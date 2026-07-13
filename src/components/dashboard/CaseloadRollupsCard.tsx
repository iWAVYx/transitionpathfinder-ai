import { Users, Sparkles, ArrowRight, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { toTitleCase } from "@/lib/title-case";
import { ModuleEmptyState } from "@/components/dashboard/ModuleEmptyState";


/**
 * CaseloadRollupsCard — school-level rollup of every caseload in the
 * building. Shows students served, reports current, PPTs scheduled,
 * and gap status per case manager (no PII).
 */

export interface CaseloadRow {
  educator: string;
  gradeBand: string;
  students: number;
  reportsCurrent: number;
  pptsThisMonth: number;
  gaps: number;
  trend?: "up" | "flat" | "down";
}

export interface CaseloadRollupsData {
  rows?: CaseloadRow[];
  buildingHref?: string;
}

const SAMPLE: Required<CaseloadRollupsData> = {
  buildingHref: "/hubs/school",
  rows: [
    { educator: "Ms. Alvarez", gradeBand: "Grade 12", students: 18, reportsCurrent: 17, pptsThisMonth: 6, gaps: 2, trend: "up" },
    { educator: "Mr. Brooks", gradeBand: "Grade 11", students: 22, reportsCurrent: 19, pptsThisMonth: 4, gaps: 5, trend: "flat" },
    { educator: "Ms. Chen", gradeBand: "Grade 10 – 12", students: 15, reportsCurrent: 14, pptsThisMonth: 3, gaps: 1, trend: "up" },
    { educator: "Mr. Diaz", gradeBand: "Grade 12", students: 20, reportsCurrent: 13, pptsThisMonth: 7, gaps: 9, trend: "down" },
    { educator: "Ms. Ellis", gradeBand: "Grade 9 – 10", students: 12, reportsCurrent: 12, pptsThisMonth: 2, gaps: 0, trend: "up" },
    { educator: "Mx. Fenn", gradeBand: "Grade 11 – 12", students: 17, reportsCurrent: 15, pptsThisMonth: 5, gaps: 3, trend: "flat" },
  ],
};

function trendIcon(t?: CaseloadRow["trend"]) {
  if (t === "up") return { Icon: TrendingUp, tone: "text-emerald-600 dark:text-emerald-400" };
  if (t === "down") return { Icon: TrendingDown, tone: "text-rose-600 dark:text-rose-400" };
  return { Icon: Minus, tone: "text-muted-foreground" };
}

function gapsTone(g: number) {
  if (g === 0) return "bg-emerald-500/10 text-emerald-700 ring-emerald-500/20 dark:text-emerald-300";
  if (g <= 3) return "bg-sky-500/10 text-sky-700 ring-sky-500/20 dark:text-sky-300";
  if (g <= 6) return "bg-amber-500/10 text-amber-700 ring-amber-500/20 dark:text-amber-300";
  return "bg-rose-500/10 text-rose-700 ring-rose-500/20 dark:text-rose-300";
}

export function CaseloadRollupsCard({
  data,
  isSample = true,
  empty = false,
}: {
  data?: CaseloadRollupsData;
  isSample?: boolean;
  /** Force the unified empty state (no sample fallback). */
  empty?: boolean;
}) {
  const d: Required<CaseloadRollupsData> = { ...SAMPLE, ...(data ?? {}), rows: data?.rows ?? SAMPLE.rows };
  const isEmpty = empty || d.rows.length === 0;


  const totals = d.rows.reduce(
    (acc, r) => {
      acc.students += r.students;
      acc.reportsCurrent += r.reportsCurrent;
      acc.ppts += r.pptsThisMonth;
      acc.gaps += r.gaps;
      return acc;
    },
    { students: 0, reportsCurrent: 0, ppts: 0, gaps: 0 },
  );
  const reportPct = totals.students > 0 ? Math.round((totals.reportsCurrent / totals.students) * 100) : 0;

  return (
    <section
      aria-labelledby="caseload-rollups-title"
      className="mt-6 rounded-3xl border bg-card p-6 shadow-soft sm:p-8"
      data-testid="caseload-rollups-card"
    >
      <header className="flex flex-wrap items-start justify-between gap-3 border-b border-border/60 pb-4">
        <div className="min-w-0">
          <p className="tf-eyebrow flex items-center gap-1">
            <Users className="h-3 w-3" aria-hidden /> Caseload Rollups
          </p>
          <h2 id="caseload-rollups-title" className="mt-1 font-display text-2xl font-medium tracking-tight">
            {toTitleCase("Every Caseload In The Building")}
          </h2>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            Students served, Pathway Reports current, PPTs scheduled, and open data gaps — per case manager.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {isSample && (
            <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-primary ring-1 ring-primary/20">
              <Sparkles className="h-3 w-3" aria-hidden /> Sample Preview
            </span>
          )}
          <Link
            to={d.buildingHref}
            className="inline-flex items-center gap-1 rounded-full border border-primary/40 bg-background px-3 py-1.5 text-xs font-semibold text-primary no-underline transition-colors hover:border-primary hover:bg-primary/10"
          >
            Open Caseloads <ArrowRight className="h-3.5 w-3.5" aria-hidden />
          </Link>
        </div>
      </header>

      <div className="mt-4 grid gap-3 sm:grid-cols-4">
        <RollupStat label="Students Served" value={totals.students.toString()} />
        <RollupStat label="Reports Current" value={`${reportPct}%`} sub={`${totals.reportsCurrent} of ${totals.students}`} />
        <RollupStat label="PPTs This Month" value={totals.ppts.toString()} />
        <RollupStat label="Open Data Gaps" value={totals.gaps.toString()} tone={totals.gaps > 15 ? "risk" : totals.gaps > 6 ? "warn" : "success"} />
      </div>

      <div className="mt-5 overflow-x-auto rounded-2xl border bg-background">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead className="bg-muted/40 text-[10px] uppercase tracking-wider text-muted-foreground">
            <tr>
              <th className="px-4 py-2 font-semibold">Case Manager</th>
              <th className="px-4 py-2 font-semibold">Grade Band</th>
              <th className="px-4 py-2 font-semibold text-right">Students</th>
              <th className="px-4 py-2 font-semibold text-right">Reports Current</th>
              <th className="px-4 py-2 font-semibold text-right">PPTs / Mo</th>
              <th className="px-4 py-2 font-semibold text-right">Gaps</th>
              <th className="px-4 py-2 font-semibold text-right">Trend</th>
            </tr>
          </thead>
          <tbody>
            {d.rows.map((r) => {
              const { Icon, tone } = trendIcon(r.trend);
              const rc = r.students > 0 ? Math.round((r.reportsCurrent / r.students) * 100) : 0;
              return (
                <tr key={r.educator} className="border-t border-border/60">
                  <td className="px-4 py-2.5 font-medium text-foreground">{r.educator}</td>
                  <td className="px-4 py-2.5 text-xs text-muted-foreground">{r.gradeBand}</td>
                  <td className="px-4 py-2.5 text-right">{r.students}</td>
                  <td className="px-4 py-2.5 text-right text-xs">
                    <span className="text-foreground/90">{r.reportsCurrent}</span>
                    <span className="ml-1 text-muted-foreground">({rc}%)</span>
                  </td>
                  <td className="px-4 py-2.5 text-right">{r.pptsThisMonth}</td>
                  <td className="px-4 py-2.5 text-right">
                    <span className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ${gapsTone(r.gaps)}`}>
                      {r.gaps}
                    </span>
                  </td>
                  <td className={`px-4 py-2.5 text-right ${tone}`}>
                    <Icon className="ml-auto h-4 w-4" aria-hidden />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function RollupStat({
  label,
  value,
  sub,
  tone,
}: {
  label: string;
  value: string;
  sub?: string;
  tone?: "success" | "warn" | "risk";
}) {
  const chip =
    tone === "risk"
      ? "text-rose-700 dark:text-rose-300"
      : tone === "warn"
        ? "text-amber-700 dark:text-amber-300"
        : "text-foreground";
  return (
    <div className="rounded-2xl border bg-background p-4">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className={`mt-1 font-display text-2xl font-medium tracking-tight ${chip}`}>{value}</p>
      {sub && <p className="text-[11px] text-muted-foreground">{sub}</p>}
    </div>
  );
}
