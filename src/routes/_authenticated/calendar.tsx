import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";

import { DashboardCalendar } from "@/components/dashboard/DashboardCalendar";
import { RoleGuard } from "@/components/RoleGuard";
import { Breadcrumbs } from "@/components/site/Breadcrumbs";
import { SiteShell } from "@/components/site/SiteShell";
import { listStudents, type Student } from "@/lib/students.functions";

export const Route = createFileRoute("/_authenticated/calendar")({
  head: () => ({
    meta: [
      { title: "Your Calendar — TransitionForward" },
      {
        name: "description",
        content: "Meetings, action-item deadlines, prep, personal events, and team events in one calendar view.",
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
  const fetchStudents = useServerFn(listStudents);
  const [students, setStudents] = useState<Student[]>([]);

  useEffect(() => {
    let active = true;
    fetchStudents()
      .then(({ students: rows }) => {
        if (active) setStudents(rows);
      })
      .catch(() => {
        // The calendar itself still loads personal events through caller RLS.
      });
    return () => { active = false; };
  }, [fetchStudents]);

  return (
    <SiteShell>
      <div className="mx-auto max-w-6xl px-4 pb-16 pt-6 sm:px-6 sm:pt-8 lg:px-8 lg:pt-10">
        <Breadcrumbs trail={[{ label: "Dashboard", to: "/dashboard" }, { label: "Calendar" }]} />
        <header className="mt-6">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">
            Transition Calendar
          </p>
          <h1 className="mt-1 font-display text-3xl font-medium tracking-tight sm:text-4xl">
            Your Calendar
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-foreground/75">
            The complete view behind your dashboard widget: meetings, action-item due dates,
            preparation deadlines, and your private or team events.
          </p>
        </header>
        <div className="mt-6">
          <DashboardCalendar
            title="Your Calendar"
            subtitle="All the events you are allowed to see, with filters, event management, and export."
            studentOptions={students.map((student) => ({
              id: student.id,
              name: `${student.first_name}${student.last_name ? ` ${student.last_name}` : ""}`,
            }))}
          />
        </div>
      </div>
    </SiteShell>
  );
}
