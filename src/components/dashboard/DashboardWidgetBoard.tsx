import { useAuth } from "@/hooks/use-auth";
import { DashboardWidgetBoardView, type WidgetContent } from "./DashboardWidgetBoardView";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { browserCalendarTimeZone, calendarDayForInstant } from "@/lib/calendar-day";
import { listCalendarEvents } from "@/lib/calendar.functions";
import {
  widgetEventDestination,
  widgetLinkDestination,
} from "@/lib/dashboard/dashboard-widget-navigation";
import {
  WIDGETS_BY_ROLE,
  getDashboardWidgetPrefs,
  updateDashboardWidgetPrefs,
  type DashboardWidgetId,
  type DashboardWidgetRole,
} from "@/lib/dashboard/dashboard-widget-prefs.functions";
import { getNextActionsForMe } from "@/lib/next-actions/next-actions.functions";

import { getOrganizationWidgetActions } from "@/lib/dashboard/organization-widget-actions.functions";

type Props = {
  role: DashboardWidgetRole;
  studentId?: string;
  organizationId?: string;
};

const OPTIONS: Array<{ id: DashboardWidgetId; title: string }> = [
  { id: "actions", title: "Next actions" },
  { id: "calendar", title: "Upcoming calendar" },
  { id: "meetings", title: "Meetings" },
];

function safeRoute(path: string | undefined) {
  return path?.startsWith("/") && !path.startsWith("//") ? path : "/dashboard";
}

/** Optional live summaries finish the dashboard below the tool cards. */
export function DashboardWidgetBoard({ role, studentId, organizationId }: Props) {
  const queryClient = useQueryClient();
  const { user, loading: authLoading } = useAuth();
  const userId = user?.id;
  const ready = !!userId && !authLoading;
  const loadPrefs = useServerFn(getDashboardWidgetPrefs);
  const savePrefs = useServerFn(updateDashboardWidgetPrefs);
  const loadCalendar = useServerFn(listCalendarEvents);
  const loadActions = useServerFn(getNextActionsForMe);
  const loadOrganizationActions = useServerFn(getOrganizationWidgetActions);
  const organizationRole = role === "school_admin" || role === "district_admin";

  const prefs = useQuery({
    queryKey: ["dashboard-widgets", role, userId],
    queryFn: () => loadPrefs({ data: { role } }),
    enabled: ready,
  });
  const widgets = prefs.data?.widgets ?? WIDGETS_BY_ROLE[role];
  const timezone = browserCalendarTimeZone();
  const waitingForOrganization = role === "school_admin" && !organizationId;
  const calendar = useQuery({
    queryKey: ["dashboard-widget-calendar", role, studentId, organizationId, timezone, userId],
    queryFn: () =>
      loadCalendar({
        data: {
          timezone,
          ...(studentId ? { student_id: studentId } : {}),
          ...(organizationId ? { organization_id: organizationId } : {}),
        },
      }),
    enabled:
      !waitingForOrganization && (widgets.includes("calendar") || widgets.includes("meetings")),
    staleTime: 30_000,
  });
  const actions = useQuery({
    queryKey: ["dashboard-widget-actions", role, studentId, userId],
    queryFn: async () => {
      const result = await loadActions({ data: { role: role as "student" | "family" | "educator" | "partner", ...(studentId ? {student_id:studentId} : {}) } });
      if (result.viewer_id !== userId) throw new Error("Action preview could not be loaded.");
      return result;
    },
    enabled: ready && !organizationRole && widgets.includes("actions"),
    staleTime: 30_000,
  });
  const organizationActions = useQuery({
    queryKey: ["dashboard-widget-organization-actions", role, organizationId, userId],
    queryFn: async () => {
      const result = await loadOrganizationActions({
        data: { role: role as "school_admin" | "district_admin", organization_id: organizationId! },
      });
      if (result.viewer_id !== userId) throw new Error("Action preview could not be loaded.");
      return result;
    },
    enabled: ready && organizationRole && !!organizationId && widgets.includes("actions"),
    staleTime: 30_000,
  });
  const save = useMutation({
    mutationFn: (next: DashboardWidgetId[]) => savePrefs({ data: { role, widgets: next } }),
    onSuccess: (result) => {
      queryClient.setQueryData(["dashboard-widgets", role, userId], result);
      toast.success("Dashboard widgets saved.");
    },
    onError: () => toast.error("Could not save dashboard widgets."),
  });

  function update(next: DashboardWidgetId[]) {
    save.mutate(next);
  }

  const today = calendarDayForInstant(new Date().toISOString(), timezone);
  const upcoming = (waitingForOrganization ? [] : (calendar.data?.events ?? []))
    .filter((event) => event.event_date >= today && event.event_status !== "cancelled")
    .sort((a, b) => a.event_date.localeCompare(b.event_date));

  const data = Object.fromEntries(
    OPTIONS.map(({ id }) => {
      const calendarTool = role === "school_admin" ? "/school/calendar" : "/calendar";
      const toolPath =
        id === "actions" ? "/next-actions" : id === "calendar" ? calendarTool : "/meetings";
      const entries =
        id === "actions"
          ? organizationRole
            ? !organizationId
              ? []
              : (organizationActions.data?.entries ?? []).map(entry => ({ ...entry, to: widgetLinkDestination(role, entry.to) }))
            : (actions.data?.active ?? [])
                .filter(
                  (action) => !studentId || !action.studentId || action.studentId === studentId,
                )
                .slice(0, 5)
                .map((action) => ({
                  id: action.id,
                  title: action.title,
                  detail: action.dueLabel ?? action.reason,
                  to: widgetLinkDestination(role, safeRoute(action.ctaRoute)),
                }))
          : upcoming
              .filter((event) => id === "calendar" || event.kind === "meeting")
              .slice(0, 5)
              .map((event) => ({
                id: event.id,
                title: event.title,
                detail: new Intl.DateTimeFormat("en-US", {
                  month: "short",
                  day: "numeric",
                  timeZone: "UTC",
                }).format(new Date(`${event.event_date}T12:00:00Z`)),
                to: widgetEventDestination(role, id === "meetings" ? "meetings" : "calendar"),
              }));
      return [
        id,
        {
          entries,
          notice:
            id === "actions" && organizationRole && !organizationId
              ? `A selected ${role === "school_admin" ? "school" : "district"} is needed to show actions.`
              : id !== "actions" && waitingForOrganization
                ? "A selected school is needed to show calendar events."
                : undefined,
          windowLabel:
            id === "actions" &&
            organizationRole &&
            organizationId &&
            organizationActions.data &&
            !organizationActions.isError
              ? `Showing ${organizationActions.data.entries.length} of ${organizationActions.data.total} recorded actions with supported ${role === "school_admin" ? "school" : "district"} tools.`
              : id === "actions" && !organizationRole && actions.data && !actions.isError
                ? "Recent personal action preview; up to five matching items."
                : undefined,
          loading:
            id === "actions"
              ? organizationRole
                ? !!organizationId && organizationActions.isLoading
                : actions.isLoading
              : calendar.isLoading,
          error:
            id === "actions"
              ? organizationRole
                ? !!organizationId && organizationActions.isError
                : actions.isError
              : !waitingForOrganization && calendar.isError,
          retry: () => {
            void (id === "actions"
              ? organizationRole
                ? organizationActions.refetch()
                : actions.refetch()
              : calendar.refetch());
          },
          toolDestination:
            id === "actions" && organizationRole ? null : widgetLinkDestination(role, toolPath),
        },
      ];
    }),
  ) as Record<DashboardWidgetId, WidgetContent>;
  return (
    <DashboardWidgetBoardView
      role={role}
      widgets={widgets}
      available={WIDGETS_BY_ROLE[role]}
      data={data}
      update={update}
      saving={save.isPending}
      loadingPrefs={authLoading || prefs.isLoading}
      prefsError={prefs.isError}
    />
  );
}
