import { z } from "zod";
import { admitDocumentTextExtraction, documentTextServiceClient, DOCUMENT_TEXT_START_MESSAGE } from "./document-text-admission.server";

export const DOCUMENT_TEXT_REVIEW_MESSAGE = "We couldn't confirm that this document review is current or editable. Reload it and check your access before trying again.";
export const documentTextExtractionRequest = z.object({
  expected_viewer_id: z.string().uuid(),
  document_id: z.string().uuid(), student_id: z.string().uuid(), extraction_id: z.string().uuid(),
  expected_updated_at: z.string().datetime({ offset: true }),
  text: z.string().trim().min(40).max(120_000),
}).strict();
const review = z.object({ id: z.string().uuid(), document_id: z.string().uuid(), student_id: z.string().uuid(),
  updated_at: z.string().datetime({ offset: true }), status: z.enum(["pending", "needs_review", "in_review"]),
});
const savedReview = review.extend({
  created_at: z.string().datetime({ offset: true }), created_by: z.string().uuid().nullable(),
  doc_type: z.string().nullable(), source_label: z.string().nullable(),
  missing_information: z.array(z.string()), suggested_questions: z.array(z.string()),
  review_notes: z.string().nullable(), reviewed_at: z.string().datetime({ offset: true }).nullable(),
  reviewer_id: z.string().uuid().nullable(), raw_extract: z.json(), sections: z.record(z.string(), z.json()),
}).strict();
const document = z.object({ id: z.string().uuid(), student_id: z.string().uuid(),
  updated_at: z.string().datetime({ offset: true }), scan_status: z.literal("clean"),
  review_status: z.string().refine(value => value !== "rejected"), archived_at: z.null(), deleted_at: z.null(),
});
type Result = { data: unknown; error: unknown };
type Query = { eq(column: string, value: string): Query; maybeSingle(): PromiseLike<Result> };
type Client = { rpc(name: string, args: Record<string, unknown>): PromiseLike<Result>;
  from(table: string): { select(columns: string): Query } };

/** Caller-scoped preflight and a source-bound admission protocol gate. The
 * matching backend accounting/completion protocol remains an activation gate.
 * This does not prove provider cancellation or pasted-text byte provenance.
 * Never upsert: a deleted, completed or concurrently edited review stays intact.
 */
export async function replaceDocumentTextExtraction<T>(privateClient: unknown, actorId: string, input: unknown,
  generate: (text: string, actorId: string) => Promise<T>,
  patchFor: (extract: T) => Record<string, unknown>,
  getServiceClient: () => Promise<unknown> = documentTextServiceClient,
) {
  const request = documentTextExtractionRequest.safeParse(input);
  if (!request.success || request.data.expected_viewer_id !== actorId) throw new Error(DOCUMENT_TEXT_REVIEW_MESSAGE);
  const data = request.data;
  const client = privateClient as Client;
  const confirm = async () => {
    for (const [name, args, expected] of [
      ["can_edit_student", { _user_id: actorId, _student_id: data.student_id }, true],
      ["is_partner_only", { _user_id: actorId }, false],
      ["can_view_document", { _user_id: actorId, _document_id: data.document_id }, true],
    ] as const) {
      const result = await client.rpc(name, args);
      if (result.error || result.data !== expected) throw new Error();
    }
    const result = await client.from("document_extractions").select("id,document_id,student_id,updated_at,status").eq("id", data.extraction_id).maybeSingle();
    const current = review.parse(result.data);
    if (result.error || current.document_id !== data.document_id || current.student_id !== data.student_id
      || current.id !== data.extraction_id || current.updated_at !== data.expected_updated_at) throw new Error();
    const source = await client.from("documents").select("id,student_id,updated_at,scan_status,review_status,archived_at,deleted_at").eq("id", data.document_id).maybeSingle();
    const available = document.parse(source.data);
    if (source.error || available.id !== data.document_id || available.student_id !== data.student_id) throw new Error();
    return { current, available };
  };
  let claim: Awaited<ReturnType<typeof admitDocumentTextExtraction>> | undefined;
  try {
    const before = await confirm();
    claim = await admitDocumentTextExtraction(getServiceClient, { actorId, studentId: data.student_id,
      documentId: data.document_id, extractionId: data.extraction_id, reviewRevision: data.expected_updated_at,
      documentRevision: before.available.updated_at, reviewStatus: before.current.status, text: data.text });
    const admittedSource = await confirm();
    if (JSON.stringify(before) !== JSON.stringify(admittedSource)) throw new Error();
    const extracted = await generate(data.text, actorId);
    const after = await confirm();
    if (JSON.stringify(before) !== JSON.stringify(after)) throw new Error();
    const patch = patchFor(extracted);
    const result = await client.rpc("save_bound_document_text_review", {
      ...claim.saveArguments,
      _extraction_id: data.extraction_id, _student_id: data.student_id, _document_id: data.document_id,
      _expected_review_revision: data.expected_updated_at, _expected_document_revision: before.available.updated_at,
      _expected_review_status: before.current.status, _raw_extract: patch.raw_extract, _sections: patch.sections,
    });
    const receipt = z.object({ schema: z.literal("bound-document-text-review-saved-v1"),
      operation_id: z.literal(claim.operationId), operation_state: z.literal("completed"), extraction: z.unknown() }).strict().parse(result.data);
    const saved = savedReview.parse(receipt.extraction);
    if (result.error || saved.id !== data.extraction_id || saved.document_id !== data.document_id
      || saved.student_id !== data.student_id || saved.status !== "needs_review" || saved.updated_at === data.expected_updated_at) throw new Error();
    return { extraction: saved };
  } catch (error) {
    if (claim) await claim.hold();
    if (!claim && error instanceof Error && error.message === DOCUMENT_TEXT_START_MESSAGE) throw error;
    // A lost write reply can already have committed; do not replay or expose
    // provider/database text. Reload is required to inspect the saved review.
    throw new Error(DOCUMENT_TEXT_REVIEW_MESSAGE);
  }
}
