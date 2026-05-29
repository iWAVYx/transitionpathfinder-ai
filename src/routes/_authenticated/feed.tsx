import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import {
  Activity,
  Sparkles,
  Target,
  ClipboardList,
  MessageCircle,
  FileText,
  Calendar,
  FolderOpen,
  Compass,
  Heart,
} from "lucide-react";

import { SiteShell } from "@/components/site/SiteShell";
import { Breadcrumbs } from "@/components/site/Breadcrumbs";
import { InfoBox } from "@/components/site/InfoBox";
import { cn } from "@/lib/utils";
import { listFeed, type FeedEvent } from "@/lib/feed.functions";
import { listStudents, type Student } from "@/lib/students.functions";

export const Route = createFileRoute("/_authenticated/feed")({
  head: () => ({
    meta: [
      { title: "Family Transition Feed — TransitionForward" },
      {
        name: "description",
        content:
          "Every important update across your students — reports, goals, meetings, reflections, and messages — in one calm timeline.",
      },
    ],
  }),
  component: FeedPage,
});

const FILTERS = [
  { key: "all", label: "All" },
  { key: "goals", label: "Goals" },
  { key: "meetings", label: "Meetings" },
  { key: "reports", label: "Reports" },
  { key: "reflections", label: "Reflections" },
  { key: "messages", label: "Messages" },
  { key: "forms", label: "Forms" },
] as const;
type FilterKey = (typeof FILTERS)[number]["key"];

const KIND_GROUP: Record<string, FilterKey> = {
  "report.generated": "reports",
  "goal.added": "goals",
  "goal.status_changed": "goals",
  "reflection.added": "reflections",
  "progress_note.added": "reflections",
  "meeting.scheduled": "meetings",
  "meeting.summary_exported": "meetings",
  "form.completed": "forms",
  "resource.matched": "reports",
  "document.uploaded": "reports",
  "message.posted": "messages",
};

const KIND_ICON: Record<string, React.ComponentType<{ className?: string }>> = {
  "report.generated": Sparkles,
  "goal.added": Target,
  "goal.status_changed": Target,
  "reflection.added": Heart,
  "progress_note.added": ClipboardList,
  "meeting.scheduled": Calendar,
  "meeting.summary_exported": Calendar,
  "form.completed": FileText,
  "resource.matched": Compass,
  "document.uploaded": FolderOpen,
  "message.posted": MessageCircle,
};

function FeedPage() {
  const fetchFeed = useServerFn(listFeed);
  const fetchStudents = useServerFn(listStudents);
  const [events, setEvents] = useState<FeedEvent[] | null>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [filter, setFilter] = useState<FilterKey>("all");
  const [studentId, setStudentId] = useState<string | "all">("all");
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    fetchStudents()
      .then((r) => setStudents(r.students))
      .catch(() => setStudents([]));
  }, [fetchStudents]);

  useEffect(() => {
    setLoadError(null);
    fetchFeed({
      data: { limit: 150, ...(studentId !== "all" ? { student_id: studentId } : {}) },
    })
      .then((r) => setEvents(r.events))
      .catch((err) => {
        setEvents([]);
        setLoadError(err instanceof Error ? err.message : "Couldn't load your feed.");
      });
  }, [fetchFeed, studentId]);

  const filtered = useMemo(() => {
    if (!events) return null;
    if (filter === "all") return events;
    return events.filter((e) => KIND_GROUP[e.kind] === filter);
  }, [events, filter]);

  const grouped = useMemo(() => {
    if (!filtered) return null;
    const map = new Map<string, FeedEvent[]>();
    for (const ev of filtered) {
      const day = new Date(ev.created_at).toDateString();
      (map.get(day) ?? map.set(day, []).get(day)!).push(ev);
    }
    return [...map.entries()];
  }, [filtered]);

  const studentNameById = useMemo(() => {
    const m = new Map<string, string>();
    for (const s of students) m.set(s.id, s.first_name);
    return m;
  }, [students]);

  return (
    <SiteShell>
      <div className="mx-auto max-w-5xl px-4 pt-8 sm:px-6 lg:px-8">
        <Breadcrumbs trail={[{ label: "Dashboard", to: "/dashboard" }, { label: "Feed" }]} />
      </div>
      <section className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">Transition Feed</p>
        <h1 className="mt-2 font-display text-4xl font-medium tracking-tight sm:text-5xl">
          Everything That's Moving — In One Place.
        </h1>
        <p className="mt-3 max-w-2xl text-base leading-relaxed text-muted-foreground">
          New reports, goal updates, reflections, meeting reminders, completed forms, and
          messages — laid out gently so nothing important slips by.
        </p>

        <InfoBox label="What lives in the Feed?" className="mt-6 max-w-2xl">
          <p>
            The Feed automatically collects every meaningful update across your students. If you
            create a Pathway Report, mark a goal as in progress, schedule a PPT meeting, or send a
            message — it lands here in plain language, with a quick link back to the source.
          </p>
        </InfoBox>

        <div className="mt-6 flex flex-wrap items-center gap-2">
          <div className="flex flex-wrap gap-1.5">
            {FILTERS.map((f) => (
              <button
                key={f.key}
                onClick={() => setFilter(f.key)}
                className={cn(
                  "rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
                  filter === f.key
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-card text-muted-foreground hover:text-foreground",
                )}
              >
                {f.label}
              </button>
            ))}
          </div>
          {students.length > 0 && (
            <select
              value={studentId}
              onChange={(e) => setStudentId(e.target.value)}
              className="ml-auto rounded-full border bg-card px-3 py-1.5 text-xs"
            >
              <option value="all">All students</option>
              {students.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.first_name}
                </option>
              ))}
            </select>
          )}
        </div>

        <div className="mt-8">
          {loadError ? (
            <div className="rounded-2xl border border-destructive/40 bg-destructive/5 p-4 text-sm text-destructive">
              {loadError}
            </div>
          ) : grouped === null ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : grouped.length === 0 ? (
            <EmptyState />
          ) : (
            <ol className="relative space-y-10 border-l border-border/60 pl-6">
              {grouped.map(([day, evs]) => (
                <li key={day}>
                  <p className="-ml-6 mb-3 inline-flex items-center gap-2 rounded-full border bg-background px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    <Activity className="h-3 w-3 text-primary" />
                    {formatDay(day)}
                  </p>
                  <ul className="space-y-3">
                    {evs.map((ev) => {
                      const Icon = KIND_ICON[ev.kind] ?? Activity;
                      const student = ev.student_id
                        ? studentNameById.get(ev.student_id)
                        : null;
                      return (
                        <li
                          key={ev.id}
                          className="relative rounded-2xl border border-border/60 bg-card p-4 shadow-soft"
                        >
                          <span className="absolute -left-[34px] top-5 flex h-7 w-7 items-center justify-center rounded-full border bg-background text-primary shadow-soft">
                            <Icon className="h-3.5 w-3.5" />
                          </span>
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-medium text-foreground">{ev.title}</p>
                              {ev.body && (
                                <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                                  {ev.body}
                                </p>
                              )}
                              <div className="mt-2 flex flex-wrap items-center gap-1.5 text-[11px] text-muted-foreground">
                                {student && (
                                  <span className="rounded-full bg-muted px-2 py-0.5">
                                    {student}
                                  </span>
                                )}
                                <span>{formatTime(ev.created_at)}</span>
                              </div>
                            </div>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                </li>
              ))}
            </ol>
          )}
        </div>
      </section>
    </SiteShell>
  );
}

function EmptyState() {
  return (
    <div className="rounded-3xl border border-dashed bg-gradient-hero p-10 text-center shadow-soft">
      <div className="mx-auto inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-background/80 shadow-soft">
        <Activity className="h-6 w-6 text-primary" />
      </div>
      <h2 className="mt-4 font-display text-2xl font-medium tracking-tight">
        Your feed will fill up as you work.
      </h2>
      <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-muted-foreground">
        Create a Pathway Report, add a goal, or schedule a PPT meeting, and you'll see updates
        appear here automatically.
      </p>
      <div className="mt-6 flex flex-wrap justify-center gap-3">
        <Link
          to="/pathway"
          className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-soft hover:shadow-lift"
        >
          <Sparkles className="h-4 w-4" />
          Create a Pathway Report
        </Link>
        <Link
          to="/meetings"
          className="inline-flex items-center gap-2 rounded-full border bg-background px-5 py-2.5 text-sm font-medium"
        >
          Schedule a meeting
        </Link>
      </div>
    </div>
  );
}

function formatDay(d: string) {
  const date = new Date(d);
  const today = new Date();
  const yest = new Date();
  yest.setDate(today.getDate() - 1);
  if (date.toDateString() === today.toDateString()) return "Today";
  if (date.toDateString() === yest.toDateString()) return "Yesterday";
  return date.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" });
}
function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
}
