import { z } from "zod";
import { ownerWorkQueueInput, ownerWorkDetailInput, ownerWorkRetainInput, ownerWorkQueue, ownerWorkDetail, ownerWorkRetained } from "./document-work-review-contract";

type Context = { userId: unknown; claims: unknown; supabase: unknown };
const actor = z.string().uuid().transform((value) => value.toLowerCase());
const verifiedClaims = z.object({ sub: actor, role: z.literal("authenticated"), aal: z.enum(["aal1", "aal2"]).optional() }).passthrough();
const readFailure = "We couldn't load document work for review. Refresh its status before continuing.";
export const REVIEW_UNCONFIRMED = "We couldn't confirm that the review was recorded. Check its status before submitting another review.";
export class OwnerWorkReviewError extends Error {
  readonly verificationRequired: boolean;
  constructor(message: string, verificationRequired: boolean) { super(message); this.name = "OwnerWorkReviewError"; this.verificationRequired = verificationRequired; }
}
function authorize(context: Context, expected: string, write = false) {
  const user = actor.safeParse(context?.userId), claims = verifiedClaims.safeParse(context?.claims);
  if (!user.success || !claims.success || user.data !== expected || claims.data.sub !== user.data) throw new Error("Your signed-in account changed. Refresh this page before continuing.");
  if (write && claims.data.aal !== "aal2") throw new Error("Complete two-factor verification before recording a review.");
  if (!context?.supabase || typeof (context.supabase as { rpc?: unknown }).rpc !== "function") throw new Error(readFailure);
}
async function rpc(context: Context, name: string, args: Record<string, unknown>, write = false): Promise<unknown> {
  let result: { data: unknown; error: unknown };
  try { result = await (context.supabase as { rpc: (name: string, args: Record<string, unknown>) => PromiseLike<{ data: unknown; error: unknown }> }).rpc(name, args); } catch { throw (write ? new OwnerWorkReviewError(REVIEW_UNCONFIRMED, true) : new Error(readFailure)); }
  if (!result || typeof result !== "object") throw (write ? new OwnerWorkReviewError(REVIEW_UNCONFIRMED, true) : new Error(readFailure));
  if (result.error) {
    const code = (result.error as { code?: unknown })?.code;
    if (code === "42501") throw new OwnerWorkReviewError("Platform Owner access or verification could not be confirmed. Sign in again before continuing.", false);
    if (code === "55000") throw new OwnerWorkReviewError("Document work changed or processing is not paused. Refresh its status before continuing.", false);
    throw (write ? new OwnerWorkReviewError(REVIEW_UNCONFIRMED, true) : new Error(readFailure));
  }
  return result.data;
}
export async function loadOwnerDocumentWork(context: Context, input: unknown) {
  const data = ownerWorkQueueInput.parse(input); authorize(context, data.expected_viewer_id);
  try { return ownerWorkQueue.parse(await rpc(context, "list_owner_document_work", { _after_operation_id: data.after_operation_id ?? null })); }
  catch (error) { if (error instanceof z.ZodError) throw new Error(readFailure); throw error; }
}
export async function inspectOwnerDocumentWork(context: Context, input: unknown) {
  const data = ownerWorkDetailInput.parse(input); authorize(context, data.expected_viewer_id);
  const raw = await rpc(context, "inspect_owner_document_work", { _operation_id: data.operation_id, _review_id: data.review_request_id ?? null });
  const parsed = ownerWorkDetail.safeParse(raw);
  if (!parsed.success || parsed.data.snapshot.operation_id !== data.operation_id || (data.review_request_id && parsed.data.retained_review && parsed.data.retained_review.review_id !== data.review_request_id)) throw new Error(readFailure);
  return parsed.data;
}
export async function retainOwnerDocumentWork(context: Context, input: unknown) {
  const data = ownerWorkRetainInput.parse(input); authorize(context, data.expected_viewer_id, true);
  // Exactly one caller-authenticated RPC. No privileged client, retry, release,
  // provider call or raw table write is available on this boundary.
  const raw = await rpc(context, "retain_owner_document_work", { _review_id: data.review_request_id, _operation_id: data.operation_id, _expected_snapshot_sha256: data.expected_snapshot_sha256, _reason_class: data.reason_class }, true);
  const parsed = ownerWorkRetained.safeParse(raw);
  if (!parsed.success || parsed.data.operation_id !== data.operation_id || parsed.data.review_id !== data.review_request_id) throw new OwnerWorkReviewError(REVIEW_UNCONFIRMED, true);
  return parsed.data;
}
