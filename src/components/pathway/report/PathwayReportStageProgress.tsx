/**
 * PathwayReportStageProgress — a compact horizontal rail of the nine
 * workspace stages, sticky at the top of the report body. Highlights
 * the stage currently in view as the reader scrolls, and marks past
 * stages as complete. Visible on all viewports so mobile readers get
 * the same journey cue the desktop spine sidebar provides.
 */
import { WORKSPACE_STAGES } from "@/lib/workspace/stages";

export interface PathwayReportStageProgressProps {
  activeStageId: string | null;
  completedStageIds: ReadonlySet<string>;
  presentStageIds?: ReadonlySet<string>;
}

export function PathwayReportStageProgress({
  activeStageId,
  completedStageIds,
  presentStageIds,
}: PathwayReportStageProgressProps) {
  const stages = presentStageIds
    ? WORKSPACE_STAGES.filter((s) => presentStageIds.has(s.id))
    : WORKSPACE_STAGES;
  if (stages.length === 0) return null;

  const activeIndex = activeStageId
    ? stages.findIndex((s) => s.id === activeStageId)
    : -1;
  const completedCount = stages.filter((s) => completedStageIds.has(s.id)).length;
  const progressPct =
    activeIndex >= 0
      ? ((activeIndex + 0.5) / stages.length) * 100
      : (completedCount / stages.length) * 100;

  return (
    <div
      className="no-print sticky top-16 z-30 -mx-4 mb-6 border-y border-border/60 bg-background/85 px-4 py-3 backdrop-blur supports-[backdrop-filter]:bg-background/70 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8"
      data-testid="pathway-report-stage-progress"
      aria-label="Report stage progress"
      role="navigation"
    >
      <div className="mx-auto flex max-w-6xl items-center gap-3">
        <span className="hidden shrink-0 text-[10px] font-semibold uppercase tracking-[0.24em] text-muted-foreground sm:inline">
          Journey
        </span>
        <div className="relative flex flex-1 items-center gap-1 overflow-x-auto">
          {/* Rail line */}
          <span
            aria-hidden
            className="pointer-events-none absolute inset-x-0 top-1/2 h-px -translate-y-1/2 bg-border"
          />
          <span
            aria-hidden
            className="pointer-events-none absolute left-0 top-1/2 h-px -translate-y-1/2 bg-primary transition-[width] duration-300 ease-out"
            style={{ width: `${Math.max(0, Math.min(100, progressPct))}%` }}
          />
          {stages.map((stage) => {
            const isActive = stage.id === activeStageId;
            const isComplete = completedStageIds.has(stage.id);
            const state = isActive ? "current" : isComplete ? "complete" : "upcoming";
            return (
              <a
                key={stage.id}
                href={`#stage-${stage.id}`}
                data-state={state}
                data-stage={stage.id}
                aria-current={isActive ? "step" : undefined}
                title={`Stage ${stage.order} · ${stage.title}`}
                className="group relative z-10 flex min-w-0 flex-1 flex-col items-center gap-1 no-underline"
              >
                <span
                  className="grid h-6 w-6 shrink-0 place-items-center rounded-full border-2 bg-background text-[10px] font-semibold tabular-nums transition-colors border-border text-muted-foreground group-hover:border-primary/60 group-data-[state=complete]:border-primary/60 group-data-[state=complete]:bg-primary/10 group-data-[state=complete]:text-primary group-data-[state=current]:border-primary group-data-[state=current]:bg-primary group-data-[state=current]:text-primary-foreground group-data-[state=current]:shadow-[0_0_0_3px_hsl(var(--primary)/0.18)]"
                  data-state={state}
                >
                  {stage.order}
                </span>
                <span
                  className="hidden text-[9px] font-semibold uppercase tracking-[0.18em] text-muted-foreground transition-colors group-hover:text-foreground group-data-[state=current]:text-primary group-data-[state=complete]:text-foreground/80 sm:inline"
                  data-state={state}
                >
                  {stage.label}
                </span>
              </a>
            );
          })}
        </div>
      </div>
    </div>
  );
}
