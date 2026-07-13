import { useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import { AnimatedCounter } from "@/components/effects/AnimatedCounter";
import { Accessibility, CheckCircle2, Clock3, Filter, Search, ShieldCheck, Sparkles, XCircle } from "lucide-react";

type Stage = "saved" | "contacted" | "applied" | "enrolled" | "not_fit";
type ReviewStatus = "approved" | "pending" | "changes_requested";

export interface PipelineCard {
  id: string;
  student: string;
  program: string;
  stage: Stage;
  updatedAgo?: string;
  fit?: {
    score: number; // 0-100
    criteria: string[]; // matched
  };
  supports?: string[]; // accessibility supports offered
  review?: ReviewStatus;
  deadline?: string;
}

const STAGES: { key: Stage; label: string; tone: string }[] = [
  { key: "saved", label: "Saved", tone: "bg-muted/60 text-foreground" },
  { key: "contacted", label: "Contacted", tone: "bg-sky-soft text-ink" },
  { key: "applied", label: "Applied", tone: "bg-primary/15 text-primary" },
  { key: "enrolled", label: "Enrolled", tone: "bg-primary/30 text-primary" },
  { key: "not_fit", label: "Not A Fit", tone: "bg-destructive/10 text-destructive" },
];

const REVIEW_META: Record<ReviewStatus, { label: string; cls: string; Icon: typeof CheckCircle2 }> = {
  approved: { label: "Approved", cls: "bg-emerald-100 text-emerald-900", Icon: CheckCircle2 },
  pending: { label: "Pending Review", cls: "bg-amber-100 text-amber-900", Icon: Clock3 },
  changes_requested: { label: "Changes Requested", cls: "bg-destructive/10 text-destructive", Icon: XCircle },
};

const ALL_SUPPORTS = [
  "Extended Time",
  "Job Coach",
  "Visual Schedule",
  "Quiet Environment",
  "ASL Interpreter",
  "Transportation",
];

const SAMPLE: PipelineCard[] = [
  {
    id: "1", student: "Jordan R.", program: "MCC Animal Care Cert", stage: "contacted", updatedAgo: "2d",
    fit: { score: 88, criteria: ["Age 18–22", "Animal care interest", "Sensory-friendly setting"] },
    supports: ["Extended Time", "Visual Schedule"], review: "approved", deadline: "Mar 14",
  },
  {
    id: "2", student: "Kai M.", program: "Life-Skills Studio", stage: "applied", updatedAgo: "5d",
    fit: { score: 74, criteria: ["Life skills goal", "Small cohort"] },
    supports: ["Job Coach", "Quiet Environment"], review: "pending", deadline: "Mar 20",
  },
  {
    id: "3", student: "Priya S.", program: "Self-Advocacy Cohort", stage: "enrolled", updatedAgo: "1w",
    fit: { score: 92, criteria: ["Self-advocacy goal", "Peer group", "Virtual option"] },
    supports: ["ASL Interpreter"], review: "approved",
  },
  {
    id: "4", student: "Alex T.", program: "Culinary Pathway", stage: "saved", updatedAgo: "today",
    fit: { score: 65, criteria: ["Food service interest"] },
    supports: ["Transportation"], review: "pending", deadline: "Apr 02",
  },
  {
    id: "5", student: "Sam L.", program: "Vet Clinic Shadow", stage: "contacted", updatedAgo: "3d",
    fit: { score: 81, criteria: ["Animal care", "Short-term"] },
    supports: ["Job Coach", "Transportation"], review: "changes_requested",
  },
  {
    id: "6", student: "River B.", program: "Retail Ready Program", stage: "not_fit", updatedAgo: "2w",
    fit: { score: 42, criteria: ["Retail interest"] },
    supports: [], review: "approved",
  },
];

interface Props {
  cards?: PipelineCard[];
  className?: string;
}

function fitTone(score: number) {
  if (score >= 80) return "bg-emerald-100 text-emerald-900";
  if (score >= 60) return "bg-amber-100 text-amber-900";
  return "bg-destructive/10 text-destructive";
}

export function OpportunityPipelineBoard({ cards = SAMPLE, className }: Props) {
  const [items, setItems] = useState(cards);
  const [query, setQuery] = useState("");
  const [minFit, setMinFit] = useState(0);
  const [reviewFilter, setReviewFilter] = useState<ReviewStatus | "all">("all");
  const [supportFilter, setSupportFilter] = useState<string | "all">("all");

  const move = (id: string, nextStage: Stage) => {
    setItems((prev) => prev.map((c) => (c.id === id ? { ...c, stage: nextStage } : c)));
  };

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items.filter((c) => {
      if (q && !`${c.student} ${c.program}`.toLowerCase().includes(q)) return false;
      if ((c.fit?.score ?? 0) < minFit) return false;
      if (reviewFilter !== "all" && c.review !== reviewFilter) return false;
      if (supportFilter !== "all" && !(c.supports ?? []).includes(supportFilter)) return false;
      return true;
    });
  }, [items, query, minFit, reviewFilter, supportFilter]);

  const byStage = STAGES.map((s) => ({ ...s, cards: filtered.filter((c) => c.stage === s.key) }));
  const totalActive = filtered.filter((c) => c.stage !== "not_fit").length;
  const enrolled = filtered.filter((c) => c.stage === "enrolled").length;
  const avgFit = filtered.length
    ? Math.round(filtered.reduce((sum, c) => sum + (c.fit?.score ?? 0), 0) / filtered.length)
    : 0;

  return (
    <section aria-label="Opportunity pipeline" className={cn("rounded-3xl border bg-card p-5 shadow-soft sm:p-6", className)}>
      <header className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="font-display text-lg">Opportunity Pipeline</h3>
          <p className="text-sm text-muted-foreground">Filter by fit, supports, and review status — then advance stages with confidence.</p>
        </div>
        <div className="flex flex-wrap gap-4 text-sm">
          <p className="text-muted-foreground">
            Active: <AnimatedCounter className="font-display text-base text-foreground" value={totalActive} />
          </p>
          <p className="text-muted-foreground">
            Enrolled: <AnimatedCounter className="font-display text-base text-primary" value={enrolled} />
          </p>
          <p className="text-muted-foreground">
            Avg Fit: <AnimatedCounter className="font-display text-base text-foreground" value={avgFit} suffix="%" />
          </p>
        </div>
      </header>

      {/* Filter bar */}
      <div className="mb-4 grid gap-2 rounded-2xl border bg-background/60 p-3 md:grid-cols-4">
        <label className="relative flex items-center">
          <Search className="pointer-events-none absolute left-2 h-3.5 w-3.5 text-muted-foreground" aria-hidden />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search student or program"
            aria-label="Search opportunities"
            className="w-full rounded-md border bg-background py-1.5 pl-7 pr-2 text-xs outline-none focus:ring-2 focus:ring-primary/40"
          />
        </label>
        <label className="flex items-center gap-2 text-xs text-muted-foreground">
          <Sparkles className="h-3.5 w-3.5" aria-hidden />
          <span className="whitespace-nowrap">Min Fit</span>
          <input
            type="range" min={0} max={100} step={5} value={minFit}
            onChange={(e) => setMinFit(Number(e.target.value))}
            aria-label="Minimum fit score"
            className="flex-1"
          />
          <span className="w-8 text-right font-semibold text-foreground">{minFit}%</span>
        </label>
        <label className="flex items-center gap-2 text-xs text-muted-foreground">
          <ShieldCheck className="h-3.5 w-3.5" aria-hidden />
          <select
            value={reviewFilter}
            onChange={(e) => setReviewFilter(e.target.value as ReviewStatus | "all")}
            aria-label="Filter by review status"
            className="flex-1 rounded-md border bg-background px-2 py-1.5 text-xs"
          >
            <option value="all">All Review Statuses</option>
            <option value="approved">Approved</option>
            <option value="pending">Pending Review</option>
            <option value="changes_requested">Changes Requested</option>
          </select>
        </label>
        <label className="flex items-center gap-2 text-xs text-muted-foreground">
          <Accessibility className="h-3.5 w-3.5" aria-hidden />
          <select
            value={supportFilter}
            onChange={(e) => setSupportFilter(e.target.value)}
            aria-label="Filter by accessibility support"
            className="flex-1 rounded-md border bg-background px-2 py-1.5 text-xs"
          >
            <option value="all">All Supports</option>
            {ALL_SUPPORTS.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </label>
      </div>

      {(query || minFit > 0 || reviewFilter !== "all" || supportFilter !== "all") && (
        <div className="mb-3 flex items-center gap-2 text-xs text-muted-foreground">
          <Filter className="h-3 w-3" aria-hidden />
          <span>Showing {filtered.length} of {items.length}</span>
          <button
            type="button"
            onClick={() => { setQuery(""); setMinFit(0); setReviewFilter("all"); setSupportFilter("all"); }}
            className="rounded-full border px-2 py-0.5 text-[11px] font-medium hover:border-primary/50 hover:text-primary"
          >
            Reset Filters
          </button>
        </div>
      )}

      <div className="grid gap-3 md:grid-cols-5">
        {byStage.map((col) => (
          <div key={col.key} className="rounded-2xl border bg-background p-3">
            <div className={cn("mb-2 flex items-center justify-between rounded-md px-2 py-1 text-xs font-semibold uppercase tracking-wider", col.tone)}>
              <span>{col.label}</span>
              <span>{col.cards.length}</span>
            </div>
            <ul className="space-y-2">
              {col.cards.map((c) => {
                const review = c.review ? REVIEW_META[c.review] : null;
                return (
                  <li key={c.id} className="rounded-xl border bg-card p-2 text-xs shadow-soft animate-fade-in">
                    <div className="flex items-start justify-between gap-1">
                      <div className="min-w-0">
                        <p className="font-semibold">{c.student}</p>
                        <p className="truncate text-muted-foreground">{c.program}</p>
                      </div>
                      {c.fit ? (
                        <span
                          className={cn("shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-semibold", fitTone(c.fit.score))}
                          title={`Fit criteria: ${c.fit.criteria.join(", ")}`}
                        >
                          {c.fit.score}%
                        </span>
                      ) : null}
                    </div>

                    {c.fit?.criteria?.length ? (
                      <ul className="mt-1.5 flex flex-wrap gap-1">
                        {c.fit.criteria.slice(0, 3).map((cr) => (
                          <li key={cr} className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
                            {cr}
                          </li>
                        ))}
                      </ul>
                    ) : null}

                    {c.supports?.length ? (
                      <p className="mt-1.5 flex items-center gap-1 text-[10px] text-muted-foreground">
                        <Accessibility className="h-3 w-3" aria-hidden />
                        <span className="truncate">{c.supports.join(" · ")}</span>
                      </p>
                    ) : null}

                    <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                      {review ? (
                        <span className={cn("inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[10px] font-medium", review.cls)}>
                          <review.Icon className="h-2.5 w-2.5" aria-hidden />
                          {review.label}
                        </span>
                      ) : null}
                      {c.deadline ? (
                        <span className="inline-flex items-center gap-1 rounded-full border px-1.5 py-0.5 text-[10px] text-muted-foreground">
                          <Clock3 className="h-2.5 w-2.5" aria-hidden />
                          Due {c.deadline}
                        </span>
                      ) : null}
                      {c.updatedAgo ? (
                        <span className="text-[10px] uppercase tracking-wider text-muted-foreground">{c.updatedAgo}</span>
                      ) : null}
                    </div>

                    <div className="mt-2 flex flex-wrap gap-1">
                      {STAGES.filter((s) => s.key !== c.stage).map((s) => (
                        <button
                          key={s.key}
                          type="button"
                          onClick={() => move(c.id, s.key)}
                          className="rounded-full border px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground transition hover:border-primary/50 hover:text-primary"
                          aria-label={`Move ${c.student} to ${s.label}`}
                        >
                          → {s.label}
                        </button>
                      ))}
                    </div>
                  </li>
                );
              })}
              {col.cards.length === 0 ? (
                <li className="rounded-xl border border-dashed p-3 text-center text-[11px] text-muted-foreground">Empty</li>
              ) : null}
            </ul>
          </div>
        ))}
      </div>
    </section>
  );
}
