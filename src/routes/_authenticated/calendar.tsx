import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";

import { SiteShell } from "@/components/site/SiteShell";
import { Breadcrumbs } from "@/components/site/Breadcrumbs";
import { RoleGuard } from "@/components/RoleGuard";
import { TransitionCalendar } from "@/components/calendar/TransitionCalendar";
import type { CalendarEvent } from "@/lib/calendar/sample-events";
import { listMeetings, type Meeting } from "@/lib/meetings.functions";
import { listStudents, type Student } from "@/lib/students.functions";
import { listStudentActionItems } from "@/lib/action-items.functions";

export const Route = createFileRoute("/_authenticated/calendar")({
  head: () => ({
    meta: [
      { title: "Your Calendar — TransitionForward" },
      {
        name: "description",
        content:
          "Meetings, action-item deadlines, report reviews, and document due dates in one calendar view.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: () => (
    <RoleGuard path="/calendar">
      <CalendarPage />
    </RoleGuard>
  ),
});

function CalendarPage() {
  const fetchMeetings = useServerFn(listMeetings);
  const fetchStudents = useServerFn(listStudents);
  const fetchActions = useServerFn(listStudentActionItems);
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [actionEvents, setActionEvents] = useState<CalendarEvent[]>([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [m, s] = await Promise.all([
        fetchMeetings({ data: {} }).catch(() => ({ meetings: [] })),
        fetchStudents().catch(() => ({ students: [] })),
      ]);
      if (cancelled) return;
      setMeetings(m.meetings ?? []);
      setStudents(s.students ?? []);
      // Pull action items per student for due-date deadlines.
      const perStudent = await Promise.all(
        (s.students ?? []).map((st) =>
          fetchActions({ data: { student_id: st.id } })
            .then((r) => ({ st, items: r.items ?? [] }))
            .catch(() => ({ st, items: [] })),
        ),
      );
      if (cancelled) return;
      const evts: CalendarEvent[] = [];
      for (const { st, items } of perStudent) {
        for (const it of items) {
          if (!it.due_date || it.status === "completed") continue;
          evts.push({
            id: `action-${it.id}`,
            title: it.title,
            start: new Date(`${it.due_date}T09:00:00`).toISOString(),
            type: "action-item",
            scope: st.first_name,
            href: "/action-items",
            description: it.description ?? undefined,
            allDay: true,
          });
        }
      }
      setActionEvents(evts);
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const events = useMemo<CalendarEvent[]>(() => {
    const nameOf = (id: string) =>
      students.find((x) => x.id === id)?.first_name ?? "Student";
    const meetingEvents: CalendarEvent[] = meetings
      .filter((m) => m.scheduled_at)
      .map((m) => ({
        id: `meeting-${m.id}`,
        title: m.title,
        start: m.scheduled_at as string,
        end: undefined,
        type: "meeting",
        scope: nameOf(m.student_id),
        location: m.location ?? undefined,
        href: `/meetings/${m.id}`,
        description: `${m.kind} · ${nameOf(m.student_id)}`,
      }));
    return [...meetingEvents, ...actionEvents];
  }, [meetings, students, actionEvents]);

  return (
    <SiteShell>
      <div className="mx-auto max-w-6xl px-4 pb-16 pt-6 sm:px-6 sm:pt-8 lg:px-8 lg:pt-10">
        <Breadcrumbs
          trail={[
            { label: "Dashboard", to: "/dashboard" },
            { label: "Calendar" },
          ]}
        />
        <header className="mt-6">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">
            Transition Calendar
          </p>
          <h1 className="mt-1 font-display text-3xl font-medium tracking-tight sm:text-4xl">
            Your Calendar
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            One view for PPT meetings, action-item deadlines, report reviews,
            and document due dates — filter by type or switch to a week or
            agenda view.
          </p>
        </header>
        <div className="mt-6">
          <TransitionCalendar
            events={events}
            initialView="month"
            addEventHref="/meetings"
            exportFilename="transitionforward-calendar"
            emptyStateBody="Schedule your first PPT or add an action item with a due date and it will appear here."
          />
        </div>
      </div>
    </SiteShell>
  );
}
