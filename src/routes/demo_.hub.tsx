import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowLeft,
  ArrowRight,
  ShieldCheck,
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
  PawPrint,
  Palette,
  Leaf,
  Lock,
  MessageSquare,
} from "lucide-react";

import { SiteShell } from "@/components/site/SiteShell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { DEMO_STUDENT, DEMO_REPORT } from "@/lib/demo-data";

export const Route = createFileRoute("/demo_/hub")({
  head: () => ({
    meta: [
      { title: "Sample Student Hub — TransitionForward demo" },
      {
        name: "description",
        content:
          "See the ongoing student workspace where families and educators track goals, documents, and progress.",
      },
    ],
  }),
  component: DemoHubPage,
});

const GOALS = [
  {
    title: "Self-advocacy with new adults",
    area: "Self-determination",
    progress: 45,
    status: "in-progress" as const,
    next: "Practice introducing accommodations to a new teacher this quarter.",
  },
  {
    title: "Weekly animal-shelter volunteer shift",
    area: "Employment",
    progress: 20,
    status: "in-progress" as const,
    next: "Tour Connecticut Humane Society this Saturday with family.",
  },
  {
    title: "One CTtransit round-trip independently",
    area: "Independent travel",
    progress: 10,
    status: "upcoming" as const,
    next: "Request travel training through the district at next PPT.",
  },
  {
    title: "Pet First Aid certification",
    area: "Credential",
    progress: 0,
    status: "upcoming" as const,
    next: "Find a Red Cross course in Hartford County.",
  },
];

const DOCUMENTS = [
  { name: "Pathway Report — Spring 2026", type: "Report", date: "Mar 4, 2026", size: "412 KB" },
  { name: "Maya — IEP 2025-2026", type: "IEP", date: "Sep 12, 2025", size: "1.1 MB" },
  { name: "Food Pantry Volunteer Log", type: "Evidence", date: "Feb 28, 2026", size: "86 KB" },
  { name: "Vocational interest inventory", type: "Assessment", date: "Oct 3, 2025", size: "240 KB" },
];

const COLLABORATORS = [
  { name: "Elena Rivera", role: "Parent · Primary contact", initials: "ER", color: "bg-primary/15 text-primary" },
  { name: "Ms. Alvarez", role: "Case manager · EHHS", initials: "MA", color: "bg-amber-500/15 text-amber-700 dark:text-amber-300" },
  { name: "Mr. Chen", role: "Transition coordinator", initials: "MC", color: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300" },
];

const ACTIVITY = [
  { icon: <FileText className="h-4 w-4" />, text: "Pathway Report generated and shared with case manager", when: "2 days ago" },
  { icon: <Upload className="h-4 w-4" />, text: "Volunteer log uploaded", when: "5 days ago" },
  { icon: <MessageSquare className="h-4 w-4" />, text: "Ms. Alvarez added a note about food-pantry placement", when: "1 week ago" },
  { icon: <Target className="h-4 w-4" />, text: "Self-advocacy goal updated to 45% progress", when: "2 weeks ago" },
];

const UPCOMING = [
  { title: "PPT meeting", date: "Apr 8, 2026 · 3:30 PM", body: "Bring the Pathway Report and Maya's questions." },
  { title: "Animal shelter tour", date: "Mar 14, 2026 · 11:00 AM", body: "Family-led visit to CT Humane Society." },
  { title: "BRS Pre-ETS intake call", date: "Mar 20, 2026 · 1:00 PM", body: "Initial conversation with Hartford regional office." },
];

function DemoHubPage() {
  return (
    <SiteShell>
      <section className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
        <Link
          to="/demo"
          className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Back to demo overview
        </Link>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <Badge variant="secondary" className="gap-1">
            <Sparkles className="h-3 w-3" /> Demo · step 3 of 3
          </Badge>
          <Badge variant="outline" className="gap-1">
            <ShieldCheck className="h-3 w-3" /> Fictional student
          </Badge>
        </div>

        {/* Header card */}
        <div className="mt-4 rounded-3xl border bg-card p-6 shadow-soft sm:p-8">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">
                Student Hub
              </p>
              <h1 className="mt-2 font-display text-3xl tracking-tight sm:text-4xl">
                {DEMO_STUDENT.full_name}
              </h1>
              <p className="mt-1 text-sm text-muted-foreground">
                {DEMO_STUDENT.pronouns} · {DEMO_STUDENT.grade} · {DEMO_STUDENT.school}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm">
                <Upload className="h-4 w-4" /> Upload document
              </Button>
              <Button size="sm" asChild>
                <Link to="/demo/report">
                  <FileText className="h-4 w-4" /> Open Pathway Report
                </Link>
              </Button>
            </div>
          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <StatTile label="Active goals" value="4" hint="2 in progress" icon={<Target className="h-4 w-4" />} />
            <StatTile label="Documents" value="12" hint="IEP up to date" icon={<FileText className="h-4 w-4" />} />
            <StatTile label="Overall readiness" value="Developing" hint="Trending up" icon={<Sparkles className="h-4 w-4" />} />
            <StatTile label="Privacy" value="Family-controlled" hint="3 collaborators" icon={<Lock className="h-4 w-4" />} />
          </div>

          <div className="mt-6 flex flex-wrap gap-2">
            <InterestChip icon={<PawPrint className="h-3.5 w-3.5" />} label="Animal care" />
            <InterestChip icon={<Palette className="h-3.5 w-3.5" />} label="Visual art" />
            <InterestChip icon={<Leaf className="h-3.5 w-3.5" />} label="Environmental" />
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
                {GOALS.map((g) => (
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
                {DOCUMENTS.map((d) => (
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

            {/* Recommended next steps */}
            <Panel
              icon={<Sparkles className="h-5 w-5" />}
              title="This week"
              action={<span className="text-xs text-muted-foreground">From {DEMO_STUDENT.first_name}'s plan</span>}
            >
              <ol className="space-y-3">
                {DEMO_REPORT.family_action_plan?.this_week.map((step, i) => (
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
                {UPCOMING.map((u) => (
                  <li key={u.title} className="rounded-2xl border border-border/60 bg-background p-3">
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
                {COLLABORATORS.map((c) => (
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
                {ACTIVITY.map((a, i) => (
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

        <div className="mt-10 flex flex-wrap items-center justify-between gap-3 rounded-3xl border border-border/60 bg-gradient-hero p-6">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">
              You've seen the full flow
            </p>
            <p className="mt-1 font-display text-xl">Ready to do this for your student?</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" asChild>
              <Link to="/demo">Restart demo</Link>
            </Button>
            <Button asChild>
              <Link to="/waitlist">
                Join the waitlist <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
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

function InterestChip({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-muted px-3 py-1 text-xs font-medium">
      <span className="text-primary">{icon}</span>
      {label}
    </span>
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
