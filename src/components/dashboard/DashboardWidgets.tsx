import { Link } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import {
  FolderOpen,
  Target,
  CalendarDays,
  Sparkles,
  ArrowRight,
  Users,
  RefreshCw,
} from "lucide-react";

import { listMyReports } from "@/lib/pathway.functions";
import { summarizeGoalStatuses } from "@/lib/goal-statuses.functions";
import { getProgramEligibility } from "@/lib/bridgeforward.functions";
import { supabase } from "@/integrations/supabase/client";
import { TransitionChannelTile } from "@/components/dashboard/TransitionChannelTile";

type ReportRow = {
  id: string;
  created_at: string;
  student_first_name: string;
  grade_band: string | null;
};

type GoalTotals = { total: number; inProgress: number; met: number };

function formatWhen(iso: string) {
  const d = new Date(iso);
  const days = Math.round((Date.now() - d.getTime()) / 86_400_000);
  if (days <= 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days} days ago`;
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export function DashboardWidgets() {
  const list = useServerFn(listMyReports);
  const summarize = useServerFn(summarizeGoalStatuses);
  const fetchElig = useServerFn(getProgramEligibility);
  const [reports, setReports] = useState<ReportRow[] | null>(null);
  const [goals, setGoals] = useState<GoalTotals>({ total: 0, inProgress: 0, met: 0 });
  const [updatingGoals, setUpdatingGoals] = useState(false);
  const [goalsError, setGoalsError] = useState(false);
  // Slice 4: BridgeForward card was previously shown whenever the user had
  // a middle-school student linked, even for partner accounts. Gate on
  // role as well so partner-only users never see family-side program cards.
  const [elig, setElig] = useState<{ hasMiddleSchoolStudent: boolean; isPartner: boolean } | null>(null);
  const reportIdsRef = useRef<string[]>([]);
  const retryTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const retryAttemptRef = useRef(0);
  const retryPausedRef = useRef(false);

  const refreshGoals = useCallback(async () => {
    const maxRetries = 5;
    const baseDelayMs = 1000;
    setUpdatingGoals(true);
    try {
      const s = await summarize({ data: { reportIds: reportIdsRef.current } });
      setGoals({ total: s.total, inProgress: s.inProgress, met: s.met });
      setGoalsError(false);
      retryAttemptRef.current = 0;
    } catch {
      setGoalsError(true);
      if (retryAttemptRef.current < maxRetries && !retryPausedRef.current) {
        const delay = baseDelayMs * 2 ** retryAttemptRef.current;
        retryAttemptRef.current += 1;
        retryTimeoutRef.current = setTimeout(() => {
          void refreshGoals();
        }, delay);
      }
    } finally {
      setUpdatingGoals(false);
    }
  }, [summarize]);

  useEffect(() => {
    let cancelled = false;
    list()
      .then(async (r) => {
        if (cancelled) return;
        setReports(r.reports);
        reportIdsRef.current = r.reports.map((x) => x.id);
        await refreshGoals();
      })
      .catch(() => {
        if (!cancelled) setReports([]);
      });
    fetchElig()
      .then((res) => {
        if (!cancelled) setElig(res);
      })
      .catch(() => {
        if (!cancelled) setElig({ hasMiddleSchoolStudent: false, isPartner: false });
      });
    return () => {
      cancelled = true;
    };
  }, [list, refreshGoals, fetchElig]);

  // Live updates: refetch the summary whenever this user's goal statuses change.
  useEffect(() => {
    let channel: ReturnType<typeof supabase.channel> | null = null;
    let cancelled = false;

    (async () => {
      const { data } = await supabase.auth.getUser();
      if (cancelled || !data.user) return;
      const userId = data.user.id;
      channel = supabase
        .channel(`goal-statuses-${userId}`)
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "goal_statuses",
            filter: `user_id=eq.${userId}`,
          },
          () => {
            retryAttemptRef.current = 0;
            if (retryTimeoutRef.current) {
              clearTimeout(retryTimeoutRef.current);
              retryTimeoutRef.current = null;
            }
            void refreshGoals();
          },
        )
        .subscribe();
    })();

    return () => {
      cancelled = true;
      if (channel) supabase.removeChannel(channel);
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
        retryTimeoutRef.current = null;
      }
    };
  }, [refreshGoals]);

  // Pause/resume retries when the user switches browser tabs.
  useEffect(() => {
    const onVisibility = () => {
      if (document.hidden) {
        retryPausedRef.current = true;
        if (retryTimeoutRef.current) {
          clearTimeout(retryTimeoutRef.current);
          retryTimeoutRef.current = null;
        }
      } else {
        retryPausedRef.current = false;
        if (goalsError) {
          retryAttemptRef.current = 0;
          void refreshGoals();
        }
      }
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [goalsError, refreshGoals]);

  const loading = reports === null;
  const empty = !loading && reports!.length === 0;

  return (
    <section className="mx-auto mt-2 max-w-7xl px-4 sm:px-6 lg:px-8">
      {/* Stat tiles — 1 col on phones, 2 then 4 on larger screens */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-4">
        <StatTile
          to="/students"
          icon={<Users className="h-5 w-5" />}
          label="Students"
          value="Hub"
          hint="Organize plans"
          accent="primary"
        />
        <StatTile
          to="/reports"
          icon={<FolderOpen className="h-5 w-5" />}
          label="Pathway Reports"
          value={loading ? "—" : String(reports!.length)}
          hint={empty ? "Create your first" : "Open library"}
          accent="sky"
        />
        <StatTile
          to="/goals"
          icon={<Target className="h-5 w-5" />}
          label="Goals tracked"
          value={
            loading ? (
              "—"
            ) : updatingGoals ? (
              <span className="inline-flex items-center gap-2">
                {goals.total}
                <RefreshCw className="h-4 w-4 animate-spin text-muted-foreground" />
              </span>
            ) : goalsError ? (
              <span className="inline-flex items-center gap-2">
                {goals.total}
                <span className="inline-flex h-2 w-2 rounded-full bg-destructive" />
              </span>
            ) : (
              String(goals.total)
            )
          }
          hint={
            loading
              ? " "
              : goalsError
                ? `${goals.inProgress} in progress · ${goals.met} met · Couldn’t refresh`
                : goals.total === 0
                  ? "Nothing yet"
                  : `${goals.inProgress} in progress · ${goals.met} met`
          }
          accent="warm"
        />
        <StatTile
          to="/ppt-prep"
          icon={<CalendarDays className="h-5 w-5" />}
          label="Next PPT"
          value="Prep"
          hint="Draft an agenda"
          accent="sky"
        />
      </div>
      {/* Transition Channel tile */}
      <div className="mt-5">
        <TransitionChannelTile />
      </div>

      {/* Program pathways — only render when relevant to this user. */}

      {elig && ((elig.hasMiddleSchoolStudent && !elig.isPartner) || elig.isPartner) && (
        <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2 auto-rows-fr">
          {elig.hasMiddleSchoolStudent && !elig.isPartner && (
            <Link
              to="/bridgeforward"
              className="group rounded-3xl border border-border/60 bg-card p-5 shadow-soft transition hover:border-primary/40 hover:shadow-md"
            >
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-xs font-medium uppercase tracking-wide text-primary">Middle School</div>
                  <div className="mt-1 text-base font-semibold">BridgeForward (Grades 6–8)</div>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Intake, student voice, high school fit finder, and a readiness snapshot.
                  </p>
                </div>
                <ArrowRight className="h-5 w-5 shrink-0 text-muted-foreground transition group-hover:translate-x-0.5 group-hover:text-primary" />
              </div>
            </Link>
          )}
          {elig.isPartner && (
            <Link
              to="/partnerforward"
              className="group rounded-3xl border border-border/60 bg-card p-5 shadow-soft transition hover:border-primary/40 hover:shadow-md"
            >
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-xs font-medium uppercase tracking-wide text-primary">Partners</div>
                  <div className="mt-1 text-base font-semibold">PartnerForward</div>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Incentives, grants, sponsorships, and accessibility resources for partners.
                  </p>
                </div>
                <ArrowRight className="h-5 w-5 shrink-0 text-muted-foreground transition group-hover:translate-x-0.5 group-hover:text-primary" />
              </div>
            </Link>
          )}
        </div>
      )}



      {/* Recent reports — list on mobile, table-feel on desktop */}
      <div className="mt-5 rounded-3xl border border-border/60 bg-card shadow-soft">
        <div className="flex items-center justify-between gap-3 border-b border-border/60 px-5 py-4 sm:px-6">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">
              Recent reports
            </p>
            <p className="text-xs text-muted-foreground sm:text-sm">
              The last few Pathway Reports you've created.
            </p>
          </div>
          <Link
            to="/reports"
            className="hidden shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold text-foreground hover:bg-muted sm:inline-flex"
          >
            See all →
          </Link>
        </div>

        {loading ? (
          <ul className="divide-y divide-border/60">
            {[0, 1, 2].map((i) => (
              <li key={i} className="flex items-center gap-3 px-5 py-4 sm:px-6">
                <div className="h-9 w-9 shrink-0 animate-pulse rounded-2xl bg-muted" />
                <div className="flex-1 space-y-2">
                  <div className="h-3 w-1/3 animate-pulse rounded bg-muted" />
                  <div className="h-3 w-1/5 animate-pulse rounded bg-muted" />
                </div>
              </li>
            ))}
          </ul>
        ) : empty ? (
          <div className="px-5 py-10 text-center sm:px-6">
            <div className="mx-auto inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-hero text-primary shadow-soft">
              <Sparkles className="h-5 w-5" />
            </div>
            <p className="mt-4 font-display text-lg font-medium tracking-tight">
              No reports yet — let's start one.
            </p>
            <p className="mx-auto mt-2 max-w-sm text-sm text-muted-foreground">
              Share what you know, even just a little. We'll do the rest.
            </p>
            <Link
              to="/pathway"
              className="mt-5 inline-flex items-center justify-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-soft hover:shadow-lift"
            >
              <Sparkles className="h-4 w-4" />
              Create a Pathway Report
            </Link>
          </div>
        ) : (
          <>
            <ul className="divide-y divide-border/60">
              {reports!.slice(0, 5).map((r) => (
                <li key={r.id}>
                  <Link
                    to="/reports/$reportId"
                    params={{ reportId: r.id }}
                    className="group flex items-center gap-3 px-5 py-4 transition-colors hover:bg-muted/40 sm:px-6"
                  >
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-gradient-sky text-primary-foreground">
                      <span className="text-sm font-semibold">
                        {r.student_first_name.slice(0, 1).toUpperCase()}
                      </span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-display text-base font-medium tracking-tight">
                        {r.student_first_name}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">
                        {r.grade_band ? `${r.grade_band} · ` : ""}
                        {formatWhen(r.created_at)}
                      </p>
                    </div>
                    <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
                  </Link>
                </li>
              ))}
            </ul>
            <div className="border-t border-border/60 px-5 py-3 text-center sm:hidden">
              <Link
                to="/reports"
                className="inline-flex items-center gap-1 text-sm font-semibold text-foreground"
              >
                See all reports
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </>
        )}
      </div>
    </section>
  );
}

function StatTile({
  to,
  icon,
  label,
  value,
  hint,
  accent,
}: {
  to: string;
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
  hint: React.ReactNode;
  accent: "primary" | "warm" | "sky";
}) {
  const bg =
    accent === "primary"
      ? "bg-gradient-hero"
      : accent === "warm"
        ? "bg-gradient-warm"
        : "bg-gradient-sky";
  return (
    <Link
      to={to as never}
      className="group flex items-center justify-between gap-4 rounded-3xl border border-border/60 bg-card p-5 shadow-soft transition-all hover:-translate-y-0.5 hover:shadow-lift sm:flex-col sm:items-start sm:gap-3 sm:p-6"
    >
      <div className="flex items-center gap-3 sm:w-full sm:justify-between">
        <div
          className={`flex h-10 w-10 items-center justify-center rounded-2xl ${bg} text-primary shadow-soft`}
        >
          {icon}
        </div>
        <ArrowRight className="hidden h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-0.5 sm:block" />
      </div>
      <div className="text-right sm:text-left">
        <p className="font-display text-3xl font-medium leading-none tracking-tight sm:text-4xl">
          {value}
        </p>
        <p className="mt-1 text-xs font-semibold uppercase tracking-wider text-primary">
          {label}
        </p>
        <p className="mt-1 hidden text-xs text-muted-foreground sm:block">{hint}</p>
      </div>
    </Link>
  );
}
