import { DashboardWidgetBoardView, type WidgetContent } from "./DashboardWidgetBoardView";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { listCalendarEvents } from "@/lib/calendar.functions";
import { widgetEventDestination, widgetLinkDestination } from "@/lib/dashboard/dashboard-widget-navigation";
import {
  WIDGETS_BY_ROLE,
  getDashboardWidgetPrefs,
  updateDashboardWidgetPrefs,
  type DashboardWidgetId,
  type DashboardWidgetRole,
} from "@/lib/dashboard/dashboard-widget-prefs.functions";
import { getNextActionsForMe } from "@/lib/next-actions/next-actions.functions";

type Props = {
  role: DashboardWidgetRole;
  studentId?: string;
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
export function DashboardWidgetBoard({ role, studentId }: Props) {
  const queryClient = useQueryClient();
  const loadPrefs = useServerFn(getDashboardWidgetPrefs);
  const savePrefs = useServerFn(updateDashboardWidgetPrefs);
  const loadCalendar = useServerFn(listCalendarEvents);
  const loadActions = useServerFn(getNextActionsForMe);

  const prefs = useQuery({
    queryKey: ["dashboard-widgets", role],
    queryFn: () => loadPrefs({ data: { role } }),
  });
  const widgets = prefs.data?.widgets ?? WIDGETS_BY_ROLE[role];
  const calendar = useQuery({
    queryKey: ["dashboard-widget-calendar", role, studentId],
    queryFn: () => loadCalendar({ data: studentId ? { student_id: studentId } : {} }),
    enabled: widgets.includes("calendar") || widgets.includes("meetings"),
    staleTime: 30_000,
  });
  const actions = useQuery({
    queryKey: ["next-actions", "me"],
    queryFn: () => loadActions(),
    enabled: widgets.includes("actions"),
    staleTime: 30_000,
  });
  const save = useMutation({
    mutationFn: (next: DashboardWidgetId[]) => savePrefs({ data: { role, widgets: next } }),
    onSuccess: (result) => {
      queryClient.setQueryData(["dashboard-widgets", role], result);
      toast.success("Dashboard widgets saved.");
    },
    onError: () => toast.error("Could not save dashboard widgets."),
  });

  function update(next: DashboardWidgetId[]) {
    save.mutate(next);
  }

  const today = new Date().toISOString().slice(0, 10);
  const upcoming = (calendar.data?.events ?? [])
    .filter((event) => event.event_date >= today && event.event_status !== "cancelled")
    .sort((a, b) => a.event_date.localeCompare(b.event_date));

  const data = Object.fromEntries(
    OPTIONS.map(({ id }) => {
      const calendarTool = role === "school_admin" ? "/school/calendar" : "/calendar";
      const toolPath =
        id === "actions" ? "/next-actions" : id === "calendar" ? calendarTool : "/meetings";
      const entries =
        id === "actions"
          ? (actions.data?.active ?? [])
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
          loading: id === "actions" ? actions.isLoading : calendar.isLoading,
          error: id === "actions" ? actions.isError : calendar.isError,
          toolDestination: widgetLinkDestination(role, toolPath),
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
      loadingPrefs={prefs.isLoading}
      prefsError={prefs.isError}
    />
  );
}
