import { z } from "zod";
export const GOAL_PROGRESS_UNAVAILABLE = "We couldn't load all your saved progress. Please reload it.";
export const GOAL_PROGRESS_LINK_REQUIRED = "Link this report to a student you can access before using saved progress.";
type Reply = { data: unknown; error: unknown };
type Client = { rpc(name: string, args: Record<string, unknown>): PromiseLike<Reply> };
export async function assertGoalProgressAccess(caller: unknown, actor: string, report: string) {
  try {
    const result = await (caller as Client).rpc("can_read_report_goal_progress", { _report_id: report, _expected_viewer_id: actor });
    if ((result.error as { code?: string } | null)?.code === "PT409") throw new Error(GOAL_PROGRESS_LINK_REQUIRED);
    if (result.error !== null || result.data !== true) throw new Error();
  } catch (error) { throw new Error(error instanceof Error && error.message === GOAL_PROGRESS_LINK_REQUIRED ? GOAL_PROGRESS_LINK_REQUIRED : GOAL_PROGRESS_UNAVAILABLE); }
}
const count = z.number().int().nonnegative().safe();
const totalsReceipt = z.object({ schema: z.literal("goal-progress-totals-v1"), actor_id: z.string().min(1), report_ids: z.array(z.string().uuid()).max(500),
  total: count, inProgress: count, met: count, notStarted: count }).strict();
export async function readGoalProgressTotals(caller: unknown, actor: string, reports: string[]) {
  const ids = [...new Set(reports.map(value => value.toLowerCase()))].sort();
  if (ids.length === 0) return { total: 0, inProgress: 0, met: 0, notStarted: 0 };
  try {
    const result = await (caller as Client).rpc("summarize_own_report_goal_progress", { _report_ids: ids, _expected_viewer_id: actor });
    if ((result.error as { code?: string } | null)?.code === "PT409") throw new Error(GOAL_PROGRESS_LINK_REQUIRED);
    if (result.error !== null) throw new Error(); const receipt = totalsReceipt.parse(result.data);
    if (receipt.actor_id !== actor || JSON.stringify(receipt.report_ids) !== JSON.stringify(ids) || receipt.total !== receipt.inProgress + receipt.met + receipt.notStarted) throw new Error();
    return { total: receipt.total, inProgress: receipt.inProgress, met: receipt.met, notStarted: receipt.notStarted };
  } catch (error) { throw new Error(error instanceof Error && error.message === GOAL_PROGRESS_LINK_REQUIRED ? GOAL_PROGRESS_LINK_REQUIRED : GOAL_PROGRESS_UNAVAILABLE); }
}
