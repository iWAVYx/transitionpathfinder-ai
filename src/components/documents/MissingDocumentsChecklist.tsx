/**
 * MissingDocumentsChecklist — surfaces the standard transition-planning
 * document set and marks which are present vs. missing across the
 * caller's visible caseload. Presentational only: consumes an array of
 * document rows (any shape with `doc_type` and optionally `student_id`)
 * and derives a checklist per doc-type.
 *
 * Feeds into the Pathway Report; a missing IEP or transition
 * assessment shows up as a Report "missing input" flag.
 */

import { CheckCircle2, Circle, FileText, Sparkles } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";

export type ChecklistDocType =
  | "iep"
  | "evaluation"
  | "transition_assessment"
  | "report_card"
  | "progress_report"
  | "accommodation_plan"
  | "outside_provider_report"
  | "work_sample";

const DOC_META: Record<
  ChecklistDocType,
  { label: string; why: string }
> = {
  iep: {
    label: "IEP",
    why: "Anchors goals, services, and accommodations across the report.",
  },
  evaluation: {
    label: "Evaluation",
    why: "Establishes eligibility evidence and current baselines.",
  },
  transition_assessment: {
    label: "Transition Assessment",
    why: "Feeds postsecondary goal areas in the Pathway Report.",
  },
  report_card: {
    label: "Report Card",
    why: "Confirms current academic performance for review.",
  },
  progress_report: {
    label: "Progress Report",
    why: "Shows growth against the IEP goals since the last review.",
  },
  accommodation_plan: {
    label: "Accommodation Plan",
    why: "504 or classroom accommodations informing readiness gaps.",
  },
  outside_provider_report: {
    label: "Outside Provider Report",
    why: "Adds clinical or agency evidence that isn't in school data.",
  },
  work_sample: {
    label: "Work Sample or Certificate",
    why: "Concrete evidence of interests, effort, and mastery.",
  },
};

type MinimalDocRow = { doc_type: string };

export function MissingDocumentsChecklist({
  rows,
  className,
  ctaHref = "/students",
  ctaLabel = "Upload from a student",
}: {
  rows: MinimalDocRow[] | null;
  className?: string;
  ctaHref?: string;
  ctaLabel?: string;
}) {
  const have = new Set(
    (rows ?? []).map((r) => (r.doc_type ?? "").toLowerCase()),
  );

  const items = (Object.keys(DOC_META) as ChecklistDocType[]).map((key) => {
    const meta = DOC_META[key];
    // Accept both exact and prefix matches (e.g. "iep" or "iep_current").
    const present = Array.from(have).some(
      (t) => t === key || t.startsWith(`${key}_`),
    );
    return { key, ...meta, present };
  });

  const missingCount = items.filter((i) => !i.present).length;

  return (
    <section
      className={`rounded-2xl border bg-card shadow-soft ${className ?? ""}`}
    >
      <header className="flex flex-wrap items-start justify-between gap-3 border-b p-5">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">
            Document Coverage
          </p>
          <h2 className="mt-1 font-display text-xl">
            Missing Documents Checklist
          </h2>
          <p className="mt-1 max-w-xl text-sm text-muted-foreground">
            {missingCount === 0
              ? "Every recommended transition document type is present in your caseload."
              : `${missingCount} recommended document ${missingCount === 1 ? "type is" : "types are"} not yet uploaded. Each missing type reduces what the Pathway Report can say with confidence.`}
          </p>
        </div>
        <Button asChild size="sm" variant={missingCount === 0 ? "outline" : "default"}>
          <Link to={ctaHref}>{ctaLabel}</Link>
        </Button>
      </header>
      <ul className="grid gap-2 p-4 sm:grid-cols-2">
        {items.map((it) => (
          <li
            key={it.key}
            className={`flex items-start gap-3 rounded-xl border p-3 ${
              it.present
                ? "border-emerald-200/70 bg-emerald-50/40 dark:border-emerald-500/20 dark:bg-emerald-500/5"
                : "border-border bg-muted/20"
            }`}
          >
            {it.present ? (
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
            ) : (
              <Circle className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
            )}
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <FileText className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="text-sm font-medium">{it.label}</span>
                {it.present ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-300">
                    Present
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Missing
                  </span>
                )}
              </div>
              <p className="mt-1 text-xs text-muted-foreground">{it.why}</p>
            </div>
          </li>
        ))}
      </ul>
      <footer className="flex items-center gap-2 border-t px-5 py-3 text-xs text-muted-foreground">
        <Sparkles className="h-3.5 w-3.5 text-primary" />
        Uploads feed the Pathway Report — the more coverage, the stronger the recommendations.
      </footer>
    </section>
  );
}
