/**
 * TransitionCalendar — the single calendar surface reused by every role.
 *
 * Views: month grid, week grid, agenda list.
 * Controls: Previous/Next/Today, view switcher, type filters,
 *           Add Event (callback), Export ICS.
 * Empty state: role-specific hint about what belongs on the calendar.
 *
 * This component owns view state only; it consumes a stateless
 * `CalendarEvent[]` prop. Signed-in routes pass live events; demo
 * previews pass sample fixtures from `sample-events.ts`.
 */

import { useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Download,
  Plus,
  Sparkles,
  Bell,
  ListChecks,
  Target,
  ArrowRight,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import type {
  CalendarEvent,
  CalendarEventType,
} from "@/lib/calendar/sample-events";

export type CalendarView = "month" | "week" | "agenda";

const TYPE_META: Record<
  CalendarEventType,
  { label: string; dot: string; chip: string }
> = {
  meeting: {
    label: "Meetings",
    dot: "bg-primary",
    chip: "bg-primary/10 text-primary ring-primary/25",
  },
  "action-item": {
    label: "Action Items",
    dot: "bg-amber-500",
    chip: "bg-amber-500/10 text-amber-700 ring-amber-500/25 dark:text-amber-300",
  },
  document: {
    label: "Documents",
    dot: "bg-sky-500",
    chip: "bg-sky-500/10 text-sky-700 ring-sky-500/25 dark:text-sky-300",
  },
  report: {
    label: "Reports",
    dot: "bg-violet-500",
    chip:
      "bg-violet-500/10 text-violet-700 ring-violet-500/25 dark:text-violet-300",
  },
  opportunity: {
    label: "Opportunities",
    dot: "bg-emerald-500",
    chip:
      "bg-emerald-500/10 text-emerald-700 ring-emerald-500/25 dark:text-emerald-300",
  },
  milestone: {
    label: "Milestones",
    dot: "bg-rose-500",
    chip: "bg-rose-500/10 text-rose-700 ring-rose-500/25 dark:text-rose-300",
  },
  program: {
    label: "Programs",
    dot: "bg-teal-500",
    chip: "bg-teal-500/10 text-teal-700 ring-teal-500/25 dark:text-teal-300",
  },
};

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function startOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}
function addDays(d: Date, n: number): Date {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}
function sameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}
function startOfWeek(d: Date): Date {
  const x = startOfDay(d);
  return addDays(x, -x.getDay());
}
function startOfMonthGrid(d: Date): Date {
  const first = new Date(d.getFullYear(), d.getMonth(), 1);
  return startOfWeek(first);
}
function fmtMonth(d: Date): string {
  return d.toLocaleDateString(undefined, { month: "long", year: "numeric" });
}
function fmtTime(iso: string): string {
  return new Date(iso).toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });
}
function fmtDayLong(d: Date): string {
  return d.toLocaleDateString(undefined, {
    weekday: "long",
    month: "short",
    day: "numeric",
  });
}
function tMinusLabel(iso: string): string {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const target = startOfDay(new Date(iso));
  const days = Math.round((target.getTime() - now.getTime()) / (24 * 60 * 60 * 1000));
  if (days < 0) return `${Math.abs(days)} day${Math.abs(days) === 1 ? "" : "s"} overdue`;
  if (days === 0) return "Today";
  if (days === 1) return "Tomorrow";
  if (days < 7) return `In ${days} days`;
  if (days < 14) return "Next week";
  return `In ${Math.round(days / 7)} weeks`;
}


function icsEscape(v: string): string {
  return v.replace(/[\\;,]/g, (m) => `\\${m}`).replace(/\n/g, "\\n");
}
function icsDate(iso: string): string {
  return iso.replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}
function toIcs(events: CalendarEvent[]): string {
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//TransitionForward//Calendar//EN",
  ];
  for (const e of events) {
    lines.push("BEGIN:VEVENT");
    lines.push(`UID:${e.id}@transitionforward`);
    lines.push(`DTSTAMP:${icsDate(new Date().toISOString())}`);
    lines.push(`DTSTART:${icsDate(e.start)}`);
    if (e.end) lines.push(`DTEND:${icsDate(e.end)}`);
    lines.push(`SUMMARY:${icsEscape(e.title)}`);
    if (e.location) lines.push(`LOCATION:${icsEscape(e.location)}`);
    if (e.description) lines.push(`DESCRIPTION:${icsEscape(e.description)}`);
    lines.push("END:VEVENT");
  }
  lines.push("END:VCALENDAR");
  return lines.join("\r\n");
}

export interface TransitionCalendarProps {
  events: CalendarEvent[];
  initialView?: CalendarView;
  /** Called when the user clicks Add Event; if omitted, button is hidden. */
  onAddEvent?: () => void;
  /** Optional href used instead of onAddEvent (renders as Link). */
  addEventHref?: string;
  /** Filename base for ICS export; omitted → no Export button. */
  exportFilename?: string;
  /** Custom empty-state copy for the current role. */
  emptyStateTitle?: string;
  emptyStateBody?: string;
  /** Show the "Sample data" chip in the header. */
  sample?: boolean;
  /** Extra header eyebrow, e.g. "Your Calendar" or "Caseload Calendar". */
  eyebrow?: string;
}

export function TransitionCalendar({
  events,
  initialView = "month",
  onAddEvent,
  addEventHref,
  exportFilename,
  emptyStateTitle = "Nothing on the calendar yet.",
  emptyStateBody = "Meetings, action-item deadlines, and report due dates will appear here as your team schedules them.",
  sample = false,
  eyebrow,
}: TransitionCalendarProps) {
  const [view, setView] = useState<CalendarView>(initialView);
  const [cursor, setCursor] = useState<Date>(() => startOfDay(new Date()));
  const [activeTypes, setActiveTypes] = useState<Set<CalendarEventType>>(
    () => new Set(Object.keys(TYPE_META) as CalendarEventType[]),
  );

  const filtered = useMemo(
    () => events.filter((e) => activeTypes.has(e.type)),
    [events, activeTypes],
  );

  const eventsByDay = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>();
    for (const e of filtered) {
      const key = startOfDay(new Date(e.start)).toISOString();
      const list = map.get(key) ?? [];
      list.push(e);
      map.set(key, list);
    }
    for (const list of map.values())
      list.sort(
        (a, b) => new Date(a.start).getTime() - new Date(b.start).getTime(),
      );
    return map;
  }, [filtered]);

  const upcoming = useMemo(() => {
    const now = Date.now();
    return [...filtered]
      .filter((e) => new Date(e.start).getTime() >= now - 24 * 60 * 60 * 1000)
      .sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());
  }, [filtered]);

  const nextUp = upcoming[0];
  const prepPool = useMemo(
    () =>
      upcoming
        .filter((e) => e.prep && e.prep.length > 0)
        .slice(0, 3),
    [upcoming],
  );
  const reminders = useMemo(
    () => upcoming.filter((e) => e.reminder).slice(0, 4),
    [upcoming],
  );
  const showFocusRail = Boolean(nextUp || prepPool.length || reminders.length);


  const step = view === "month" ? "month" : view === "week" ? "week" : "week";
  function shift(delta: -1 | 1) {
    setCursor((c) => {
      const n = new Date(c);
      if (step === "month") n.setMonth(n.getMonth() + delta);
      else n.setDate(n.getDate() + delta * 7);
      return startOfDay(n);
    });
  }

  function toggleType(t: CalendarEventType) {
    setActiveTypes((prev) => {
      const next = new Set(prev);
      if (next.has(t)) next.delete(t);
      else next.add(t);
      return next;
    });
  }

  function download() {
    if (!exportFilename) return;
    const blob = new Blob([toIcs(filtered)], { type: "text/calendar" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${exportFilename}.ics`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  const headerLabel =
    view === "month"
      ? fmtMonth(cursor)
      : `${startOfWeek(cursor).toLocaleDateString(undefined, { month: "short", day: "numeric" })} – ${addDays(startOfWeek(cursor), 6).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}`;

  return (
    <section
      className="rounded-3xl border bg-card shadow-soft"
      data-testid="transition-calendar"
    >
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-3 border-b p-4 sm:p-5">
        <div>
          <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">
            <CalendarIcon className="h-3.5 w-3.5" aria-hidden />
            {eyebrow ?? "Calendar"}
            {sample && (
              <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold tracking-wider text-primary ring-1 ring-primary/20">
                <Sparkles className="h-3 w-3" aria-hidden /> Sample
              </span>
            )}
          </div>
          <h2 className="mt-1 font-display text-xl font-medium tracking-tight sm:text-2xl">
            {headerLabel}
          </h2>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div
            className="inline-flex items-center overflow-hidden rounded-full border bg-background"
            role="group"
            aria-label="Change date range"
          >
            <button
              type="button"
              onClick={() => shift(-1)}
              className="px-2.5 py-1.5 text-sm hover:bg-muted"
              aria-label="Previous"
            >
              <ChevronLeft className="h-4 w-4" aria-hidden />
            </button>
            <button
              type="button"
              onClick={() => setCursor(startOfDay(new Date()))}
              className="border-x px-3 py-1.5 text-xs font-medium hover:bg-muted"
            >
              Today
            </button>
            <button
              type="button"
              onClick={() => shift(1)}
              className="px-2.5 py-1.5 text-sm hover:bg-muted"
              aria-label="Next"
            >
              <ChevronRight className="h-4 w-4" aria-hidden />
            </button>
          </div>
          <div
            className="inline-flex overflow-hidden rounded-full border bg-background text-xs"
            role="tablist"
            aria-label="Calendar view"
          >
            {(["month", "week", "agenda"] as CalendarView[]).map((v) => (
              <button
                key={v}
                type="button"
                role="tab"
                aria-selected={view === v}
                onClick={() => setView(v)}
                className={cn(
                  "px-3 py-1.5 font-medium capitalize transition",
                  view === v
                    ? "bg-primary text-primary-foreground"
                    : "text-foreground/70 hover:bg-muted",
                )}
              >
                {v}
              </button>
            ))}
          </div>
          {exportFilename && (
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={download}
              data-testid="calendar-export"
            >
              <Download className="mr-1.5 h-3.5 w-3.5" aria-hidden /> Export
            </Button>
          )}
          {(onAddEvent || addEventHref) &&
            (addEventHref ? (
              <Button
                asChild
                size="sm"
                data-testid="calendar-add-event"
              >
                <Link to={addEventHref as never}>
                  <Plus className="mr-1.5 h-3.5 w-3.5" aria-hidden /> Add Event
                </Link>
              </Button>
            ) : (
              <Button
                type="button"
                size="sm"
                onClick={onAddEvent}
                data-testid="calendar-add-event"
              >
                <Plus className="mr-1.5 h-3.5 w-3.5" aria-hidden /> Add Event
              </Button>
            ))}
        </div>
      </div>

      {/* Filter chips */}
      <div className="flex flex-wrap items-center gap-1.5 border-b p-3 sm:px-5">
        <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          Filter By Type
        </span>
        {(Object.keys(TYPE_META) as CalendarEventType[]).map((t) => {
          const meta = TYPE_META[t];
          const on = activeTypes.has(t);
          return (
            <button
              key={t}
              type="button"
              onClick={() => toggleType(t)}
              aria-pressed={on}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium ring-1 transition",
                on
                  ? meta.chip
                  : "bg-muted/40 text-muted-foreground ring-transparent hover:bg-muted",
              )}
            >
              <span
                className={cn("h-1.5 w-1.5 rounded-full", meta.dot)}
                aria-hidden
              />
              {meta.label}
            </button>
          );
        })}
      </div>

      {/* Pathway-linked focus rail */}
      {showFocusRail && (
        <FocusRail
          nextUp={nextUp}
          prepPool={prepPool}
          reminders={reminders}
        />
      )}

      {/* Body */}
      <div className="p-3 sm:p-4">
        {filtered.length === 0 ? (
          <EmptyState title={emptyStateTitle} body={emptyStateBody} />
        ) : view === "month" ? (
          <MonthView cursor={cursor} eventsByDay={eventsByDay} />
        ) : view === "week" ? (
          <WeekView cursor={cursor} eventsByDay={eventsByDay} />
        ) : (
          <AgendaView events={filtered} />
        )}
      </div>

    </section>
  );
}

/* ---------------------------------------------- Views */

function EmptyState({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-2xl border border-dashed bg-muted/20 p-8 text-center">
      <CalendarIcon className="mx-auto h-6 w-6 text-muted-foreground" aria-hidden />
      <h3 className="mt-2 font-display text-lg">{title}</h3>
      <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">{body}</p>
    </div>
  );
}

function EventPill({ e }: { e: CalendarEvent }) {
  const meta = TYPE_META[e.type];
  const body = (
    <span className="flex items-center gap-1 truncate">
      <span className={cn("h-1.5 w-1.5 shrink-0 rounded-full", meta.dot)} aria-hidden />
      <span className="truncate">{e.title}</span>
    </span>
  );
  const cls =
    "block w-full truncate rounded-md bg-background/80 px-1.5 py-0.5 text-[10.5px] font-medium text-foreground/85 ring-1 ring-border hover:ring-primary/40";
  return e.href ? (
    <Link to={e.href as never} className={cls} title={`${e.title} · ${fmtTime(e.start)}`}>
      {body}
    </Link>
  ) : (
    <span className={cls} title={`${e.title} · ${fmtTime(e.start)}`}>
      {body}
    </span>
  );
}

function MonthView({
  cursor,
  eventsByDay,
}: {
  cursor: Date;
  eventsByDay: Map<string, CalendarEvent[]>;
}) {
  const gridStart = startOfMonthGrid(cursor);
  const today = startOfDay(new Date());
  const cells = Array.from({ length: 42 }, (_, i) => addDays(gridStart, i));
  return (
    <div>
      <div className="grid grid-cols-7 gap-px pb-1">
        {WEEKDAYS.map((d) => (
          <div
            key={d}
            className="px-2 text-center text-[10px] font-semibold uppercase tracking-wider text-muted-foreground"
          >
            {d}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-px overflow-hidden rounded-xl bg-border">
        {cells.map((d) => {
          const key = d.toISOString();
          const inMonth = d.getMonth() === cursor.getMonth();
          const isToday = sameDay(d, today);
          const day = eventsByDay.get(key) ?? [];
          return (
            <div
              key={key}
              className={cn(
                "min-h-24 bg-card p-1.5 text-xs sm:min-h-28",
                !inMonth && "bg-muted/30 text-muted-foreground",
              )}
            >
              <div
                className={cn(
                  "mb-1 flex items-center justify-between text-[11px] font-medium",
                  isToday && "text-primary",
                )}
              >
                <span
                  className={cn(
                    "inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1",
                    isToday && "bg-primary text-primary-foreground",
                  )}
                >
                  {d.getDate()}
                </span>
                {day.length > 3 && (
                  <span className="text-[10px] text-muted-foreground">
                    +{day.length - 3}
                  </span>
                )}
              </div>
              <div className="space-y-0.5">
                {day.slice(0, 3).map((e) => (
                  <EventPill key={e.id} e={e} />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function WeekView({
  cursor,
  eventsByDay,
}: {
  cursor: Date;
  eventsByDay: Map<string, CalendarEvent[]>;
}) {
  const start = startOfWeek(cursor);
  const today = startOfDay(new Date());
  const days = Array.from({ length: 7 }, (_, i) => addDays(start, i));
  return (
    <div className="grid grid-cols-1 gap-2 sm:grid-cols-7">
      {days.map((d) => {
        const isToday = sameDay(d, today);
        const day = eventsByDay.get(d.toISOString()) ?? [];
        return (
          <div
            key={d.toISOString()}
            className={cn(
              "min-h-40 rounded-xl border bg-card p-2",
              isToday && "border-primary ring-1 ring-primary/20",
            )}
          >
            <div className="mb-1.5 flex items-center justify-between">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                {d.toLocaleDateString(undefined, { weekday: "short" })}
              </span>
              <span
                className={cn(
                  "text-sm font-medium",
                  isToday && "text-primary",
                )}
              >
                {d.getDate()}
              </span>
            </div>
            {day.length === 0 ? (
              <p className="text-[11px] text-muted-foreground">—</p>
            ) : (
              <div className="space-y-1">
                {day.map((e) => (
                  <div key={e.id} className="rounded-lg border bg-background/60 p-1.5">
                    <p className="text-[10px] text-muted-foreground">
                      {e.allDay ? "All day" : fmtTime(e.start)}
                    </p>
                    <EventPill e={e} />
                    {e.location && (
                      <p className="mt-0.5 truncate text-[10px] text-muted-foreground">
                        {e.location}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function AgendaView({ events }: { events: CalendarEvent[] }) {
  const sorted = [...events].sort(
    (a, b) => new Date(a.start).getTime() - new Date(b.start).getTime(),
  );
  const groups = new Map<string, CalendarEvent[]>();
  for (const e of sorted) {
    const key = startOfDay(new Date(e.start)).toISOString();
    const list = groups.get(key) ?? [];
    list.push(e);
    groups.set(key, list);
  }
  return (
    <ol className="space-y-4">
      {Array.from(groups.entries()).map(([k, list]) => {
        const d = new Date(k);
        const isToday = sameDay(d, startOfDay(new Date()));
        return (
          <li key={k}>
            <div className="mb-2 flex items-center gap-2">
              <span
                className={cn(
                  "text-xs font-semibold uppercase tracking-wider",
                  isToday ? "text-primary" : "text-muted-foreground",
                )}
              >
                {fmtDayLong(d)}
                {isToday && " · Today"}
              </span>
              <span className="h-px flex-1 bg-border" />
            </div>
            <ul className="divide-y divide-border rounded-xl border bg-card">
              {list.map((e) => {
                const meta = TYPE_META[e.type];
                const body = (
                  <div className="flex flex-wrap items-start gap-3 p-3">
                    <span
                      className={cn(
                        "mt-1 h-2 w-2 shrink-0 rounded-full",
                        meta.dot,
                      )}
                      aria-hidden
                    />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-foreground">
                        {e.title}
                      </p>
                      {e.description && (
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          {e.description}
                        </p>
                      )}
                      <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] text-muted-foreground">
                        <span>
                          {e.allDay
                            ? "All day"
                            : `${fmtTime(e.start)}${e.end ? ` – ${fmtTime(e.end)}` : ""}`}
                        </span>
                        {e.location && <span>{e.location}</span>}
                        {e.scope && <span>· {e.scope}</span>}
                        {e.owner && (
                          <span className="rounded-full bg-muted px-2 py-0.5 font-medium text-foreground/80">
                            {e.owner}
                          </span>
                        )}
                        {e.reminder && (
                          <span className="inline-flex items-center gap-1 text-amber-700 dark:text-amber-300">
                            <Bell className="h-3 w-3" aria-hidden /> {e.reminder}
                          </span>
                        )}
                      </div>
                      {e.pathwayGoal && (
                        <span className="mt-2 inline-flex max-w-full items-center gap-1 truncate rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary ring-1 ring-primary/20">
                          <Target className="h-3 w-3 shrink-0" aria-hidden />
                          <span className="truncate">{e.pathwayGoal.label}</span>
                        </span>
                      )}
                      {e.prep && e.prep.length > 0 && (
                        <details className="mt-2 rounded-lg border border-dashed border-border/70 bg-muted/20 px-2.5 py-1.5">
                          <summary className="cursor-pointer text-[11px] font-medium text-foreground/80">
                            <ListChecks className="mr-1 inline h-3 w-3 text-primary" aria-hidden />
                            Prep ({e.prep.length})
                          </summary>
                          <ul className="mt-1.5 space-y-1 pl-4 text-[11px] leading-relaxed text-foreground/80">
                            {e.prep.map((p, i) => (
                              <li key={i} className="list-disc">{p}</li>
                            ))}
                          </ul>
                        </details>
                      )}
                    </div>
                    <span
                      className={cn(
                        "shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ring-1",
                        meta.chip,
                      )}
                    >
                      {meta.label}
                    </span>
                  </div>
                );

                return (
                  <li key={e.id}>
                    {e.href ? (
                      <Link
                        to={e.href as never}
                        className="block hover:bg-muted/40"
                      >
                        {body}
                      </Link>
                    ) : (
                      body
                    )}
                  </li>
                );
              })}
            </ul>
          </li>
        );
      })}
    </ol>
  );
}
