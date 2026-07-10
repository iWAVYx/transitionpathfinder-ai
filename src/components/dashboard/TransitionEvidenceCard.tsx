import { FileSearch, Sparkles, ArrowRight, FileCheck2, AlertTriangle } from "lucide-react";
import { Link } from "@tanstack/react-router";

/**
 * TransitionEvidenceCard — school-level view of evidence coverage across
 * the building. Complements the caseload-level EvidenceReviewCard by
 * showing coverage percentages and where the gaps live.
 */

export interface EvidenceCoverage {
  category: string;
  covered: number;
  total: number;
  note?: string;
  ownerHint?: string;
}

export interface TransitionEvidenceData {
  categories?: EvidenceCoverage[];
  documentsHref?: string;
}

const SAMPLE: Required<TransitionEvidenceData> = {
  documentsHref: "/documents",
  categories: [
    { category: "Interest Inventories on File", covered: 118, total: 132, ownerHint: "School Counselor Team", note: "14 outstanding across 3 caseloads." },
    { category: "Current Vocational Evaluations", covered: 96, total: 132, ownerHint: "Transition Specialist", note: "36 evaluations older than 12 months." },
    { category: "Signed Family Priorities Intakes", covered: 100, total: 132, ownerHint: "Case Managers", note: "Outreach queued for the remaining 32 families." },
    { category: "Work-Based Learning Logs (Term)", covered: 71, total: 88, ownerHint: "Job Coaches", note: "17 students under 20 documented hours." },
    { category: "Student Voice Statements", covered: 124, total: 132, ownerHint: "Case Managers", note: "8 statements still in draft." },
    { category: "Adult-Services Referrals (Grade 12)", covered: 22, total: 34, ownerHint: "Transition Specialist", note: "12 seniors have unsigned intake." },
  ],
};

function pct(c: EvidenceCoverage) {
  return c.total > 0 ? Math.round((c.covered / c.total) * 100) : 0;
}

function tone(p: number) {
  if (p >= 90) return { bar: "bg-emerald-500", chip: "bg-emerald-500/10 text-emerald-700 ring-emerald-500/20 dark:text-emerald-300" };
  if (p >= 75) return { bar: "bg-sky-500", chip: "bg-sky-500/10 text-sky-700 ring-sky-500/20 dark:text-sky-300" };
  if (p >= 60) return { bar: "bg-amber-500", chip: "bg-amber-500/10 text-amber-700 ring-amber-500/20 dark:text-amber-300" };
  return { bar: "bg-rose-500", chip: "bg-rose-500/10 text-rose-700 ring-rose-500/20 dark:text-rose-300" };
}

export function TransitionEvidenceCard({
  data,
  isSample = true,
}: {
  data?: TransitionEvidenceData;
  isSample?: boolean;
}) {
  const d: Required<TransitionEvidenceData> = { ...SAMPLE, ...(data ?? {}), categories: data?.categories ?? SAMPLE.categories };
  const under75 = d.categories.filter((c) => pct(c) < 75).length;

  return (
    <section
      aria-labelledby="school-evidence-title"
      className="mt-6 rounded-3xl border bg-card p-6 shadow-soft sm:p-8"
      data-testid="school-evidence-card"
    >
      <header className="flex flex-wrap items-start justify-between gap-3 border-b border-border/60 pb-4">
        <div className="min-w-0">
          <p className="tf-eyebrow flex items-center gap-1">
            <FileSearch className="h-3 w-3" aria-hidden /> Building-Wide Transition Evidence
          </p>
          <h2 id="school-evidence-title" className="mt-1 font-display text-2xl font-medium tracking-tight">
            Evidence Coverage Across The Building
          </h2>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            How much of the required transition evidence is on file — and where the coverage gaps live.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {isSample && (
            <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-primary ring-1 ring-primary/20">
              <Sparkles className="h-3 w-3" aria-hidden /> Sample Preview
            </span>
          )}
          <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-amber-700 ring-1 ring-amber-500/20 dark:text-amber-300">
            <AlertTriangle className="h-3 w-3" aria-hidden /> {under75} Below Target
          </span>
          <Link
            to={d.documentsHref}
            className="inline-flex items-center gap-1 rounded-full border border-primary/40 bg-background px-3 py-1.5 text-xs font-semibold text-primary no-underline transition-colors hover:border-primary hover:bg-primary/10"
          >
            Open Documents <ArrowRight className="h-3.5 w-3.5" aria-hidden />
          </Link>
        </div>
      </header>

      <ul className="mt-5 space-y-3">
        {d.categories.map((c) => {
          const p = pct(c);
          const t = tone(p);
          return (
            <li key={c.category} className="rounded-2xl border bg-background p-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="flex items-center gap-2 text-sm font-semibold text-foreground">
                    <FileCheck2 className="h-3.5 w-3.5 text-primary" aria-hidden />
                    {c.category}
                  </p>
                  {c.ownerHint && (
                    <p className="mt-0.5 text-[11px] text-muted-foreground">Owner: {c.ownerHint}</p>
                  )}
                </div>
                <span className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold ring-1 ${t.chip}`}>
                  {c.covered} / {c.total} · {p}%
                </span>
              </div>
              <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-muted">
                <div
                  aria-hidden
                  className={`h-full rounded-full ${t.bar}`}
                  style={{ width: `${p}%` }}
                />
              </div>
              {c.note && <p className="mt-2 text-xs text-foreground/80">{c.note}</p>}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
