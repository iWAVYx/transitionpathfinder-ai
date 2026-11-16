import { assertGoalProgressAccess, readGoalProgressTotals, GOAL_PROGRESS_LINK_REQUIRED, GOAL_PROGRESS_UNAVAILABLE } from "./goal-progress-read.server";
import { assertExpectedViewer, viewerIntentSchema } from "./viewer-intent";
import { readReportPages } from "./report-query-pages";
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const StatusEnum = z.enum(["not-started", "in-progress", "met"]);

export const listGoalStatuses = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) =>
    z.object({ reportId: z.string().uuid(), ...viewerIntentSchema.shape }).parse(input),
  )
  .handler(async ({ data, context }) => {
    assertExpectedViewer(data, context.userId);
    const { supabase, userId } = context;
    try {
      await assertGoalProgressAccess(supabase, userId, data.reportId);
      const rows = await readReportPages((from, to) => supabase
        .from("goal_statuses")
        .select("id, item_id, status", { count: "exact" })
        .eq("user_id", userId)
        .eq("report_id", data.reportId)
        .order("id", { ascending: true })
        .range(from, to));
      const entrySchema = z.object({ item_id: z.string().min(1).max(200), status: StatusEnum });
      const seen = new Set<string>();
      const entries = rows.map(row => {
        const entry = entrySchema.parse(row);
        if (seen.has(entry.item_id)) throw new Error("Duplicate progress entry.");
        seen.add(entry.item_id);
        return [entry.item_id, entry.status] as const;
      });
      await assertGoalProgressAccess(supabase, userId, data.reportId);
      return { statuses: Object.fromEntries(entries) };
    } catch (error) {
      throw new Error(error instanceof Error && error.message === GOAL_PROGRESS_LINK_REQUIRED ? GOAL_PROGRESS_LINK_REQUIRED : GOAL_PROGRESS_UNAVAILABLE);
    }
  });

export const upsertGoalStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) =>
    z
      .object({
        reportId: z.string().uuid(),
        itemId: z.string().min(1).max(200),
        status: StatusEnum,
        ...viewerIntentSchema.shape,
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    assertExpectedViewer(data, context.userId);
    const { supabase, userId } = context;
    try {
      await assertGoalProgressAccess(supabase, userId, data.reportId);
      const { data: saved, error } = await supabase
        .from("goal_statuses")
        .upsert(
          {
            user_id: userId,
            report_id: data.reportId,
            item_id: data.itemId,
            status: data.status,
          },
          { onConflict: "user_id,report_id,item_id" },
        )
        .select("user_id,report_id,item_id,status")
        .single();
      if ((error as { code?: string } | null)?.code === "PT409") throw new Error(GOAL_PROGRESS_LINK_REQUIRED);
      if (
        error ||
        !saved ||
        saved.user_id !== userId ||
        saved.report_id !== data.reportId ||
        saved.item_id !== data.itemId ||
        saved.status !== data.status
      )
        throw new Error(
          "We couldn't confirm this progress update. Reload your saved progress before trying again.",
        );
    } catch (error) {
      if (error instanceof Error && error.message === GOAL_PROGRESS_LINK_REQUIRED) throw new Error(GOAL_PROGRESS_LINK_REQUIRED);
      throw new Error(
        "We couldn't confirm this progress update. Reload your saved progress before trying again.",
      );
    }
    return { ok: true as const };
  });

/** Aggregate all eligible personal goal rows in one caller-RLS database snapshot. */
export const summarizeGoalStatuses = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) => z.object({ reportIds: z.array(z.string().uuid()).max(500), ...viewerIntentSchema.shape }).parse(input))
  .handler(({ data, context }) => {
    assertExpectedViewer(data, context.userId);
    return readGoalProgressTotals(context.supabase, context.userId, data.reportIds);
  });
