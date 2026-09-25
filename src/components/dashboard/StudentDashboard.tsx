import { Link } from "@tanstack/react-router";
import {
  ClipboardList,
  Target,
  CheckCircle2,
  Circle,
  PlayCircle,
  FileText,
  RefreshCw,
  Compass,
  MessageCircle,
  Bookmark,
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
import { LiveStudentWorkspaceOverview } from "@/components/dashboard/LiveStudentWorkspaceOverview";
import { ROLE_DASHBOARD_TEST_IDS } from "@/lib/dashboard-testids";

type Props = {
  firstName: string;
  snap: DashboardSnapshot;
  onToggleAction: (item: ActionItemRow) => void;
  onReconnect?: () => void;
};

export function StudentDashboard({ firstName, snap, onToggleAction, onReconnect }: Props) {
  const s = snap.student;
  const myActions = snap.actionItems.filter(
    (a) => a.category === "student" || a.category === "family",
  );
  const openCount = myActions.filter((a) => a.status !== "complete").length;
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
          <h1 className="mt-6 font-display text-4xl font-semibold tracking-tight sm:text-5xl">
            Welcome, {toTitleCase(firstName)}.
          </h1>
          <p className="mt-3 text-base leading-relaxed text-foreground/75 sm:text-lg">
            This account controls your own transition plan. We could not finish connecting the
            student profile to your dashboard yet, but you do not{" "}
            {"need to be added as a collaborator."}
          </p>
          <div className="mt-8 border-y border-border/70 py-5">
            <h2 className="font-display text-xl">Next Best Step</h2>
            <ol className="mt-3 list-inside list-decimal space-y-2 text-sm text-foreground/75">
              <li>Reconnect your student profile below.</li>
              <li>Refresh once the connection completes.</li>
              <li>Your goals, meetings, documents, and action items will appear here.</li>
            </ol>
            <div className="mt-5 flex flex-wrap gap-2">
              <Button type="button" size="sm" onClick={onReconnect} disabled={!onReconnect}>
                <RefreshCw className="mr-1.5 h-3.5 w-3.5" /> Reconnect My Profile
              </Button>
              <Button asChild variant="outline" size="sm">
                <Link to="/help">Get help</Link>
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
    <SiteShell dashboardTestId={ROLE_DASHBOARD_TEST_IDS.student}>
      <div className="demo-shell">
        <div className="mx-auto max-w-6xl px-4 pb-16 pt-8 sm:px-6 lg:px-8">
          <p className="tf-eyebrow" data-dashboard-landmark="student">
            Next Best Step · Student Dashboard
          </p>
          <Breadcrumbs trail={[{ label: "My plan" }]} />
          <RoleValueStrip role="student" className="mt-4" />

          <div className="mt-6">
            <LiveStudentWorkspaceOverview snapshot={snap} />
          </div>

          <div className="mt-6">
            <NextBestAction surface="student" />
            <div className="mt-4">
              <JourneyStrip surface="student" />
            </div>
            <OnboardingChecklist surface="student" className="mt-4" />
          </div>

          <div className="mt-6 grid gap-6 lg:grid-cols-2">
            {/* My goals */}
            <section className="border-y border-border/70 py-5">
              <div className="mb-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Target className="h-5 w-5 text-primary" />
                  <h2 className="font-display text-xl">Your Goals</h2>
                </div>
              </div>
              {snap.goals.length === 0 ? (
                <p className="text-sm text-foreground/75">
                  No goals set yet. Your team will add goals to your plan soon.
                </p>
              ) : (
                <ul className="space-y-2">
                  {snap.goals.slice(0, 5).map((g) => (
                    <li
                      key={g.id}
                      className="flex items-start justify-between gap-3 border-b border-border/60 py-3 last:border-b-0"
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-medium">{g.title}</p>
                        <p className="text-[10px] font-semibold uppercase tracking-wider text-foreground/75">
                          {g.category}
                        </p>
                      </div>
                      <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-foreground/75">
                        {g.status.replace(/-/g, " ")}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            {/* My action items */}
            <section className="border-y border-border/70 py-5">
              <div className="mb-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ClipboardList className="h-5 w-5 text-primary" />
                  <h2 className="font-display text-xl">Next Best Steps</h2>
                </div>
                <span className="text-xs text-foreground/75">{openCount} open</span>
              </div>
              {myActions.length === 0 ? (
                <p className="text-sm text-foreground/75">
                  Nothing for you to do right now. Your team will add steps as your plan grows.
                </p>
              ) : (
                <ul className="space-y-2">
                  {myActions.slice(0, 7).map((a) => (
                    <li
                      key={a.id}
                      className="flex items-start gap-3 border-b border-border/60 py-3 last:border-b-0"
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
                          <Circle className="h-5 w-5 text-foreground/75" />
                        )}
                      </button>
                      <p
                        className={
                          a.status === "complete"
                            ? "text-sm line-through text-foreground/75"
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
          <ExploreForStudent gradeBand={s.grade_band} />

          {/* Calendar — your meetings, prep steps, and team events */}
          <div className="mt-6">
            <DashboardCalendar studentId={s.id} compact title="Your calendar" />
          </div>

          {/* IEP summary in plain language */}
          <div className="mt-6">
            <MyIepSummaryCard studentId={s.id} />
          </div>

          {/* Latest report */}
          <section className="mt-6 border-y border-border/70 py-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
                  Your pathway report
                </p>
                <h2 className="mt-1 font-display text-2xl font-medium">
                  {snap.latestReport ? "Latest report" : "Not generated yet"}
                </h2>
                {snap.latestReport && (
                  <p className="mt-1 text-sm text-foreground/75">
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
                <p className="max-w-sm text-sm text-foreground/75">
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

type ExploreTile = {
  to: string;
  icon: React.ReactNode;
  title: string;
  body: string;
};

function ExploreForStudent({ gradeBand }: { gradeBand: string | null }) {
  const isMiddle = gradeBand === "6-8";
  const isHigh = gradeBand === "9-10" || gradeBand === "11-12";

  const tiles: ExploreTile[] = [];
  if (isMiddle) {
    tiles.push({
      to: "/bridgeforward/intake",
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
    to: "/messages",
    icon: <MessageCircle className="h-5 w-5" />,
    title: "Your Team",
    body: "Message the adults connected to your plan — family, teachers, case manager.",
  });

  return (
    <section className="mt-6">
      <h2 className="font-display text-xl">Explore</h2>
      <p className="mt-1 text-sm text-foreground/75">
        Tools picked for you{isMiddle ? " — middle school" : isHigh ? " — high school" : ""}.
      </p>
      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {tiles.map((t) => (
          <Link
            key={t.to}
            to={t.to}
            className="group flex h-full flex-col border-y border-border/70 py-4 transition hover:bg-muted/30 sm:px-2"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
              {t.icon}
            </div>
            <h3 className="mt-3 font-display text-base">{t.title}</h3>
            <p className="mt-1 text-xs text-foreground/75">{t.body}</p>
          </Link>
        ))}
      </div>
    </section>
  );
}
