import { ClipboardList, Sparkles, ArrowRight, CheckCircle2, AlertCircle } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { toTitleCase } from "@/lib/title-case";
import { ModuleEmptyState } from "@/components/dashboard/ModuleEmptyState";


/**
 * StudentFitSummariesCard — anonymized narrative fit summaries for a
 * partner opportunity. Complements PartnerMatchesCard by giving the
 * partner the "why" behind each match without revealing PII.
 */

export interface StudentFitItem {
  code: string;
  headline: string;
  strengths: string[];
  supportsNeeded: string[];
  recommendedFirstStep: string;
  fit: number;
}

export interface StudentFitSummariesData {
  items?: StudentFitItem[];
  detailsHref?: string;
}

const SAMPLE: Required<StudentFitSummariesData> = {
  detailsHref: "/opportunities",
  items: [
    {
      code: "TF-1042",
      headline: "Strong design portfolio with independent travel and mature communication.",
      fit: 94,
      strengths: [
        "Has completed a portfolio piece in CAD",
        "Travels independently by public transit",
        "Comfortable with structured feedback",
      ],
      supportsNeeded: [
        "Warm handoff on day one to reduce first-day anxiety",
        "Clear written weekly expectations",
      ],
      recommendedFirstStep: "Invite to a 30-min meet-and-greet with the site mentor.",
    },
    {
      code: "TF-0987",
      headline: "Hands-on fabricator ready for supervised shop work.",
      fit: 88,
      strengths: [
        "Shop-safety certified this term",
        "Consistent mornings availability",
        "Strong team collaborator",
      ],
      supportsNeeded: [
        "Check-in with school job coach every 2 weeks",
        "Visual step-by-step for new machines",
      ],
      recommendedFirstStep: "Schedule a shadow shift with the lead fabricator.",
    },
    {
      code: "TF-1108",
      headline: "Emerging visual arts student building attendance stamina.",
      fit: 82,
      strengths: ["Consistent attendance", "Portfolio in progress"],
      supportsNeeded: [
        "One-day-per-week start to build stamina",
        "Predictable routine and location",
      ],
      recommendedFirstStep: "Offer a 1-day observation before the internship starts.",
    },
  ],
};

function fitTone(fit: number) {
  if (fit >= 90) return "bg-emerald-500/10 text-emerald-700 ring-emerald-500/20 dark:text-emerald-300";
  if (fit >= 80) return "bg-sky-500/10 text-sky-700 ring-sky-500/20 dark:text-sky-300";
  return "bg-amber-500/10 text-amber-700 ring-amber-500/20 dark:text-amber-300";
}

export function StudentFitSummariesCard({
  data,
  isSample = true,
  empty = false,
}: {
  data?: StudentFitSummariesData;
  isSample?: boolean;
  /** Force the unified empty state (no sample fallback). */
  empty?: boolean;
}) {
  const d: Required<StudentFitSummariesData> = { ...SAMPLE, ...(data ?? {}), items: data?.items ?? SAMPLE.items };
  const isEmpty = empty || d.items.length === 0;


  return (
    <section
      aria-labelledby="student-fit-title"
      className="mt-6 rounded-3xl border bg-card p-6 shadow-soft sm:p-8"
      data-testid="student-fit-summaries-card"
    >
      <header className="flex flex-wrap items-start justify-between gap-3 border-b border-border/60 pb-4">
        <div className="min-w-0">
          <p className="tf-eyebrow flex items-center gap-1">
            <ClipboardList className="h-3 w-3" aria-hidden /> Student Fit Summaries
          </p>
          <h2 id="student-fit-title" className="mt-1 font-display text-2xl font-medium tracking-tight">
            {toTitleCase("The Why Behind Each Match")}
          </h2>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            Narrative summaries derived from the Pathway Report — strengths, supports, and the recommended first step. No PII.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {isSample && (
            <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-primary ring-1 ring-primary/20">
              <Sparkles className="h-3 w-3" aria-hidden /> Sample Preview
            </span>
          )}
          <Link
            to={d.detailsHref}
            className="inline-flex items-center gap-1 rounded-full border border-primary/40 bg-background px-3 py-1.5 text-xs font-semibold text-primary no-underline transition-colors hover:border-primary hover:bg-primary/10"
          >
            Open Opportunity <ArrowRight className="h-3.5 w-3.5" aria-hidden />
          </Link>
        </div>
      </header>

      <ol className="mt-5 space-y-4">
        {d.items.map((s) => (
          <li key={s.code} className="rounded-2xl border bg-background p-4">
            <div className="flex flex-wrap items-start justify-between gap-3 border-b border-dashed border-border/60 pb-3">
              <div className="min-w-0">
                <p className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">{s.code}</p>
                <p className="mt-0.5 text-sm font-medium text-foreground">{s.headline}</p>
              </div>
              <span className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold ring-1 ${fitTone(s.fit)}`}>
                Fit {s.fit}
              </span>
            </div>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <div>
                <p className="tf-eyebrow flex items-center gap-1 text-emerald-700 dark:text-emerald-300">
                  <CheckCircle2 className="h-3 w-3" aria-hidden /> Strengths
                </p>
                <ul className="mt-1.5 space-y-1 text-xs">
                  {s.strengths.map((x) => (
                    <li key={x} className="flex items-start gap-2">
                      <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500/60" />
                      <span className="text-foreground/90">{x}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <p className="tf-eyebrow flex items-center gap-1 text-amber-700 dark:text-amber-300">
                  <AlertCircle className="h-3 w-3" aria-hidden /> Supports Needed
                </p>
                <ul className="mt-1.5 space-y-1 text-xs">
                  {s.supportsNeeded.map((x) => (
                    <li key={x} className="flex items-start gap-2">
                      <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-500/60" />
                      <span className="text-foreground/90">{x}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
            <p className="mt-3 rounded-xl bg-primary/5 p-3 text-xs text-primary ring-1 ring-primary/20">
              <span className="font-semibold uppercase tracking-wider">Recommended first step:</span> {s.recommendedFirstStep}
            </p>
          </li>
        ))}
      </ol>
    </section>
  );
}
