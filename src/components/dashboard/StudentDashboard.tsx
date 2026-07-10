import { Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { getStudentVoiceResponses } from "@/lib/student-voice.functions";
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
  Compass,
  MessageCircle,
  Bookmark,
  Mic,
} from "lucide-react";
import { SiteShell } from "@/components/site/SiteShell";
import { Breadcrumbs } from "@/components/site/Breadcrumbs";
import { RoleValueStrip } from "@/components/value/RoleValueStrip";
import { Button } from "@/components/ui/button";
import { toTitleCase } from "@/lib/title-case";
import type { DashboardSnapshot, ActionItemRow } from "@/lib/golden-path.functions";
import { NextBestAction } from "@/components/dashboard/NextBestAction";
import { JourneyStrip } from "@/components/dashboard/JourneyStrip";
import { OnboardingChecklist } from "@/components/dashboard/OnboardingChecklist";
import { DashboardCalendar } from "@/components/dashboard/DashboardCalendar";
import { MyIepSummaryCard } from "@/components/dashboard/MyIepSummaryCard";
import { StudentPathwaySections } from "@/components/dashboard/StudentPathwaySections";
import { NextStepsTimeline } from "@/components/dashboard/NextStepsTimeline";
import { ROLE_DASHBOARD_TEST_IDS } from "@/lib/dashboard-testids";

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
      <SiteShell dashboardTestId={ROLE_DASHBOARD_TEST_IDS.student}>
        <div className="mx-auto max-w-3xl px-4 pb-20 pt-12 sm:px-6 lg:px-8">

          <p
            className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary"
            data-dashboard-landmark="student"
          >
            Next Best Step — Student Dashboard
          </p>
          <Breadcrumbs trail={[{ label: "My plan" }]} />
          <h1 className="mt-6 font-display text-4xl font-medium tracking-tight">
            Welcome, {toTitleCase(firstName)}.
          </h1>
          <p className="mt-3 text-base leading-relaxed text-muted-foreground">
            You're signed in as a student. To see your transition plan, a family member,
            educator, or case manager needs to add you as a collaborator on your plan.
          </p>
          <div className="mt-8 rounded-3xl border bg-card p-6 shadow-soft">
            <h2 className="font-display text-xl">Next Best Step</h2>
            <ol className="mt-3 list-inside list-decimal space-y-2 text-sm text-muted-foreground">
              <li>Ask a parent, guardian, or case manager to invite you using this account's email.</li>
              <li>Accept the invite when you receive it — your plan will appear here.</li>
              <li>You'll be able to see your goals, your meetings, and your action items.</li>
            </ol>
            <div className="mt-5 flex flex-wrap gap-2">
              <Button
                type="button"
                size="sm"
                onClick={async () => {
                  const text = `Hi — please invite me to my transition plan on TransitionForward. Sign in, open the Students page, and add me as a collaborator using this email address. Thank you!`;
                  try {
                    if (navigator.clipboard) {
                      await navigator.clipboard.writeText(text);
                    }
                  } catch {
                    /* noop — fallback to mailto */
                  }
                  window.location.href = `mailto:?subject=${encodeURIComponent(
                    "Please invite me to my transition plan",
                  )}&body=${encodeURIComponent(text)}`;
                }}
              >
                <Mail className="mr-1.5 h-3.5 w-3.5" /> Email an invite request
              </Button>
              <Button asChild variant="outline" size="sm">
                <Link to="/help">Get help</Link>
              </Button>
              <Button asChild variant="outline" size="sm">
                <Link to="/settings">Account settings</Link>
              </Button>
            </div>
            <p className="mt-3 text-[11px] text-muted-foreground">
              The button above copies a short message and opens your email app — no data is sent automatically.
            </p>
          </div>
        </div>
      </SiteShell>
    );
  }

  return (
    <SiteShell dashboardTestId={ROLE_DASHBOARD_TEST_IDS.student}>
      <div className="demo-shell">
      <div className="mx-auto max-w-6xl px-4 pb-16 pt-8 sm:px-6 lg:px-8">

        <p
          className="tf-eyebrow"
          data-dashboard-landmark="student"
        >
          Next Best Step · Student Dashboard
        </p>
        <Breadcrumbs trail={[{ label: "My plan" }]} />
        <RoleValueStrip role="student" className="mt-4" />



        <div className="mt-6">
          <NextBestAction surface="student" /><div className="mt-4"><JourneyStrip surface="student" /></div>
          <OnboardingChecklist surface="student" className="mt-4" />
        </div>

        <div className="tf-cover mt-6 px-6 py-8 sm:px-10 sm:py-10">
          <p className="tf-eyebrow">Your Transition Plan</p>
          <h1 className="mt-3 font-display text-4xl font-medium leading-[1.05] tracking-tight sm:text-5xl">
            Hi, {toTitleCase(s.preferred_name ?? s.first_name)}.
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted-foreground sm:text-base">
            This is your space. Here's what your team is working on with you —
            your goals, your meetings, and the next steps that move your plan forward.
          </p>
          {s.student_voice_statement && (
            <blockquote className="tf-pull mt-6">
              "{s.student_voice_statement}"
              <cite>In Your Words</cite>
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
                <h2 className="font-display text-xl">Your Goals</h2>
              </div>
              <Link to="/goals" className="text-xs font-medium text-primary hover:underline">
                Open All Goals
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
                <h2 className="font-display text-xl">Next Best Steps</h2>
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

        {/* Explore — grade-band aware tools just for you */}
        <ExploreForStudent gradeBand={s.grade_band} studentId={s.id} />

        {/* Calendar — your meetings, prep steps, and team events */}
        <div className="mt-6">
          <DashboardCalendar studentId={s.id} compact title="Your calendar" />
        </div>


        {/* IEP summary in plain language */}
        <div className="mt-6">
          <MyIepSummaryCard studentId={s.id} />
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

type ExploreTile = {
  to: string;
  icon: React.ReactNode;
  title: string;
  body: string;
};

function ExploreForStudent({
  gradeBand,
  studentId,
}: {
  gradeBand: string | null;
  studentId: string;
}) {
  const isMiddle = gradeBand === "6-8";
  const isHigh = gradeBand === "9-10" || gradeBand === "11-12";

  // Phase 6D — read voice-response count so the Student Voice tile can
  // nudge first-time students to add a reflection.
  const fetchVoice = useServerFn(getStudentVoiceResponses);
  const [voiceCount, setVoiceCount] = useState<number | null>(null);
  useEffect(() => {
    let cancelled = false;
    fetchVoice({ data: { studentId } })
      .then((r) => {
        if (!cancelled) setVoiceCount(r.responses?.length ?? 0);
      })
      .catch(() => {
        if (!cancelled) setVoiceCount(null);
      });
    return () => {
      cancelled = true;
    };
  }, [studentId, fetchVoice]);

  const tiles: ExploreTile[] = [];
  if (isMiddle) {
    tiles.push({
      to: "/bridgeforward",
      icon: <Compass className="h-5 w-5" />,
      title: "BridgeForward",
      body: "Find a high school that fits — explore interests, take the fit finder, share your voice.",
    });
  }
  if (isHigh) {
    tiles.push({
      to: "/opportunities",
      icon: <Bookmark className="h-5 w-5" />,
      title: "Opportunities For You",
      body: "Programs, internships, and pathways that match your goals and interests.",
    });
  }
  tiles.push({
    to: "/student-voice",
    icon: <Mic className="h-5 w-5" />,
    title: "Your Student Voice",
    body:
      voiceCount === 0
        ? "Add your first reflection — your team will see it in your plan."
        : "Add what's important to you so your team can plan around your goals.",
  });
  tiles.push({
    to: "/messages",
    icon: <MessageCircle className="h-5 w-5" />,
    title: "Your Team",
    body: "Message the adults connected to your plan — family, teachers, case manager.",
  });

  return (
    <section className="mt-6">
      <h2 className="font-display text-xl">Explore</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Tools picked for you{isMiddle ? " — middle school" : isHigh ? " — high school" : ""}.
      </p>
      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {tiles.map((t) => (
          <Link
            key={t.to}
            to={t.to}
            className="group flex h-full flex-col rounded-2xl border bg-card p-4 shadow-soft transition-all hover:-translate-y-0.5 hover:shadow-lift"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
              {t.icon}
            </div>
            <h3 className="mt-3 font-display text-base">{t.title}</h3>
            <p className="mt-1 text-xs text-muted-foreground">{t.body}</p>
          </Link>
        ))}
      </div>
    </section>
  );
}
