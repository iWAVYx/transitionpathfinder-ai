import { FolderCheck, Sparkles, ArrowRight, FileText, ClipboardCheck, MessageSquareQuote, GraduationCap } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { toTitleCase } from "@/lib/title-case";

/**
 * EvidenceReviewCard — Documents + Evidence panel for educators.
 * Mirrors the Pathway Report's "Documents and Evidence" section: what the
 * plan is grounded in, who provided it, and its recency.
 */

export interface EvidenceItem {
  title: string;
  source: string;
  updated: string;
  kind: "assessment" | "document" | "voice" | "observation";
  status?: "current" | "stale" | "missing";
  note?: string;
}

export interface EvidenceReviewData {
  items?: EvidenceItem[];
  documentsHref?: string;
}

const KIND_ICON: Record<EvidenceItem["kind"], typeof FileText> = {
  assessment: ClipboardCheck,
  document: FileText,
  voice: MessageSquareQuote,
  observation: GraduationCap,
};

const STATUS_TONE: Record<NonNullable<EvidenceItem["status"]>, string> = {
  current: "bg-emerald-500/10 text-emerald-700 ring-emerald-500/20 dark:text-emerald-300",
  stale: "bg-amber-500/10 text-amber-700 ring-amber-500/20 dark:text-amber-300",
  missing: "bg-rose-500/10 text-rose-700 ring-rose-500/20 dark:text-rose-300",
};

const SAMPLE: Required<EvidenceReviewData> = {
  documentsHref: "/documents",
  items: [
    { title: "Current IEP + Transition Plan", source: "Case Manager · Uploaded PDF", updated: "Updated 2 weeks ago", kind: "document", status: "current" },
    { title: "Transition Assessment (Interest Inventory)", source: "School Counselor", updated: "Completed this term", kind: "assessment", status: "current" },
    { title: "Student Voice Interview", source: "Student self-report", updated: "Recorded this month", kind: "voice", status: "current", note: "Quote used in Executive Summary." },
    { title: "Work-based Learning Log", source: "Job Coach", updated: "3 sessions logged", kind: "observation", status: "current" },
    { title: "Vocational Evaluation", source: "External evaluator", updated: "Older than 12 months", kind: "assessment", status: "stale", note: "Flag for re-eval before spring PPT." },
    { title: "Family Priorities Intake", source: "Parent / Guardian", updated: "Not yet submitted", kind: "document", status: "missing", note: "Send intake link from Family Hub." },
  ],
};

export function EvidenceReviewCard({
  data,
  isSample = true,
}: {
  data?: EvidenceReviewData;
  isSample?: boolean;
}) {
  const d: Required<EvidenceReviewData> = { ...SAMPLE, ...(data ?? {}), items: data?.items ?? SAMPLE.items };
  const counts = d.items.reduce(
    (acc, i) => {
      const k = i.status ?? "current";
      acc[k] = (acc[k] ?? 0) + 1;
      return acc;
    },
    {} as Record<string, number>,
  );

  return (
    <section
      aria-labelledby="evidence-review-title"
      className="mt-6 rounded-3xl border bg-card p-6 shadow-soft sm:p-8"
      data-testid="evidence-review-card"
    >
      <header className="flex flex-wrap items-start justify-between gap-3 border-b border-border/60 pb-4">
        <div className="min-w-0">
          <p className="tf-eyebrow flex items-center gap-1">
            <FolderCheck className="h-3 w-3" aria-hidden /> Documents + Evidence
          </p>
          <h2 id="evidence-review-title" className="mt-1 font-display text-2xl font-medium tracking-tight">
            {toTitleCase("What The Plan Is Grounded In")}
          </h2>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            Every recommendation cites its source. Review what's current, what's stale, and what still needs to be gathered before the next PPT.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {isSample && (
            <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-primary ring-1 ring-primary/20">
              <Sparkles className="h-3 w-3" aria-hidden /> Sample Preview
            </span>
          )}
          <Link
            to={d.documentsHref}
            className="inline-flex items-center gap-1 rounded-full border border-primary/40 bg-background px-3 py-1.5 text-xs font-semibold text-primary no-underline transition-colors hover:border-primary hover:bg-primary/10"
          >
            Open Documents <ArrowRight className="h-3.5 w-3.5" aria-hidden />
          </Link>
        </div>
      </header>

      <div className="mt-4 flex flex-wrap gap-2 text-[11px]">
        <span className={`rounded-full px-2.5 py-1 font-semibold uppercase tracking-wider ring-1 ${STATUS_TONE.current}`}>
          {counts.current ?? 0} Current
        </span>
        <span className={`rounded-full px-2.5 py-1 font-semibold uppercase tracking-wider ring-1 ${STATUS_TONE.stale}`}>
          {counts.stale ?? 0} Stale
        </span>
        <span className={`rounded-full px-2.5 py-1 font-semibold uppercase tracking-wider ring-1 ${STATUS_TONE.missing}`}>
          {counts.missing ?? 0} Missing
        </span>
      </div>

      <ul className="mt-5 grid gap-3 md:grid-cols-2">
        {d.items.map((it) => {
          const Icon = KIND_ICON[it.kind];
          const status = it.status ?? "current";
          return (
            <li key={it.title} className="flex items-start gap-3 rounded-2xl border bg-background p-4">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary ring-1 ring-primary/20">
                <Icon className="h-4 w-4" aria-hidden />
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="truncate text-sm font-medium text-foreground">{it.title}</p>
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ring-1 ${STATUS_TONE[status]}`}>
                    {status}
                  </span>
                </div>
                <p className="mt-0.5 text-[11px] text-muted-foreground">
                  {it.source} · {it.updated}
                </p>
                {it.note && <p className="mt-1.5 text-xs text-foreground/80">{it.note}</p>}
              </div>
            </li>
          );
        })}
      </ul>

      <p className="mt-5 text-[11px] italic leading-relaxed text-muted-foreground">
        AI-assisted synthesis always cites its evidence. Stale or missing items are flagged automatically so nothing goes into the report unverified.
      </p>
    </section>
  );
}
