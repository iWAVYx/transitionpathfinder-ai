import { useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Download,
  Sparkles,
  Target,
  ClipboardList,
  CalendarClock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import type { DashboardSnapshot } from "@/lib/golden-path.functions";
import {
  addMonths,
  buildGoogleCalendarUrl,
  downloadDashboardIcs,
  endOfMonth,
  eventsFromSnapshot,
  isPast,
  sameDay,
  startOfMonth,
  type CalendarEvent,
} from "@/lib/calendar-events";

const TIMEZONES = [
  { value: "America/New_York", label: "Eastern" },
  { value: "America/Chicago", label: "Central" },
  { value: "America/Denver", label: "Mountain" },
  { value: "America/Los_Angeles", label: "Pacific" },
  { value: "America/Anchorage", label: "Alaska" },
  { value: "Pacific/Honolulu", label: "Hawaii" },
];

function getBrowserTz(): string {
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    return TIMEZONES.some((t) => t.value === tz) ? tz : "America/New_York";
  } catch {
    return "America/New_York";
  }
}

function kindStyles(kind: CalendarEvent["kind"]) {
  switch (kind) {
    case "meeting":
      return {
        dot: "bg-primary",
        chip: "bg-primary/15 text-primary border-primary/20",
        icon: <Sparkles className="h-3 w-3" aria-hidden />,
        label: "Meeting",
      };
    case "prep":
      return {
        dot: "bg-amber-500",
        chip:
          "bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/20",
        icon: <CalendarClock className="h-3 w-3" aria-hidden />,
        label: "Prep",
      };
    case "goal":
      return {
        dot: "bg-emerald-500",
        chip:
          "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20",
        icon: <Target className="h-3 w-3" aria-hidden />,
        label: "Goal",
      };
    case "action":
    default:
      return {
        dot: "bg-sky-500",
        chip: "bg-sky-500/10 text-sky-700 dark:text-sky-300 border-sky-500/20",
        icon: <ClipboardList className="h-3 w-3" aria-hidden />,
        label: "Action",
      };
  }
}

type Props = {
  snap: DashboardSnapshot;
  /** Compact mode shrinks day cells; useful for the student dashboard. */
  compact?: boolean;
};

export function DashboardCalendar({ snap, compact = false }: Props) {
  const events = useMemo(() => eventsFromSnapshot(snap), [snap]);
  const [cursor, setCursor] = useState<Date>(() => {
    // Default to the month of the next upcoming event, else today.
    const upcoming = events.find((e) => !isPast(e.date));
    return startOfMonth(upcoming ? upcoming.date : new Date());
  });
  const [tz, setTz] = useState<string>(getBrowserTz);

  const monthEvents = useMemo(() => {
    const start = startOfMonth(cursor).getTime();
    const end = endOfMonth(cursor).getTime();
    return events.filter((e) => {
      const t = e.date.getTime();
      return t >= start && t <= end + 24 * 3600 * 1000 - 1;
    });
  }, [events, cursor]);

  const upcoming = useMemo(
    () => events.filter((e) => !isPast(e.date)).slice(0, 8),
    [events],
  );

  // Build a 6-week grid (Sun-start) covering the visible month.
  const grid = useMemo(() => {
    const first = startOfMonth(cursor);
    const startWeekday = first.getDay(); // 0 = Sun
    const gridStart = new Date(first);
    gridStart.setDate(first.getDate() - startWeekday);
    const days: Date[] = [];
    for (let i = 0; i < 42; i++) {
      const d = new Date(gridStart);
      d.setDate(gridStart.getDate() + i);
      days.push(d);
    }
    return days;
  }, [cursor]);

  const monthLabel = cursor.toLocaleDateString(undefined, {
    month: "long",
    year: "numeric",
  });

  const today = new Date();

  return (
    <section className="rounded-3xl border bg-card p-6 shadow-soft">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <CalendarDays className="h-5 w-5 text-primary" />
          <div>
            <h2 className="font-display text-xl">Calendar</h2>
            <p className="text-xs text-muted-foreground">
              Meetings, action items, and prep deadlines from your pathway plan.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Select value={tz} onValueChange={setTz}>
            <SelectTrigger className="h-8 w-auto gap-1 text-xs" aria-label="Timezone">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {TIMEZONES.map((t) => (
                <SelectItem key={t.value} value={t.value} className="text-xs">
                  {t.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            variant="outline"
            size="sm"
            disabled={events.length === 0}
            onClick={() => {
              downloadDashboardIcs(events, tz);
              toast.success("Calendar file downloaded — open it to add all events.");
            }}
          >
            <Download className="mr-1.5 h-3.5 w-3.5" />
            Export .ics
          </Button>
        </div>
      </div>

      {/* Month nav */}
      <div className="mt-4 flex items-center justify-between">
        <button
          type="button"
          onClick={() => setCursor((c) => addMonths(c, -1))}
          className="rounded-full border bg-background p-1.5 hover:bg-muted"
          aria-label="Previous month"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <p className="font-display text-base font-medium">{monthLabel}</p>
        <button
          type="button"
          onClick={() => setCursor((c) => addMonths(c, 1))}
          className="rounded-full border bg-background p-1.5 hover:bg-muted"
          aria-label="Next month"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      {/* Weekday header */}
      <div className="mt-3 grid grid-cols-7 gap-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
          <div key={d} className="px-2 py-1 text-center">
            {d}
          </div>
        ))}
      </div>

      {/* Day grid */}
      <div className="mt-1 grid grid-cols-7 gap-1">
        {grid.map((d, i) => {
          const inMonth = d.getMonth() === cursor.getMonth();
          const isToday = sameDay(d, today);
          const dayEvents = monthEvents.filter((e) => sameDay(e.date, d));
          return (
            <div
              key={i}
              className={
                "relative rounded-lg border bg-background p-1.5 " +
                (compact ? "min-h-[56px] " : "min-h-[72px] ") +
                (inMonth ? "" : "opacity-40 ") +
                (isToday ? "ring-2 ring-primary/40 " : "")
              }
            >
              <div className="flex items-center justify-between">
                <span
                  className={
                    "text-[11px] font-medium " +
                    (isToday ? "text-primary" : "text-foreground")
                  }
                >
                  {d.getDate()}
                </span>
              </div>
              <div className="mt-1 space-y-0.5">
                {dayEvents.slice(0, compact ? 2 : 3).map((ev) => {
                  const s = kindStyles(ev.kind);
                  return (
                    <a
                      key={ev.id}
                      href={buildGoogleCalendarUrl(ev, tz)}
                      target="_blank"
                      rel="noopener noreferrer"
                      title={`${ev.title} — add to Google Calendar`}
                      className="flex items-center gap-1 truncate rounded px-1 py-0.5 text-[10px] font-medium text-foreground hover:bg-muted"
                    >
                      <span className={"h-1.5 w-1.5 shrink-0 rounded-full " + s.dot} />
                      <span className="truncate">{ev.title}</span>
                    </a>
                  );
                })}
                {dayEvents.length > (compact ? 2 : 3) && (
                  <p className="px-1 text-[9px] text-muted-foreground">
                    +{dayEvents.length - (compact ? 2 : 3)} more
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Upcoming list */}
      <div className="mt-6">
        <div className="flex items-center justify-between">
          <h3 className="font-display text-sm font-medium">Upcoming</h3>
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
            Tap a date to add to Google Calendar
          </p>
        </div>
        {upcoming.length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">
            No upcoming events. Add a meeting date or generate a pathway report to
            populate your calendar.
          </p>
        ) : (
          <ul className="mt-3 space-y-2">
            {upcoming.map((ev) => {
              const s = kindStyles(ev.kind);
              const dateLabel = ev.date.toLocaleDateString(undefined, {
                weekday: "short",
                month: "short",
                day: "numeric",
              });
              const isDone = ev.status === "complete";
              return (
                <li
                  key={ev.id}
                  className="flex items-start gap-3 rounded-2xl border bg-background p-3"
                >
                  <span className={"mt-1 h-2 w-2 shrink-0 rounded-full " + s.dot} />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p
                        className={
                          "text-sm font-medium " +
                          (isDone ? "line-through text-muted-foreground" : "")
                        }
                      >
                        {ev.title}
                      </p>
                      <span
                        className={
                          "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider " +
                          s.chip
                        }
                      >
                        {s.icon}
                        {s.label}
                      </span>
                      {ev.priority === "high" && (
                        <span className="rounded-full bg-destructive/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-destructive">
                          High
                        </span>
                      )}
                    </div>
                    {ev.detail && (
                      <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                        {ev.detail}
                      </p>
                    )}
                    <div className="mt-1 flex flex-wrap items-center gap-3 text-[11px] text-muted-foreground">
                      <span className="font-medium text-foreground">{dateLabel}</span>
                      {ev.href && (
                        <Link to={ev.href} className="text-primary hover:underline">
                          Open
                        </Link>
                      )}
                    </div>
                  </div>
                  <a
                    href={buildGoogleCalendarUrl(ev, tz)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="shrink-0 inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-1 text-[11px] font-medium text-primary hover:bg-primary/20"
                    title="Add to Google Calendar"
                  >
                    <CalendarDays className="h-3 w-3" />
                    Add
                  </a>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </section>
  );
}
