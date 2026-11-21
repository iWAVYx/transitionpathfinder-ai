import { z } from "zod";
import { assertExpectedViewer } from "./viewer-intent";
import { progressTimestampKey } from "./progress-contract";
import { PLANNING_WRITE_UNCONFIRMED } from "./planning-records.server";
const stamp = z
  .string()
  .datetime({ offset: true })
  .refine((s) => (s.match(/\.([0-9]+)/)?.[1].length ?? 0) <= 6);
const receipt = z
  .object({
    schema: z.literal("planning-record-delete-v1"),
    kind: z.enum(["goals", "action_items"]),
    actor_id: z.string().uuid(),
    student_id: z.string().uuid(),
    record_id: z.string().uuid(),
    expected_updated_at: stamp,
    deleted: z.literal(true),
    deleted_row: z
      .object({
        id: z.string().uuid(),
        student_id: z.string().uuid(),
        title: z.string(),
        status: z.string(),
        category: z.string(),
        updated_at: stamp,
      })
      .passthrough(),
  })
  .strict();
type Intent = {
  id: string;
  student_id: string;
  expected_updated_at: string;
  expected_viewer_id?: string;
};
/** One confirmed current-proof delete; missing/lost replies never trigger retries. */
export async function deletePlanningRecordAtomically(
  caller: unknown,
  actor: string,
  kind: "goals" | "action_items",
  intent: Intent,
) {
  assertExpectedViewer(intent, actor);
  try {
    const client = caller as {
      rpc: (
        name: string,
        args: Record<string, unknown>,
      ) => PromiseLike<{ data: unknown; error: unknown }>;
    };
    const result = await client.rpc("delete_student_planning_record", {
      _kind: kind,
      _student_id: intent.student_id,
      _expected_viewer_id: actor,
      _record_id: intent.id,
      _expected_updated_at: intent.expected_updated_at,
    });
    if (result.error !== null) throw Error();
    const removed = receipt.parse(result.data);
    if (
      removed.kind !== kind ||
      removed.actor_id !== actor ||
      removed.student_id !== intent.student_id ||
      removed.record_id !== intent.id ||
      removed.deleted_row.id !== intent.id ||
      removed.deleted_row.student_id !== intent.student_id ||
      progressTimestampKey(removed.expected_updated_at) !==
        progressTimestampKey(intent.expected_updated_at) ||
      progressTimestampKey(removed.deleted_row.updated_at) !==
        progressTimestampKey(intent.expected_updated_at)
    )
      throw Error();
    return { ok: true as const };
  } catch {
    throw Error(PLANNING_WRITE_UNCONFIRMED);
  }
}
