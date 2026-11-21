import { z } from "zod";
import { EXTRACTION_SECTION_KEYS } from "./document-review-edit.server";

export const DOCUMENT_REVIEW_LOAD_MESSAGE = "We couldn't open this document review. Refresh the page to check your sign-in, access and the current review before trying again.";
const requestSchema = z.object({ document_id: z.string().uuid(), expected_viewer_id: z.string().uuid() }).strict();
export function parseDocumentReviewLoadRequest(input: unknown) {
  try { return requestSchema.parse(input); } catch { throw new Error(DOCUMENT_REVIEW_LOAD_MESSAGE); }
}
const documentSchema = z.object({ id: z.string().uuid(), student_id: z.string().uuid() });
const sectionSchema = z.object({ state: z.enum(["pending", "accepted", "edited", "rejected", "uncertain"]), value: z.string(), original_value: z.string(), notes: z.string() });
const reviewSchema = z.object({
  id: z.string().uuid(), document_id: z.string().uuid(), student_id: z.string().uuid(),
  status: z.enum(["pending", "needs_review", "in_review", "complete"]), updated_at: z.string().datetime({ offset: true }),
  sections: z.record(z.string(), sectionSchema),
}).passthrough();
type Result = { data: unknown; error: unknown };
type Query = { eq(key: string, value: string): Query; select(columns: string): Query; maybeSingle(): PromiseLike<Result>; single(): PromiseLike<Result> };
type Client = { rpc(name: string, args: Record<string, string>): PromiseLike<Result>; from(table: string): { select(columns: string): Query; insert(value: Record<string, unknown>): Query } };

/** Caller RLS only. This initializes an empty review, never generated content.
 * No service client, upsert, automatic retry or provider call. Separate reads
 * and INSERT do not claim transaction-held access-removal serialization. */
export async function loadOrInitializeDocumentReview(privateClient: unknown, actorId: string, input: unknown) {
  try {
    const data = parseDocumentReviewLoadRequest(input);
    if (actorId !== data.expected_viewer_id) throw new Error();
    const client = privateClient as Client;
    const result = await client.from("documents").select("id,student_id").eq("id", data.document_id).maybeSingle();
    const doc = documentSchema.parse(result.data);
    if (result.error || doc.id !== data.document_id) throw new Error();
    async function permit(name: string, args: Record<string, string>, expected = true) {
      const reply = await client.rpc(name, args);
      if (reply.error || reply.data !== expected) throw new Error();
    }
    async function confirmRead() {
      await permit("can_access_student", { _user_id: actorId, _student_id: doc.student_id });
      await permit("can_view_document", { _user_id: actorId, _document_id: doc.id });
    }
    await confirmRead();
    const existing = await client.from("document_extractions").select("*").eq("document_id", doc.id).eq("student_id", doc.student_id).maybeSingle();
    if (existing.error) throw new Error();
    function receipt(value: unknown) {
      const row = reviewSchema.parse(value);
      if (row.document_id !== doc.id || row.student_id !== doc.student_id) throw new Error();
      return row;
    }
    if (existing.data !== null) {
      const extraction = receipt(existing.data);
      await confirmRead();
      return { extraction };
    }
    await permit("can_edit_student", { _user_id: actorId, _student_id: doc.student_id });
    await permit("is_partner_only", { _user_id: actorId }, false);
    const sections = Object.fromEntries(EXTRACTION_SECTION_KEYS.map(key => [key, { state: "pending", value: "", original_value: "", notes: "" }]));
    const inserted = await client.from("document_extractions").insert({ document_id: doc.id, student_id: doc.student_id, status: "pending", sections, created_by: actorId }).select("*").single();
    if (inserted.error) throw new Error();
    const extraction = receipt(inserted.data);
    z.object({ raw_extract: z.object({}).strict(), missing_information: z.array(z.string()).length(0), suggested_questions: z.array(z.string()).length(0), review_notes: z.null(), reviewer_id: z.null(), reviewed_at: z.null() }).parse(extraction);
    if (extraction.status !== "pending" || extraction.created_by !== actorId || Object.keys(extraction.sections).length !== EXTRACTION_SECTION_KEYS.length || EXTRACTION_SECTION_KEYS.some(key => {
      const section = extraction.sections[key];
      return !section || section.state !== "pending" || section.value !== "" || section.original_value !== "" || section.notes !== "";
    })) throw new Error();
    await confirmRead();
    return { extraction };
  } catch { throw new Error(DOCUMENT_REVIEW_LOAD_MESSAGE); }
}
