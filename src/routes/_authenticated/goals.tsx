import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Target, Sparkles } from "lucide-react";

import { SiteShell } from "@/components/site/SiteShell";
import { Breadcrumbs } from "@/components/site/Breadcrumbs";
import { InfoBox } from "@/components/site/InfoBox";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { listMyReports } from "@/lib/pathway.functions";
import { getPathwayReport } from "@/lib/ppt.functions";
import { listGoalStatuses, upsertGoalStatus } from "@/lib/goal-statuses.functions";
import type { PathwayReport } from "@/lib/pathway.functions";

import { toTitleCase } from "@/lib/title-case";
export const Route = createFileRoute("/_authenticated/goals")({
  head: () => ({ meta: [{ title: "Goal Tracker — TransitionForward" }] }),
  component: GoalsPage,
});

type Status = "not-started" | "in-progress" | "met";
const STATUSES: Status[] = ["not-started", "in-progress", "met"];
const LABELS: Record<Status, string> = {
  "not-started": "Not started",
  "in-progress": "In progress",
  met: "Met",
};

type ReportRow = { id: string; student_first_name: string; grade_band: string | null; created_at: string };

function storageKey(reportId: string) {
  return `tf:goal-status:${reportId}`;
}


function GoalsPage() {
  const list = useServerFn(listMyReports);
  const fetchReport = useServerFn(getPathwayReport);

  const [reports, setReports] = useState<ReportRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [report, setReport] = useState<PathwayReport | null>(null);
  const [reportName, setReportName] = useState<string>("");
  const [reportLoading, setReportLoading] = useState(false);

  useEffect(() => {
    list()
      .then((r) => {
        setReports(r.reports);
        if (r.reports[0]) setSelectedId(r.reports[0].id);
      })
      .finally(() => setLoading(false));
  }, [list]);

  useEffect(() => {
    if (!selectedId) {
      setReport(null);
      return;
    }
    setReportLoading(true);
    fetchReport({ data: { id: selectedId } })
      .then((r) => {
        setReport(r.content as PathwayReport);
        setReportName(r.student_first_name);
      })
      .finally(() => setReportLoading(false));
  }, [selectedId, fetchReport]);

  const goalItems = useMemo(() => {
    if (!report) return [] as { id: string; group: string; label: string }[];
    const items: { id: string; group: string; label: string }[] = [];
    report.life_skills_focus.forEach((s, i) => items.push({ id: `life:${i}`, group: "Life skills", label: s }));
    report.education_training_options.forEach((s, i) =>
      items.push({ id: `edu:${i}`, group: "Education & training", label: s }),
    );
    report.career_pathways.forEach((p, pi) =>
      p.first_steps.forEach((s, si) =>
        items.push({ id: `path:${pi}:${si}`, group: `Pathway: ${p.title}`, label: s }),
      ),
    );
    report.thirty_day_plan.forEach((w) =>
      items.push({ id: `30d:${w.week}`, group: "30-day plan", label: `Week ${w.week}: ${w.action}` }),
    );
    return items;
  }, [report]);

  return (
    <SiteShell>
      <section className="mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-8">
        <Breadcrumbs trail={[{ label: "Goal Tracker" }]} />
        <p className="mt-6 text-xs font-semibold uppercase tracking-wider text-primary">Goal Tracker</p>
        <h1 className="mt-3 font-display text-4xl font-medium tracking-tight sm:text-5xl">
          Small Steps, Gently Tracked.
        </h1>
        <p className="mt-4 max-w-2xl text-base leading-relaxed text-muted-foreground">
          Every action from your Pathway Reports, in one place. Tap to mark something as
          in progress or met — your progress syncs to your account so it follows you across devices.
        </p>

        <InfoBox label="How does the tracker work?" className="mt-6 max-w-2xl">
          <p>
            We pull the next steps from each Pathway Report you've created — life skills,
            education and training, career pathways, and the 30-day plan — and lay them out
            here so you can move them through <strong>Not started → In progress → Met</strong>
            at your own pace.
          </p>
          <p className="mt-2">
            Your status updates are saved to your account. Only you can see them unless you
            choose to share.
          </p>
        </InfoBox>

        {loading ? (
          <p className="mt-10 text-sm text-muted-foreground">Loading…</p>
        ) : reports.length === 0 ? (
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
              className="mt-6 inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-soft hover:shadow-lift"
            >
              <Sparkles className="h-4 w-4" aria-hidden />
              Create your first Pathway Report
            </Link>
          </div>
        ) : (
          <>
            <div className="mt-8 flex flex-wrap gap-2">
              {reports.map((r) => (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => setSelectedId(r.id)}
                  className={cn(
                    "rounded-full border px-4 py-2 text-sm transition-colors",
                    selectedId === r.id
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border bg-card text-muted-foreground hover:text-foreground",
                  )}
                >
                  {r.student_first_name}
                  {r.grade_band ? ` · ${r.grade_band}` : ""}
                </button>
              ))}
            </div>

            <div className="mt-8">
              {reportLoading || !report ? (
                <p className="text-sm text-muted-foreground">Opening report…</p>
              ) : (
                <GoalList reportId={selectedId!} studentName={reportName} items={goalItems} />
              )}
            </div>
          </>
        )}
      </section>
    </SiteShell>
  );
}

function GoalList({
  reportId,
  studentName,
  items,
}: {
  reportId: string;
  studentName: string;
  items: { id: string; group: string; label: string }[];
}) {
  const [statuses, setStatuses] = useState<Record<string, Status>>({});

  useEffect(() => {
    try {
      const raw = localStorage.getItem(storageKey(reportId));
      setStatuses(raw ? (JSON.parse(raw) as Record<string, Status>) : {});
    } catch {
      setStatuses({});
    }
  }, [reportId]);

  const setStatus = (id: string, next: Status) => {
    setStatuses((prev) => {
      const updated = { ...prev, [id]: next };
      try {
        localStorage.setItem(storageKey(reportId), JSON.stringify(updated));
      } catch {
        /* ignore */
      }
      return updated;
    });
  };

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
    <div>
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
                          onClick={() => setStatus(it.id, s)}
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
