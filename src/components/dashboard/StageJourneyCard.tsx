/**
 * StageJourneyCard — the shared "your journey through the workspace"
 * widget for every role dashboard and hub.
 *
 * Derives its stages from the SINGLE stage model
 * (`src/lib/workspace/stages.ts`) filtered to the audience the dashboard
 * is rendering for. The nine-stage rail is visually the same primitive
 * as the workspace `StageSpine`, so a family / educator / partner
 * dashboard visibly reads as "you are here, in the same journey the
 * workspace and Pathway Report share".
 *
 * The dashboard passes a set of completed stage ids (or omits it — in
 * which case START is treated as the current step). The next step
 * highlights, deep-links into the authenticated workspace, and shows a
 * short "why this matters" line pulled from the stage description.
 */
import { Link } from "@tanstack/react-router";
import { ArrowRight, Check } from "lucide-react";

import {
  WORKSPACE_STAGES,
  stagesForAudience,
  type StageId,
  type WorkspaceStage,
} from "@/lib/workspace/stages";
import type { RoleAudience } from "@/lib/role-policy";
import { cn } from "@/lib/utils";
import { toTitleCase } from "@/lib/title-case";

export interface StageJourneyCardProps {
  audience: RoleAudience;
  /** Stage ids the user (or their student) has meaningfully completed. */
  completedStages?: ReadonlySet<StageId>;
  /**
   * Explicit override for the "current" stage. If omitted the first
   * uncompleted stage the audience can see is used.
   */
  currentStage?: StageId;
  className?: string;
}

export function StageJourneyCard({
  audience,
  completedStages,
  currentStage,
  className,
}: StageJourneyCardProps) {
  const stages = stagesForAudience(audience);
  if (stages.length === 0) return null;

  const completed = completedStages ?? new Set<StageId>();
  const resolvedCurrent =
    currentStage ??
    stages.find((s) => !completed.has(s.id))?.id ??
    stages[stages.length - 1].id;

  const currentStageObj = WORKSPACE_STAGES.find((s) => s.id === resolvedCurrent);

  return (
    <section
      aria-label="Your transition journey"
      data-testid="stage-journey-card"
      className={cn(
        "rounded-3xl border bg-card p-5 shadow-soft sm:p-6",
        className,
      )}
    >
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-primary">
          The Transition Workspace
        </p>
        <p className="text-xs text-muted-foreground">
          {completed.size} of {stages.length} stages complete
        </p>
      </div>
      <h3 className="mt-2 font-display text-xl font-medium leading-snug tracking-tight">
        {toTitleCase(currentStageObj ? `You're on Stage ${currentStageObj.order} — ${currentStageObj.title}` : "You're on Your Journey")}
      </h3>
      {currentStageObj ? (
        <p className="mt-1.5 text-sm leading-relaxed text-foreground/75">
          {currentStageObj.description}
        </p>
      ) : null}

      <ol className="relative mt-5 m-0 list-none space-y-4 p-0">
        <span
          aria-hidden
          className="absolute left-[19px] top-2 bottom-2 w-px bg-border"
        />
        {stages.map((stage) => (
          <StageRow
            key={stage.id}
            stage={stage}
            state={
              completed.has(stage.id)
                ? "done"
                : stage.id === resolvedCurrent
                  ? "current"
                  : "upcoming"
            }
          />
        ))}
      </ol>

      {currentStageObj ? (
        <div className="mt-5">
          <Link
            to="/workspace/$stage"
            params={{ stage: currentStageObj.id }}
            className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-soft transition hover:shadow-lift"
          >
            Continue {currentStageObj.label.toLowerCase()}
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      ) : null}
    </section>
  );
}

function StageRow({
  stage,
  state,
}: {
  stage: WorkspaceStage;
  state: "done" | "current" | "upcoming";
}) {
  const isCurrent = state === "current";
  const isDone = state === "done";

  return (
    <li className="relative">
      <div className="flex items-start gap-4">
        <span
          aria-hidden
          className={cn(
            "relative z-10 mt-0.5 grid h-10 w-10 shrink-0 place-items-center rounded-full border-2 text-[11px] font-semibold uppercase tracking-[0.16em]",
            isDone && "border-primary bg-primary text-primary-foreground",
            isCurrent && "border-primary bg-background text-primary",
            !isDone && !isCurrent && "border-border bg-background text-muted-foreground",
          )}
        >
          {isDone ? <Check className="h-4 w-4" /> : stage.order}
        </span>
        <div className="min-w-0 flex-1 pt-1.5">
          <div className="flex flex-wrap items-baseline gap-x-2">
            <p
              className={cn(
                "text-[11px] font-semibold uppercase tracking-[0.22em]",
                isCurrent ? "text-primary" : "text-muted-foreground",
              )}
            >
              {stage.label}
            </p>
            {isCurrent ? (
              <span className="text-[10px] font-semibold uppercase tracking-wider text-primary/80">
                You're here
              </span>
            ) : null}
          </div>
          <p className="mt-0.5 text-sm font-medium text-foreground">
            {stage.title}
          </p>
        </div>
      </div>
    </li>
  );
}
