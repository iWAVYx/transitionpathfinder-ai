import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import type { Database } from "@/integrations/supabase/types";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { extractFromIep, type IepExtract } from "./iep-extract.functions";
import { documentTextExtractionRequest, replaceDocumentTextExtraction } from "./document-text-extraction.server";
import { applyReviewedExtractionWithAdmission, parseExtractionApplyRequest } from "./document-extraction-apply.server";

/** Section keys we surface in the review UI, mapped to IepExtract fields. */
export const EXTRACTION_SECTION_KEYS = [
  "student_first_name",
  "grade_band",
  "strengths",
  "interests",
  "needs",
  "supports",
  "transportation",
  "communication",
  "current_goals",
  "family_concerns",
  "student_voice",
  "educator_input",
] as const;

export type ExtractionSectionKey = (typeof EXTRACTION_SECTION_KEYS)[number];
export type SectionReviewState = "pending" | "accepted" | "edited" | "rejected" | "uncertain";

export type ExtractionSection = {
  state: SectionReviewState;
  value: string;
  original_value: string;
  notes: string;
};

export type ExtractionSections = Record<ExtractionSectionKey, ExtractionSection>;

function emptySections(extract?: Partial<IepExtract>): ExtractionSections {
  const out = {} as ExtractionSections;
  for (const k of EXTRACTION_SECTION_KEYS) {
    const v = (extract?.[k] ?? "") as string;
    out[k] = { state: "pending", value: v, original_value: v, notes: "" };
  }
  return out;
}

export const getOrCreateExtraction = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((i: unknown) =>
    z.object({ document_id: z.string().uuid() }).parse(i),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    const { data: existing } = await supabase
      .from("document_extractions")
      .select("*")
      .eq("document_id", data.document_id)
      .maybeSingle();

    if (existing) return { extraction: existing };

    // Need the student_id from the document (RLS-guarded).
    const { data: doc, error: docErr } = await supabase
      .from("documents")
      .select("id, student_id, title")
      .eq("id", data.document_id)
      .maybeSingle();
    if (docErr || !doc) throw new Error("Document not found or not accessible.");

    const { data: inserted, error } = await supabase
      .from("document_extractions")
      .insert({
        document_id: doc.id,
        student_id: doc.student_id,
        status: "pending",
        sections: emptySections() as any,
        created_by: userId,
      })
      .select("*")
      .single();
    if (error || !inserted) throw new Error("Could not initialize extraction.");
    return { extraction: inserted };
  });

export const runExtractionFromText = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((i: unknown) => documentTextExtractionRequest.parse(i))
  .handler(async ({ data, context }) => {
    const result = await replaceDocumentTextExtraction(
      context.supabase, context.userId, data,
      async (text, actorId) => (await extractFromIep({ data: { text, expected_viewer_id: actorId } })).extract,
      extract => ({ raw_extract: extract as any, sections: emptySections(extract) as any, status: "needs_review" }),
    );
    return { extraction: result.extraction as Database["public"]["Tables"]["document_extractions"]["Row"] };
  });

export const updateExtractionSection = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((i: unknown) =>
    z.object({
      extraction_id: z.string().uuid(),
      key: z.enum(EXTRACTION_SECTION_KEYS),
      state: z.enum(["pending", "accepted", "edited", "rejected", "uncertain"]),
      value: z.string().max(4000).default(""),
      notes: z.string().max(1000).default(""),
    }).parse(i),
  )
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { data: row, error } = await supabase
      .from("document_extractions")
      .select("sections")
      .eq("id", data.extraction_id)
      .maybeSingle();
    if (error || !row) throw new Error("Extraction not found.");

    const sections = (row.sections ?? {}) as Record<string, ExtractionSection>;
    const prev = sections[data.key] ?? {
      state: "pending",
      value: "",
      original_value: "",
      notes: "",
    };
    sections[data.key] = {
      state: data.state,
      value: data.value || prev.value,
      original_value: prev.original_value,
      notes: data.notes,
    };

    const { data: saved, error: upErr } = await supabase
      .from("document_extractions")
      .update({ sections: sections as any, status: "in_review" })
      .eq("id", data.extraction_id).select("updated_at").maybeSingle();
    if (upErr || !saved) throw new Error("Could not update section.");
    return { ok: true, updated_at: saved.updated_at };
  });

export const updateExtractionMeta = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((i: unknown) =>
    z.object({
      extraction_id: z.string().uuid(),
      missing_information: z.array(z.string().max(400)).max(40).optional(),
      suggested_questions: z.array(z.string().max(400)).max(40).optional(),
      review_notes: z.string().max(4000).optional(),
    }).parse(i),
  )
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const patch: any = {};
    if (data.missing_information) patch.missing_information = data.missing_information;
    if (data.suggested_questions) patch.suggested_questions = data.suggested_questions;
    if (data.review_notes !== undefined) patch.review_notes = data.review_notes;
    const { data: saved, error } = await supabase
      .from("document_extractions")
      .update(patch)
      .eq("id", data.extraction_id).select("updated_at").maybeSingle();
    if (error || !saved) throw new Error("Could not save review notes.");
    return { ok: true, updated_at: saved.updated_at };
  });

export const applyAcceptedExtraction = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((i: unknown) => parseExtractionApplyRequest(i))
  .handler(async ({ data, context }) => applyReviewedExtractionWithAdmission(context.supabase, context.userId, data));
