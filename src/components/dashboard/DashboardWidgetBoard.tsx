import { Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowDown, ArrowUp, CalendarDays, CheckSquare, Settings2, Users } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { listCalendarEvents } from "@/lib/calendar.functions";
import { widgetLinkDestination } from "@/lib/dashboard/dashboard-widget-navigation";
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

/** Compact, optional real-data widgets sit below the preview-first tool cards. */
export function DashboardWidgetBoard({ role, studentId }: Props) {
  const queryClient = useQueryClient();
  const loadPrefs = useServerFn(getDashboardWidgetPrefs);
  const savePrefs = useServerFn(updateDashboardWidgetPrefs);
  const loadCalendar = useServerFn(listCalendarEvents);
  const loadActions = useServerFn(getNextActionsForMe);
  const [editing, setEditing] = useState(false);

  const prefs = useQuery({
    queryKey: ["dashboard-widgets", role],
    queryFn: () => loadPrefs({ data: { role } }),
  });
  const widgets = prefs.data?.widgets ?? WIDGETS_BY_ROLE[role];
  const options = OPTIONS.filter((option) => WIDGETS_BY_ROLE[role].includes(option.id));
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

  function move(id: DashboardWidgetId, direction: -1 | 1) {
    const next = [...widgets];
    const index = next.indexOf(id);
    const target = index + direction;
    if (index < 0 || target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    update(next);
  }

  const today = new Date().toISOString().slice(0, 10);
  const upcoming = (calendar.data?.events ?? [])
    .filter((event) => event.event_date >= today && event.event_status !== "cancelled")
    .sort((a, b) => a.event_date.localeCompare(b.event_date));

  return (
    <section className="mt-8" data-testid="dashboard-widget-board" aria-label="Dashboard widgets">
      <div className="flex flex-wrap items-start justify-between gap-3 border-t border-border/70 pt-6">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">At a glance</p>
          <h2 className="mt-1 font-display text-2xl font-medium">Your dashboard widgets</h2>
          <p className="mt-1 text-sm text-foreground/75">
            Short summaries from your signed-in tools. Open a tool for its complete view.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setEditing((value) => !value)}
          aria-expanded={editing}
          className="inline-flex items-center gap-2 rounded-full border border-border px-4 py-2 text-sm font-semibold hover:bg-muted"
        >
          <Settings2 className="h-4 w-4" aria-hidden />
          {editing ? "Done customizing" : "Customize widgets"}
        </button>
      </div>

      {editing && (
        <div className="mt-4 rounded-xl border border-border bg-card p-4" aria-label="Choose dashboard widgets">
          <p className="mb-3 text-sm text-foreground/75">
            Show or hide widgets and choose their order. Your choices are saved to your account for this role.
          </p>
          <div className="flex flex-wrap gap-3">
            {options.map(({ id, title }) => {
              const selected = widgets.includes(id);
              return (
                <div key={id} className="flex items-center gap-2 rounded-lg border border-border px-3 py-2">
                  <label className="flex items-center gap-2 text-sm font-medium">
                    <input
                      type="checkbox"
                      checked={selected}
                      disabled={save.isPending}
                      onChange={() => update(selected ? widgets.filter((widget) => widget !== id) : [...widgets, id])}
                    />
                    {title}
                  </label>
                  {selected && (
                    <div className="flex gap-1">
                      <button type="button" aria-label={`Move ${title} up`} disabled={save.isPending || widgets[0] === id} onClick={() => move(id, -1)}><ArrowUp className="h-4 w-4" /></button>
                      <button type="button" aria-label={`Move ${title} down`} disabled={save.isPending || widgets[widgets.length - 1] === id} onClick={() => move(id, 1)}><ArrowDown className="h-4 w-4" /></button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {prefs.isError && (
        <p className="mt-4 text-sm text-destructive" role="alert">
          Dashboard preferences are unavailable; showing the standard widgets for now.
        </p>
      )}
      {widgets.length === 0 ? (
        <p className="mt-5 rounded-xl border border-dashed border-border p-5 text-sm text-foreground/75">
          No widgets selected. Use Customize widgets to add one.
        </p>
      ) : (
        <div className="mt-5 grid gap-4 lg:grid-cols-3">
          {widgets.map((id) => {
            const option = OPTIONS.find((item) => item.id === id)!;
            const entries = id === "actions"
              ? (actions.data?.active ?? []).slice(0, 3).map((action) => ({
                  id: action.id,
                  title: action.title,
                  detail: action.dueLabel ?? action.reason,
                  to: safeRoute(action.ctaRoute),
                }))
              : upcoming
                  .filter((event) => id === "calendar" || event.kind === "meeting")
                  .slice(0, 3)
                  .map((event) => ({
                    id: event.id,
                    title: event.title,
                    detail: new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", timeZone: "UTC" }).format(new Date(`${event.event_date}T12:00:00Z`)),
                    to: role === "school_admin"
                      ? "/school/calendar"
                      : event.kind === "meeting" && role !== "student"
                        ? "/meetings"
                        : "/calendar",
                  }));
            const loading = id === "actions" ? actions.isLoading : calendar.isLoading;
            const error = id === "actions" ? actions.isError : calendar.isError;
            const Icon = id === "actions" ? CheckSquare : id === "calendar" ? CalendarDays : Users;
            const calendarTool = role === "school_admin" ? "/school/calendar" : "/calendar";
            const toolPath = id === "actions" ? "/next-actions" : id === "calendar" ? calendarTool : "/meetings";
            const toolDestination = widgetLinkDestination(role, toolPath);
            return (
              <div key={id} className="rounded-2xl border border-border bg-card p-5" data-testid={`dashboard-widget-${id}`}>
                <div className="flex items-center justify-between gap-2">
                  <h3 className="flex items-center gap-2 font-display text-lg"><Icon className="h-5 w-5 text-primary" aria-hidden />{option.title}</h3>
                  {toolDestination && (
                    <Link to={toolDestination as never} className="text-xs font-semibold text-primary hover:underline">Open tool</Link>
                  )}
                </div>
                {loading ? <p className="mt-4 text-sm text-foreground/75">Loading your data…</p>
                  : error ? <p className="mt-4 text-sm text-destructive">Could not load this widget.</p>
                    : entries.length === 0 ? <p className="mt-4 text-sm text-foreground/75">Nothing upcoming yet.</p>
                      : (
                        <ul className="mt-3 divide-y divide-border/60">
                          {entries.map((entry) => {
                            const destination = widgetLinkDestination(role, entry.to);
                            return (
                              <li key={entry.id} className="py-2 text-sm">
                                {destination ? (
                                  <Link to={destination as never} className="font-medium text-foreground hover:text-primary hover:underline">{entry.title}</Link>
                                ) : (
                                  <span className="font-medium text-foreground">{entry.title}</span>
                                )}
                                <p className="line-clamp-1 text-xs text-foreground/75">{entry.detail}</p>
                              </li>
                            );
                          })}
                        </ul>
                      )}
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
