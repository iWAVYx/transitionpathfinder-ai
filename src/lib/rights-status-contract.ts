import { z } from "zod";

export const RIGHTS_STATUS_VALUES = [
  "under_18_parent_rights_active",
  "approaching_transfer_of_rights",
  "rights_transferred_to_student",
  "student_shared_decision_making",
  "parent_guardian_authorized_by_student",
  "legal_representative_or_conservator",
  "unknown_needs_review",
] as const;

export type RightsStatus = (typeof RIGHTS_STATUS_VALUES)[number];

export const RIGHTS_STATUS_LABELS: Record<RightsStatus, string> = {
  under_18_parent_rights_active: "Under 18 — parent/guardian rights active",
  approaching_transfer_of_rights: "Approaching transfer of rights (age 17)",
  rights_transferred_to_student: "Rights transferred to student (18+)",
  student_shared_decision_making: "Student shared decision-making",
  parent_guardian_authorized_by_student: "Parent/guardian authorized by student",
  legal_representative_or_conservator: "Legal representative or conservator",
  unknown_needs_review: "Unknown — needs review",
};

export const RIGHTS_READ_UNAVAILABLE = "We couldn't load this rights review. Refresh to check your sign-in, access and the latest status.";
export const RIGHTS_SAVE_UNCONFIRMED = "We couldn't confirm this rights review. Refresh the status before trying again.";
const timestamp = z.string().datetime({ offset: true });
const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine(value => {
  const parsed = new Date(value + "T00:00:00Z");
  return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
});
export const rightsReadRequest = z.object({ student_id: z.string().uuid(), expected_viewer_id: z.string().uuid() }).strict();
export const rightsChanges = z.object({
  current_status: z.enum(RIGHTS_STATUS_VALUES),
  transfer_notice_date: date.nullable().default(null),
  student_authorized_parent_access: z.boolean().default(false),
  decision_making_notes: z.string().max(2000).nullable().default(null),
  legal_representative_notes: z.string().max(2000).nullable().default(null),
}).strict();
export const rightsSaveRequest = rightsReadRequest.extend({
  request_id: z.string().uuid(), expected_revision: z.string().uuid(), ...rightsChanges.shape,
}).strict();
export const rightsHistoryRow = z.object({
  id: z.string().uuid(), student_id: z.string().uuid(), current_status: z.enum(RIGHTS_STATUS_VALUES),
  transfer_notice_date: date.nullable(), student_authorized_parent_access: z.boolean(),
  decision_making_notes: z.string().nullable(), legal_representative_notes: z.string().nullable(),
  reviewed_by_user_id: z.string().uuid().nullable(), created_at: timestamp, updated_at: timestamp,
}).strict();
export type RightsTransferRow = z.infer<typeof rightsHistoryRow>;
export const rightsReadReceipt = z.object({
  schema: z.literal("rights-status-read-v1"), actor_id: z.string().uuid(),
  student: z.object({ id: z.string().uuid(), rights_status: z.enum(RIGHTS_STATUS_VALUES), rights_status_revision: z.string().uuid(),
    transfer_notice_acknowledged_at: timestamp.nullable(), date_of_birth: date.nullable(), age: z.number().nullable() }).strict(),
  history: z.array(rightsHistoryRow).max(20), latest: rightsHistoryRow.nullable(), can_edit: z.boolean(), needs_review: z.boolean(),
}).strict();
export const rightsSaveReceipt = z.object({
  schema: z.literal("rights-status-save-v1"), request_id: z.string().uuid(), actor_id: z.string().uuid(),
  student_id: z.string().uuid(), expected_revision: z.string().uuid(), revision: z.string().uuid(),
  row: rightsHistoryRow, replayed: z.boolean(),
}).strict();
export function parseRightsReadRequest(input: unknown) {
  try { return rightsReadRequest.parse(input); } catch { throw new Error(RIGHTS_READ_UNAVAILABLE); }
}
export function parseRightsSaveRequest(input: unknown) {
  try { return rightsSaveRequest.parse(input); } catch { throw new Error(RIGHTS_SAVE_UNCONFIRMED); }
}
