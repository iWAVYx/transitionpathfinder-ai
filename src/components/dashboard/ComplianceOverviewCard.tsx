import { ShieldCheck, Sparkles, ArrowRight } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { toTitleCase } from "@/lib/title-case";

/**
 * ComplianceOverviewCard — school-level IDEA + Indicator 13 compliance
 * snapshot. Aggregates from Pathway Reports across the building.
 */

export interface ComplianceMetric {
  label: string;
  value: string;
  target: string;
  percent: number;
  tone?: "success" | "warn" | "risk";
  note?: string;
}

export interface ComplianceOverviewData {
  buildingName?: string;
  reviewedThroughDate?: string;
  metrics?: ComplianceMetric[];
  reportsHref?: string;
}

const TONE_BAR: Record<NonNullable<ComplianceMetric["tone"]>, string> = {
  success: "bg-emerald-500",
  warn: "bg-amber-500",
  risk: "bg-rose-500",
};

const TONE_CHIP: Record<NonNullable<ComplianceMetric["tone"]>, string> = {
  success: "bg-emerald-500/10 text-emerald-700 ring-emerald-500/20 dark:text-emerald-300",
  warn: "bg-amber-500/10 text-amber-700 ring-amber-500/20 dark:text-amber-300",
  risk: "bg-rose-500/10 text-rose-700 ring-rose-500/20 dark:text-rose-300",
};

const SAMPLE: Required<ComplianceOverviewData> = {
  buildingName: "Riverbend High School",
  reviewedThroughDate: "Reviewed through this week",
  reportsHref: "/reports",
  metrics: [
    { label: "Indicator 13 Compliance", value: "94%", target: "≥ 90%", percent: 94, tone: "success", note: "8 files under review awaiting educator sign-off." },
    { label: "Current Transition Assessments", value: "87%", target: "100%", percent: 87, tone: "warn", note: "12 seniors need a re-eval within 30 days." },
    { label: "Signed Family Consents", value: "76%", target: "≥ 85%", percent: 76, tone: "warn", note: "9 families outstanding — Family Hub outreach queued." },
    { label: "Adult-Services Referrals Complete", value: "68%", target: "100% before graduation", percent: 68, tone: "risk", note: "Priority group: Grade 12 seniors exiting in 90 days." },
  ],
};

export function ComplianceOverviewCard({
  data,
  isSample = true,
}: {
  data?: ComplianceOverviewData;
  isSample?: boolean;
}) {
  const d: Required<ComplianceOverviewData> = { ...SAMPLE, ...(data ?? {}), metrics: data?.metrics ?? SAMPLE.metrics };

  return (
    <section
      aria-labelledby="school-compliance-title"
      className="mt-6 rounded-3xl border bg-card p-6 shadow-soft sm:p-8"
      data-testid="school-compliance-card"
    >
      <header className="flex flex-wrap items-start justify-between gap-3 border-b border-border/60 pb-4">
        <div className="min-w-0">
          <p className="tf-eyebrow flex items-center gap-1">
            <ShieldCheck className="h-3 w-3" aria-hidden /> IDEA + Indicator 13 Compliance
          </p>
          <h2 id="school-compliance-title" className="mt-1 font-display text-2xl font-medium tracking-tight">
            {toTitleCase(`${d.buildingName} Compliance Snapshot`)}
          </h2>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            Aggregated from every Pathway Report in the building. Each metric ties back to the specific caseloads that own it.
          </p>
          <p className="mt-1 text-[11px] text-muted-foreground">{d.reviewedThroughDate}</p>
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
            Open Reports <ArrowRight className="h-3.5 w-3.5" aria-hidden />
          </Link>
        </div>
      </header>

      <ul className="mt-5 grid gap-3 md:grid-cols-2">
        {d.metrics.map((m) => {
          const tone = m.tone ?? "success";
          return (
            <li key={m.label} className="rounded-2xl border bg-background p-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-foreground">{m.label}</p>
                  <p className="mt-0.5 text-[11px] text-muted-foreground">Target: {m.target}</p>
                </div>
                <span className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold ring-1 ${TONE_CHIP[tone]}`}>
                  {m.value}
                </span>
              </div>
              <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-muted">
                <div
                  aria-hidden
                  className={`h-full rounded-full ${TONE_BAR[tone]}`}
                  style={{ width: `${Math.max(0, Math.min(100, m.percent))}%` }}
                />
              </div>
              {m.note && <p className="mt-2 text-xs text-foreground/80">{m.note}</p>}
            </li>
          );
        })}
      </ul>

      <p className="mt-5 text-[11px] italic leading-relaxed text-muted-foreground">
        AI-assisted aggregation from source documents — every metric can be drilled to the specific caseload and student file it summarizes.
      </p>
    </section>
  );
}
