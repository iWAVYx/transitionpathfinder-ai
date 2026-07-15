import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { generateText, Output } from "ai";
import { createHash } from "crypto";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { createLovableAiGatewayProvider } from "@/lib/ai-gateway.server";
import { REPORT_SECTIONS } from "./types";
import type { ReportSectionId } from "@/lib/hubs/registry";

const SOURCE_KINDS = [
  "document",
  "note",
  "goal",
  "meeting",
  "voice_response",
  "assessment",
  "opportunity",
  "other",
] as const;
type SourceKind = (typeof SOURCE_KINDS)[number];

const ExtractedItem = z.object({
  section: z.enum(REPORT_SECTIONS as [ReportSectionId, ...ReportSectionId[]]),
  snippet: z.string().trim().min(15).max(600),
  confidence: z.enum(["low", "medium", "high"]),
});
const ExtractionSchema = z.object({
  items: z.array(ExtractedItem).max(24).default([]),
});
export type ExtractedEvidenceItem = z.infer<typeof ExtractedItem>;

const GENERIC_PHRASES = [
  "student needs support",
  "student is a hard worker",
  "no additional information",
  "n/a",
  "not applicable",
  "see attached",
];

/**
 * Normalize a snippet for hashing so trivial whitespace/case differences
 * still collapse into the same evidence link.
 */
export function snippetHash(
  section: string,
  sourceKind: string,
  sourceId: string | null | undefined,
  snippet: string,
): string {
  const norm = snippet.trim().toLowerCase().replace(/\s+/g, " ");
  const key = `${section}|${sourceKind}|${sourceId ?? ""}|${norm}`;
  return createHash("sha256").update(key).digest("hex").slice(0, 32);
}

/** Drop empty / boilerplate / duplicate-in-batch snippets before insert. */
export function filterUsefulItems(
  items: ExtractedEvidenceItem[],
): ExtractedEvidenceItem[] {
  const seen = new Set<string>();
  const out: ExtractedEvidenceItem[] = [];
  for (const it of items) {
    const snip = it.snippet.trim();
    if (snip.length < 15) continue;
    const lower = snip.toLowerCase();
    if (GENERIC_PHRASES.some((g) => lower === g || lower.startsWith(g + "."))) continue;
    const key = `${it.section}::${lower}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ ...it, snippet: snip });
  }
  return out;
}

async function callExtractor(text: string, contextHint: string) {
  const apiKey = process.env.LOVABLE_API_KEY;
  if (!apiKey) throw new Error("AI service is not configured.");
  const gateway = createLovableAiGatewayProvider(apiKey);

  const sectionList = REPORT_SECTIONS.join(", ");
  const prompt = `You are helping a transition-planning team map source material to sections of a student's Pathway Report.

CONTEXT: ${contextHint}

Read the SOURCE TEXT below and extract concrete pieces of evidence. For each piece:
- pick ONE section id from this exact list: ${sectionList}
- copy a short SNIPPET (15-500 chars) drawn from the text; you may lightly rephrase for clarity but do NOT invent facts
- rate confidence: "high" (directly stated), "medium" (clearly implied), or "low" (weak signal)

Rules:
- Skip generic boilerplate ("student needs support", "n/a", "hard worker").
- Skip identifiers: last names, addresses, dates of birth, school names.
- Return at most 12 items, strongest first.
- If nothing useful, return an empty items array.

SOURCE TEXT:
"""
${text.slice(0, 60_000)}
"""`;

  const { experimental_output } = await generateText({
    model: gateway("google/gemini-3-flash-preview"),
    experimental_output: Output.object({ schema: ExtractionSchema }),
    prompt,
  });
  return (experimental_output as { items: ExtractedEvidenceItem[] }).items ?? [];
}

const ExtractInput = z.object({
  student_id: z.string().uuid(),
  source_kind: z.enum(SOURCE_KINDS),
  source_id: z.string().uuid().optional().nullable(),
  source_label: z.string().trim().min(1).max(200),
  text: z.string().trim().min(40).max(120_000),
  context_hint: z.string().trim().max(400).optional(),
});

type InsertRow = {
  student_id: string;
  report_section: string;
  source_kind: string;
  source_id: string | null;
  source_label: string;
  note: string | null;
  snippet_hash: string;
  created_by: string;
};

/**
 * Run the AI extractor over free text and idempotently upsert one
 * report_evidence_link per (student, section, source, snippet).
 * No UI — called from feature pages (documents, intake, meeting notes).
 */
export const extractEvidenceFromText = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => ExtractInput.parse(i))
  .handler(async ({ data, context }) => {
    // Authorization: caller must be able to view+edit this student.
    const { data: canEdit, error: canErr } = await context.supabase.rpc(
      "can_edit_student",
      { _student_id: data.student_id },
    );
    if (canErr) {
      console.error("extractEvidenceFromText auth check failed", canErr);
      throw new Error("Couldn't verify access to this student.");
    }
    if (!canEdit) throw new Error("You don't have access to this student.");

    let raw: ExtractedEvidenceItem[] = [];
    try {
      raw = await callExtractor(data.text, data.context_hint ?? data.source_label);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error("extractEvidenceFromText AI call failed", msg);
      if (msg.includes("429")) throw new Error("The AI is busy right now. Try again in a moment.");
      if (msg.includes("402")) throw new Error("AI usage limit reached. Please add credits to continue.");
      throw new Error("We couldn't read evidence out of this source.");
    }

    const items = filterUsefulItems(raw);
    if (items.length === 0) {
      return { extracted: 0, inserted: 0, skipped_duplicates: 0, items: [] };
    }

    const rows: InsertRow[] = items.map((it) => ({
      student_id: data.student_id,
      report_section: it.section,
      source_kind: data.source_kind,
      source_id: data.source_id ?? null,
      source_label: data.source_label,
      note: `AI-extracted (${it.confidence}): ${it.snippet}`,
      snippet_hash: snippetHash(it.section, data.source_kind, data.source_id ?? null, it.snippet),
      created_by: context.userId,
    }));

    // Idempotent upsert against the partial unique index we added in this slice.
    const { data: inserted, error } = await context.supabase
      .from("report_evidence_links")
      .upsert(rows, {
        onConflict: "student_id,report_section,source_kind,source_id,snippet_hash",
        ignoreDuplicates: true,
      })
      .select("id");
    if (error) {
      console.error("extractEvidenceFromText insert failed", error);
      throw new Error("Couldn't save the extracted evidence.");
    }

    const insertedCount = inserted?.length ?? 0;
    return {
      extracted: items.length,
      inserted: insertedCount,
      skipped_duplicates: items.length - insertedCount,
      items,
    };
  });

/**
 * Convenience wrapper: pulls a document row the caller can view, then feeds
 * its parsed_summary text into the shared extractor.
 */
export const extractEvidenceFromDocument = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z.object({ document_id: z.string().uuid() }).parse(i),
  )
  .handler(async ({ data, context }) => {
    const { data: doc, error } = await context.supabase
      .from("documents")
      .select("id, student_id, title, parsed_summary, doc_type")
      .eq("id", data.document_id)
      .single();
    if (error || !doc) {
      console.error("extractEvidenceFromDocument load failed", error);
      throw new Error("Couldn't load that document.");
    }

    const summary = doc.parsed_summary as unknown;
    const text =
      typeof summary === "string"
        ? summary
        : summary && typeof summary === "object"
          ? JSON.stringify(summary)
          : "";
    if (text.trim().length < 40) {
      throw new Error("This document doesn't have extracted text yet. Add a summary first.");
    }

    return extractEvidenceFromText({
      data: {
        student_id: doc.student_id,
        source_kind: "document",
        source_id: doc.id,
        source_label: doc.title || "Uploaded document",
        text,
        context_hint: `Document type: ${doc.doc_type ?? "other"}. Title: ${doc.title ?? ""}.`,
      },
    });
  });
