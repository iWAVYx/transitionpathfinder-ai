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
