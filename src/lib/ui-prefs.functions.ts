import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type ReportViewerPrefs = {
  density?: "compact" | "comfortable";
  outline_open?: boolean;
  collapsed_blocks?: string[];
};

const ReportViewerSchema = z.object({
  density: z.enum(["compact", "comfortable"]).optional(),
  outline_open: z.boolean().optional(),
  collapsed_blocks: z.array(z.string().min(1).max(120)).max(200).optional(),
});

export const getReportViewerPrefs = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<ReportViewerPrefs> => {
    const { supabase, userId } = context;
    const { data, error } = await supabase
      .from("user_ui_prefs")
      .select("report_viewer")
      .eq("user_id", userId)
      .maybeSingle();
    if (error) return {};
    const rv = (data?.report_viewer ?? {}) as ReportViewerPrefs;
    return ReportViewerSchema.parse(rv);
  });

export const updateReportViewerPrefs = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => ReportViewerSchema.parse(i))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: existing } = await supabase
      .from("user_ui_prefs")
      .select("report_viewer")
      .eq("user_id", userId)
      .maybeSingle();
    const current = (existing?.report_viewer ?? {}) as ReportViewerPrefs;
    const merged: ReportViewerPrefs = { ...current, ...data };
    const { error } = await supabase
      .from("user_ui_prefs")
      .upsert(
        { user_id: userId, report_viewer: merged },
        { onConflict: "user_id" },
      );
    if (error) throw new Error("Could not save view preferences.");
    return { ok: true };
  });
