import { z } from "zod";
import { documentUploadOutcome } from "./document-upload-outcome";
import {
  confirmDocumentUploadReservation,
  documentUploadReviewHash,
  documentUploadReservationRequestSchema,
  documentUploadRecoveryRequestSchema,
} from "./document-upload-intent";
type RpcClient = {
  rpc(name: string, args: Record<string, unknown>): PromiseLike<{ data: unknown; error: unknown }>;
};
const message =
  "We couldn't confirm this upload attempt. Refresh the page and review the document list before continuing.";
const sensitive = ["iep", "current-iep", "previous-iep", "evaluation", "transition-plan"];
export async function reserveDocumentUploadIntent(
  client: unknown,
  actor: string,
  input: unknown,
  expectedReview?: string,
) {
  try {
    const data = documentUploadReservationRequestSchema.parse(input);
    if (sensitive.includes(data.doc_type) && !data.consent_acknowledged) throw new Error(message);
    const hash = await documentUploadReviewHash(actor, data);
    if (expectedReview !== undefined && expectedReview !== hash) throw new Error(message);
    // Narrow adapter for proposal-only RPCs; generated canonical types stay unchanged.
    const result = await (client as RpcClient).rpc("reserve_document_upload", {
      _attempt_id: data.attempt_id,
      _student_id: data.student_id,
      _claimed_content_sha256: data.content_hash,
      _review_context_sha256: hash,
    });
    if (result.error !== null) throw new Error(message);
    const raw = z.record(z.string(), z.unknown()).parse(result.data);
    return confirmDocumentUploadReservation(
      { ...raw, review_context_sha256: hash },
      actor,
      data.student_id,
      data.attempt_id,
    );
  } catch {
    throw new Error(message);
  }
}
export async function recoverDocumentUploadIntent(client: unknown, actor: string, input: unknown) {
  try {
    const data = documentUploadRecoveryRequestSchema.parse(input);
    if ((await documentUploadReviewHash(actor, data)) !== data.review_context_sha256)
      throw new Error(message);
    const result = await (client as RpcClient).rpc("read_document_upload_registration", {
      _attempt_id: data.attempt_id,
      _review_context_sha256: data.review_context_sha256,
    });
    if (result.error !== null) throw new Error(message);
    const row = z
      .object({
        schema: z.literal("document-upload-registration-v1"),
        attempt_id: z.string().uuid(),
        document_id: z.string().uuid(),
        actor_id: z.string(),
        student_id: z.string().uuid(),
        storage_path: z.string(),
        scan_status: z.string(),
        review_status: z.string(),
        archived_at: z.string().nullable(),
        deleted_at: z.string().nullable(),
      })
      .parse(result.data);
    if (
      row.attempt_id !== data.attempt_id ||
      row.actor_id !== actor ||
      row.student_id !== data.student_id ||
      row.storage_path !== `${data.student_id}/${data.attempt_id}-privacy-safe-document.txt`
    )
      throw new Error(message);
    const receipt = { ...row, id: row.document_id };
    if (documentUploadOutcome(receipt, data.student_id, row.storage_path) === "uncertain")
      throw new Error(message);
    return receipt;
  } catch {
    throw new Error(message);
  }
}
