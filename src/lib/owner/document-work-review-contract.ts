import { z } from "zod";
const identity = z.string().uuid().transform((value) => value.toLowerCase());
const digest = z.string().regex(/^[a-f0-9]{64}$/);
export const DOCUMENT_WORK_KIND_LABELS = { register: "Upload Registration", rescan: "Document Rescan", apply: "Apply Reviewed Information", summary: "Document Summary" } as const;
export const DOCUMENT_WORK_REASON_LABELS = { provider_unknown: "Service Status Unconfirmed", missing_receipt: "Completion Could Not Be Confirmed", source_changed: "Source Information Changed", manual_review: "Further Review Needed" } as const;
export const workReason = z.enum(["provider_unknown", "missing_receipt", "source_changed", "manual_review"]);
const kind = z.enum(["register", "rescan", "apply", "summary"]);
const viewer = { expected_viewer_id: identity };
export const ownerWorkQueueInput = z.object({ ...viewer, after_operation_id: identity.optional() }).strict();
export const ownerWorkDetailInput = z.object({ ...viewer, operation_id: identity, review_request_id: identity.optional() }).strict();
export const ownerWorkRetainInput = z.object({ ...viewer, operation_id: identity, review_request_id: identity, expected_snapshot_sha256: digest, reason_class: workReason }).strict();
const item = z.object({ operation_id: identity, operation_kind: kind, state: z.enum(["active", "needs_review"]) }).strict();
export const ownerWorkQueue = z.object({ schema: z.literal("owner-document-work-queue-v1"), scope: z.literal("tracked_document_work"), control_revision: z.number().int().positive().max(Number.MAX_SAFE_INTEGER), paused: z.literal(true), items: z.array(item).max(25), has_more: z.boolean(), next_cursor: identity.nullable(), external_quiescence_verified: z.literal(false), release_permitted: z.literal(false) }).strict().superRefine((value, ctx) => {
  const ids = value.items.map((row) => row.operation_id);
  if (new Set(ids).size !== ids.length || ids.some((id, n) => n > 0 && id <= ids[n - 1]) || (value.has_more ? ids.length !== 25 || value.next_cursor !== ids.at(-1) : value.next_cursor !== null)) ctx.addIssue({ code: "custom", message: "Invalid work page" });
});
const snapshot = z.object({ schema: z.literal("document-operation-review-snapshot-v1"), operation_id: identity, operation_kind: kind, state: z.enum(["active", "needs_review", "completed"]), control_revision: z.number().int().positive().max(Number.MAX_SAFE_INTEGER), reservation_present: z.boolean(), accounting_consistent: z.boolean(), shared_reserved_units: z.number().int().min(1).max(2).nullable(), remaining_shared_units: z.number().int().min(0).max(2).nullable(), recorded_completion: z.boolean(), reconciled_no_save: z.boolean(), external_quiescence_verified: z.literal(false), release_permitted: z.literal(false), snapshot_sha256: digest }).strict().superRefine((value, ctx) => {
  if (value.accounting_consistent ? !value.reservation_present || value.shared_reserved_units === null || value.remaining_shared_units === null || value.remaining_shared_units > value.shared_reserved_units : value.shared_reserved_units !== null || value.remaining_shared_units !== null) ctx.addIssue({ code: "custom", message: "Invalid work accounting" });
  if (value.reconciled_no_save && (value.operation_kind !== "apply" || value.state !== "needs_review" || !value.reservation_present || !value.accounting_consistent || value.shared_reserved_units !== 1 || value.remaining_shared_units !== 0 || value.recorded_completion)) ctx.addIssue({ code: "custom", message: "Invalid no-save recovery status" });
});
const review = z.object({ review_id: identity, operation_id: identity, snapshot_sha256: digest, reason_class: workReason, recorded_at: z.string().datetime({ offset: true }), decision: z.literal("retain_work"), release_permitted: z.literal(false) }).strict();
export const ownerWorkDetail = z.object({ schema: z.literal("owner-document-work-detail-v1"), snapshot, retained_review: review.nullable() }).strict().superRefine((value, ctx) => { if (value.retained_review && value.retained_review.operation_id !== value.snapshot.operation_id) ctx.addIssue({ code: "custom", message: "Invalid review identity" }); });
export const ownerWorkRetained = z.object({ schema: z.literal("owner-document-work-review-retained-v1"), review_id: identity, operation_id: identity, decision: z.literal("retain_work"), release_permitted: z.literal(false), already_recorded: z.boolean() }).strict();
export type OwnerWorkQueue = z.infer<typeof ownerWorkQueue>;
export type OwnerWorkDetail = z.infer<typeof ownerWorkDetail>;
export type OwnerWorkRetained = z.infer<typeof ownerWorkRetained>;
export type OwnerWorkReason = z.infer<typeof workReason>;

export const DOCUMENT_WORK_REVIEW_MESSAGES = {
 read: "We couldn't load document work for review. Refresh its status before continuing.",
 unknown: "We couldn't confirm that the review was recorded. Check its status before submitting another review.",
 viewer: "Your signed-in account changed. Refresh this page before continuing.",
 mfa: "Complete two-factor verification before recording a review.",
 owner: "Platform Owner access or verification could not be confirmed. Sign in again before continuing.",
 changed: "Document work changed or processing is not paused. Refresh its status before continuing.",
 pageChanged: "Document work changed. Refresh the list before continuing.",
} as const;
