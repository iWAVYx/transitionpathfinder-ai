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
      return { statuses: Object.fromEntries(entries) };
    } catch {
      throw new Error("We couldn't load all your saved progress. Please reload it.");
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
    } catch {
      throw new Error(
        "We couldn't confirm this progress update. Reload your saved progress before trying again.",
      );
    }
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
