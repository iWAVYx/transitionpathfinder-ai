import { useEffect, useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import { AnimatedCounter } from "@/components/effects/AnimatedCounter";
import {
  Accessibility,
  CheckCircle2,
  Circle,
  Clock3,
  FileText,
  Filter,
  Search,
  ShieldCheck,
  Sparkles,
  Star,
  Trash2,
  XCircle,
} from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";

type Stage = "saved" | "contacted" | "applied" | "enrolled" | "not_fit";
type ReviewStatus = "approved" | "pending" | "changes_requested";

export interface PipelineDocument {
  label: string;
  kind: "iep" | "consent" | "resume" | "portfolio" | "other";
  href?: string;
}

export interface PipelineChecklistItem {
  id: string;
  label: string;
  done?: boolean;
}

export interface PipelineCard {
  id: string;
  student: string;
  program: string;
  stage: Stage;
  updatedAgo?: string;
  fit?: {
    score: number; // 0-100
    criteria: string[]; // matched
    rationale?: string; // narrative
    gaps?: string[]; // unmet criteria
  };
  supports?: string[]; // accessibility supports offered
  review?: ReviewStatus;
  deadline?: string;
  documents?: PipelineDocument[];
  checklist?: PipelineChecklistItem[];
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

type FilterPreset = {
  id: string;
  name: string;
  supports: string[];
  minFit?: number;
  review?: ReviewStatus | "all";
};

const BUILTIN_PRESETS: FilterPreset[] = [
  {
    id: "sensory-friendly",
    name: "Sensory-Friendly",
    supports: ["Quiet Environment", "Visual Schedule"],
    minFit: 60,
    review: "all",
  },
  {
    id: "communication-supports",
    name: "Communication Supports",
    supports: ["ASL Interpreter", "Visual Schedule"],
    review: "all",
  },
  {
    id: "job-ready",
    name: "Job-Ready with Coaching",
    supports: ["Job Coach", "Transportation", "Extended Time"],
    minFit: 70,
    review: "approved",
  },
];

const PRESET_STORAGE_KEY = "tf.pipeline-filter-presets.v1";

const DEFAULT_CHECKLIST_BY_STAGE: Record<Stage, string[]> = {
  saved: ["Confirm student interest", "Share program overview with family", "Verify eligibility"],
  contacted: ["Log outreach note", "Schedule intro call", "Send accessibility supports summary"],
  applied: ["Upload application confirmation", "Attach consent form", "Track partner response"],
  enrolled: ["Confirm start date", "Coordinate transportation", "Set 30-day check-in"],
  not_fit: ["Record reason", "Suggest alternative pathway", "Close loop with family"],
};

const SAMPLE: PipelineCard[] = [
  {
    id: "1", student: "Jordan R.", program: "MCC Animal Care Cert", stage: "contacted", updatedAgo: "2d",
    fit: {
      score: 88,
      criteria: ["Age 18–22", "Animal care interest", "Sensory-friendly setting"],
      rationale: "Strong alignment on interest area and sensory needs. Program cohort size matches Jordan's IEP support level.",
      gaps: ["Transportation plan not confirmed"],
    },
    supports: ["Extended Time", "Visual Schedule"], review: "approved", deadline: "Mar 14",
    documents: [
      { label: "IEP Summary (2025)", kind: "iep", href: "#" },
      { label: "Parent Consent", kind: "consent", href: "#" },
    ],
  },
  {
    id: "2", student: "Kai M.", program: "Life-Skills Studio", stage: "applied", updatedAgo: "5d",
    fit: {
      score: 74,
      criteria: ["Life skills goal", "Small cohort"],
      rationale: "Program goals overlap on independent living. Cohort ratio 1:4 supports Kai's engagement pattern.",
      gaps: ["Communication device orientation needed"],
    },
    supports: ["Job Coach", "Quiet Environment"], review: "pending", deadline: "Mar 20",
    documents: [
      { label: "Application PDF", kind: "other", href: "#" },
      { label: "Résumé Draft", kind: "resume", href: "#" },
    ],
  },
  {
    id: "3", student: "Priya S.", program: "Self-Advocacy Cohort", stage: "enrolled", updatedAgo: "1w",
    fit: {
      score: 92,
      criteria: ["Self-advocacy goal", "Peer group", "Virtual option"],
      rationale: "Priya's transition goals map directly to cohort outcomes. Virtual option accommodates medical schedule.",
    },
    supports: ["ASL Interpreter"], review: "approved",
    documents: [{ label: "Enrollment Confirmation", kind: "other", href: "#" }],
  },
  {
    id: "4", student: "Alex T.", program: "Culinary Pathway", stage: "saved", updatedAgo: "today",
    fit: {
      score: 65,
      criteria: ["Food service interest"],
      rationale: "Interest aligned. Fit limited by kitchen environment sensory profile — needs a site visit before applying.",
      gaps: ["Sensory site visit", "Transportation window"],
    },
    supports: ["Transportation"], review: "pending", deadline: "Apr 02",
    documents: [{ label: "Portfolio (Baking)", kind: "portfolio", href: "#" }],
  },
  {
    id: "5", student: "Sam L.", program: "Vet Clinic Shadow", stage: "contacted", updatedAgo: "3d",
    fit: {
      score: 81,
      criteria: ["Animal care", "Short-term"],
      rationale: "Short-term shadow fits Sam's exploratory phase. Partner requested updated liability release.",
      gaps: ["Updated liability release"],
    },
    supports: ["Job Coach", "Transportation"], review: "changes_requested",
    documents: [{ label: "IEP At-a-Glance", kind: "iep", href: "#" }],
  },
  {
    id: "6", student: "River B.", program: "Retail Ready Program", stage: "not_fit", updatedAgo: "2w",
    fit: {
      score: 42,
      criteria: ["Retail interest"],
      rationale: "Environment noise level and shift length do not match River's current support plan.",
      gaps: ["Sensory match", "Shift length"],
    },
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
  const [supportFilters, setSupportFilters] = useState<string[]>([]);
  const [supportMode, setSupportMode] = useState<"any" | "all">("any");
  const [openId, setOpenId] = useState<string | null>(null);
  const [userPresets, setUserPresets] = useState<FilterPreset[]>([]);
  const [activePresetId, setActivePresetId] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = window.localStorage.getItem(PRESET_STORAGE_KEY);
      if (raw) setUserPresets(JSON.parse(raw));
    } catch {
      /* ignore */
    }
  }, []);

  const persistPresets = (next: FilterPreset[]) => {
    setUserPresets(next);
    if (typeof window !== "undefined") {
      try {
        window.localStorage.setItem(PRESET_STORAGE_KEY, JSON.stringify(next));
      } catch {
        /* ignore */
      }
    }
  };

  const toggleSupport = (s: string) => {
    setActivePresetId(null);
    setSupportFilters((prev) =>
      prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s],
    );
  };

  const applyPreset = (p: FilterPreset) => {
    setSupportFilters(p.supports);
    if (typeof p.minFit === "number") setMinFit(p.minFit);
    if (p.review) setReviewFilter(p.review);
    setSupportMode("all");
    setActivePresetId(p.id);
  };

  const saveCurrentAsPreset = () => {
    if (typeof window === "undefined") return;
    const name = window.prompt("Name this filter preset");
    if (!name?.trim()) return;
    const preset: FilterPreset = {
      id: `user-${Date.now()}`,
      name: name.trim(),
      supports: supportFilters,
      minFit,
      review: reviewFilter,
    };
    persistPresets([...userPresets, preset]);
    setActivePresetId(preset.id);
  };

  const deletePreset = (id: string) => {
    persistPresets(userPresets.filter((p) => p.id !== id));
    if (activePresetId === id) setActivePresetId(null);
  };

  const move = (id: string, nextStage: Stage) => {
    setItems((prev) => prev.map((c) => (c.id === id ? { ...c, stage: nextStage } : c)));
  };

  const toggleChecklist = (id: string, itemId: string) => {
    setItems((prev) =>
      prev.map((c) => {
        if (c.id !== id) return c;
        const list = c.checklist ?? (DEFAULT_CHECKLIST_BY_STAGE[c.stage] ?? []).map((label, i) => ({
          id: `${id}-${i}`,
          label,
          done: false,
        }));
        return {
          ...c,
          checklist: list.map((it) => (it.id === itemId ? { ...it, done: !it.done } : it)),
        };
      }),
    );
  };

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items.filter((c) => {
      if (q && !`${c.student} ${c.program}`.toLowerCase().includes(q)) return false;
      if ((c.fit?.score ?? 0) < minFit) return false;
      if (reviewFilter !== "all" && c.review !== reviewFilter) return false;
      if (supportFilters.length > 0) {
        const cardSupports = c.supports ?? [];
        const matches = supportFilters.filter((s) => cardSupports.includes(s));
        if (supportMode === "all" && matches.length !== supportFilters.length) return false;
        if (supportMode === "any" && matches.length === 0) return false;
      }
      return true;
    });
  }, [items, query, minFit, reviewFilter, supportFilters, supportMode]);

  const byStage = STAGES.map((s) => ({ ...s, cards: filtered.filter((c) => c.stage === s.key) }));
  const totalActive = filtered.filter((c) => c.stage !== "not_fit").length;
  const enrolled = filtered.filter((c) => c.stage === "enrolled").length;
  const avgFit = filtered.length
    ? Math.round(filtered.reduce((sum, c) => sum + (c.fit?.score ?? 0), 0) / filtered.length)
    : 0;

  const openCard = openId ? items.find((c) => c.id === openId) ?? null : null;
  const openChecklist =
    openCard?.checklist ??
    (openCard ? (DEFAULT_CHECKLIST_BY_STAGE[openCard.stage] ?? []).map((label, i) => ({
      id: `${openCard.id}-${i}`,
      label,
      done: false,
    })) : []);
  const doneCount = openChecklist.filter((i) => i.done).length;

  return (
    <section aria-label="Opportunity pipeline" className={cn("rounded-3xl border bg-card p-5 shadow-soft sm:p-6", className)}>
      <header className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="font-display text-lg">Opportunity Pipeline</h3>
          <p className="text-sm text-muted-foreground">Filter, open a card for full fit rationale and next-step actions, then advance the stage.</p>
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
                  <li key={c.id}>
                    <button
                      type="button"
                      onClick={() => setOpenId(c.id)}
                      className="w-full rounded-xl border bg-card p-2 text-left text-xs shadow-soft animate-fade-in transition hover:border-primary/40 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-primary/40"
                      aria-label={`Open details for ${c.student} — ${c.program}`}
                    >
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
                    </button>

                    <div className="mt-1 flex flex-wrap gap-1">
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

      <Sheet open={openCard !== null} onOpenChange={(o) => !o && setOpenId(null)}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-lg">
          {openCard ? (
            <>
              <SheetHeader>
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <SheetTitle className="font-display text-xl">{openCard.student}</SheetTitle>
                    <SheetDescription className="truncate">{openCard.program}</SheetDescription>
                  </div>
                  {openCard.fit ? (
                    <span className={cn("shrink-0 rounded-full px-2 py-1 text-xs font-semibold", fitTone(openCard.fit.score))}>
                      {openCard.fit.score}% Fit
                    </span>
                  ) : null}
                </div>
              </SheetHeader>

              <div className="mt-4 flex flex-wrap items-center gap-2 text-xs">
                <span className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-semibold uppercase tracking-wider", STAGES.find((s) => s.key === openCard.stage)?.tone)}>
                  {STAGES.find((s) => s.key === openCard.stage)?.label}
                </span>
                {openCard.review ? (
                  <span className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-medium", REVIEW_META[openCard.review].cls)}>
                    {(() => { const I = REVIEW_META[openCard.review].Icon; return <I className="h-3 w-3" aria-hidden />; })()}
                    {REVIEW_META[openCard.review].label}
                  </span>
                ) : null}
                {openCard.deadline ? (
                  <span className="inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-muted-foreground">
                    <Clock3 className="h-3 w-3" aria-hidden /> Due {openCard.deadline}
                  </span>
                ) : null}
              </div>

              {/* Fit rationale */}
              <section className="mt-6">
                <h4 className="mb-2 flex items-center gap-1.5 font-display text-sm uppercase tracking-wider text-muted-foreground">
                  <Sparkles className="h-3.5 w-3.5" aria-hidden /> Fit Rationale
                </h4>
                {openCard.fit ? (
                  <>
                    <div className="mb-3 h-2 w-full overflow-hidden rounded-full bg-muted" aria-hidden>
                      <div
                        className={cn("h-full transition-all", openCard.fit.score >= 80 ? "bg-emerald-500" : openCard.fit.score >= 60 ? "bg-amber-500" : "bg-destructive")}
                        style={{ width: `${openCard.fit.score}%` }}
                      />
                    </div>
                    {openCard.fit.rationale ? (
                      <p className="mb-3 text-sm text-foreground">{openCard.fit.rationale}</p>
                    ) : null}
                    {openCard.fit.criteria.length ? (
                      <div className="mb-3">
                        <p className="mb-1 text-xs font-semibold text-emerald-800">Matched Criteria</p>
                        <ul className="flex flex-wrap gap-1.5">
                          {openCard.fit.criteria.map((cr) => (
                            <li key={cr} className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-xs text-emerald-900">
                              <CheckCircle2 className="h-3 w-3" aria-hidden /> {cr}
                            </li>
                          ))}
                        </ul>
                      </div>
                    ) : null}
                    {openCard.fit.gaps?.length ? (
                      <div>
                        <p className="mb-1 text-xs font-semibold text-amber-800">Gaps To Close</p>
                        <ul className="flex flex-wrap gap-1.5">
                          {openCard.fit.gaps.map((g) => (
                            <li key={g} className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-xs text-amber-900">
                              <XCircle className="h-3 w-3" aria-hidden /> {g}
                            </li>
                          ))}
                        </ul>
                      </div>
                    ) : null}
                  </>
                ) : (
                  <p className="text-sm text-muted-foreground">No fit summary yet.</p>
                )}
              </section>

              {/* Accessibility supports */}
              {openCard.supports?.length ? (
                <section className="mt-6">
                  <h4 className="mb-2 flex items-center gap-1.5 font-display text-sm uppercase tracking-wider text-muted-foreground">
                    <Accessibility className="h-3.5 w-3.5" aria-hidden /> Accessibility Supports
                  </h4>
                  <ul className="flex flex-wrap gap-1.5">
                    {openCard.supports.map((s) => (
                      <li key={s} className="rounded-full bg-muted px-2 py-0.5 text-xs text-foreground">{s}</li>
                    ))}
                  </ul>
                </section>
              ) : null}

              {/* Documents */}
              <section className="mt-6">
                <h4 className="mb-2 flex items-center gap-1.5 font-display text-sm uppercase tracking-wider text-muted-foreground">
                  <FileText className="h-3.5 w-3.5" aria-hidden /> Supporting Documents
                </h4>
                {openCard.documents?.length ? (
                  <ul className="space-y-1.5">
                    {openCard.documents.map((d, i) => (
                      <li key={`${d.label}-${i}`}>
                        <a
                          href={d.href ?? "#"}
                          onClick={(e) => { if (!d.href || d.href === "#") e.preventDefault(); }}
                          className="flex items-center justify-between gap-2 rounded-lg border bg-background px-3 py-2 text-sm transition hover:border-primary/40 hover:text-primary"
                        >
                          <span className="flex items-center gap-2">
                            <FileText className="h-4 w-4 text-muted-foreground" aria-hidden />
                            {d.label}
                          </span>
                          <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] uppercase tracking-wider text-muted-foreground">
                            {d.kind}
                          </span>
                        </a>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="rounded-lg border border-dashed p-3 text-center text-xs text-muted-foreground">
                    No documents attached yet.
                  </p>
                )}
              </section>

              {/* Checklist */}
              <section className="mt-6">
                <div className="mb-2 flex items-center justify-between">
                  <h4 className="flex items-center gap-1.5 font-display text-sm uppercase tracking-wider text-muted-foreground">
                    <CheckCircle2 className="h-3.5 w-3.5" aria-hidden /> Next-Step Checklist
                  </h4>
                  <span className="text-xs text-muted-foreground">
                    {doneCount}/{openChecklist.length} done
                  </span>
                </div>
                <ul className="space-y-1.5">
                  {openChecklist.map((it) => (
                    <li key={it.id}>
                      <button
                        type="button"
                        onClick={() => toggleChecklist(openCard.id, it.id)}
                        className={cn(
                          "flex w-full items-center gap-2 rounded-lg border bg-background px-3 py-2 text-left text-sm transition hover:border-primary/40",
                          it.done && "text-muted-foreground line-through",
                        )}
                        aria-pressed={it.done}
                      >
                        {it.done ? (
                          <CheckCircle2 className="h-4 w-4 shrink-0 text-primary" aria-hidden />
                        ) : (
                          <Circle className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
                        )}
                        <span className="flex-1">{it.label}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              </section>

              {/* Stage actions */}
              <section className="mt-6">
                <h4 className="mb-2 font-display text-sm uppercase tracking-wider text-muted-foreground">Advance Stage</h4>
                <div className="flex flex-wrap gap-2">
                  {STAGES.filter((s) => s.key !== openCard.stage).map((s) => (
                    <Button
                      key={s.key}
                      size="sm"
                      variant="outline"
                      onClick={() => move(openCard.id, s.key)}
                    >
                      → {s.label}
                    </Button>
                  ))}
                </div>
              </section>
            </>
          ) : null}
        </SheetContent>
      </Sheet>
    </section>
  );
}
