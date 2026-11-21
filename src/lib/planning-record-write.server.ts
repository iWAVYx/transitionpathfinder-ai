import { z } from "zod";
import { assertExpectedViewer } from "./viewer-intent";
import { progressTimestampKey } from "./progress-contract";
import { PLANNING_WRITE_UNCONFIRMED } from "./planning-records.server";
import { normalizeActionRecord } from "./action-item-values";
const stamp = z
  .string()
  .datetime({ offset: true })
  .refine((s) => (s.match(/\.([0-9]+)/)?.[1].length ?? 0) <= 6);
const rowSchema = z
  .object({
    id: z.string().uuid(),
    student_id: z.string().uuid(),
    title: z.string(),
    status: z.string(),
    category: z.string(),
    created_at: stamp,
    updated_at: stamp,
  })
  .passthrough();
const createReceipt = z
  .object({
    schema: z.literal("planning-record-create-v1"),
    kind: z.enum(["goals", "action_items"]),
    actor_id: z.string().uuid(),
    student_id: z.string().uuid(),
    record_id: z.string().uuid(),
    row: rowSchema,
  })
  .strict();
const statusReceipt = z
  .object({
    schema: z.literal("goal-status-update-v1"),
    actor_id: z.string().uuid(),
    student_id: z.string().uuid(),
    goal_id: z.string().uuid(),
    expected_updated_at: stamp,
    previous_status: z.enum(["not-started", "in-progress", "met", "paused"]),
    changed: z.boolean(),
    row: rowSchema,
  })
  .strict();
type Client = {
  rpc(name: string, args: Record<string, unknown>): PromiseLike<{ data: unknown; error: unknown }>;
};
/** No fallback or retry: an uncertain response requires reading saved records. */
export async function createPlanningRecordAtomically(
  caller: unknown,
  actor: string,
  kind: "goals" | "action_items",
  input: Record<string, unknown> & {
    student_id: string;
    expected_viewer_id?: string;
    request_id?: string;
  },
) {
  assertExpectedViewer(input, actor);
  try {
    const { expected_viewer_id, request_id, student_id, ...fields } = input;
    const record = request_id ?? crypto.randomUUID();
    const result = await (caller as Client).rpc("create_student_planning_record", {
      _kind: kind,
      _student_id: student_id,
      _expected_viewer_id: actor,
      _record_id: record,
      _fields: fields,
    });
    if (result.error !== null) throw Error();
    const receipt = createReceipt.parse(result.data),
      saved = receipt.row;
    const defaults =
      kind === "goals"
        ? {
            category: "general",
            status: "not-started",
            description: null,
            target_date: null,
            measurable_criteria: null,
          }
        : {
            category: "family",
            status: "not_started",
            priority: "medium",
            description: null,
            due_date: null,
            related_goal_area: null,
            pathway_report_id: null,
          };
    const expected = {
      ...defaults,
      ...fields,
      id: record,
      student_id,
      [kind === "goals" ? "created_by" : "created_by_user_id"]: actor,
      ...(kind === "action_items" ? { assigned_to_user_id: null } : {}),
    };
    if (
      receipt.kind !== kind ||
      receipt.actor_id !== actor ||
      receipt.student_id !== student_id ||
      receipt.record_id !== record ||
      Object.entries(expected).some(([key, value]) => saved[key] !== value)
    )
      throw Error();
    return kind === "action_items" ? normalizeActionRecord(saved as any) : saved;
  } catch {
    throw Error(PLANNING_WRITE_UNCONFIRMED);
  }
}
export async function updateGoalStatusAtomically(
  caller: unknown,
  actor: string,
  input: {
    id: string;
    student_id: string;
    expected_updated_at: string;
    expected_viewer_id?: string;
    status: string;
  },
) {
  assertExpectedViewer(input, actor);
  try {
    const result = await (caller as Client).rpc("update_student_goal_status", {
      _student_id: input.student_id,
      _expected_viewer_id: actor,
      _goal_id: input.id,
      _expected_updated_at: input.expected_updated_at,
      _status: input.status,
    });
    if (result.error !== null) throw Error();
    const receipt = statusReceipt.parse(result.data),
      saved = receipt.row;
    const before = progressTimestampKey(input.expected_updated_at),
      after = progressTimestampKey(saved.updated_at);
    if (
      receipt.actor_id !== actor ||
      receipt.student_id !== input.student_id ||
      receipt.goal_id !== input.id ||
      saved.id !== input.id ||
      saved.student_id !== input.student_id ||
      saved.status !== input.status ||
      progressTimestampKey(receipt.expected_updated_at) !== before ||
      receipt.changed !== (receipt.previous_status !== input.status) ||
      (receipt.changed ? after <= before : after !== before)
    )
      throw Error();
    return saved;
  } catch {
    throw Error(PLANNING_WRITE_UNCONFIRMED);
  }
}
