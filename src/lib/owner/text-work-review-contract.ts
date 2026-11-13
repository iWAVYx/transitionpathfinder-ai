import { z } from "zod";
const id = z.string().uuid().transform(value => value.toLowerCase());
const control = z.number().int().positive().max(Number.MAX_SAFE_INTEGER);
export const TEXT_WORK_READ_MESSAGE = "We couldn't confirm the text tasks. Refresh their status before continuing.";
export const textWorkQueueInput = z.object({ expected_viewer_id: id, after_operation_id: id.optional() }).strict();
export const textWorkDetailInput = z.object({ expected_viewer_id: id, operation_id: id }).strict();
export const textWorkQueue = z.object({ schema: z.literal("owner-text-work-queue-v1"), namespace: z.literal("attached_text"), control_revision: control, paused: z.literal(true), items: z.array(z.object({ operation_id: id, state: z.enum(["active", "needs_review"]) }).strict()).max(25), has_more: z.boolean(), next_cursor: id.nullable(), external_quiescence_verified: z.literal(false), release_permitted: z.literal(false) }).strict().superRefine((v, ctx) => {
  const ids = v.items.map(x => x.operation_id);
  if (new Set(ids).size !== ids.length || ids.some((x, n) => n > 0 && x <= ids[n-1]) || (v.has_more ? ids.length !== 25 || v.next_cursor !== ids.at(-1) : v.next_cursor !== null)) ctx.addIssue({ code: "custom", message: "Invalid text task page" });
});
export const TEXT_HOLD_LABELS = { provider_uncertain: "Service Response Unconfirmed", save_uncertain: "Saved Result Unconfirmed", source_changed: "Source Information Changed" } as const;
export const textWorkDetail = z.object({ schema: z.literal("owner-text-work-detail-v1"), namespace: z.literal("attached_text"), operation_id: id, control_revision: control, state: z.enum(["active", "needs_review", "completed"]), hold_reason: z.enum(["provider_uncertain", "save_uncertain", "source_changed"]).nullable(), remaining_shared_units: z.union([z.literal(0),z.literal(1)]), recorded_completion: z.boolean(), external_quiescence_verified: z.literal(false), release_permitted: z.literal(false) }).strict().superRefine((v, ctx) => {
  if (v.state === "completed" ? !v.recorded_completion || v.remaining_shared_units !== 0 || v.hold_reason !== null : v.recorded_completion || v.remaining_shared_units !== 1 || (v.state === "active" ? v.hold_reason !== null : v.hold_reason === null)) ctx.addIssue({ code: "custom", message: "Inconsistent text work status" });
});
export type TextWorkQueue = z.infer<typeof textWorkQueue>;
export type TextWorkDetail = z.infer<typeof textWorkDetail>;
