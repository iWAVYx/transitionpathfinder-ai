import { z } from "zod";
import { assertExpectedViewer } from "./viewer-intent";
import { progressTimestampKey } from "./progress-contract";
import type { Meeting } from "./meetings.functions";
export const MEETING_WRITE_UNCONFIRMED =
  "We couldn't confirm this meeting update. Reload the saved meeting before trying again.";
const stamp = z.string().datetime({ offset: true });
const row = z
  .object({
    id: z.string().uuid(),
    student_id: z.string().uuid(),
    title: z.string(),
    status: z.string(),
    updated_at: stamp,
  })
  .passthrough();
type Intent = {
  id: string;
  student_id: string;
  expected_updated_at: string;
  expected_viewer_id?: string;
};
type Client = {
  from(table: string): any;
  rpc(name: string, args: Record<string, unknown>): PromiseLike<{ data: unknown; error: unknown }>;
};
export async function completeMeetingAtomically(
  client: Client,
  actor: string,
  intent: Intent,
  patch: Record<string, unknown>,
) {
  assertExpectedViewer(intent, actor);
  try {
    const result = await client.rpc("complete_student_meeting", {
      _student_id: intent.student_id,
      _expected_viewer_id: actor,
      _meeting_id: intent.id,
      _expected_updated_at: intent.expected_updated_at,
      _patch: patch,
    });
    if (result.error !== null) throw Error();
    const receipt = z
      .object({
        schema: z.literal("meeting-completion-v1"),
        actor_id: z.literal(actor),
        student_id: z.literal(intent.student_id),
        meeting_id: z.literal(intent.id),
        expected_updated_at: stamp,
        row,
        promoted: z.array(
          z
            .object({
              source_id: z.string().uuid(),
              action: z
                .object({
                  id: z.string().uuid(),
                  student_id: z.literal(intent.student_id),
                  created_by_user_id: z.literal(actor),
                  title: z.string(),
                  category: z.enum(["family", "student", "educator", "school", "team"]),
                  priority: z.literal("medium"),
                  status: z.enum(["not_started", "completed"]),
                  assigned_to_user_id: z.null(),
                  pathway_report_id: z.null(),
                  related_goal_area: z.null(),
                })
                .passthrough(),
            })
            .strict(),
        ),
        event: z
          .object({
            id: z.string().uuid(),
            student_id: z.literal(intent.student_id),
            actor_id: z.literal(actor),
            kind: z.literal("meeting.completed"),
            ref_table: z.literal("meetings"),
            ref_id: z.literal(intent.id),
            title: z.string(),
            body: z.string().nullable(),
          })
          .passthrough(),
      })
      .strict()
      .parse(result.data);
    if (
      receipt.row.id !== intent.id ||
      receipt.row.student_id !== intent.student_id ||
      receipt.row.status !== "completed" ||
      progressTimestampKey(receipt.expected_updated_at) !==
        progressTimestampKey(intent.expected_updated_at) ||
      progressTimestampKey(receipt.row.updated_at) <=
        progressTimestampKey(intent.expected_updated_at) ||
      Object.entries(patch).some(([k, v]) => receipt.row[k] !== v)
    )
      throw Error();
    const count = receipt.promoted.length;
    if (
      new Set(receipt.promoted.map((p) => p.source_id)).size !== count ||
      new Set(receipt.promoted.map((p) => p.action.id)).size !== count ||
      receipt.event.title !== `Meeting completed: ${receipt.row.title}` ||
      receipt.event.body !==
        (count ? `${count} follow-up action item${count === 1 ? "" : "s"} added.` : null)
    )
      throw Error();
    return { ok: true as const, promoted: count, meeting: receipt.row as unknown as Meeting };
  } catch {
    throw Error(MEETING_WRITE_UNCONFIRMED);
  }
}
/** Single caller-RLS conditional update; completion must use its composed transaction. */
export async function saveMeetingFields(
  client: Client,
  actor: string,
  intent: Intent,
  patch: Record<string, unknown>,
) {
  assertExpectedViewer(intent, actor);
  try {
    if (!Object.keys(patch).length || patch.status === "completed") throw Error();
    const result = await client
      .from("meetings")
      .update(patch)
      .eq("id", intent.id)
      .eq("student_id", intent.student_id)
      .eq("updated_at", intent.expected_updated_at)
      .select("*")
      .single();
    if (result.error !== null) throw Error();
    const saved = row.parse(result.data);
    if (
      saved.id !== intent.id ||
      saved.student_id !== intent.student_id ||
      progressTimestampKey(saved.updated_at) <= progressTimestampKey(intent.expected_updated_at) ||
      Object.entries(patch).some(([k, v]) => k === "scheduled_at" && typeof v === "string" && typeof saved[k] === "string" ? progressTimestampKey(saved[k] as string) !== progressTimestampKey(v) : saved[k] !== v)
    )
      throw Error();
    return { ok: true as const, meeting: saved as unknown as Meeting };
  } catch {
    throw Error(MEETING_WRITE_UNCONFIRMED);
  }
}
