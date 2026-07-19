import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { extractFromIep, type IepExtract } from "./iep-extract.functions";
import { emitEvidenceForConfirmedExtraction } from "./evidence-writers.functions";

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
  .inputValidator((i: unknown) =>
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
  .inputValidator((i: unknown) =>
    z.object({
      document_id: z.string().uuid(),
      text: z.string().trim().min(40).max(120_000),
    }).parse(i),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    const { data: doc } = await supabase
      .from("documents")
      .select("id, student_id")
      .eq("id", data.document_id)
      .maybeSingle();
    if (!doc) throw new Error("Document not found or not accessible.");

    const { extract } = await extractFromIep({ data: { text: data.text } });

    const sections = emptySections(extract);

    const { data: row, error } = await supabase
      .from("document_extractions")
      .upsert(
        {
          document_id: doc.id,
          student_id: doc.student_id,
          raw_extract: extract as any,
          sections: sections as any,
          status: "needs_review",
          created_by: userId,
        },
        { onConflict: "document_id" },
      )
      .select("*")
      .single();
    if (error || !row) {
      console.error("runExtractionFromText upsert failed", error);
      throw new Error("Could not save the extraction.");
    }
    return { extraction: row };
  });

export const updateExtractionSection = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
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

    const { error: upErr } = await supabase
      .from("document_extractions")
      .update({ sections: sections as any, status: "in_review" })
      .eq("id", data.extraction_id);
    if (upErr) throw new Error("Could not update section.");
    return { ok: true };
  });

export const updateExtractionMeta = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
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
    const { error } = await supabase
      .from("document_extractions")
      .update(patch)
      .eq("id", data.extraction_id);
    if (error) throw new Error("Could not save review notes.");
    return { ok: true };
  });

export const applyAcceptedExtraction = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z.object({ extraction_id: z.string().uuid() }).parse(i),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: row, error } = await supabase
      .from("document_extractions")
      .select("id, student_id, document_id, sections")
      .eq("id", data.extraction_id)
      .maybeSingle();
    if (error || !row) throw new Error("Extraction not found.");

    const sections = (row.sections ?? {}) as Record<string, ExtractionSection>;
    const accepted = (k: ExtractionSectionKey) => {
      const s = sections[k];
      if (!s) return null;
      return s.state === "accepted" || s.state === "edited" ? (s.value || "").trim() : null;
    };

    // Map accepted sections into students + transition_profiles fields.
    const studentPatch: any = {};
    const tp: any = {};

    const firstName = accepted("student_first_name");
    if (firstName) studentPatch.first_name = firstName;
    const grade = accepted("grade_band");
    if (grade && ["9-10", "11-12", "post-secondary", "not-applicable"].includes(grade)) {
      studentPatch.grade_band = grade;
    }
    const strengths = accepted("strengths");
    if (strengths) studentPatch.strengths_summary = strengths;
    const interests = accepted("interests");
    if (interests) studentPatch.interests_summary = interests;
    const needs = accepted("needs");
    if (needs) studentPatch.support_needs_summary = needs;
    const voice = accepted("student_voice");
    if (voice) studentPatch.student_voice_statement = voice;
    const familyConcerns = accepted("family_concerns");
    if (familyConcerns) studentPatch.family_priorities = familyConcerns;

    const transportation = accepted("transportation");
    if (transportation) tp.transportation_goal = transportation;
    const supports = accepted("supports");
    if (supports) tp.current_services_summary = supports;
    const currentGoals = accepted("current_goals");
    if (currentGoals) tp.education_training_goal = currentGoals;

    if (Object.keys(studentPatch).length) {
      const { error: sErr } = await supabase
        .from("students")
        .update(studentPatch)
        .eq("id", row.student_id);
      if (sErr) console.error("apply students update failed", sErr);
    }

    if (Object.keys(tp).length) {
      const { error: tErr } = await supabase
        .from("transition_profiles")
        .upsert({ student_id: row.student_id, ...tp }, { onConflict: "student_id" });
      if (tErr) console.error("apply transition_profiles upsert failed", tErr);
    }

    const { error: finErr } = await supabase
      .from("document_extractions")
      .update({
        status: "complete",
        reviewer_id: userId,
        reviewed_at: new Date().toISOString(),
      })
      .eq("id", row.id);
    if (finErr) throw new Error("Could not finalize the review.");

    // Slice B4: emit one evidence_item for this confirmed extraction (flagged).
    // Idempotent: partial unique index on (student_id, source_kind, source_id).
    await emitEvidenceForConfirmedExtraction({
      supabase,
      userId,
      extractionId: row.id,
      studentId: row.student_id,
      documentId: (row as { document_id?: string | null }).document_id ?? null,
      verificationState: "human_confirmed",
      payload: {
        applied_student_fields: Object.keys(studentPatch),
        applied_transition_fields: Object.keys(tp),
      },
    });



    await supabase.from("audit_log").insert({
      actor_id: userId,
      action: "document.extraction.applied",
      entity_type: "document_extraction",
      entity_id: row.id,
      student_id: row.student_id,
      metadata: {
        applied_student_fields: Object.keys(studentPatch),
        applied_transition_fields: Object.keys(tp),
      },
    });

    return { ok: true };
  });
