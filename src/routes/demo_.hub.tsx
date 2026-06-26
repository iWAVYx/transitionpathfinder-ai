import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Bookmark,
  Building2,
  Mail,

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
  DEFAULT_DEMO_STUDENT,
  DemoStepBar,
  DemoStepFooter,
  demoStudentSearch,
  validateStudentSearch,
} from "@/components/site/DemoStepBar";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { getDemoStudent } from "@/lib/demo-data";
import { toTitleCase } from "@/lib/title-case";
import { DemoCalendarPreview } from "@/components/pathway/DemoCalendarPreview";

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
  const search = Route.useSearch();
  const s = search.s ?? DEFAULT_DEMO_STUDENT;
  const preservedStudentSearch = demoStudentSearch(search.s);
  const bundle = getDemoStudent(s);
  const { profile: student, report } = bundle;

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

  type ActivityItem = {
    icon: React.ReactNode;
    text: string;
    when: string;
    milestone?: {
      kind: "planned" | "in-progress" | "completed";
      goal: string;
    };
  };

  const activity: ActivityItem[] = [
    {
      icon: <CheckCircle2 className="h-3.5 w-3.5" />,
      text: `Milestone reached on "${goals[0]?.title ?? "transition goal"}"`,
      when: "Yesterday",
      milestone: { kind: "completed", goal: goals[0]?.area ?? "Goal" },
    },
    {
      icon: <FileText className="h-3.5 w-3.5" />,
      text: "Pathway Report generated and shared with case manager",
      when: "2 days ago",
    },
    {
      icon: <Target className="h-3.5 w-3.5" />,
      text: `Step in progress on "${goals[1]?.title ?? "next goal"}"`,
      when: "4 days ago",
      milestone: { kind: "in-progress", goal: goals[1]?.area ?? "Goal" },
    },
    { icon: <Upload className="h-3.5 w-3.5" />, text: "Document uploaded", when: "5 days ago" },
    {
      icon: <MessageSquare className="h-3.5 w-3.5" />,
      text: `${student.case_manager} added a note about an upcoming placement`,
      when: "1 week ago",
    },
    {
      icon: <Circle className="h-3.5 w-3.5" />,
      text: `Step planned on "${goals[2]?.title ?? "upcoming goal"}"`,
      when: "2 weeks ago",
      milestone: { kind: "planned", goal: goals[2]?.area ?? "Goal" },
    },
  ];

  const milestoneStyles = {
    planned: {
      ring: "ring-muted-foreground/20",
      bg: "bg-muted text-muted-foreground",
      label: "Planned",
      pill: "bg-muted text-muted-foreground",
    },
    "in-progress": {
      ring: "ring-primary/20",
      bg: "bg-primary/15 text-primary",
      label: "In progress",
      pill: "bg-primary/15 text-primary",
    },
    completed: {
      ring: "ring-emerald-500/20",
      bg: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
      label: "Completed",
      pill: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
    },
  } as const;

  const avgGoalProgress = goals.length
    ? Math.round(goals.reduce((s, g) => s + g.progress, 0) / goals.length)
    : 0;
  const readinessLevel = report.student_snapshot?.readiness_level ?? "developing";
  const readinessPct =
    readinessLevel === "ready" ? 85 : readinessLevel === "emerging" ? 25 : 55;




  return (
    <SiteShell>
      <div className="demo-shell">
        <DemoStepBar current="hub" student={s} />

      <section className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-10 lg:px-8 lg:py-14">
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
              <Button asChild variant="outline" size="sm">
                <Link to="/demo/calendar" {...(preservedStudentSearch ? { search: preservedStudentSearch } : {})}>
                  <Calendar className="h-4 w-4" /> Open Calendar
                </Link>
              </Button>
              <Button size="sm" asChild>
                <Link to="/demo/report" {...(preservedStudentSearch ? { search: preservedStudentSearch } : {})}>
                  <FileText className="h-4 w-4" /> Open Pathway Report
                </Link>
              </Button>
            </div>
          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <StatTile
              label="Active goals"
              value={String(goals.length)}
              hint={`${avgGoalProgress}% avg progress`}
              progress={avgGoalProgress}
            />
            <StatTile label="Documents" value={String(documents.length)} hint="IEP up to date" icon={<FileText className="h-4 w-4" />} />
            <StatTile
              label="Overall readiness"
              value={toTitleCase(readinessLevel)}
              hint="Trending up"
              progress={readinessPct}
            />
            <StatTile label="Privacy" value="Family-led" hint="3 collaborators" icon={<Lock className="h-4 w-4" />} />
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

        <div className="mt-10 grid gap-10 lg:grid-cols-[1fr_320px]">
          {/* Main column */}
          <div className="space-y-10">
            <section className="space-y-5">
              <SectionHeader label="The Plan" />

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

              <div className="grid gap-6 sm:grid-cols-2">
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
                            {d.type} · {d.date}
                          </p>
                        </div>
                        <Button variant="ghost" size="sm" className="shrink-0">
                          <Download className="h-3.5 w-3.5" />
                        </Button>
                      </li>
                    ))}
                  </ul>
                </Panel>

                <Panel
                  icon={<Sparkles className="h-5 w-5" />}
                  title="This week"
                  action={<span className="text-xs text-muted-foreground">{student.first_name}'s plan</span>}
                >
                  <ol className="space-y-3">
                    {(report.family_action_plan?.this_week ?? []).map((step, i) => (
                      <li key={step} className="flex gap-3">
                        <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                          {i + 1}
                        </span>
                        <p className="text-sm text-foreground/85">{step}</p>
                      </li>
                    ))}
                  </ol>
                </Panel>
              </div>
            </section>

            <section className="space-y-5">
              <SectionHeader label="Resources" />
              <div className="grid gap-6 sm:grid-cols-2">
                <Panel icon={<Bookmark className="h-5 w-5" />} title="Saved resources">
                  <ul className="space-y-3 text-sm">
                    <li className="rounded-2xl border border-border/60 bg-background p-3">
                      <p className="font-medium">Transition Planning 101</p>
                      <p className="text-xs text-muted-foreground">Matches {student.first_name}'s interests.</p>
                    </li>
                    <li className="rounded-2xl border border-border/60 bg-background p-3">
                      <p className="font-medium">Self-Advocacy Workbook</p>
                      <p className="text-xs text-muted-foreground">Supports the self-advocacy growth area.</p>
                    </li>
                  </ul>
                </Panel>

                <Panel icon={<Building2 className="h-5 w-5" />} title="Recommended partners">
                  <ul className="space-y-3 text-sm">
                    <li className="rounded-2xl border border-border/60 bg-background p-3">
                      <p className="font-medium">The Kennedy Collective</p>
                      <p className="text-xs text-muted-foreground">Reached out — waiting on intake call.</p>
                    </li>
                    <li className="rounded-2xl border border-border/60 bg-background p-3">
                      <p className="font-medium">BRS Regional Offices</p>
                      <p className="text-xs text-muted-foreground">Bookmarked for summer planning.</p>
                    </li>
                  </ul>
                </Panel>
              </div>
            </section>
          </div>

          {/* Side column */}
          <aside className="space-y-10">
            <section className="space-y-5">
              <SectionHeader label="Schedule" align="start" />
              <DemoCalendarPreview
                student={s}
                title="Upcoming"
                subtitle={`From ${student.first_name}'s Pathway Report and care-team adds.`}
                limit={4}
              />
            </section>

            <section className="space-y-5">
              <SectionHeader label="People" align="start" />
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

              <Panel icon={<Mail className="h-5 w-5" />} title="Invites">
                <div className="rounded-2xl border border-border/60 bg-background p-3">
                  <p className="text-sm font-medium">coach@{student.first_name.toLowerCase()}-team.demo</p>
                  <p className="text-xs text-muted-foreground">Viewer · Pending</p>
                  <div className="mt-2 flex gap-2">
                    <Button variant="outline" size="sm" disabled>Accept</Button>
                    <Button variant="ghost" size="sm" disabled>Decline</Button>
                  </div>
                </div>
              </Panel>
            </section>

            <section className="space-y-5">
              <SectionHeader label="Activity" align="start" />
              <div className="rounded-3xl border bg-card p-5 shadow-soft sm:p-6">
                <ol className="relative space-y-5">
                  <span
                    aria-hidden
                    className="absolute left-[13px] top-2 bottom-2 w-px bg-border/70"
                  />
                  {activity.map((a, i) => {
                    const style = a.milestone ? milestoneStyles[a.milestone.kind] : null;
                    return (
                      <li key={i} className="relative flex gap-3 pl-9">
                        <span
                          className={`absolute left-0 top-0 inline-flex h-7 w-7 items-center justify-center rounded-full ring-4 ring-card ${
                            style ? `${style.bg} ${style.ring}` : "bg-primary/10 text-primary"
                          }`}
                        >
                          {a.icon}
                        </span>
                        <div className="min-w-0">
                          <p className="text-sm text-foreground/85">{a.text}</p>
                          <div className="mt-1 flex flex-wrap items-center gap-2">
                            <p className="text-xs text-muted-foreground">{a.when}</p>
                            {style && a.milestone && (
                              <span
                                className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${style.pill}`}
                              >
                                <span className="h-1.5 w-1.5 rounded-full bg-current" />
                                {style.label} · {a.milestone.goal}
                              </span>
                            )}
                          </div>
                        </div>
                      </li>
                    );
                  })}
                </ol>
              </div>
            </section>

          </aside>
        </div>

        <DemoStepFooter current="hub" student={s} />
      </section>
      </div>
    </SiteShell>
  );
}

function StatTile({
  label,
  value,
  hint,
  icon,
  progress,
}: {
  label: string;
  value: string;
  hint: string;
  icon?: React.ReactNode;
  progress?: number;
}) {
  return (
    <div className="rounded-2xl border border-border/60 bg-background p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            {label}
          </p>
          <p className="mt-2 font-display text-xl">{value}</p>
          <p className="mt-0.5 text-xs text-muted-foreground">{hint}</p>
        </div>
        {typeof progress === "number" ? (
          <RingProgress value={progress} />
        ) : (
          <span className="text-primary">{icon}</span>
        )}
      </div>
    </div>
  );
}

function RingProgress({ value, size = 44 }: { value: number; size?: number }) {
  const stroke = 4;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const clamped = Math.max(0, Math.min(100, value));
  const offset = c - (clamped / 100) * c;
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke="currentColor"
          strokeWidth={stroke}
          fill="none"
          className="text-muted"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke="currentColor"
          strokeWidth={stroke}
          fill="none"
          strokeDasharray={c}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className="text-primary transition-all duration-500"
        />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center text-[10px] font-semibold text-primary">
        {clamped}%
      </span>
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

function SectionHeader({ label, align = "center" }: { label: string; align?: "center" | "start" }) {
  if (align === "start") {
    return (
      <h2 className="text-[11px] font-bold uppercase tracking-[0.22em] text-muted-foreground">
        {label}
      </h2>
    );
  }
  return (
    <div className="flex items-center gap-4">
      <div className="h-px flex-grow bg-border/70" />
      <h2 className="text-[11px] font-bold uppercase tracking-[0.22em] text-muted-foreground">
        {label}
      </h2>
      <div className="h-px flex-grow bg-border/70" />
    </div>
  );
}
