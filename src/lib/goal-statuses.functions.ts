import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const StatusEnum = z.enum(["not-started", "in-progress", "met"]);

export const listGoalStatuses = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { reportId: string }) =>
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
  .inputValidator((input: { reportId: string; itemId: string; status: string }) =>
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
