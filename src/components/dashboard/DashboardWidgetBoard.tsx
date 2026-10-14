import { useEffect, useRef } from "react";
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
import { personalActionToolSearch } from "@/lib/next-actions/action-context";
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
  const currentScope = useRef({ ready, userId, role });
  currentScope.current = { ready, userId, role };
  const mounted = useRef(false);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  function assertViewer(expected: string | undefined) {
    if (!currentScope.current.ready || currentScope.current.userId !== expected)
      throw new Error("Your sign-in changed. Please try again.");
  }
  const loadPrefs = useServerFn(getDashboardWidgetPrefs);
  const savePrefs = useServerFn(updateDashboardWidgetPrefs);
  const loadCalendar = useServerFn(listCalendarEvents);
  const loadActions = useServerFn(getNextActionsForMe);
  const loadOrganizationActions = useServerFn(getOrganizationWidgetActions);
  const organizationRole = role === "school_admin" || role === "district_admin";

  const prefs = useQuery({
    queryKey: ["dashboard-widgets", role, userId],
    queryFn: async () => {
      assertViewer(userId);
      const result = await loadPrefs({ data: { role, expected_viewer_id: userId } });
      assertViewer(userId);
      return result;
    },
    enabled: ready,
  });
  const widgets = prefs.data?.widgets ?? WIDGETS_BY_ROLE[role];
  const timezone = browserCalendarTimeZone();
  const waitingForOrganization = role === "school_admin" && !organizationId;
  const calendar = useQuery({
    queryKey: ["dashboard-widget-calendar", role, studentId, organizationId, timezone, userId],
    queryFn: async () => {
      assertViewer(userId);
      const result = await loadCalendar({
        data: {
          timezone,
          expected_viewer_id: userId,
          ...(studentId ? { student_id: studentId } : {}),
          ...(organizationId ? { organization_id: organizationId } : {}),
        },
      });
      assertViewer(userId);
      return result;
    },
    enabled:
      ready &&
      !waitingForOrganization &&
      (widgets.includes("calendar") || widgets.includes("meetings")),
    staleTime: 30_000,
  });
  const actions = useQuery({
    queryKey: ["dashboard-widget-actions", role, studentId, userId],
    queryFn: async () => {
      const result = await loadActions({
        data: {
          role: role as "student" | "family" | "educator" | "partner",
          ...(studentId ? { student_id: studentId } : {}),
        },
      });
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
  type SaveIntent = { role: DashboardWidgetRole; viewerId: string; widgets: DashboardWidgetId[] };
  function isCurrentIntent(intent: SaveIntent) {
    const current = currentScope.current;
    return (
      mounted.current &&
      current.ready &&
      current.userId === intent.viewerId &&
      current.role === intent.role
    );
  }
  const save = useMutation({
    mutationFn: (intent: SaveIntent) =>
      savePrefs({
        data: { role: intent.role, widgets: intent.widgets, expected_viewer_id: intent.viewerId },
      }),
    onSuccess: (result, intent) => {
      const queryKey = ["dashboard-widgets", intent.role, intent.viewerId];
      if (!isCurrentIntent(intent)) {
        void queryClient.invalidateQueries({ queryKey, refetchType: "none" });
        return;
      }
      queryClient.setQueryData(queryKey, result);
      toast.success("Dashboard widgets saved.");
    },
    onError: (_error, intent) => {
      void queryClient.invalidateQueries({
        queryKey: ["dashboard-widgets", intent.role, intent.viewerId],
        refetchType: "none",
      });
      if (isCurrentIntent(intent)) toast.error("Could not save dashboard widgets.");
    },
  });
  const savingHere =
    save.isPending && save.variables?.viewerId === userId && save.variables?.role === role;

  function update(next: DashboardWidgetId[]) {
    if (!ready || !userId || savingHere) return;
    save.mutate({ role, viewerId: userId, widgets: next });
  }

  if (!ready) return <p role="status">Loading Your Dashboard Widgets…</p>;
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
          toolSearch: id === "actions" ? personalActionToolSearch(role, studentId) : undefined,
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
      saving={savingHere}
      loadingPrefs={authLoading || prefs.isLoading}
      prefsError={prefs.isError}
    />
  );
}
