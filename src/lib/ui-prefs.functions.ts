import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type ReportViewerPrefs = {
  density?: "compact" | "comfortable";
  outline_open?: boolean;
  collapsed_blocks?: string[];
};

export type AccessibilityPrefs = {
  font_size?: "normal" | "large" | "xlarge";
  high_contrast?: boolean;
  dark_mode?: boolean;
};

const ReportViewerSchema = z.object({
  density: z.enum(["compact", "comfortable"]).optional(),
  outline_open: z.boolean().optional(),
  collapsed_blocks: z.array(z.string().min(1).max(120)).max(200).optional(),
});

const AccessibilitySchema = z.object({
  font_size: z.enum(["normal", "large", "xlarge"]).optional(),
  high_contrast: z.boolean().optional(),
  dark_mode: z.boolean().optional(),
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
  .validator((i: unknown) => ReportViewerSchema.parse(i))
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

export const getAccessibilityPrefs = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<AccessibilityPrefs> => {
    const { supabase, userId } = context;
    const { data, error } = await supabase
      .from("user_ui_prefs")
      .select("accessibility")
      .eq("user_id", userId)
      .maybeSingle();
    if (error) return {};
    const a = (data?.accessibility ?? {}) as AccessibilityPrefs;
    return AccessibilitySchema.parse(a);
  });

export const updateAccessibilityPrefs = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((i: unknown) => AccessibilitySchema.parse(i))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: existing } = await supabase
      .from("user_ui_prefs")
      .select("accessibility")
      .eq("user_id", userId)
      .maybeSingle();
    const current = (existing?.accessibility ?? {}) as AccessibilityPrefs;
    const merged: AccessibilityPrefs = { ...current, ...data };
    const { error } = await supabase
      .from("user_ui_prefs")
      .upsert(
        { user_id: userId, accessibility: merged },
        { onConflict: "user_id" },
      );
    if (error) throw new Error("Could not save accessibility preferences.");
    return { ok: true };
  });
