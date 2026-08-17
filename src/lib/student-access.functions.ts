import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  EXTRACTION_SECTION_KEYS,
  type ExtractionSectionKey,
  type ExtractionSections,
} from "./extractions.functions";

/**
 * Sections we expose to the student in plain language. Subset of the full
 * extraction — we deliberately do NOT show family/educator-private fields.
 */
const STUDENT_SECTIONS: { key: ExtractionSectionKey; label: string }[] = [
  { key: "strengths", label: "What you're good at" },
  { key: "interests", label: "Your interests" },
  { key: "needs", label: "Areas where you may want help" },
  { key: "supports", label: "Supports and accommodations" },
  { key: "current_goals", label: "Your transition goals" },
  { key: "transportation", label: "Getting around" },
  { key: "communication", label: "How you communicate" },
  { key: "student_voice", label: "In your own words" },
];

export type StudentFriendlySection = {
  key: ExtractionSectionKey;
  label: string;
  value: string;
  accepted: boolean;
};

export type StudentFriendlySummary = {
  document_id: string;
  document_title: string | null;
  doc_type: string;
  status: string;
  ready: boolean;
  sections: StudentFriendlySection[];
};

export const getStudentFriendlyDocumentSummary = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((i: unknown) =>
    z.object({ document_id: z.string().uuid() }).parse(i),
  )
  .handler(async ({ data, context }) => {
    const { supabase } = context;

    // RLS: visible only to roles allowed by can_view_document.
    const { data: doc, error: dErr } = await supabase
      .from("documents")
      .select("id, title, doc_type")
      .eq("id", data.document_id)
      .maybeSingle();
    if (dErr) throw new Error(dErr.message);
    if (!doc) throw new Error("Document not found");

    const { data: extraction } = await supabase
      .from("document_extractions")
      .select("status, sections")
      .eq("document_id", data.document_id)
      .maybeSingle();

    const sections = (extraction?.sections ?? null) as ExtractionSections | null;
    const ready = !!extraction && !!sections;

    const out: StudentFriendlySection[] = STUDENT_SECTIONS.map(({ key, label }) => {
      const s = sections?.[key];
      const value = s?.value?.trim() ?? "";
      const accepted = s?.state === "accepted" || s?.state === "edited";
      return { key, label, value, accepted };
    }).filter((s) => s.value.length > 0);

    const summary: StudentFriendlySummary = {
      document_id: doc.id,
      document_title: doc.title,
      doc_type: doc.doc_type,
      status: extraction?.status ?? "pending",
      ready,
      sections: out,
    };
    return { summary };
  });

/**
 * Lists IEP / transition-plan documents the current user can access for the
 * given student, with a quick "summary readiness" flag. Drives the student
 * dashboard "My IEP summary" card and the document-row student CTA.
 */
export const listStudentFriendlyDocuments = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((i: unknown) =>
    z.object({ student_id: z.string().uuid() }).parse(i),
  )
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { data: docs, error } = await supabase
      .from("documents")
      .select("id, title, doc_type, created_at")
      .eq("student_id", data.student_id)
      .in("doc_type", ["iep", "current-iep", "previous-iep", "transition-plan"])
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);

    const ids = (docs ?? []).map((d) => d.id);
    let readyMap: Record<string, boolean> = {};
    if (ids.length > 0) {
      const { data: extr } = await supabase
        .from("document_extractions")
        .select("document_id, status")
        .in("document_id", ids);
      for (const e of extr ?? []) {
        readyMap[e.document_id] = e.status === "complete" || e.status === "in_review";
      }
    }

    return {
      documents: (docs ?? []).map((d) => ({
        id: d.id,
        title: d.title,
        doc_type: d.doc_type,
        created_at: d.created_at,
        summary_ready: !!readyMap[d.id],
      })),
    };
  });
// Silence unused export check from bundler when sections list is fully filtered.
export { EXTRACTION_SECTION_KEYS };
