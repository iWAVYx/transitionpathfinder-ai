import { useId, useState } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowRight, ChevronDown, LayoutDashboard, Sparkles } from "lucide-react";

import type { WorkspaceStage } from "@/lib/workspace/stages";
import {
  getStageSample,
  getStageDetail,
  STAGE_DETAIL_PHASE_LABEL,
  type StageDetailPhase,
  type StageSampleCard,
  type StageSampleTone,
} from "@/lib/workspace/stage-samples";

/**
 * StageSamplePanel — inline "Sample Screen" preview embedded inside a
 * Transition Workspace stage.
 *
 * When `expandInPlace` is true (public demo), the "Open Full Sample Screen"
 * CTA does NOT navigate to a separate page; it expands an inline detail
 * section rendered from `STAGE_SAMPLE_DETAILS`. This keeps the Workspace
 * Tour as the single demo experience.
 *
 * When a `fullSampleHref` is provided AND `expandInPlace` is false
 * (signed-in workspace), the CTA links to the live work surface for that
 * stage.
 *
 * Titles use Title Case; descriptions stay sentence case.
 */
export interface StageSamplePanelProps {
  stage: WorkspaceStage;
  /** Live work-surface route (signed-in). Ignored when expandInPlace is true. */
  fullSampleHref?: string;
  fullSampleLabel?: string;
  /**
   * When true, the CTA toggles an inline detail section instead of
   * navigating away. Used by the public Workspace Tour.
   */
  expandInPlace?: boolean;
  /** Start with the detail section already expanded (used by redirects). */
  defaultExpanded?: boolean;
  /** Controlled expansion state; when provided with onExpandChange, panel is controlled. */
  expanded?: boolean;
  onExpandChange?: (next: boolean) => void;
  /** Active demo profile; when set, sample content is token-substituted. */
  profile?: import("@/lib/demo/demo-profiles").DemoProfile;
}


const TONE_STYLES: Record<StageSampleTone, string> = {
  default: "bg-primary/10 text-primary ring-primary/20",
  success:
    "bg-emerald-500/10 text-emerald-700 ring-emerald-500/20 dark:text-emerald-300",
  warning:
    "bg-amber-500/10 text-amber-700 ring-amber-500/20 dark:text-amber-300",
  critical: "bg-destructive/10 text-destructive ring-destructive/20",
  muted: "bg-muted text-muted-foreground ring-border",
};

const PHASE_STYLES: Record<StageDetailPhase, string> = {
  input: "bg-sky-500/10 text-sky-700 ring-sky-500/20 dark:text-sky-300",
  insight: "bg-violet-500/10 text-violet-700 ring-violet-500/20 dark:text-violet-300",
  pathway: "bg-primary/10 text-primary ring-primary/20",
  action: "bg-emerald-500/10 text-emerald-700 ring-emerald-500/20 dark:text-emerald-300",
};

export function StageSamplePanel({
  stage,
  fullSampleHref,
  fullSampleLabel = "Open Full Sample Screen",
  expandInPlace = false,
  defaultExpanded = false,
  expanded: controlledExpanded,
  onExpandChange,
}: StageSamplePanelProps) {
  const sample = getStageSample(stage.id);
  const detail = expandInPlace ? getStageDetail(stage.id) : null;
  const isControlled =
    controlledExpanded !== undefined && onExpandChange !== undefined;
  const [uncontrolledExpanded, setUncontrolledExpanded] = useState(defaultExpanded);
  const expanded = isControlled ? controlledExpanded : uncontrolledExpanded;
  const toggleExpanded = () => {
    const next = !expanded;
    if (isControlled) onExpandChange(next);
    else setUncontrolledExpanded(next);
  };
  const detailId = useId();


  return (
    <section
      aria-labelledby={`sample-${stage.id}-title`}
      className="relative rounded-3xl border border-border bg-card p-6 shadow-soft sm:p-8"
      data-testid={`stage-sample-${stage.id}`}
    >
      <span
        aria-hidden
        className="pointer-events-none absolute -left-px top-8 hidden h-16 w-px bg-primary/40 lg:block"
      />

      <header className="flex flex-col gap-3 border-b border-border/60 pb-5 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <p className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-primary">
            <LayoutDashboard className="h-3.5 w-3.5" aria-hidden />
            Sample Screen · Stage {stage.order} Of 9
          </p>
          <h2
            id={`sample-${stage.id}-title`}
            className="mt-2 font-display text-2xl leading-tight tracking-tight text-foreground sm:text-3xl"
          >
            {sample.title}
          </h2>
          <p className="mt-2 max-w-[58ch] text-sm leading-relaxed text-muted-foreground">
            {sample.description}
          </p>
        </div>
        <span
          className="inline-flex shrink-0 items-center gap-1 self-start rounded-full bg-primary/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-primary ring-1 ring-primary/20 sm:self-end"
          aria-label="Sample data only"
        >
          <Sparkles className="h-3 w-3" aria-hidden />
          Sample Data
        </span>
      </header>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {sample.cards.map((card) => (
          <SampleCard key={card.title} card={card} />
        ))}
      </div>

      {detail && expanded && (
        <div
          id={detailId}
          className="mt-6 rounded-2xl border border-dashed border-border/70 bg-muted/30 p-5 sm:p-6"
        >
          <p className="text-sm leading-relaxed text-muted-foreground">
            {detail.intro}
          </p>
          <p className="mt-4 flex flex-wrap items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            <span className={`rounded-full px-2 py-0.5 ring-1 ${PHASE_STYLES.input}`}>Input</span>
            <span aria-hidden>→</span>
            <span className={`rounded-full px-2 py-0.5 ring-1 ${PHASE_STYLES.insight}`}>Insight</span>
            <span aria-hidden>→</span>
            <span className={`rounded-full px-2 py-0.5 ring-1 ${PHASE_STYLES.pathway}`}>Pathway</span>
            <span aria-hidden>→</span>
            <span className={`rounded-full px-2 py-0.5 ring-1 ${PHASE_STYLES.action}`}>Action</span>
            <span className="ml-1 normal-case tracking-normal text-muted-foreground/80">
              Pathway Report flow
            </span>
          </p>
          <div className="mt-5 grid gap-5 md:grid-cols-2">
            {detail.groups.map((group) => (
              <div
                key={group.title}
                className="rounded-xl border border-border bg-background p-4"
              >
                {group.phase && (
                  <span
                    className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ring-1 ${PHASE_STYLES[group.phase]}`}
                  >
                    {STAGE_DETAIL_PHASE_LABEL[group.phase]}
                  </span>
                )}
                <h3 className="mt-2 font-display text-sm font-semibold tracking-tight text-foreground">
                  {group.title}
                </h3>
                {group.description && (
                  <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                    {group.description}
                  </p>
                )}
                <ul className="mt-3 space-y-2 text-xs">
                  {group.items.map((it, i) => (
                    <li
                      key={i}
                      className="flex flex-col gap-0.5 border-b border-dashed border-border/60 pb-2 last:border-b-0 last:pb-0"
                    >
                      <span className="font-medium text-foreground">
                        {it.label}
                      </span>
                      {it.note && (
                        <span className="text-muted-foreground">{it.note}</span>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          {detail.disclaimer && (
            <p className="mt-4 text-[11px] italic leading-relaxed text-muted-foreground">
              {detail.disclaimer}
            </p>
          )}
        </div>
      )}

      <footer className="mt-6 flex flex-col gap-3 border-t border-dashed border-border/70 pt-5 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs leading-relaxed text-muted-foreground">
          {sample.reportLink}
        </p>
        {detail ? (
          <button
            type="button"
            onClick={toggleExpanded}
            aria-expanded={expanded}
            aria-controls={detailId}
            className="inline-flex items-center gap-1.5 self-start rounded-full border border-primary/40 bg-background px-4 py-2 text-sm font-semibold text-primary transition-colors hover:border-primary hover:bg-primary/10 sm:self-auto"
          >
            {expanded ? "Hide Full Sample Screen" : fullSampleLabel}
            <ChevronDown
              className={`h-4 w-4 transition-transform ${expanded ? "rotate-180" : ""}`}
              aria-hidden
            />
          </button>
        ) : fullSampleHref ? (
          <Link
            to={fullSampleHref as never}
            className="inline-flex items-center gap-1.5 self-start rounded-full border border-primary/40 bg-background px-4 py-2 text-sm font-semibold text-primary no-underline transition-colors hover:border-primary hover:bg-primary/10 sm:self-auto"
          >
            {fullSampleLabel}
            <ArrowRight className="h-4 w-4" aria-hidden />
          </Link>
        ) : null}
      </footer>
    </section>
  );
}

function SampleCard({ card }: { card: StageSampleCard }) {
  const Icon = card.icon;
  const tone = TONE_STYLES[card.tone ?? "default"];
  return (
    <article className="flex h-full min-h-[13rem] flex-col rounded-2xl border border-border bg-background p-4 shadow-soft">
      <div className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary ring-1 ring-primary/20">
          <Icon className="h-4 w-4" aria-hidden />
        </span>
        <span aria-hidden />
        {card.status ? (
          <span
            className={`inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ring-1 ${tone}`}
          >
            {card.status}
          </span>
        ) : (
          <span aria-hidden />
        )}
      </div>
      <h3 className="mt-3 font-display text-base font-medium leading-snug tracking-tight text-foreground">
        {card.title}
      </h3>
      {card.summary && (
        <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
          {card.summary}
        </p>
      )}
      {card.bullets && card.bullets.length > 0 && (
        <ul className="mt-3 space-y-1.5 text-xs">
          {card.bullets.slice(0, 3).map((b, i) => (
            <li
              key={i}
              className="flex items-baseline justify-between gap-2 border-b border-dashed border-border/60 pb-1.5 last:border-b-0 last:pb-0"
            >
              <span className="text-muted-foreground">{b.label}</span>
              <span className="text-right font-medium text-foreground">
                {b.value ?? "—"}
              </span>
            </li>
          ))}
        </ul>
      )}
    </article>
  );
}
