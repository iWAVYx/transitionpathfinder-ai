import { z } from "zod";
import { assertExpectedViewer } from "./viewer-intent";
import { normalizeActionRecord, isActionItemComplete } from "./action-item-values";
import { progressTimestampKey } from "./progress-contract";
import { PLANNING_WRITE_UNCONFIRMED } from "./planning-records.server";
import type { StudentActionItem } from "./action-items.functions";
const stamp = z
  .string()
  .datetime({ offset: true })
  .refine((s) => (s.match(/\.([0-9]+)/)?.[1].length ?? 0) <= 6);
const row = z
  .object({
    id: z.string().uuid(),
    student_id: z.string().uuid(),
    title: z.string(),
    status: z.string(),
    category: z.string(),
    updated_at: stamp,
    pathway_report_id: z.string().uuid().nullable(),
  })
  .passthrough();
const receipt = z
  .object({
    schema: z.literal("action-item-update-v1"),
    actor_id: z.string().uuid(),
    student_id: z.string().uuid(),
    action_id: z.string().uuid(),
    expected_updated_at: stamp,
    previous_status: z.string(),
    changed: z.boolean(),
    row,
    event_id: z.string().uuid().nullable(),
    stale_report_id: z.string().uuid().nullable(),
    inputs_stale_at: stamp.nullable(),
  })
  .strict();
type Intent = {
  id: string;
  student_id: string;
  expected_updated_at: string;
  expected_viewer_id?: string;
};
export async function updateActionAtomically(
  caller: unknown,
  actor: string,
  intent: Intent,
  patch: Record<string, unknown>,
) {
  assertExpectedViewer(intent, actor);
  try {
    const client = caller as {
      rpc: (
        name: string,
        args: Record<string, unknown>,
      ) => PromiseLike<{ data: unknown; error: unknown }>;
    };
    const result = await client.rpc("update_student_action_atomic", {
      _student_id: intent.student_id,
      _expected_viewer_id: actor,
      _action_id: intent.id,
      _expected_updated_at: intent.expected_updated_at,
      _patch: patch,
    });
    if (result.error !== null) throw Error();
    const saved = receipt.parse(result.data);
    if (
      saved.actor_id !== actor ||
      saved.student_id !== intent.student_id ||
      saved.action_id !== intent.id ||
      saved.row.id !== intent.id ||
      saved.row.student_id !== intent.student_id ||
      progressTimestampKey(saved.expected_updated_at) !==
        progressTimestampKey(intent.expected_updated_at) ||
      Object.entries(patch).some(([key, value]) => saved.row[key] !== value)
    )
      throw Error();
    const previous = progressTimestampKey(intent.expected_updated_at),
      next = progressTimestampKey(saved.row.updated_at);
    if (saved.changed ? next <= previous : next !== previous) throw Error();
    const completed =
      saved.changed &&
      isActionItemComplete(saved.row.status) &&
      !isActionItemComplete(saved.previous_status);
    if (completed) {
      if (
        !saved.event_id ||
        saved.stale_report_id !== saved.row.pathway_report_id ||
        !!saved.inputs_stale_at !== !!saved.row.pathway_report_id
      )
        throw Error();
    } else if (
      saved.event_id !== null ||
      saved.stale_report_id !== null ||
      saved.inputs_stale_at !== null
    )
      throw Error();
    return normalizeActionRecord(saved.row as unknown as StudentActionItem);
  } catch {
    throw Error(PLANNING_WRITE_UNCONFIRMED);
  }
}
