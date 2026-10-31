import type { DashboardWidgetRole } from "@/lib/dashboard/dashboard-widget-prefs.functions";

// These dashboards already open the full calendar from their preview-first
// feature card. Widget summaries must not create a second link to that route.
const CALENDAR_FEATURE_ROUTE: Partial<Record<DashboardWidgetRole, string>> = {
  family: "/calendar",
  student: "/calendar",
  educator: "/calendar",
  school_admin: "/school/calendar",
};

export function widgetLinkDestination(role: DashboardWidgetRole, destination: string): string | null {
  return destination === CALENDAR_FEATURE_ROUTE[role] ? null : destination;
}

/** Widget category, rather than event kind, determines the destination. */
export function widgetEventDestination(role: DashboardWidgetRole, widget: "calendar" | "meetings"): string | null {
  const path = widget === "calendar" || role === "school_admin" || role === "student"
    ? role === "school_admin" ? "/school/calendar" : "/calendar"
    : "/meetings";
  return widgetLinkDestination(role, path);
}
