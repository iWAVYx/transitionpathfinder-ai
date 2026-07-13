import { AlertTriangle, Sparkles, ArrowRight, CircleDashed } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { toTitleCase } from "@/lib/title-case";
import { ModuleEmptyState } from "@/components/dashboard/ModuleEmptyState";


/**
 * DataGapsCard — surfaces the Pathway Report's "Data Gaps + Needs Review"
 * section for educators: what's missing, why it matters, and who owns it.
 */

export interface DataGapItem {
  area: string;
  gap: string;
  impact: string;
  owner: string;
  due?: string;
  severity?: "high" | "medium" | "low";
}

export interface DataGapsData {
  items?: DataGapItem[];
  reportHref?: string;
}

const SEVERITY_TONE: Record<NonNullable<DataGapItem["severity"]>, string> = {
  high: "bg-rose-500/10 text-rose-700 ring-rose-500/20 dark:text-rose-300",
  medium: "bg-amber-500/10 text-amber-700 ring-amber-500/20 dark:text-amber-300",
  low: "bg-sky-500/10 text-sky-700 ring-sky-500/20 dark:text-sky-300",
};

const SAMPLE: Required<DataGapsData> = {
  reportHref: "/reports",
  items: [
    {
      area: "Vocational Assessment",
      gap: "No current interest inventory on file within last 12 months.",
      impact: "Employment goal cannot be defended in a PPT without a current assessment.",
      owner: "School Counselor",
      due: "Before next PPT",
      severity: "high",
    },
    {
      area: "Family Priorities Intake",
      gap: "Parent has not completed the priorities form.",
      impact: "Family Voice section will render as sample-only in the report.",
      owner: "Case Manager",
      due: "This week",
      severity: "high",
    },
    {
      area: "Independent Living Baseline",
      gap: "Life-skills checklist not scored in over 9 months.",
      impact: "Independent Living goal wording will not match student's current level.",
      owner: "Transition Specialist",
      due: "Within 30 days",
      severity: "medium",
    },
    {
      area: "Adult Services Referral",
      gap: "State agency intake started but not signed.",
      impact: "Post-graduation continuity of services may lapse.",
      owner: "Case Manager",
      due: "Within 60 days",
      severity: "medium",
    },
    {
      area: "Work-based Learning Hours",
      gap: "Fewer than 20 documented hours this term.",
      impact: "Weakens Employment readiness score in the report.",
      owner: "Job Coach",
      severity: "low",
    },
  ],
};

export function DataGapsCard({
  data,
  isSample = true,
  empty = false,
}: {
  data?: DataGapsData;
  isSample?: boolean;
  /** Force the unified empty state (no sample fallback). */
  empty?: boolean;
}) {
  const d: Required<DataGapsData> = { ...SAMPLE, ...(data ?? {}), items: data?.items ?? SAMPLE.items };
  const isEmpty = empty || d.items.length === 0;
  const highCount = d.items.filter((i) => (i.severity ?? "medium") === "high").length;


  return (
    <section
      aria-labelledby="data-gaps-title"
      className="mt-6 rounded-3xl border bg-card p-6 shadow-soft sm:p-8"
      data-testid="data-gaps-card"
    >
      <header className="flex flex-wrap items-start justify-between gap-3 border-b border-border/60 pb-4">
        <div className="min-w-0">
          <p className="tf-eyebrow flex items-center gap-1">
            <AlertTriangle className="h-3 w-3" aria-hidden /> Data Gaps + Needs Review
          </p>
          <h2 id="data-gaps-title" className="mt-1 font-display text-2xl font-medium tracking-tight">
            {toTitleCase("What's Missing Before The Next PPT")}
          </h2>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            Concrete gaps the report has flagged — with the owner, the reason it matters, and how urgent it is.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {isSample && (
            <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-primary ring-1 ring-primary/20">
              <Sparkles className="h-3 w-3" aria-hidden /> Sample Preview
            </span>
          )}
          <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider ring-1 ${SEVERITY_TONE.high}`}>
            {highCount} High Priority
          </span>
          <Link
            to={d.reportHref}
            className="inline-flex items-center gap-1 rounded-full border border-primary/40 bg-background px-3 py-1.5 text-xs font-semibold text-primary no-underline transition-colors hover:border-primary hover:bg-primary/10"
          >
            Open Report <ArrowRight className="h-3.5 w-3.5" aria-hidden />
          </Link>
        </div>
      </header>

      {isEmpty ? (
        <ModuleEmptyState
          kind="tasks"
          eyebrow="Data Gaps"
          title="No Gaps Flagged Yet"
          description="Gaps surface once a Pathway Report is built and reviewed — missing assessments, consents, or referrals will show up here with an owner, an impact statement, and a due date."
          primaryAction={{ label: "Open Pathway Report", to: d.reportHref }}
          secondaryAction={{ label: "Open Action Items", to: "/action-items" }}
          className="mt-5"
        />
      ) : (
      <ol className="mt-5 space-y-3">
        {d.items.map((it, i) => {
          const sev = it.severity ?? "medium";
          return (
            <li key={it.area} className="rounded-2xl border bg-background p-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="flex items-start gap-3">
                  <span className="mt-0.5 flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-[11px] font-semibold text-primary ring-1 ring-primary/20">
                    {i + 1}
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-foreground">{it.area}</p>
                    <p className="mt-1 text-xs text-foreground/85">{it.gap}</p>
                  </div>
                </div>
                <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ring-1 ${SEVERITY_TONE[sev]}`}>
                  {sev}
                </span>
              </div>
              <div className="mt-3 grid gap-2 border-t border-dashed border-border/60 pt-3 text-[11px] text-muted-foreground sm:grid-cols-3">
                <p><span className="font-semibold uppercase tracking-wider text-foreground/70">Impact:</span> {it.impact}</p>
                <p className="flex items-center gap-1"><CircleDashed className="h-3 w-3" aria-hidden /><span className="font-semibold uppercase tracking-wider text-foreground/70">Owner:</span> {it.owner}</p>
                {it.due && <p><span className="font-semibold uppercase tracking-wider text-foreground/70">Due:</span> {it.due}</p>}
              </div>
            </li>
          );
        })}
      </ol>
      )}

    </section>
  );
}
