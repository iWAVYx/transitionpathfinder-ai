import { Link } from "@tanstack/react-router";
import {
  Sparkles,
  ClipboardList,
  Target,
  Calendar,
  CheckCircle2,
  Circle,
  PlayCircle,
  FileText,
  GraduationCap,
  Mail,
} from "lucide-react";
import { SiteShell } from "@/components/site/SiteShell";
import { Breadcrumbs } from "@/components/site/Breadcrumbs";
import { Button } from "@/components/ui/button";
import { toTitleCase } from "@/lib/title-case";
import type { DashboardSnapshot, ActionItemRow } from "@/lib/golden-path.functions";
import { NextBestAction } from "@/components/dashboard/NextBestAction";

type Props = {
  firstName: string;
  snap: DashboardSnapshot;
  onToggleAction: (item: ActionItemRow) => void;
};

export function StudentDashboard({ firstName, snap, onToggleAction }: Props) {
  const s = snap.student;
  const myActions = snap.actionItems.filter(
    (a) => a.category === "student" || a.category === "family",
  );
  const openCount = myActions.filter((a) => a.status !== "complete").length;
  const nextMeeting = snap.upcomingMeeting;

  if (!s) {
    return (
      <SiteShell>
        <div className="mx-auto max-w-3xl px-4 pb-20 pt-12 sm:px-6 lg:px-8">
          <Breadcrumbs trail={[{ label: "My plan" }]} />
          <h1 className="mt-6 font-display text-4xl font-medium tracking-tight">
            Welcome, {toTitleCase(firstName)}.
          </h1>
          <p className="mt-3 text-base leading-relaxed text-muted-foreground">
            You're signed in as a student. To see your transition plan, a family member,
            educator, or case manager needs to add you as a collaborator on your plan.
          </p>
          <div className="mt-8 rounded-3xl border bg-card p-6 shadow-soft">
            <h2 className="font-display text-xl">What to do next</h2>
            <ol className="mt-3 list-inside list-decimal space-y-2 text-sm text-muted-foreground">
              <li>Ask a parent, guardian, or case manager to invite you using this account's email.</li>
              <li>Accept the invite when you receive it — your plan will appear here.</li>
              <li>You'll be able to see your goals, your meetings, and your action items.</li>
            </ol>
            <div className="mt-5 flex flex-wrap gap-2">
              <Button asChild variant="outline" size="sm">
                <Link to="/help">
                  <Mail className="mr-1.5 h-3.5 w-3.5" /> Get help
                </Link>
              </Button>
              <Button asChild variant="outline" size="sm">
                <Link to="/settings">Account settings</Link>
              </Button>
            </div>
          </div>
        </div>
      </SiteShell>
    );
  }

  return (
    <SiteShell>
      <div className="mx-auto max-w-6xl px-4 pb-16 pt-8 sm:px-6 lg:px-8">
        <Breadcrumbs trail={[{ label: "My plan" }]} />

        <div className="mt-6 rounded-3xl border bg-gradient-hero p-6 shadow-soft sm:p-8">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
            Your transition plan
          </p>
          <h1 className="mt-2 font-display text-4xl font-medium tracking-tight">
            Hi, {toTitleCase(s.preferred_name ?? s.first_name)}.
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            This is your space. Here's what your team is working on with you —
            your goals, your meetings, and the next steps that move your plan forward.
          </p>
          {s.student_voice_statement && (
            <blockquote className="mt-5 border-l-4 border-primary/40 bg-background/60 px-4 py-3 text-sm italic text-foreground/80">
              "{s.student_voice_statement}"
              <span className="ml-2 text-xs not-italic text-muted-foreground">— in your words</span>
            </blockquote>
          )}
        </div>

        {/* Quick facts */}
        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          <FactCard
            icon={<GraduationCap className="h-4 w-4" />}
            label="Grade"
            value={s.grade_band ?? "Not set"}
          />
          <FactCard
            icon={<Sparkles className="h-4 w-4" />}
            label="Readiness"
            value={s.readiness_level ?? "Building it together"}
          />
          <FactCard
            icon={<Calendar className="h-4 w-4" />}
            label="Next meeting"
            value={
              nextMeeting?.scheduled_at
                ? new Date(nextMeeting.scheduled_at).toLocaleDateString(undefined, {
                    month: "short",
                    day: "numeric",
                  })
                : "Not scheduled"
            }
          />
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          {/* My goals */}
          <section className="rounded-3xl border bg-card p-6 shadow-soft">
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Target className="h-5 w-5 text-primary" />
                <h2 className="font-display text-xl">Your goals</h2>
              </div>
              <Link to="/goals" className="text-xs font-medium text-primary hover:underline">
                View all →
              </Link>
            </div>
            {snap.goals.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No goals set yet. Your team will add goals to your plan soon.
              </p>
            ) : (
              <ul className="space-y-2">
                {snap.goals.slice(0, 5).map((g) => (
                  <li
                    key={g.id}
                    className="flex items-start justify-between gap-3 rounded-xl border bg-background p-3"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium">{g.title}</p>
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                        {g.category}
                      </p>
                    </div>
                    <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                      {g.status.replace(/-/g, " ")}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {/* My action items */}
          <section className="rounded-3xl border bg-card p-6 shadow-soft">
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ClipboardList className="h-5 w-5 text-primary" />
                <h2 className="font-display text-xl">Things you can do</h2>
              </div>
              <span className="text-xs text-muted-foreground">{openCount} open</span>
            </div>
            {myActions.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Nothing for you to do right now. Your team will add steps as your plan grows.
              </p>
            ) : (
              <ul className="space-y-2">
                {myActions.slice(0, 7).map((a) => (
                  <li
                    key={a.id}
                    className="flex items-start gap-3 rounded-xl border bg-background p-3"
                  >
                    <button
                      type="button"
                      onClick={() => onToggleAction(a)}
                      className="mt-0.5 shrink-0"
                      aria-label={`Mark "${a.title}" as ${a.status === "complete" ? "not done" : "done"}`}
                    >
                      {a.status === "complete" ? (
                        <CheckCircle2 className="h-5 w-5 text-primary" />
                      ) : a.status === "in_progress" ? (
                        <PlayCircle className="h-5 w-5 text-primary/70" />
                      ) : (
                        <Circle className="h-5 w-5 text-muted-foreground" />
                      )}
                    </button>
                    <p
                      className={
                        a.status === "complete"
                          ? "text-sm line-through text-muted-foreground"
                          : "text-sm font-medium"
                      }
                    >
                      {a.title}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>

        {/* Latest report */}
        <section className="mt-6 rounded-3xl border bg-card p-6 shadow-soft">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
                Your pathway report
              </p>
              <h2 className="mt-1 font-display text-2xl font-medium">
                {snap.latestReport ? "Latest report" : "Not generated yet"}
              </h2>
              {snap.latestReport && (
                <p className="mt-1 text-sm text-muted-foreground">
                  Created {new Date(snap.latestReport.created_at).toLocaleDateString()}
                </p>
              )}
            </div>
            {snap.latestReport ? (
              <Button asChild>
                <Link to="/reports/$reportId" params={{ reportId: snap.latestReport.id }}>
                  <FileText className="mr-1.5 h-4 w-4" /> Read it
                </Link>
              </Button>
            ) : (
              <p className="max-w-sm text-sm text-muted-foreground">
                A pathway report shows your strengths, interests, and what's next after high
                school. Your team will share it with you when it's ready.
              </p>
            )}
          </div>
        </section>
      </div>
    </SiteShell>
  );
}

function FactCard({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl border bg-card p-4 shadow-soft">
      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        {icon}
        {label}
      </div>
      <p className="mt-2 text-base font-medium text-foreground">{value}</p>
    </div>
  );
}
