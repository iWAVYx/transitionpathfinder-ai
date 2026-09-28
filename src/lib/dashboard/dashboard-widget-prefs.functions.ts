import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const dashboardRoleSchema = z.enum([
  "family",
  "student",
  "educator",
  "school_admin",
  "district_admin",
  "partner",
]);
export type DashboardWidgetRole = z.infer<typeof dashboardRoleSchema>;

export const dashboardWidgetSchema = z.enum(["actions", "calendar", "meetings"]);
export type DashboardWidgetId = z.infer<typeof dashboardWidgetSchema>;

export const WIDGETS_BY_ROLE: Record<DashboardWidgetRole, DashboardWidgetId[]> = {
  family: ["actions", "calendar", "meetings"],
  student: ["actions", "calendar"],
  educator: ["actions", "calendar", "meetings"],
  school_admin: ["actions", "calendar"],
  district_admin: ["actions"],
  partner: ["actions"],
};

const widgetListSchema = z.array(dashboardWidgetSchema).max(3).refine(
  (widgets) => new Set(widgets).size === widgets.length,
  "Choose each widget only once.",
);
// Parse each role independently so an older or malformed preference cannot
// leak a widget from one role into another role's dashboard.
export function widgetsForRole(value: unknown, role: DashboardWidgetRole): DashboardWidgetId[] {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return [...WIDGETS_BY_ROLE[role]];
  }
  const raw = (value as Record<string, unknown>)[role];
  const parsed = widgetListSchema.safeParse(raw);
  return parsed.success && parsed.data.every((widget) => WIDGETS_BY_ROLE[role].includes(widget))
    ? parsed.data
    : [...WIDGETS_BY_ROLE[role]];
}

export const getDashboardWidgetPrefs = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) => z.object({ role: dashboardRoleSchema }).parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: row, error } = await supabase
      .from("user_ui_prefs")
      .select("dashboard_layout")
      .eq("user_id", userId)
      .maybeSingle();
    if (error) throw new Error("Could not load dashboard preferences.");
    return { widgets: widgetsForRole(row?.dashboard_layout, data.role) };
  });

export const updateDashboardWidgetPrefs = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) =>
    z.object({ role: dashboardRoleSchema, widgets: widgetListSchema })
      .refine(({ role, widgets }) => widgets.every((widget) => WIDGETS_BY_ROLE[role].includes(widget)),
        "Widget unavailable for this role.")
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: existing, error: readError } = await supabase
      .from("user_ui_prefs")
      .select("dashboard_layout")
      .eq("user_id", userId)
      .maybeSingle();
    if (readError) throw new Error("Could not load dashboard preferences.");

    const current = existing?.dashboard_layout;
    const layout: Record<string, DashboardWidgetId[]> = {};
    if (current && typeof current === "object" && !Array.isArray(current)) {
      for (const candidate of dashboardRoleSchema.options) {
        const parsed = widgetListSchema.safeParse((current as Record<string, unknown>)[candidate]);
        if (parsed.success) layout[candidate] = parsed.data;
      }
    }
    layout[data.role] = data.widgets;
    const { error } = await supabase.from("user_ui_prefs").upsert(
      { user_id: userId, dashboard_layout: layout },
      { onConflict: "user_id" },
    );
    if (error) throw new Error("Could not save dashboard preferences.");
    return { widgets: data.widgets };
  });
