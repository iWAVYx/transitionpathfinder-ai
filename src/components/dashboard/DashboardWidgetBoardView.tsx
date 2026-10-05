import { Link } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowDown, ArrowUp, CalendarDays, CheckSquare, Settings2, Users } from "lucide-react";
import type { DashboardWidgetId, DashboardWidgetRole } from "@/lib/dashboard/dashboard-widget-prefs.functions";

export type WidgetContent = {
  entries: Array<{ id: string; title: string; detail?: string | null; to: string | null }>;
  loading?: boolean;
  error?: boolean;
  toolDestination: string | null;
};
const ACTION_SETUP: Record<DashboardWidgetRole, string> = {
  family: "Start with a connected student and Pathway Report, then review the next steps available in your family workspace.",
  student: "Review your pathway and student tools to find the next step toward your goals.",
  educator: "Review your connected students and caseload tools to identify planning and follow-up priorities.",
  school_admin: "Review your school workspace for access requests, team coordination and planning priorities.",
  district_admin: "Review your district workspace for school access, licensing and organization priorities.",
  partner: "Review your partner profile and listed opportunities to keep information current and useful.",
};
const WIDGET_GUIDANCE: Record<DashboardWidgetId, { summary: string; emptyTitle: string; details: string[] }> = {
  actions: {
    summary: "Priorities from your tools, with the context and next step for each item.",
    emptyTitle: "No active actions to show",
    details: ["Your available next steps appear here as you use your workspace.", "Each item includes its priority or timing and a route to the relevant tool."],
  },
  calendar: {
    summary: "Your next scheduled dates, collected in one place.",
    emptyTitle: "No upcoming calendar events",
    details: ["Future events appear here in date order; cancelled events are excluded.", "Use the Calendar tool card to review dates and the options available to your role."],
  },
  meetings: {
    summary: "Upcoming meetings, with dates and access to the meeting workspace.",
    emptyTitle: "No upcoming meetings",
    details: ["Scheduled meeting events appear here when they are added to your calendar.", "Use your meeting tools to organize questions, evidence and follow-up before the next conversation."],
  },
};

const OPTIONS: Array<{ id: DashboardWidgetId; title: string }> = [
  { id: "actions", title: "Next actions" },
  { id: "calendar", title: "Upcoming calendar" },
  { id: "meetings", title: "Meetings" },
];

export function DashboardWidgetBoardView({
  widgets,
  role,
  available,
  data,
  update,
  saving = false,
  loadingPrefs = false,
  prefsError = false,
  sample = false,
}: {
  widgets: DashboardWidgetId[];
  role: DashboardWidgetRole;
  available: DashboardWidgetId[];
  data: Record<DashboardWidgetId, WidgetContent>;
  update: (widgets: DashboardWidgetId[]) => void;
  saving?: boolean;
  loadingPrefs?: boolean;
  prefsError?: boolean;
  sample?: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const options = OPTIONS.filter((option) => available.includes(option.id));
  function move(id: DashboardWidgetId, direction: -1 | 1) {
    const next = [...widgets];
    const index = next.indexOf(id);
    const target = index + direction;
    if (index < 0 || target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    update(next);
  }

  return (
    <section className="mt-8" data-testid="dashboard-widget-board" aria-label="Dashboard widgets">
      <div className="flex flex-wrap items-start justify-between gap-3 border-t border-border/70 pt-6">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
            At a glance
          </p>
          <h2 className="mt-1 font-display text-2xl font-medium">Your dashboard widgets</h2>
          <p className="mt-1 text-sm text-foreground/75">
            {sample
              ? "Sample summaries. Open a tool to explore the demo."
              : "Short summaries from your signed-in tools. Open a tool for its complete view."}
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
        <div
          className="mt-4 rounded-xl border border-border bg-card p-4"
          aria-label="Choose dashboard widgets"
        >
          <p className="mb-3 text-sm text-foreground/75">
            {sample
              ? "Show, hide, and reorder sample widgets. Choices stay in this browser for this demo role."
              : "Show or hide widgets and choose their order. Your choices are saved to your account for this role."}
          </p>
          <div className="flex flex-wrap gap-3">
            {options.map(({ id, title }) => {
              const selected = widgets.includes(id);
              return (
                <div
                  key={id}
                  className="flex items-center gap-2 rounded-lg border border-border px-3 py-2"
                >
                  <label className="flex items-center gap-2 text-sm font-medium">
                    <input
                      type="checkbox"
                      checked={selected}
                      disabled={saving}
                      onChange={() =>
                        update(
                          selected ? widgets.filter((widget) => widget !== id) : [...widgets, id],
                        )
                      }
                    />
                    {title}
                  </label>
                  {selected && (
                    <div className="flex gap-1">
                      <button
                        type="button"
                        aria-label={`Move ${title} up`}
                        disabled={saving || widgets[0] === id}
                        onClick={() => move(id, -1)}
                      >
                        <ArrowUp className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        aria-label={`Move ${title} down`}
                        disabled={saving || widgets[widgets.length - 1] === id}
                        onClick={() => move(id, 1)}
                      >
                        <ArrowDown className="h-4 w-4" />
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {prefsError && (
        <p className="mt-4 text-sm text-destructive" role="alert">
          Dashboard preferences are unavailable; showing the standard widgets for now.
        </p>
      )}
      {widgets.length === 0 ? (
        <p className="mt-5 rounded-xl border border-dashed border-border p-5 text-sm text-foreground/75">
          No widgets selected. Use Customize widgets to add one.
        </p>
      ) : (
        <div
          className={`mt-5 grid gap-5 ${widgets.length === 1 ? "grid-cols-1" : widgets.length === 2 ? "md:grid-cols-2" : "xl:grid-cols-3"}`}
        >
          {widgets.map((id) => {
            const option = OPTIONS.find((item) => item.id === id)!;
            const { entries, loading, error, toolDestination } = data[id];
            const Icon = id === "actions" ? CheckSquare : id === "calendar" ? CalendarDays : Users;
            return (
              <div
                key={id}
                className="min-w-0 rounded-2xl border border-border bg-card p-5 sm:p-6"
                data-testid={`dashboard-widget-${id}`}
              >
                <div className="flex items-center justify-between gap-2">
                  <h3 className="flex items-center gap-2 font-display text-lg">
                    <Icon className="h-5 w-5 text-primary" aria-hidden />
                    {option.title}
                  </h3>
                  {toolDestination && (
                    <Link
                      to={toolDestination as never}
                      className="text-xs font-semibold text-primary hover:underline"
                    >
                      Open tool
                    </Link>
                  )}
                </div>
                <p className="mt-2 text-sm leading-relaxed text-foreground/75">
                  {WIDGET_GUIDANCE[id].summary}
                </p>
                {loading ? (
                  <p className="mt-4 text-sm text-foreground/75">Loading your data…</p>
                ) : error ? (
                  <p className="mt-4 text-sm text-destructive">Could not load this widget.</p>
                ) : entries.length === 0 ? (
                  <div className="mt-4 rounded-xl border border-dashed border-border bg-muted/20 p-4">
                    <p className="text-sm font-medium">{WIDGET_GUIDANCE[id].emptyTitle}</p>
                    <ul className="mt-2 space-y-2 text-sm leading-relaxed text-foreground/75">
                      {WIDGET_GUIDANCE[id].details.map((detail) => <li key={detail}>{detail}</li>)}
                    </ul>
                    {id === "actions" && <p className="mt-3 text-sm leading-relaxed text-foreground/75">{ACTION_SETUP[role]}</p>}
                    <p className="mt-3 text-xs text-foreground/75">
                      {sample ? "This demo view has no sample items in this widget." : "This widget will update when matching items are available."}
                    </p>
                  </div>
                ) : (
                  <ul className="mt-3 divide-y divide-border/60">
                    {entries.map((entry) => {
                      const destination = entry.to;
                      return (
                        <li key={entry.id} className="py-3 text-sm">
                          {destination ? (
                            <Link
                              to={destination as never}
                              className="font-medium text-foreground hover:text-primary hover:underline"
                            >
                              {entry.title}
                            </Link>
                          ) : (
                            <span className="font-medium text-foreground">{entry.title}</span>
                          )}
                          <p className="mt-1 line-clamp-2 text-sm text-foreground/75">
                            {entry.detail}
                          </p>
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
