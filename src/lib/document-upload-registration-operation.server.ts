import { z } from "zod";
import { DocumentOperationAdmissionError } from "./document-operation-admission.server";

const uuid = z.string().uuid();
const sha256 = z.string().regex(/^[0-9a-f]{64}$/);
const contextSchema = z.object({
  actorId: uuid, studentId: uuid, attemptId: uuid,
  contentSha256: sha256, reviewContextSha256: sha256,
}).strict();
const claimSchema = z.object({
  schema: z.literal("document-upload-registration-operation-v1"),
  attempt_id: uuid, actor_id: uuid, student_id: uuid,
  storage_path: z.string(), content_sha256: sha256, review_context_sha256: sha256,
  operation_id: uuid, receipt_id: uuid,
  revision: z.number().int().positive().max(Number.MAX_SAFE_INTEGER),
  object_id: uuid,
  object_version: z.string().min(1).max(1024).refine(value => value.trim() === value && value.length > 0),
  claimed_at: z.string().datetime({ offset: true }),
}).strict();
const finishedSchema = z.object({
  schema: z.literal("document-operation-finished-v1"),
  operation_id: uuid, state: z.enum(["completed", "needs_review"]),
}).strict();
type RpcClient = {
  rpc(name: string, args: Record<string, unknown>): PromiseLike<{ data: unknown; error: unknown }>;
};
export type RegistrationSource = Readonly<{
  objectId: string; objectVersion: string; storagePath: string; contentSha256: string;
}>;

/** Prepared service-only continuation of an already admitted reservation.
 * Caller must establish current viewer/student/review authority before calling.
 * This never begins a second operation, retries a claim or exposes its receipt.
 * Work must verify the actual same-copy bytes/current authority and validate its
 * domain write/scan/queue receipts before resolving. No handler is wired yet. */
export async function runClaimedDocumentRegistration<T>(
  input: z.infer<typeof contextSchema> & { serviceClient: unknown },
  work: (source: RegistrationSource) => Promise<T>,
): Promise<T> {
  let claim: z.infer<typeof claimSchema>;
  let client: RpcClient;
  let actorId: string;
  try {
    const { serviceClient, ...raw } = input;
    const context = contextSchema.parse(raw);
    if (typeof work !== "function") throw new Error();
    client = serviceClient as RpcClient;
    actorId = context.actorId;
    const result = await client.rpc("claim_document_upload_registration_operation", {
      _attempt_id: context.attemptId, _actor_id: actorId,
      _review_context_sha256: context.reviewContextSha256,
    });
    if (result.error !== null) throw new Error();
    claim = claimSchema.parse(result.data);
    if (claim.actor_id !== actorId || claim.student_id !== context.studentId ||
        claim.attempt_id !== context.attemptId || claim.content_sha256 !== context.contentSha256 ||
        claim.review_context_sha256 !== context.reviewContextSha256 ||
        claim.storage_path !== `${context.studentId}/${context.attemptId}-privacy-safe-document.txt`) throw new Error();
  } catch {
    // Claim may have committed. Without a fully bound receipt, no file IO,
    // finish, new operation or automatic replay is safe.
    throw new DocumentOperationAdmissionError("admission");
  }
  const finish = async (outcome: "completed" | "needs_review") => {
    const result = await client.rpc("finish_document_operation", {
      _operation_id: claim.operation_id, _actor_id: actorId,
      _receipt_id: claim.receipt_id, _outcome: outcome,
    });
    if (result.error !== null) throw new Error();
    const receipt = finishedSchema.parse(result.data);
    if (receipt.operation_id !== claim.operation_id || receipt.state !== outcome) throw new Error();
  };
  let value: T;
  try {
    value = await work(Object.freeze({
      objectId: claim.object_id, objectVersion: claim.object_version,
      storagePath: claim.storage_path, contentSha256: claim.content_sha256,
    }));
  } catch {
    try { await finish("needs_review"); } catch { /* retain counted work for reconciliation */ }
    throw new DocumentOperationAdmissionError("work");
  }
  try { await finish("completed"); } catch {
    // Completion may already be committed: never send another finish or return
    // a saved-success result. A separate token-free recovery checks completion.
    throw new DocumentOperationAdmissionError("completion");
  }
  return value;
}
