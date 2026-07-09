import { Link } from "@tanstack/react-router";
import {
  WORKSPACE_STAGES,
  type StageId,
  type WorkspaceStage,
} from "@/lib/workspace/stages";

/**
 * StageSpine — the connected vertical pathway that anchors the
 * Transition Workspace. NOT a tile grid. A single continuous rail
 * with stage markers; the active stage swells into the narrative
 * on the right. Same primitive on demo, signed-in workspace, and
 * (later) the Pathway Report table of contents.
 */
export interface StageSpineProps {
  activeStageId: StageId;
  /** Builds the href for a stage — differs between demo and signed-in. */
  hrefFor: (stage: WorkspaceStage) => string;
  /** Optional filter (e.g., audience-restricted). Defaults to all stages. */
  stages?: readonly WorkspaceStage[];
}

export function StageSpine({
  activeStageId,
  hrefFor,
  stages = WORKSPACE_STAGES,
}: StageSpineProps) {
  const activeIdx = stages.findIndex((s) => s.id === activeStageId);

  return (
    <nav
      aria-label="Transition workspace stages"
      className="tfws-spine"
      data-testid="workspace-stage-spine"
    >
      <ol className="relative m-0 list-none p-0">
        {/* continuous rail */}
        <span
          aria-hidden
          className="absolute left-[19px] top-2 bottom-2 w-px bg-border"
        />
        {stages.map((stage, i) => {
          const state =
            stage.id === activeStageId
              ? "current"
              : i < activeIdx
                ? "done"
                : "future";
          return (
            <li key={stage.id} className="relative">
              <Link
                to={hrefFor(stage) as never}
                data-state={state}
                data-stage-id={stage.id}
                aria-current={state === "current" ? "step" : undefined}
                className="group relative flex items-start gap-4 rounded-lg px-3 py-3 text-left no-underline transition-colors hover:bg-muted/50 data-[state=current]:bg-muted/60"
              >
                <span
                  aria-hidden
                  className="relative z-10 mt-0.5 grid h-10 w-10 shrink-0 place-items-center rounded-full border-2 border-border bg-background text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground group-data-[state=current]:border-primary group-data-[state=current]:bg-primary group-data-[state=current]:text-primary-foreground group-data-[state=done]:border-primary/70 group-data-[state=done]:bg-primary/10 group-data-[state=done]:text-primary"
                >
                  {stage.order}
                </span>
                <span className="min-w-0 flex-1 pt-1.5">
                  <span className="block text-[11px] font-semibold uppercase tracking-[0.22em] text-muted-foreground group-data-[state=current]:text-primary">
                    {stage.label}
                  </span>
                  <span className="mt-1 block font-display text-lg leading-snug text-foreground">
                    {stage.title}
                  </span>
                </span>
              </Link>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
