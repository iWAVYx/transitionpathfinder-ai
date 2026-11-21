import { z } from "zod";
import type { ExtractionSection } from "./extractions.functions";

export const EXTRACTION_SECTION_KEYS = ["student_first_name", "grade_band", "strengths", "interests", "needs", "supports", "transportation", "communication", "current_goals", "family_concerns", "student_voice", "educator_input"] as const;
export const REVIEW_EDIT_MESSAGE = "We couldn't confirm that your changes were saved. Reload the review to see the latest version before editing again.";
const identity = z.object({ expected_viewer_id: z.string().uuid(), extraction_id: z.string().uuid(), document_id: z.string().uuid(), student_id: z.string().uuid(), expected_updated_at: z.string().datetime({ offset: true }) });
export const sectionEditRequest = identity.extend({ key: z.enum(EXTRACTION_SECTION_KEYS), state: z.enum(["pending", "accepted", "edited", "rejected", "uncertain"]).optional(), value: z.string().max(4000).optional(), notes: z.string().max(1000).optional() }).strict().refine(v => v.state !== undefined || v.value !== undefined || v.notes !== undefined);
export const metaEditRequest = identity.extend({ missing_information: z.array(z.string().max(400)).max(40).optional(), suggested_questions: z.array(z.string().max(400)).max(40).optional(), review_notes: z.string().max(4000).optional() }).strict().refine(v => v.missing_information !== undefined || v.suggested_questions !== undefined || v.review_notes !== undefined);
const editable = z.enum(["pending", "needs_review", "in_review"]);
const rowSchema = z.object({ id: z.string().uuid(), document_id: z.string().uuid(), student_id: z.string().uuid(), updated_at: z.string().datetime({ offset: true }), status: editable, sections: z.record(z.string(), z.json()) });
const sectionSchema = z.object({ state: z.enum(["pending", "accepted", "edited", "rejected", "uncertain"]), value: z.string(), original_value: z.string(), notes: z.string() });
type Result = { data: unknown; error: unknown };
type Query = { eq(key: string, value: string): Query; select(columns: string): Query; maybeSingle(): PromiseLike<Result> };
type Client = { rpc(name: string, args: Record<string, string>): PromiseLike<Result>; from(table: string): { select(columns: string): Query; update(patch: Record<string, unknown>): Query } };

/** Caller RLS only; the version predicate is part of the UPDATE itself. No
 * retry, upsert, service client, completion marker or generated-source write. */
export async function saveManualReviewEdit(privateClient: unknown, actorId: string, input: unknown, kind: "section" | "meta") {
  try {
    const data = kind === "section" ? sectionEditRequest.parse(input) : metaEditRequest.parse(input);
    if (actorId !== data.expected_viewer_id) throw new Error();
    const client = privateClient as Client;
    for (const [name, args, wanted] of [
      ["can_edit_student", { _user_id: actorId, _student_id: data.student_id }, true],
      ["is_partner_only", { _user_id: actorId }, false],
      ["can_view_document", { _user_id: actorId, _document_id: data.document_id }, true],
    ] as const) { const result = await client.rpc(name, args); if (result.error || result.data !== wanted) throw new Error(); }
    const result = await client.from("document_extractions").select("id,document_id,student_id,updated_at,status,sections").eq("id", data.extraction_id).maybeSingle();
    const row = rowSchema.parse(result.data);
    if (result.error || row.id !== data.extraction_id || row.document_id !== data.document_id || row.student_id !== data.student_id || row.updated_at !== data.expected_updated_at) throw new Error();
    let patch: Record<string, unknown>;
    if ("key" in data) {
      const previous: ExtractionSection = sectionSchema.parse(row.sections[data.key] ?? { state: "pending", value: "", original_value: "", notes: "" });
      patch = { sections: { ...row.sections, [data.key]: { ...previous, state: data.state ?? previous.state, value: data.value ?? previous.value, notes: data.notes ?? previous.notes } }, status: "in_review" };
    } else {
      patch = {};
      for (const key of ["missing_information", "suggested_questions", "review_notes"] as const) if (data[key] !== undefined) patch[key] = data[key];
    }
    const saved = await client.from("document_extractions").update(patch).eq("id", data.extraction_id).eq("document_id", data.document_id).eq("student_id", data.student_id).eq("updated_at", data.expected_updated_at).eq("status", row.status).select("id,updated_at").maybeSingle();
    const receipt = z.object({ id: z.string().uuid(), updated_at: z.string().datetime({ offset: true }) }).parse(saved.data);
    if (saved.error || receipt.id !== data.extraction_id || receipt.updated_at === data.expected_updated_at) throw new Error();
    return { ok: true, updated_at: receipt.updated_at };
  } catch { throw new Error(REVIEW_EDIT_MESSAGE); }
}
