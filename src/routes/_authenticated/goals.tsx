import { formatGradeBand } from "@/lib/grade-band-label";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useAuth } from "@/hooks/use-auth";
import { OwnerWorkspaceGate } from "@/components/dashboard/OwnerWorkspaceGate";
import { RoleGuard } from "@/components/RoleGuard";
import { useCallback, useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Target, Sparkles } from "lucide-react";

import { SiteShell } from "@/components/site/SiteShell";
import { Breadcrumbs } from "@/components/site/Breadcrumbs";
import { InfoBox } from "@/components/site/InfoBox";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { getMyRoles } from "@/lib/profile.functions";
import { audiencesForRoles } from "@/lib/role-policy";
import { listMyReports } from "@/lib/pathway.functions";
import { getPathwayReport } from "@/lib/ppt.functions";
import { listGoalStatuses, upsertGoalStatus } from "@/lib/goal-statuses.functions";
import { goalTrackerItems, type GoalTrackerItem } from "@/lib/goal-tracker-items";

import { EarlierProgressReview } from "@/components/pathway/EarlierProgressReview";
import { earlierGoalProgress } from "@/lib/earlier-goal-progress";
import { toTitleCase } from "@/lib/title-case";
export const Route = createFileRoute("/_authenticated/goals")({
  head: () => ({ meta: [{ title: "Goal Tracker — TransitionForward" }] }),
  component: () => (<RoleGuard path="/goals"><GoalsPage /></RoleGuard>),
});

type Status = "not-started" | "in-progress" | "met";
const STATUSES: Status[] = ["not-started", "in-progress", "met"];
const LABELS: Record<Status, string> = {
  "not-started": "Not started",
  "in-progress": "In progress",
  met: "Met",
};

type ReportRow = { id: string; student_first_name: string; grade_band: string | null; created_at: string };

function storageKey(viewerId: string, reportId: string) {
  return `tf:goal-status:v2:${JSON.stringify([viewerId, reportId])}`;
}


function GoalsPage() {
  const { user, loading } = useAuth();
  const scopeKey = JSON.stringify([user?.id ?? null, Boolean(loading)]);
  const currentScope = useRef(scopeKey);
  currentScope.current = scopeKey;
  if (loading || !user)
    return (
      <SiteShell>
        <main className="mx-auto max-w-5xl px-4 py-10" role="status">
          Checking your sign-in before opening Goal Tracker…
        </main>
      </SiteShell>
    );
  return (
    <OwnerWorkspaceGate>
      <GoalsSession
        key={scopeKey}
        viewerId={user.id}
        scopeKey={scopeKey}
        currentScope={currentScope}
      />
    </OwnerWorkspaceGate>
  );
}
function GoalsSession({
  viewerId,
  scopeKey,
  currentScope,
}: {
  viewerId: string;
  scopeKey: string;
  currentScope: { current: string };
}) {
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  const current = useCallback(
    () => mounted.current && currentScope.current === scopeKey,
    [currentScope, scopeKey],
  );
  const list = useServerFn(listMyReports);
  const fetchReport = useServerFn(getPathwayReport);
  const fetchRoles = useServerFn(getMyRoles);
  const [planningRoles, setPlanningRoles] = useState<("family" | "educator")[]>([]);
  const [planningRole, setPlanningRole] = useState<"family" | "educator" | undefined>();
  const [rolesLoading, setRolesLoading] = useState(true);
  const [rolesError, setRolesError] = useState(false);
  const [rolesAttempt, setRolesAttempt] = useState(0);

  const [reports, setReports] = useState<ReportRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [listError, setListError] = useState(false);
  const [listAttempt, setListAttempt] = useState(0);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [goalItems, setGoalItems] = useState<GoalTrackerItem[] | null>(null);
  const [reportName, setReportName] = useState<string>("");
  const [reportLoading, setReportLoading] = useState(false);
  const [reportError, setReportError] = useState(false);
  const [reportAttempt, setReportAttempt] = useState(0);
  const [loadedId, setLoadedId] = useState<string | null>(null);
  const selectedAvailable = reports.some((report) => report.id === selectedId);
  const planContext = JSON.stringify([
    selectedId,
    planningRole ?? null,
    loading,
    listError,
    rolesLoading,
    rolesError,
    reportAttempt,
  ]);
  const currentPlan = useRef(planContext);
  currentPlan.current = planContext;
  const isPlanCurrent = useCallback(
    () => current() && currentPlan.current === planContext,
    [current, planContext],
  );

  useEffect(() => {
    let cancelled = false;
    setRolesLoading(true);
    setRolesError(false);
    fetchRoles({ data: { expected_viewer_id: viewerId } })
      .then((result) => {
        if (cancelled || !current()) return;
        if (
          !Array.isArray(result?.roles) ||
          !result.roles.every((role) => typeof role === "string")
        )
          throw new Error("Invalid planning view");
        const roles = result.roles;
        const audiences = audiencesForRoles(roles);
        const available = audiences.has("admin")
          ? []
          : (["family", "educator"] as const).filter((role) => audiences.has(role));
        setPlanningRoles(available);
        setPlanningRole((current) =>
          current && available.includes(current) ? current : available[0],
        );
      })
      .catch(() => {
        if (!cancelled && current()) {
          setRolesError(true);
          setPlanningRoles([]);
          setPlanningRole(undefined);
        }
      })
      .finally(() => {
        if (!cancelled && current()) setRolesLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [fetchRoles, rolesAttempt, current, viewerId]);

  useEffect(() => {
    if (rolesLoading || rolesError || !planningRoles.length) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setListError(false);
    list({ data: { expected_viewer_id: viewerId } })
      .then((result) => {
        if (cancelled || !current()) return;
        if (
          !result ||
          result.loadFailed !== false ||
          !Array.isArray(result.reports) ||
          result.reports.some(
            (row) =>
              typeof row?.id !== "string" || !row.id || typeof row.student_first_name !== "string",
          ) ||
          new Set(result.reports.map((row) => row.id)).size !== result.reports.length
        )
          throw new Error("Reports unavailable");
        setReports(result.reports);
        // Keep an explicit unavailable selection until the viewer chooses another report.
        setSelectedId((selected) => selected ?? result.reports[0]?.id ?? null);
      })
      .catch(() => {
        if (!cancelled && current()) {
          setReports([]);
          setListError(true);
        }
      })
      .finally(() => {
        if (!cancelled && current()) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [list, listAttempt, rolesLoading, rolesError, planningRoles, current, viewerId]);

  useEffect(() => {
    let cancelled = false;
    setGoalItems(null);
    setReportName("");
    setLoadedId(null);
    setReportError(false);
    if (
      !selectedId ||
      !selectedAvailable ||
      !planningRole ||
      loading ||
      listError ||
      rolesLoading ||
      rolesError
    ) {
      setReportLoading(false);
      return;
    }
    setReportLoading(true);
    fetchReport({ data: { id: selectedId, expected_viewer_id: viewerId } })
      .then(async (result) => {
        if (cancelled || !isPlanCurrent()) return;
        if (result?.id !== selectedId || typeof result.student_first_name !== "string")
          throw new Error("Report does not match selection");
        const items = await goalTrackerItems(result.content, planningRole);
        if (cancelled || !isPlanCurrent()) return;
        setGoalItems(items);
        setReportName(result.student_first_name);
        setLoadedId(planContext);
      })
      .catch(() => {
        if (!cancelled && isPlanCurrent()) setReportError(true);
      })
      .finally(() => {
        if (!cancelled && isPlanCurrent()) setReportLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [
    selectedId,
    selectedAvailable,
    fetchReport,
    reportAttempt,
    planningRole,
    rolesLoading,
    rolesError,
    loading,
    listError,
    planContext,
    isPlanCurrent,
    viewerId,
  ]);

  return (
    <SiteShell>
      <div className="demo-shell">
      <section className="tf-cover mx-auto max-w-5xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8 lg:py-10">
        <Breadcrumbs trail={[{ label: "Goal Tracker" }]} />
        <p className="tf-eyebrow mt-6">Goal Tracker</p>
        <h1 className="mt-3 font-display text-4xl font-medium tracking-tight sm:text-5xl">
          Small Steps, Gently Tracked.
        </h1>
        <p className="mt-4 max-w-2xl text-base leading-relaxed text-muted-foreground">
          Track the recorded steps shown here from your Pathway Reports. Tap to mark something as
          in progress or met — your progress syncs to your account so it follows you across devices.
        </p>

        <InfoBox label="How does the tracker work?" className="mt-6 max-w-2xl">
          <p>
            We show recorded steps from the selected Pathway Report. These can include life skills,
            education and training, career pathways, living and community activities, and dated planning steps.
            Move them through <strong>Not started → In progress → Met</strong>
            at your own pace.
          </p>
          <p className="mt-2">
            Your status updates are saved to your account. Only you can see them unless you
            choose to share.
          </p>
        </InfoBox>

        {loading || rolesLoading ? (
          <p className="mt-10 text-sm text-muted-foreground">Loading…</p>
        ) : rolesError ? (
          <div role="alert" className="mt-10 rounded-2xl border bg-card p-4">
            <p className="text-sm">We couldn't confirm your planning view. Please try again.</p>
            <Button variant="outline" className="mt-3" onClick={() => setRolesAttempt(attempt => attempt + 1)}>Reload Planning View</Button>
          </div>
        ) : planningRoles.length === 0 ? (
          <div className="mt-10 rounded-2xl border bg-card p-4">
            <p className="text-sm">Goal Tracker is available for family and educator planning roles.</p>
            <Link to="/dashboard" className="mt-3 inline-block text-sm underline">Return to Your Workspace</Link>
          </div>
        ) : listError ? (
          <div role="alert" className="mt-10 rounded-2xl border bg-card p-4">
            <p className="text-sm">We couldn't load your Pathway Reports. Please try again.</p>
            <Button variant="outline" className="mt-3" onClick={() => setListAttempt(attempt => attempt + 1)}>Reload Reports</Button>
          </div>
        ) : reports.length === 0 && !selectedId ? (
          <div className="mt-10 rounded-3xl border border-dashed border-border/70 bg-gradient-hero p-10 text-center shadow-soft">
            <div className="mx-auto inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-background/80 shadow-soft">
              <Target className="h-6 w-6 text-primary" aria-hidden />
            </div>
            <h2 className="mt-4 font-display text-2xl font-medium tracking-tight">
              Nothing to track yet — that's okay.
            </h2>
            <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-muted-foreground">
              Create your first Pathway Report and we'll automatically pull the next steps
              into this tracker for you.
            </p>
            <Link
              to="/pathway"
              className="mt-6 inline-flex items-center justify-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-soft hover:shadow-lift"
            >
              <Sparkles className="h-4 w-4" aria-hidden />
              Create your first Pathway Report
            </Link>
          </div>
        ) : (
          <>
            {planningRoles.length > 1 && (
              <div className="mt-8 flex flex-wrap items-center gap-2" role="group" aria-label="Your Planning View">
                <span className="text-sm">Your Planning View</span>
                {planningRoles.map(role => <Button key={role} variant={planningRole === role ? "default" : "outline"}
                  aria-pressed={planningRole === role} onClick={() => setPlanningRole(role)}>{role === "family" ? "Family Plan" : "Educator Plan"}</Button>)}
              </div>
            )}
            <div className="mt-8 flex flex-wrap gap-2">
              <Button variant="outline" onClick={() => setListAttempt(attempt => attempt + 1)}>Refresh Report List</Button>
              {reports.map((r) => (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => setSelectedId(r.id)}
                  aria-pressed={selectedId === r.id}
                  className={cn(
                    "rounded-full border px-4 py-2 text-sm transition-colors",
                    selectedId === r.id
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border bg-card text-muted-foreground hover:text-foreground",
                  )}
                >
                  {r.student_first_name}
                  {r.grade_band ? ` · ${formatGradeBand(r.grade_band)}` : ""}
                </button>
              ))}
            </div>

            <div className="mt-8">
              {!selectedAvailable ? (
                <div role="alert" className="rounded-2xl border bg-card p-4">
                  <p className="text-sm">The selected report is no longer available in this list. Choose another report or reload the list.</p>
                  <Button variant="outline" className="mt-3" onClick={() => setListAttempt(attempt => attempt + 1)}>Reload Reports</Button>
                </div>
              ) : reportError ? (
                <div role="alert" className="rounded-2xl border bg-card p-4">
                  <p className="text-sm">We couldn't open this report's next steps. Please try again.</p>
                  <Button variant="outline" className="mt-3" onClick={() => setReportAttempt(attempt => attempt + 1)}>Reload Next Steps</Button>
                </div>
              ) : reportLoading || !goalItems || loadedId !== planContext ? (
                <p className="text-sm text-muted-foreground">Opening report…</p>
              ) : (
                <GoalList key={planContext} viewerId={viewerId} isPlanCurrent={isPlanCurrent} reportId={selectedId!} studentName={reportName} items={goalItems} />
              )}
            </div>
          </>
        )}
      </section>
      </div>
    </SiteShell>
  );
}

function GoalList({
  viewerId,
  isPlanCurrent,
  reportId,
  studentName,
  items,
}: {
  viewerId: string;
  isPlanCurrent: () => boolean;
  reportId: string;
  studentName: string;
  items: { id: string; group: string; label: string }[];
}) {
  const [statuses, setStatuses] = useState<Record<string, Status>>({});
  const [statusLoading, setStatusLoading] = useState(true);
  const [statusError, setStatusError] = useState(false);
  const [statusAttempt, setStatusAttempt] = useState(0);
  const [saving, setSaving] = useState(false);
  const activeRef = useRef(true);
  const savingRef = useRef(false);
  const loadStatuses = useServerFn(listGoalStatuses);
  const saveStatus = useServerFn(upsertGoalStatus);

  useEffect(() => {
    activeRef.current = true;
    return () => {
      activeRef.current = false;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    setStatusLoading(true);
    setStatusError(false);
    setStatuses({});
    loadStatuses({ data: { reportId, expected_viewer_id: viewerId } })
      .then((result) => {
        if (cancelled || !isPlanCurrent()) return;
        const value = result?.statuses;
        if (
          !value ||
          typeof value !== "object" ||
          Array.isArray(value) ||
          Object.entries(value).some(
            ([id, status]) => !id.length || id.length > 200 || !STATUSES.includes(status),
          )
        )
          throw new Error("Invalid saved progress");
        const confirmed = Object.fromEntries(Object.entries(value));
        setStatuses(confirmed);
        try {
          localStorage.setItem(storageKey(viewerId, reportId), JSON.stringify(confirmed));
        } catch {
          /* Storage is optional; the server is the source of saved progress. */
        }
      })
      .catch(() => {
        if (!cancelled && isPlanCurrent()) setStatusError(true);
      })
      .finally(() => {
        if (!cancelled && isPlanCurrent()) setStatusLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [reportId, viewerId, isPlanCurrent, loadStatuses, statusAttempt]);

  const setStatus = async (id: string, next: Status) => {
    if (
      !activeRef.current ||
      !isPlanCurrent() ||
      savingRef.current ||
      statusLoading ||
      statusError ||
      !items.some((item) => item.id === id)
    )
      return false;
    savingRef.current = true;
    setSaving(true);
    const updated = { ...statuses, [id]: next };
    setStatuses(updated);
    try {
      const result = await saveStatus({
        data: { reportId, itemId: id, status: next, expected_viewer_id: viewerId },
      });
      if (!activeRef.current || !isPlanCurrent()) return false;
      if (result?.ok !== true) throw new Error("Progress was not confirmed");
      try {
        localStorage.setItem(storageKey(viewerId, reportId), JSON.stringify(updated));
      } catch {
        /* Storage is optional. */
      }
      return true;
    } catch {
      if (!activeRef.current || !isPlanCurrent()) return false;
      setStatusError(true);
      toast.error(
        "We couldn't confirm this update. Reload your saved progress before trying again.",
      );
      return false;
    } finally {
      savingRef.current = false;
      if (activeRef.current && isPlanCurrent()) setSaving(false);
    }
  };

  if (statusLoading)
    return <p className="text-sm text-muted-foreground">Loading saved progress…</p>;
  if (statusError)
    return (
      <div role="alert" className="rounded-2xl border bg-card p-4">
        <p className="text-sm">
          We couldn't confirm your saved progress. Reload it before making another update.
        </p>
        <Button
          variant="outline"
          className="mt-3"
          onClick={() => setStatusAttempt((attempt) => attempt + 1)}
        >
          Reload Saved Progress
        </Button>
      </div>
    );

  const earlierEntries = earlierGoalProgress(statuses);

  const totals = items.reduce(
    (acc, it) => {
      const s = statuses[it.id] ?? "not-started";
      acc[s] += 1;
      return acc;
    },
    { "not-started": 0, "in-progress": 0, met: 0 } as Record<Status, number>,
  );

  // Group items
  const groups = items.reduce<Record<string, typeof items>>((acc, it) => {
    (acc[it.group] = acc[it.group] || []).push(it);
    return acc;
  }, {});

  return (
    <div aria-busy={saving}>
      {Object.keys(statuses).some(id => !items.some(item => item.id === id)) && (
        <p role="note" className="mb-4 rounded-2xl border bg-card p-4 text-sm">Some saved progress couldn't be matched to the steps in this view. It remains saved. Review the current steps before recording progress.</p>
      )}
      {earlierEntries.length > 0 && items.length > 0 && (
        <EarlierProgressReview entries={earlierEntries} items={items} statuses={statuses} saving={saving}
          onApply={async (sourceId, targetId) => {
            const source = earlierEntries.find(entry => entry.id === sourceId);
            if (!source || !items.some(item => item.id === targetId)) return false;
            return setStatus(targetId, source.status);
          }} />
      )}
      {items.length === 0 && (
        <p className="mb-4 text-sm text-muted-foreground">No next steps are available in this tracker for this report. <Link to="/reports/$reportId" params={{ reportId }} className="underline">Open your Pathway Report</Link> to review its current plan.</p>
      )}
      {saving && <p role="status" className="mb-3 text-sm text-muted-foreground">Saving progress…</p>}
      <div className="rounded-3xl bg-gradient-hero p-6 shadow-soft">
        <p className="font-display text-xl font-medium tracking-tight">{studentName}'s next steps</p>
        <div className="mt-4 grid grid-cols-3 gap-3 text-center">
          {STATUSES.map((s) => (
            <div key={s} className="rounded-2xl bg-background/70 p-3">
              <p className="font-display text-2xl font-semibold">{totals[s]}</p>
              <p className="text-xs text-muted-foreground">{LABELS[s]}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-8 space-y-8">
        {Object.entries(groups).map(([group, list]) => (
          <div key={group}>
            <h3 className="font-display text-base font-semibold uppercase tracking-wider text-primary">
              {toTitleCase(group)}
            </h3>
            <ul className="mt-3 space-y-2">
              {list.map((it) => {
                const current = statuses[it.id] ?? "not-started";
                return (
                  <li
                    key={it.id}
                    className="flex flex-col gap-3 rounded-2xl border border-border/60 bg-card p-4 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <p
                      className={cn(
                        "text-sm leading-relaxed",
                        current === "met" ? "text-muted-foreground line-through" : "text-foreground",
                      )}
                    >
                      {it.label}
                    </p>
                    <div className="flex shrink-0 gap-1.5">
                      {STATUSES.map((s) => (
                        <button
                          key={s}
                          type="button"
                          onClick={() => { void setStatus(it.id, s); }}
                          disabled={saving}
                          aria-pressed={current === s}
                          className={cn(
                            "rounded-full px-3 py-1 text-xs font-medium transition-colors",
                            current === s
                              ? s === "met"
                                ? "bg-primary text-primary-foreground"
                                : s === "in-progress"
                                  ? "bg-foreground text-background"
                                  : "bg-muted text-foreground"
                              : "border border-border text-muted-foreground hover:text-foreground",
                          )}
                        >
                          {LABELS[s]}
                        </button>
                      ))}
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </div>

      <div className="mt-10 flex flex-wrap gap-3">
        <Button asChild variant="outline">
          <Link to="/pathway">Create another Pathway Report</Link>
        </Button>
        <Button asChild>
          <Link to="/ppt-prep">Prep a PPT meeting →</Link>
        </Button>
      </div>
    </div>
  );
}
