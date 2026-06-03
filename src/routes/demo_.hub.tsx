import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Sparkles,
  Target,
  FileText,
  Users,
  Calendar,
  CheckCircle2,
  Circle,
  Clock,
  Download,
  Upload,
  Lock,
  MessageSquare,
} from "lucide-react";

import { SiteShell } from "@/components/site/SiteShell";
import {
  DemoStepBar,
  DemoStepFooter,
  validateStudentSearch,
} from "@/components/site/DemoStepBar";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { getDemoStudent } from "@/lib/demo-data";
import { toTitleCase } from "@/lib/title-case";

export const Route = createFileRoute("/demo_/hub")({
  validateSearch: validateStudentSearch,
  head: () => ({
    meta: [
      { title: "Sample Student Hub — TransitionForward demo" },
      {
        name: "description",
        content:
          "The ongoing student workspace where families and educators track goals, documents, and progress.",
      },
      { property: "og:url", content: "/demo/hub" },
    ],
    links: [{ rel: "canonical", href: "/demo/hub" }],
  }),
  component: DemoHubPage,
});

function DemoHubPage() {
  const { s } = Route.useSearch();
  const bundle = getDemoStudent(s);
  const { profile: student, report, nextMeetingDate } = bundle;

  const goals = (report.readiness_scorecard ?? []).slice(0, 4).map((g, i) => ({
    title: g.suggested_goal ?? g.growth_activity ?? g.category,
    area: g.category,
    progress: [55, 40, 20, 5][i] ?? 15,
    status:
      g.level === "ready"
        ? ("complete" as const)
        : g.level === "developing"
          ? ("in-progress" as const)
          : ("upcoming" as const),
    next: g.growth_activity,
  }));

  const documents = [
    { name: `Pathway Report — Spring 2026`, type: "Report", date: bundle.issued, size: "412 KB" },
    { name: `${student.first_name} — IEP 2025-2026`, type: "IEP", date: "Sep 12, 2025", size: "1.1 MB" },
    { name: "Vocational interest inventory", type: "Assessment", date: "Oct 3, 2025", size: "240 KB" },
    { name: "Volunteer / activity log", type: "Evidence", date: "Feb 28, 2026", size: "86 KB" },
  ];

  const collaborators = [
    {
      name: s === "jordan" ? "Marcus Bennett" : "Elena Rivera",
      role: "Parent · Primary contact",
      initials: s === "jordan" ? "MB" : "ER",
      color: "bg-primary/15 text-primary",
    },
    {
      name: student.case_manager,
      role: `Case manager · ${student.school}`,
      initials: student.case_manager
        .split(" ")
        .map((p) => p[0])
        .slice(0, 2)
        .join(""),
      color: "bg-amber-500/15 text-amber-700 dark:text-amber-300",
    },
    {
      name: s === "jordan" ? "Ms. Patel" : "Mr. Chen",
      role: "Transition coordinator",
      initials: s === "jordan" ? "MP" : "MC",
      color: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
    },
  ];

  const activity = [
    {
      icon: <FileText className="h-4 w-4" />,
      text: "Pathway Report generated and shared with case manager",
      when: "2 days ago",
    },
    { icon: <Upload className="h-4 w-4" />, text: "Document uploaded", when: "5 days ago" },
    {
      icon: <MessageSquare className="h-4 w-4" />,
      text: `${student.case_manager} added a note about an upcoming placement`,
      when: "1 week ago",
    },
    {
      icon: <Target className="h-4 w-4" />,
      text: "Goal progress updated",
      when: "2 weeks ago",
    },
  ];

  const upcoming = [
    {
      title: "PPT meeting",
      date: nextMeetingDate,
      body: `Bring the Pathway Report and ${student.first_name}'s questions.`,
    },
    ...report.thirty_day_plan.slice(0, 2).map((p) => ({
      title: `Week ${p.week}`,
      date: "Next 30 days",
      body: p.action,
    })),
  ];

  return (
    <SiteShell>
      <DemoStepBar current="hub" student={s} />

      <section className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
        {/* Header card */}
        <div className="rounded-3xl border bg-card p-6 shadow-soft sm:p-8">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">
                Student Hub
              </p>
              <h1 className="mt-2 font-display text-3xl tracking-tight sm:text-4xl">
                {toTitleCase(student.full_name)}
              </h1>
              <p className="mt-1 text-sm text-muted-foreground">
                {student.pronouns} · {student.grade} · {student.school}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">{bundle.headline}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm">
                <Upload className="h-4 w-4" /> Upload document
              </Button>
              <Button size="sm" asChild>
                <Link to="/demo/report" search={{ s }}>
                  <FileText className="h-4 w-4" /> Open Pathway Report
                </Link>
              </Button>
            </div>
          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <StatTile label="Active goals" value={String(goals.length)} hint="2 in progress" icon={<Target className="h-4 w-4" />} />
            <StatTile label="Documents" value={String(documents.length)} hint="IEP up to date" icon={<FileText className="h-4 w-4" />} />
            <StatTile
              label="Overall readiness"
              value={
                report.student_snapshot?.readiness_level
                  ? toTitleCase(report.student_snapshot.readiness_level)
                  : "Developing"
              }
              hint="Trending up"
              icon={<Sparkles className="h-4 w-4" />}
            />
            <StatTile label="Privacy" value="Family-controlled" hint="3 collaborators" icon={<Lock className="h-4 w-4" />} />
          </div>

          <div className="mt-6 flex flex-wrap gap-2">
            {(report.student_snapshot?.primary_interests ?? []).slice(0, 4).map((interest) => (
              <span
                key={interest}
                className="inline-flex items-center gap-1.5 rounded-full bg-muted px-3 py-1 text-xs font-medium"
              >
                <Sparkles className="h-3 w-3 text-primary" />
                {interest}
              </span>
            ))}
          </div>
        </div>

        <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_320px]">
          {/* Main column */}
          <div className="space-y-6">
            {/* Goals */}
            <Panel
              icon={<Target className="h-5 w-5" />}
              title="Transition goals"
              action={<span className="text-xs text-muted-foreground">From the Pathway Report</span>}
            >
              <ul className="divide-y divide-border/60">
                {goals.map((g) => (
                  <li key={g.title} className="py-4 first:pt-0 last:pb-0">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-display text-base">{g.title}</p>
                        <p className="mt-0.5 text-xs text-muted-foreground">{g.area}</p>
                      </div>
                      <StatusPill status={g.status} />
                    </div>
                    <Progress value={g.progress} className="mt-3 h-2" />
                    <p className="mt-2 text-xs text-muted-foreground">
                      <span className="font-medium text-foreground/80">Next:</span> {g.next}
                    </p>
                  </li>
                ))}
              </ul>
            </Panel>

            {/* Documents */}
            <Panel
              icon={<FileText className="h-5 w-5" />}
              title="Documents"
              action={
                <Button variant="ghost" size="sm">
                  <Upload className="h-4 w-4" /> Upload
                </Button>
              }
            >
              <ul className="divide-y divide-border/60">
                {documents.map((d) => (
                  <li key={d.name} className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{d.name}</p>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {d.type} · {d.date} · {d.size}
                      </p>
                    </div>
                    <Button variant="ghost" size="sm" className="shrink-0">
                      <Download className="h-3.5 w-3.5" />
                    </Button>
                  </li>
                ))}
              </ul>
            </Panel>

            {/* This week */}
            <Panel
              icon={<Sparkles className="h-5 w-5" />}
              title="This week"
              action={<span className="text-xs text-muted-foreground">From {student.first_name}'s plan</span>}
            >
              <ol className="space-y-3">
                {(report.family_action_plan?.this_week ?? []).map((step, i) => (
                  <li key={step} className="flex gap-3 rounded-2xl border border-border/60 bg-background p-4">
                    <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
                      {i + 1}
                    </span>
                    <p className="text-sm text-foreground/85">{step}</p>
                  </li>
                ))}
              </ol>
            </Panel>
          </div>

          {/* Side column */}
          <aside className="space-y-6">
            <Panel icon={<Calendar className="h-5 w-5" />} title="Upcoming">
              <ul className="space-y-3">
                {upcoming.map((u) => (
                  <li key={u.title + u.date} className="rounded-2xl border border-border/60 bg-background p-3">
                    <p className="text-sm font-medium">{u.title}</p>
                    <p className="mt-0.5 text-[11px] font-medium uppercase tracking-wider text-primary">
                      {u.date}
                    </p>
                    <p className="mt-1 text-xs leading-snug text-muted-foreground">{u.body}</p>
                  </li>
                ))}
              </ul>
            </Panel>

            <Panel icon={<Users className="h-5 w-5" />} title="Care team">
              <ul className="space-y-3">
                {collaborators.map((c) => (
                  <li key={c.name} className="flex items-center gap-3">
                    <span
                      className={`inline-flex h-9 w-9 items-center justify-center rounded-full text-xs font-semibold ${c.color}`}
                    >
                      {c.initials}
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{c.name}</p>
                      <p className="truncate text-xs text-muted-foreground">{c.role}</p>
                    </div>
                  </li>
                ))}
              </ul>
              <Button variant="outline" size="sm" className="mt-4 w-full">
                Invite a team member
              </Button>
            </Panel>

            <Panel icon={<Clock className="h-5 w-5" />} title="Recent activity">
              <ul className="space-y-3">
                {activity.map((a, i) => (
                  <li key={i} className="flex gap-3 text-sm">
                    <span className="mt-0.5 text-primary">{a.icon}</span>
                    <div className="min-w-0">
                      <p className="text-foreground/85">{a.text}</p>
                      <p className="text-xs text-muted-foreground">{a.when}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </Panel>
          </aside>
        </div>

        <DemoStepFooter current="hub" student={s} />
      </section>
    </SiteShell>
  );
}

function StatTile({
  label,
  value,
  hint,
  icon,
}: {
  label: string;
  value: string;
  hint: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-border/60 bg-background p-4">
      <div className="flex items-center justify-between">
        <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
          {label}
        </p>
        <span className="text-primary">{icon}</span>
      </div>
      <p className="mt-2 font-display text-xl">{value}</p>
      <p className="mt-0.5 text-xs text-muted-foreground">{hint}</p>
    </div>
  );
}

function Panel({
  icon,
  title,
  action,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-3xl border bg-card p-5 shadow-soft sm:p-6">
      <div className="flex items-center justify-between gap-3 border-b border-border/60 pb-3">
        <h2 className="flex items-center gap-2 font-display text-lg">
          <span className="text-primary">{icon}</span>
          {title}
        </h2>
        {action}
      </div>
      <div className="pt-4">{children}</div>
    </div>
  );
}

function StatusPill({ status }: { status: "complete" | "in-progress" | "upcoming" }) {
  const config = {
    complete: { icon: <CheckCircle2 className="h-3 w-3" />, label: "Complete", cls: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300" },
    "in-progress": { icon: <Clock className="h-3 w-3" />, label: "In progress", cls: "bg-primary/15 text-primary" },
    upcoming: { icon: <Circle className="h-3 w-3" />, label: "Upcoming", cls: "bg-muted text-muted-foreground" },
  }[status];
  return (
    <span className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-medium ${config.cls}`}>
      {config.icon}
      {config.label}
    </span>
  );
}
