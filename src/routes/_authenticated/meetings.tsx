import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Calendar, Plus, ArrowRight } from "lucide-react";

import { SiteShell } from "@/components/site/SiteShell";
import { Breadcrumbs } from "@/components/site/Breadcrumbs";
import { InfoBox } from "@/components/site/InfoBox";
import { Button } from "@/components/ui/button";
import {
  listMeetings,
  createMeeting,
  MEETING_KINDS,
  type Meeting,
  type MeetingKind,
} from "@/lib/meetings.functions";
import { listStudents, type Student } from "@/lib/students.functions";

export const Route = createFileRoute("/_authenticated/meetings")({
  head: () => ({
    meta: [
      { title: "Meeting Center — TransitionForward" },
      {
        name: "description",
        content:
          "Prep, run, and follow up on PPT/IEP meetings — agendas, student voice, family concerns, and action items in one place.",
      },
    ],
  }),
  component: MeetingsPage,
});

function MeetingsPage() {
  const fetchMeetings = useServerFn(listMeetings);
  const create = useServerFn(createMeeting);
  const fetchStudents = useServerFn(listStudents);
  const [meetings, setMeetings] = useState<Meeting[] | null>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [showForm, setShowForm] = useState(false);

  const reload = () =>
    fetchMeetings({ data: {} })
      .then((r) => setMeetings(r.meetings))
      .catch(() => setMeetings([]));
  useEffect(() => {
    reload();
    fetchStudents()
      .then((r) => setStudents(r.students))
      .catch(() => setStudents([]));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleCreate(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const scheduledRaw = String(fd.get("scheduled_at") || "");
    await create({
      data: {
        student_id: String(fd.get("student_id")),
        kind: String(fd.get("kind")) as MeetingKind,
        title: String(fd.get("title")),
        location: String(fd.get("location") || "") || undefined,
        scheduled_at: scheduledRaw ? new Date(scheduledRaw).toISOString() : undefined,
      },
    });
    setShowForm(false);
    await reload();
  }

  const studentName = (id: string) => students.find((s) => s.id === id)?.first_name ?? "—";

  const upcoming = (meetings ?? []).filter((m) => m.status === "upcoming");
  const past = (meetings ?? []).filter((m) => m.status !== "upcoming");

  return (
    <SiteShell>
      <div className="mx-auto max-w-5xl px-4 pt-8 sm:px-6 lg:px-8">
        <Breadcrumbs trail={[{ label: "Dashboard", to: "/dashboard" }, { label: "Meetings" }]} />
      </div>
      <section className="mx-auto max-w-5xl px-4 py-6 sm:px-6 lg:px-8">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">Meeting Center</p>
            <h1 className="mt-2 font-display text-3xl font-medium tracking-tight sm:text-4xl">
              Walk Into Every PPT Prepared.
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
              One workspace for upcoming meetings, agendas, student voice, family concerns, teacher
              notes, questions to ask, and follow-up action items.
            </p>
          </div>
          <Button onClick={() => setShowForm((s) => !s)} disabled={students.length === 0}>
            <Plus className="h-4 w-4" />
            {showForm ? "Close" : "Schedule meeting"}
          </Button>
        </div>

        {students.length === 0 && (
          <InfoBox label="Add a student to start" defaultOpen className="mt-6 max-w-2xl">
            Meetings are tied to a student. Add a student first, then schedule.
          </InfoBox>
        )}

        {showForm && (
          <form
            onSubmit={handleCreate}
            className="mt-6 grid gap-4 rounded-2xl border bg-card p-5 shadow-soft sm:grid-cols-2"
          >
            <label className="text-sm">
              <span className="mb-1 block font-medium">Student *</span>
              <select required name="student_id" className="w-full rounded-lg border bg-background px-3 py-2">
                {students.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.first_name}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-sm">
              <span className="mb-1 block font-medium">Meeting type *</span>
              <select required name="kind" defaultValue="PPT" className="w-full rounded-lg border bg-background px-3 py-2">
                {MEETING_KINDS.map((k) => (
                  <option key={k} value={k}>
                    {k}
                  </option>
                ))}
              </select>
            </label>
            <label className="sm:col-span-2 text-sm">
              <span className="mb-1 block font-medium">Title *</span>
              <input
                required
                name="title"
                maxLength={200}
                placeholder="e.g. Daniel's Spring PPT"
                className="w-full rounded-lg border bg-background px-3 py-2"
              />
            </label>
            <label className="text-sm">
              <span className="mb-1 block font-medium">Date & time</span>
              <input
                type="datetime-local"
                name="scheduled_at"
                className="w-full rounded-lg border bg-background px-3 py-2"
              />
            </label>
            <label className="text-sm">
              <span className="mb-1 block font-medium">Location / link</span>
              <input
                name="location"
                maxLength={200}
                className="w-full rounded-lg border bg-background px-3 py-2"
              />
            </label>
            <div className="sm:col-span-2 flex gap-2">
              <Button type="submit">Schedule</Button>
            </div>
          </form>
        )}

        <h2 className="mt-10 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Upcoming
        </h2>
        {meetings === null ? (
          <p className="mt-3 text-sm text-muted-foreground">Loading…</p>
        ) : upcoming.length === 0 ? (
          <div className="mt-3 rounded-2xl border border-dashed bg-muted/30 p-5 text-sm text-muted-foreground">
            No upcoming meetings.{" "}
            {students.length > 0 && (
              <button
                type="button"
                onClick={() => setShowForm(true)}
                className="font-medium text-primary underline-offset-2 hover:underline"
              >
                Schedule one
              </button>
            )}
          </div>
        ) : (
          <ul className="mt-3 grid gap-3 sm:grid-cols-2">
            {upcoming.map((m) => (
              <MeetingCard key={m.id} m={m} student={studentName(m.student_id)} />
            ))}
          </ul>
        )}

        {past.length > 0 && (
          <>
            <h2 className="mt-10 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Past
            </h2>
            <ul className="mt-3 grid gap-3 sm:grid-cols-2">
              {past.map((m) => (
                <MeetingCard key={m.id} m={m} student={studentName(m.student_id)} />
              ))}
            </ul>
          </>
        )}
      </section>
    </SiteShell>
  );
}

function MeetingCard({ m, student }: { m: Meeting; student: string }) {
  return (
    <li className="rounded-2xl border bg-card p-5 shadow-soft transition-shadow hover:shadow-lift">
      <Link to="/meetings/$meetingId" params={{ meetingId: m.id }} className="block">
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-primary" />
          <span className="text-xs font-semibold uppercase tracking-wider text-primary">
            {m.kind} · {student}
          </span>
        </div>
        <h3 className="mt-2 font-display text-lg">{m.title}</h3>
        <p className="mt-1 text-xs text-muted-foreground">
          {m.scheduled_at ? new Date(m.scheduled_at).toLocaleString() : "Unscheduled"}
          {m.location ? ` · ${m.location}` : ""}
        </p>
        <span className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-primary">
          Open prep <ArrowRight className="h-3.5 w-3.5" />
        </span>
      </Link>
    </li>
  );
}
