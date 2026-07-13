import { ShieldCheck, Sparkles, ArrowRight, Building2 } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { toTitleCase } from "@/lib/title-case";
import { ModuleEmptyState } from "@/components/dashboard/ModuleEmptyState";


/**
 * DistrictComplianceCard — district-wide IDEA + Indicator 13 rollup
 * across every building. Complements the school-level card by
 * aggregating totals and showing per-building outliers.
 */

export interface DistrictBuildingCompliance {
  building: string;
  seniors: number;
  indicator13: number;
  assessmentsCurrent: number;
  familyConsents: number;
  adultReferrals: number;
}

export interface DistrictComplianceData {
  districtName?: string;
  reviewedThroughDate?: string;
  buildings?: DistrictBuildingCompliance[];
  reportsHref?: string;
}

const SAMPLE: Required<DistrictComplianceData> = {
  districtName: "Riverbend Public Schools",
  reviewedThroughDate: "Reviewed through this week",
  reportsHref: "/reports",
  buildings: [
    { building: "Riverbend High", seniors: 132, indicator13: 94, assessmentsCurrent: 87, familyConsents: 76, adultReferrals: 68 },
    { building: "North Ridge High", seniors: 108, indicator13: 91, assessmentsCurrent: 82, familyConsents: 80, adultReferrals: 72 },
    { building: "East Valley High", seniors: 96, indicator13: 88, assessmentsCurrent: 79, familyConsents: 71, adultReferrals: 61 },
    { building: "Lakeside Tech", seniors: 74, indicator13: 96, assessmentsCurrent: 92, familyConsents: 88, adultReferrals: 81 },
    { building: "Central Transition Program", seniors: 42, indicator13: 98, assessmentsCurrent: 95, familyConsents: 90, adultReferrals: 85 },
  ],
};

function tone(p: number, target: number) {
  if (p >= target) return { bar: "bg-emerald-500", chip: "bg-emerald-500/10 text-emerald-700 ring-emerald-500/20 dark:text-emerald-300" };
  if (p >= target - 10) return { bar: "bg-amber-500", chip: "bg-amber-500/10 text-amber-700 ring-amber-500/20 dark:text-amber-300" };
  return { bar: "bg-rose-500", chip: "bg-rose-500/10 text-rose-700 ring-rose-500/20 dark:text-rose-300" };
}

function weightedAvg(rows: DistrictBuildingCompliance[], key: keyof Omit<DistrictBuildingCompliance, "building" | "seniors">) {
  const totalW = rows.reduce((s, r) => s + r.seniors, 0);
  if (totalW === 0) return 0;
  const sum = rows.reduce((s, r) => s + r[key] * r.seniors, 0);
  return Math.round(sum / totalW);
}

export function DistrictComplianceCard({
  data,
  isSample = true,
  empty = false,
}: {
  data?: DistrictComplianceData;
  isSample?: boolean;
  /** Force the unified empty state (no sample fallback). */
  empty?: boolean;
}) {
  const d: Required<DistrictComplianceData> = { ...SAMPLE, ...(data ?? {}), buildings: data?.buildings ?? SAMPLE.buildings };
  const isEmpty = empty || d.buildings.length === 0;
  const seniors = d.buildings.reduce((s, r) => s + r.seniors, 0);

  const districtRoll = {
    indicator13: weightedAvg(d.buildings, "indicator13"),
    assessmentsCurrent: weightedAvg(d.buildings, "assessmentsCurrent"),
    familyConsents: weightedAvg(d.buildings, "familyConsents"),
    adultReferrals: weightedAvg(d.buildings, "adultReferrals"),
  };

  return (
    <section
      aria-labelledby="district-compliance-title"
      className="mt-6 rounded-3xl border bg-card p-6 shadow-soft sm:p-8"
      data-testid="district-compliance-card"
    >
      <header className="flex flex-wrap items-start justify-between gap-3 border-b border-border/60 pb-4">
        <div className="min-w-0">
          <p className="tf-eyebrow flex items-center gap-1">
            <ShieldCheck className="h-3 w-3" aria-hidden /> District Compliance Rollup
          </p>
          <h2 id="district-compliance-title" className="mt-1 font-display text-2xl font-medium tracking-tight">
            {toTitleCase(`${d.districtName} — IDEA + Indicator 13`)}
          </h2>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            Weighted by senior enrollment. Every metric drills to the building and caseload that owns it.
          </p>
          <p className="mt-1 text-[11px] text-muted-foreground">
            {d.reviewedThroughDate} · {seniors} seniors across {d.buildings.length} buildings
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {isSample && (
            <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-primary ring-1 ring-primary/20">
              <Sparkles className="h-3 w-3" aria-hidden /> Sample Preview
            </span>
          )}
          <Link
            to={d.reportsHref}
            className="inline-flex items-center gap-1 rounded-full border border-primary/40 bg-background px-3 py-1.5 text-xs font-semibold text-primary no-underline transition-colors hover:border-primary hover:bg-primary/10"
          >
            Open District Reports <ArrowRight className="h-3.5 w-3.5" aria-hidden />
          </Link>
        </div>
      </header>

      {isEmpty ? (
        <ModuleEmptyState
          kind="reports"
          eyebrow="District Compliance"
          title="No Buildings Reporting Yet"
          description="As schools onboard and educators generate Pathway Reports, this district-wide rollup will show weighted IDEA + Indicator 13 metrics with drill-through to each building and caseload."
          primaryAction={{ label: "Add Schools", to: "/settings/invites" }}
          secondaryAction={{ label: "Open District Report", to: d.reportsHref }}
          className="mt-5"
        />
      ) : (
      <>
      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <RollupStat label="Indicator 13" value={`${districtRoll.indicator13}%`} target={90} />
        <RollupStat label="Current Assessments" value={`${districtRoll.assessmentsCurrent}%`} target={95} />
        <RollupStat label="Family Consents" value={`${districtRoll.familyConsents}%`} target={85} />
        <RollupStat label="Adult-Services Referrals" value={`${districtRoll.adultReferrals}%`} target={90} />
      </div>

      <div className="mt-5 overflow-x-auto rounded-2xl border bg-background">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead className="bg-muted/40 text-[10px] uppercase tracking-wider text-muted-foreground">
            <tr>
              <th className="px-4 py-2 font-semibold">Building</th>
              <th className="px-4 py-2 font-semibold text-right">Seniors</th>
              <th className="px-4 py-2 font-semibold text-right">Ind. 13</th>
              <th className="px-4 py-2 font-semibold text-right">Assessments</th>
              <th className="px-4 py-2 font-semibold text-right">Consents</th>
              <th className="px-4 py-2 font-semibold text-right">Referrals</th>
            </tr>
          </thead>
          <tbody>
            {d.buildings.map((b) => (
              <tr key={b.building} className="border-t border-border/60">
                <td className="px-4 py-2.5 font-medium text-foreground">
                  <span className="inline-flex items-center gap-1.5">
                    <Building2 className="h-3.5 w-3.5 text-primary" aria-hidden />
                    {b.building}
                  </span>
                </td>
                <td className="px-4 py-2.5 text-right">{b.seniors}</td>
                <MetricCell v={b.indicator13} target={90} />
                <MetricCell v={b.assessmentsCurrent} target={95} />
                <MetricCell v={b.familyConsents} target={85} />
                <MetricCell v={b.adultReferrals} target={90} />
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      </>
      )}

    </section>
  );
}

function RollupStat({ label, value, target }: { label: string; value: string; target: number }) {
  const pct = parseInt(value, 10);
  const t = tone(pct, target);
  return (
    <div className="rounded-2xl border bg-background p-4">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="mt-1 font-display text-2xl font-medium tracking-tight text-foreground">{value}</p>
      <p className="text-[11px] text-muted-foreground">Target ≥ {target}%</p>
      <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-muted">
        <div aria-hidden className={`h-full rounded-full ${t.bar}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function MetricCell({ v, target }: { v: number; target: number }) {
  const t = tone(v, target);
  return (
    <td className="px-4 py-2.5 text-right">
      <span className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ${t.chip}`}>
        {v}%
      </span>
    </td>
  );
}
