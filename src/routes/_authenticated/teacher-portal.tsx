import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import {
  GraduationCap,
  CalendarClock,
  Target,
  ShieldAlert,
  Loader2,
  AlertTriangle,
  Info,
  ChevronRight,
} from "lucide-react";

import { SiteShell } from "@/components/site/SiteShell";
import { RoleGuard } from "@/components/RoleGuard";
import { Breadcrumbs } from "@/components/site/Breadcrumbs";
import { PageContainer } from "@/components/layout/PageContainer";
import { PageHeader } from "@/components/layout/PageHeader";
import { Section } from "@/components/layout/Section";
import { StatGrid, StatCard } from "@/components/layout/StatGrid";
import { Badge } from "@/components/ui/badge";
import {
  getTeacherPortal,
  type TeacherPortalPayload,
} from "@/lib/teacher-portal.functions";

export const Route = createFileRoute("/_authenticated/teacher-portal")({
  head: () => ({
    meta: [
      { title: "Teacher Portal — TransitionForward" },
      {
        name: "description",
        content:
          "Upcoming IEP transition milestones, goal target dates, and Connecticut compliance reminders for your caseload.",
      },
    ],
  }),
  component: TeacherPortalPage,
});

function TeacherPortalPage() {
  return (
    <RoleGuard path="/teacher-portal" allow={["educator", "admin"]}>
      <SiteShell>
        <PageContainer>
          <Breadcrumbs items={[{ label: "Teacher Portal" }]} />
          <PageHeader
            icon={GraduationCap}
            title="Teacher Portal"
            description="Upcoming transition milestones, goal target dates, and Connecticut compliance reminders for your caseload."
          />
          <PortalBody />
        </PageContainer>
      </SiteShell>
    </RoleGuard>
  );
}

function PortalBody() {
  const fetchPortal = useServerFn(getTeacherPortal);
  const [data, setData] = useState<TeacherPortalPayload | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    fetchPortal()
      .then(setData)
      .catch((e) => setErr(e instanceof Error ? e.message : "Couldn't load portal."));
  }, [fetchPortal]);

  if (err) {
    return (
      <p className="rounded-xl border border-destructive/40 bg-destructive/10 p-4 text-sm">
        {err}
      </p>
    );
  }
  if (!data) {
    return (
      <p className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading caseload…
      </p>
    );
  }
  if (data.students.length === 0) {
    return (
      <div className="rounded-2xl border bg-card p-8 text-center shadow-soft">
        <p className="font-display text-lg">No students on your caseload yet.</p>
        <p className="mt-2 text-sm text-muted-foreground">
          Once a student is added or shared with you, their milestones will appear here.
        </p>
        <Link
          to="/caseload"
          className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
        >
          Go to Caseload <ChevronRight className="h-4 w-4" />
        </Link>
      </div>
    );
  }

  const overdueReminders = data.reminders.filter((r) => r.severity === "overdue").length;
  const dueReminders = data.reminders.filter((r) => r.severity === "due").length;
  const overdueGoals = data.upcomingGoals.filter(
    (g) => g.days_until !== null && g.days_until < 0,
  ).length;

  return (
    <div className="space-y-6 sm:space-y-8">
      <StatGrid>
        <StatCard
          icon={GraduationCap}
          label="Students on caseload"
          value={data.students.length}
        />
        <StatCard
          icon={CalendarClock}
          label="Upcoming meetings (next 90d)"
          value={data.upcomingMeetings.length}
        />
        <StatCard
          icon={Target}
          label="Goals due / overdue"
          value={data.upcomingGoals.length}
          hint={overdueGoals > 0 ? `${overdueGoals} overdue` : undefined}
        />
        <StatCard
          icon={ShieldAlert}
          label="Compliance reminders"
          value={dueReminders + overdueReminders}
          hint={overdueReminders > 0 ? `${overdueReminders} overdue` : undefined}
        />
      </StatGrid>

      <Section
        title="Compliance reminders"
        description="Connecticut transition planning checkpoints based on each student's age and grade band."
      >
        {data.reminders.length === 0 ? (
          <p className="text-sm text-muted-foreground">No reminders at this time.</p>
        ) : (
          <ul className="space-y-3">
            {data.reminders.map((r, idx) => (
              <li
                key={`${r.student_id}-${idx}`}
                className="rounded-xl border bg-card p-4 shadow-soft"
              >
                <div className="flex items-start gap-3">
                  <SeverityIcon severity={r.severity} />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Link
                        to="/students"
                        className="text-sm font-semibold hover:underline"
                      >
                        {r.student_name}
                      </Link>
                      <SeverityBadge severity={r.severity} />
                      <Badge variant="outline" className="text-[10px]">
                        {bandLabel(r.band)}
                      </Badge>
                    </div>
                    <p className="mt-1 text-sm font-medium">{r.title}</p>
                    <p className="mt-1 text-xs text-muted-foreground">{r.body}</p>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Section>

      <Section
        title="Upcoming transition milestones"
        description="IEP and PPT meetings scheduled in the next 90 days."
      >
        {data.upcomingMeetings.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No upcoming meetings scheduled.{" "}
            <Link to="/meetings" className="text-primary hover:underline">
              Schedule one
            </Link>
            .
          </p>
        ) : (
          <ul className="divide-y rounded-xl border bg-card shadow-soft">
            {data.upcomingMeetings.map((m) => (
              <li key={m.id} className="flex items-start justify-between gap-3 p-4">
                <div className="min-w-0">
                  <p className="text-sm font-medium">{m.title}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {m.student_name} · {m.kind}
                  </p>
                </div>
                <div className="shrink-0 text-right">
                  <p className="text-xs font-medium">
                    {new Date(m.scheduled_at).toLocaleDateString(undefined, {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    {m.days_until === 0
                      ? "Today"
                      : m.days_until === 1
                        ? "Tomorrow"
                        : `in ${m.days_until} days`}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Section>

      <Section
        title="Goal target dates"
        description="Open transition goals approaching or past their target date."
      >
        {data.upcomingGoals.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No upcoming goal deadlines.{" "}
            <Link to="/goals" className="text-primary hover:underline">
              Open Goal Tracker
            </Link>
            .
          </p>
        ) : (
          <ul className="divide-y rounded-xl border bg-card shadow-soft">
            {data.upcomingGoals.map((g) => {
              const overdue = g.days_until !== null && g.days_until < 0;
              return (
                <li key={g.id} className="flex items-start justify-between gap-3 p-4">
                  <div className="min-w-0">
                    <p className="text-sm font-medium">{g.title}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {g.student_name} · {g.category} · {g.status}
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p
                      className={`text-xs font-medium ${
                        overdue ? "text-destructive" : ""
                      }`}
                    >
                      {g.target_date
                        ? new Date(g.target_date + "T00:00:00").toLocaleDateString(undefined, {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })
                        : "No target date"}
                    </p>
                    {g.days_until !== null ? (
                      <p
                        className={`text-[11px] ${
                          overdue ? "text-destructive" : "text-muted-foreground"
                        }`}
                      >
                        {overdue
                          ? `${Math.abs(g.days_until)}d overdue`
                          : g.days_until === 0
                            ? "Due today"
                            : `in ${g.days_until} days`}
                      </p>
                    ) : null}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </Section>
    </div>
  );
}

function SeverityIcon({ severity }: { severity: "info" | "due" | "overdue" }) {
  if (severity === "overdue")
    return <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />;
  if (severity === "due")
    return <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />;
  return <Info className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />;
}

function SeverityBadge({ severity }: { severity: "info" | "due" | "overdue" }) {
  if (severity === "overdue")
    return <Badge variant="destructive" className="text-[10px]">Overdue</Badge>;
  if (severity === "due")
    return (
      <Badge className="bg-amber-100 text-amber-900 hover:bg-amber-100 text-[10px]">
        Action Needed
      </Badge>
    );
  return <Badge variant="secondary" className="text-[10px]">FYI</Badge>;
}

function bandLabel(band: string): string {
  switch (band) {
    case "early":
      return "Pre-transition";
    case "age_14":
      return "Age 14+";
    case "age_16":
      return "Age 16+";
    case "age_17":
      return "Age 17 — Rights notice";
    case "age_18_plus":
      return "Age 18 — Rights transferred";
    case "exit_year":
      return "Exit year";
    default:
      return band;
  }
}
