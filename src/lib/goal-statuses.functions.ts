import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const StatusEnum = z.enum(["not-started", "in-progress", "met"]);

export const listGoalStatuses = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: { reportId: string }) =>
    z.object({ reportId: z.string().uuid() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: rows, error } = await supabase
      .from("goal_statuses")
      .select("item_id, status")
      .eq("user_id", userId)
      .eq("report_id", data.reportId);
    if (error) throw new Error(error.message);
    const map: Record<string, "not-started" | "in-progress" | "met"> = {};
    for (const r of rows ?? []) map[r.item_id] = r.status as never;
    return { statuses: map };
  });

export const upsertGoalStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: { reportId: string; itemId: string; status: string }) =>
    z
      .object({
        reportId: z.string().uuid(),
        itemId: z.string().min(1).max(200),
        status: StatusEnum,
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { error } = await supabase
      .from("goal_statuses")
      .upsert(
        {
          user_id: userId,
          report_id: data.reportId,
          item_id: data.itemId,
          status: data.status,
        },
        { onConflict: "user_id,report_id,item_id" },
      );
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });

/**
 * Aggregate every goal status the current user owns across the given reports.
 * RLS already scopes by `auth.uid()` AND verifies student access on each row,
 * so this is safe to call with whatever report ids the dashboard loaded.
 * Returns 0 totals when no reports are supplied — never throws on empty input.
 */
export const summarizeGoalStatuses = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: { reportIds: string[] }) =>
    z
      .object({
        reportIds: z.array(z.string().uuid()).max(500),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    if (data.reportIds.length === 0) {
      return { total: 0, inProgress: 0, met: 0, notStarted: 0 };
    }
    const { supabase, userId } = context;
    const { data: rows, error } = await supabase
      .from("goal_statuses")
      .select("status")
      .eq("user_id", userId)
      .in("report_id", data.reportIds);
    if (error) throw new Error(error.message);
    let inProgress = 0;
    let met = 0;
    let notStarted = 0;
    for (const r of rows ?? []) {
      if (r.status === "in-progress") inProgress += 1;
      else if (r.status === "met") met += 1;
      else if (r.status === "not-started") notStarted += 1;
    }
    return { total: (rows ?? []).length, inProgress, met, notStarted };
  });
