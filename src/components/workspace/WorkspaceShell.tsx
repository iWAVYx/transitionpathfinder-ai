import type { ReactNode } from "react";
import {
  getStage,
  type StageId,
  type WorkspaceStage,
} from "@/lib/workspace/stages";
import { SmartBackLink } from "@/components/site/SmartBackLink";
import { StageSpine } from "./StageSpine";
import { StageHeader } from "./StageHeader";
import { StagePrevNext } from "./StagePrevNext";
import { StageProgress } from "./StageProgress";

/**
 * WorkspaceShell — the Transition Workspace chrome. Two-column layout:
 * a persistent StageSpine on the left, an expressive narrative canvas
 * on the right. Same primitive powers /workspace (signed-in) and
 * /demo/workspace (public fictional data).
 *
 * NOT a tiled dashboard. The visual metaphor is a single connected
 * path — the spine — with stage markers. The active stage swells into
 * the narrative panel; adjacent stages are one click away via
 * StagePrevNext at the foot.
 */
export interface WorkspaceShellProps {
  activeStageId: StageId;
  /** Builds a URL for a given stage — implementer chooses demo vs signed-in. */
  hrefFor: (stage: WorkspaceStage) => string;
  /** Editorial kicker rendered above the stage header (e.g., "Transition Workspace · Demo"). */
  eyebrow?: string;
  /** Optional filter (e.g., audience-restricted list). */
  visibleStages?: readonly WorkspaceStage[];
  children: ReactNode;
}

export function WorkspaceShell({
  activeStageId,
  hrefFor,
  eyebrow,
  visibleStages,
  children,
}: WorkspaceShellProps) {
  const stage = getStage(activeStageId);

  return (
    <div
      className="mx-auto flex w-full max-w-7xl flex-col gap-10 px-4 py-10 sm:px-6 lg:px-8 lg:py-14"
      data-testid="workspace-shell"
      data-active-stage={activeStageId}
    >
      {eyebrow ? (
        <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-primary">
          {eyebrow}
        </p>
      ) : null}
      <StageProgress activeStageId={activeStageId} />

      <div className="grid gap-12 lg:grid-cols-[minmax(0,300px)_1fr]">
        <div className="lg:sticky lg:top-24 lg:self-start">
          <StageSpine
            activeStageId={activeStageId}
            hrefFor={hrefFor}
            stages={visibleStages}
          />
        </div>

        <div className="min-w-0">
          <StageHeader stage={stage} />
          {children}
          <StagePrevNext activeStageId={activeStageId} hrefFor={hrefFor} />
        </div>
      </div>
    </div>
  );
}
