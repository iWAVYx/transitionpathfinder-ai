import { useCallback, useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Download,
  Sparkles,
  Target,
  ClipboardList,
  CalendarClock,
  Plus,
  Trash2,
  Loader2,
  Users,
  User as UserIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { toast } from "sonner";
import {
  listCalendarEvents,
  createCalendarEvent,
  deleteCalendarEvent,
  updateCalendarEvent,
  listMyCalendarOrganizations,
  type TeamCalendarEvent,
  type CalendarVisibility,
} from "@/lib/calendar.functions";
import {
  buildGoogleCalendarUrl,
  downloadDashboardIcs,
  type CalendarEvent as IcsEvent,
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

function parseDate(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function startOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}
function endOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth() + 1, 0);
}
function addMonths(d: Date, n: number) {
  return new Date(d.getFullYear(), d.getMonth() + n, 1);
}
function sameDayIso(date: Date, iso: string) {
  const [y, m, d] = iso.split("-").map(Number);
  return (
    date.getFullYear() === y &&
    date.getMonth() === m - 1 &&
    date.getDate() === d
  );
}
function isPastIso(iso: string) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return parseDate(iso).getTime() < today.getTime();
}
function toIsoDate(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function kindStyles(kind: TeamCalendarEvent["kind"]) {
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
        chip: "bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/20",
        icon: <CalendarClock className="h-3 w-3" aria-hidden />,
        label: "Prep",
      };
    case "action":
      return {
        dot: "bg-sky-500",
        chip: "bg-sky-500/10 text-sky-700 dark:text-sky-300 border-sky-500/20",
        icon: <ClipboardList className="h-3 w-3" aria-hidden />,
        label: "Action",
      };
    case "team":
      return {
        dot: "bg-violet-500",
        chip: "bg-violet-500/10 text-violet-700 dark:text-violet-300 border-violet-500/20",
        icon: <Users className="h-3 w-3" aria-hidden />,
        label: "Team",
      };
    case "personal":
    default:
      return {
        dot: "bg-emerald-500",
        chip: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20",
        icon: <UserIcon className="h-3 w-3" aria-hidden />,
        label: "Personal",
      };
  }
}

function toIcsEvent(ev: TeamCalendarEvent): IcsEvent {
  return {
    id: ev.id,
    date: parseDate(ev.event_date),
    title: ev.title,
    detail: ev.detail,
    kind: ev.kind === "meeting"
      ? "meeting"
      : ev.kind === "prep"
        ? "prep"
        : ev.kind === "action"
          ? "action"
          : "goal",
  };
}

type OrgOption = { id: string; name: string };

type Props = {
  /** Scope the calendar to a single student. Omit for "all my collaborations." */
  studentId?: string | null;
  /** Compact mode shrinks day cells. */
  compact?: boolean;
  /** Override displayed title. */
  title?: string;
  /** Override displayed subtitle. */
  subtitle?: string;
  /** List of students the user can attach events to (id + name). If empty,
   *  only personal events can be created. */
  studentOptions?: Array<{ id: string; name: string }>;
  /** Optional pre-supplied list of organizations. If omitted the component
   *  fetches the caller's active memberships. */
  organizationOptions?: OrgOption[];
  /** Optional default visibility tier offered first in the create form. */
  defaultVisibility?: CalendarVisibility;
  /** Hide visibility tiers that don't apply to this surface. */
  allowedVisibilities?: CalendarVisibility[];
};

const ALL_VISIBILITIES: CalendarVisibility[] = [
  "private",
  "family_team",
  "school_team",
  "district_team",
  "partner_only",
  "platform_admin_only",
  "public_event",
];

export function DashboardCalendar({
  studentId = null,
  compact = false,
  title = "Calendar",
  subtitle = "Meetings, action items, prep deadlines, and team events.",
  studentOptions = [],
  organizationOptions,
  defaultVisibility,
  allowedVisibilities,
}: Props) {
  const fetchEvents = useServerFn(listCalendarEvents);
  const createEvent = useServerFn(createCalendarEvent);
  const removeEvent = useServerFn(deleteCalendarEvent);
  const updateEvent = useServerFn(updateCalendarEvent);
  const fetchOrgs = useServerFn(listMyCalendarOrganizations);

  const [events, setEvents] = useState<TeamCalendarEvent[]>([]);
  const [orgs, setOrgs] = useState<OrgOption[]>(organizationOptions ?? []);
  const [loading, setLoading] = useState(true);
  const [cursor, setCursor] = useState<Date>(() => startOfMonth(new Date()));
  const [tz, setTz] = useState<string>(getBrowserTz);
  const [addOpen, setAddOpen] = useState(false);
  const [filterKind, setFilterKind] = useState<string>("all");

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetchEvents({
        data: studentId ? { student_id: studentId } : {},
      });
      setEvents(res.events);
      const upcoming = res.events.find((e) => !isPastIso(e.event_date));
      if (upcoming) setCursor(startOfMonth(parseDate(upcoming.event_date)));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not load calendar.");
    } finally {
      setLoading(false);
    }
  }, [fetchEvents, studentId]);

  useEffect(() => {
    reload();
  }, [reload]);

  useEffect(() => {
    if (organizationOptions !== undefined) {
      setOrgs(organizationOptions);
      return;
    }
    let cancelled = false;
    fetchOrgs({ data: {} })
      .then((r) => {
        if (!cancelled) setOrgs(r.organizations);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [fetchOrgs, organizationOptions]);

  const filteredEvents = useMemo(() => {
    if (filterKind === "all") return events;
    return events.filter((e) => e.kind === filterKind);
  }, [events, filterKind]);

  const monthEvents = useMemo(() => {
    const start = toIsoDate(startOfMonth(cursor));
    const end = toIsoDate(endOfMonth(cursor));
    return filteredEvents.filter((e) => e.event_date >= start && e.event_date <= end);
  }, [filteredEvents, cursor]);

  const upcoming = useMemo(
    () => filteredEvents.filter((e) => !isPastIso(e.event_date)).slice(0, 10),
    [filteredEvents],
  );

  const grid = useMemo(() => {
    const first = startOfMonth(cursor);
    const startWeekday = first.getDay();
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
  const todayIso = toIsoDate(today);

  async function handleDelete(ev: TeamCalendarEvent) {
    if (!ev.id.startsWith("cal-") || !ev.is_mine) return;
    const id = ev.id.slice("cal-".length);
    try {
      await removeEvent({ data: { id } });
      setEvents((prev) => prev.filter((e) => e.id !== ev.id));
      toast.success("Event removed.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not delete.");
    }
  }

  async function handleComplete(ev: TeamCalendarEvent) {
    if (!ev.id.startsWith("cal-") || !ev.is_mine) return;
    const id = ev.id.slice("cal-".length);
    const next = ev.event_status === "completed" ? "scheduled" : "completed";
    try {
      await updateEvent({ data: { id, status: next } });
      setEvents((prev) =>
        prev.map((e) => (e.id === ev.id ? { ...e, event_status: next } : e)),
      );
      toast.success(next === "completed" ? "Marked complete." : "Reopened.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not update event.");
    }
  }

  const visibilityChoices = (allowedVisibilities ?? ALL_VISIBILITIES);

  return (
    <section className="rounded-3xl border bg-card p-6 shadow-soft">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <CalendarDays className="h-5 w-5 text-primary" />
          <div>
            <h2 className="font-display text-xl">{title}</h2>
            <p className="text-xs text-muted-foreground">{subtitle}</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Select value={filterKind} onValueChange={setFilterKind}>
            <SelectTrigger className="h-8 w-auto gap-1 text-xs" aria-label="Filter by type">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all" className="text-xs">All events</SelectItem>
              <SelectItem value="meeting" className="text-xs">Meetings</SelectItem>
              <SelectItem value="prep" className="text-xs">Prep</SelectItem>
              <SelectItem value="action" className="text-xs">Action items</SelectItem>
              <SelectItem value="team" className="text-xs">Team events</SelectItem>
              <SelectItem value="personal" className="text-xs">Personal</SelectItem>
            </SelectContent>
          </Select>
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
          <AddEventPopover
            open={addOpen}
            onOpenChange={setAddOpen}
            defaultStudentId={studentId ?? null}
            studentOptions={studentOptions}
            organizationOptions={orgs}
            visibilityChoices={visibilityChoices}
            defaultVisibility={defaultVisibility ?? "private"}
            onCreate={async (input) => {
              await createEvent({ data: input });
              setAddOpen(false);
              toast.success(
                input.visibility === "private"
                  ? "Event added to your personal calendar."
                  : "Event added to the shared calendar.",
              );
              await reload();
            }}
          />
          <Button
            variant="outline"
            size="sm"
            disabled={events.length === 0}
            onClick={() => {
              downloadDashboardIcs(events.map(toIcsEvent), tz);
              toast.success("Calendar file downloaded.");
            }}
          >
            <Download className="mr-1.5 h-3.5 w-3.5" />
            Export .ics
          </Button>
        </div>
      </div>

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

      <div className="mt-3 grid grid-cols-7 gap-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
          <div key={d} className="px-2 py-1 text-center">
            {d}
          </div>
        ))}
      </div>

      <div className="mt-1 grid grid-cols-7 gap-1">
        {grid.map((d, i) => {
          const inMonth = d.getMonth() === cursor.getMonth();
          const iso = toIsoDate(d);
          const isToday = iso === todayIso;
          const dayEvents = monthEvents.filter((e) => sameDayIso(d, e.event_date));
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
                      href={buildGoogleCalendarUrl(toIcsEvent(ev), tz)}
                      target="_blank"
                      rel="noopener noreferrer"
                      title={`${ev.title}${ev.student_name ? ` · ${ev.student_name}` : ""} — add to Google Calendar`}
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

      <div className="mt-6">
        <div className="flex items-center justify-between">
          <h3 className="font-display text-sm font-medium">Upcoming</h3>
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
            Tap a date to add to Google Calendar
          </p>
        </div>
        {loading ? (
          <p className="mt-3 flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading…
          </p>
        ) : upcoming.length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">
            Nothing scheduled. Use "Add event" above to put something on the team calendar.
          </p>
        ) : (
          <ul className="mt-3 space-y-2">
            {upcoming.map((ev) => {
              const s = kindStyles(ev.kind);
              const dateLabel = parseDate(ev.event_date).toLocaleDateString(undefined, {
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
                      {ev.student_name && (
                        <span className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                          {ev.student_name}
                        </span>
                      )}
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
                      {ev.owner_name && (ev.kind === "team" || ev.kind === "personal") && (
                        <span>Added by {ev.owner_name}</span>
                      )}
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    <a
                      href={buildGoogleCalendarUrl(toIcsEvent(ev), tz)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-1 text-[11px] font-medium text-primary hover:bg-primary/20"
                      title="Add to Google Calendar"
                    >
                      <CalendarDays className="h-3 w-3" />
                      Add
                    </a>
                    {ev.is_mine && ev.id.startsWith("cal-") && (
                      <button
                        type="button"
                        onClick={() => handleDelete(ev)}
                        className="rounded-full p-1 text-muted-foreground hover:bg-muted hover:text-destructive"
                        title="Delete event"
                        aria-label="Delete event"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------

function AddEventPopover({
  open,
  onOpenChange,
  defaultStudentId,
  studentOptions,
  onCreate,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultStudentId: string | null;
  studentOptions: Array<{ id: string; name: string }>;
  onCreate: (input: {
    title: string;
    detail: string | null;
    event_date: string;
    visibility: "private" | "team";
    student_id: string | null;
  }) => Promise<void>;
}) {
  const [title, setTitle] = useState("");
  const [detail, setDetail] = useState("");
  const [date, setDate] = useState<string>(toIsoDate(new Date()));
  const [visibility, setVisibility] = useState<"private" | "team">("private");
  const [studentSel, setStudentSel] = useState<string>(
    defaultStudentId ?? (studentOptions[0]?.id ?? ""),
  );
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (open) {
      setTitle("");
      setDetail("");
      setDate(toIsoDate(new Date()));
      setVisibility(defaultStudentId ? "team" : "private");
      setStudentSel(defaultStudentId ?? (studentOptions[0]?.id ?? ""));
    }
  }, [open, defaultStudentId, studentOptions]);

  const teamPossible = studentOptions.length > 0 || !!defaultStudentId;

  return (
    <Popover open={open} onOpenChange={onOpenChange}>
      <PopoverTrigger asChild>
        <Button size="sm" variant="default">
          <Plus className="mr-1.5 h-3.5 w-3.5" />
          Add event
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[320px] pointer-events-auto" align="end">
        <form
          className="space-y-3"
          onSubmit={async (e) => {
            e.preventDefault();
            if (!title.trim()) {
              toast.error("Title is required.");
              return;
            }
            if (visibility === "team" && !studentSel) {
              toast.error("Pick a student for team events.");
              return;
            }
            setBusy(true);
            try {
              await onCreate({
                title: title.trim(),
                detail: detail.trim() ? detail.trim() : null,
                event_date: date,
                visibility,
                student_id: visibility === "team" ? studentSel : (defaultStudentId ?? null),
              });
            } finally {
              setBusy(false);
            }
          }}
        >
          <div>
            <Label htmlFor="ce-title" className="text-xs">Title</Label>
            <Input
              id="ce-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Driver's ed registration deadline"
              maxLength={200}
              autoFocus
            />
          </div>
          <div>
            <Label htmlFor="ce-date" className="text-xs">Date</Label>
            <Input
              id="ce-date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="ce-detail" className="text-xs">Note (optional)</Label>
            <Textarea
              id="ce-detail"
              value={detail}
              onChange={(e) => setDetail(e.target.value)}
              rows={2}
              maxLength={2000}
            />
          </div>
          <div>
            <Label className="text-xs">Visibility</Label>
            <Select
              value={visibility}
              onValueChange={(v) => setVisibility(v as "private" | "team")}
              disabled={!teamPossible}
            >
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="private">Private (only you)</SelectItem>
                <SelectItem value="team" disabled={!teamPossible}>
                  Team (everyone collaborating on this student)
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
          {visibility === "team" && !defaultStudentId && studentOptions.length > 0 && (
            <div>
              <Label className="text-xs">Student</Label>
              <Select value={studentSel} onValueChange={setStudentSel}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Pick a student" />
                </SelectTrigger>
                <SelectContent>
                  {studentOptions.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="ghost" size="sm" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" size="sm" disabled={busy}>
              {busy && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
              Add to calendar
            </Button>
          </div>
        </form>
      </PopoverContent>
    </Popover>
  );
}
