import { Link } from "@tanstack/react-router";
import {
  nextStage,
  previousStage,
  type StageId,
  type WorkspaceStage,
} from "@/lib/workspace/stages";

export interface StagePrevNextProps {
  activeStageId: StageId;
  hrefFor: (stage: WorkspaceStage) => string;
}

export function StagePrevNext({ activeStageId, hrefFor }: StagePrevNextProps) {
  const prev = previousStage(activeStageId);
  const next = nextStage(activeStageId);

  return (
    <nav
      aria-label="Move between stages"
      className="mt-16 flex flex-col gap-3 border-t border-border pt-8 sm:flex-row sm:items-stretch sm:justify-between sm:gap-6"
    >
      {prev ? (
        <Link
          to={hrefFor(prev) as never}
          className="group flex flex-1 items-center gap-3 rounded-xl border border-border bg-background/60 px-5 py-4 no-underline transition-colors hover:border-primary/60 hover:bg-muted/60"
        >
          <span aria-hidden className="text-2xl text-muted-foreground group-hover:text-primary">
            ←
          </span>
          <span className="flex flex-col">
            <span className="text-[10px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
              Previous · {prev.label}
            </span>
            <span className="mt-1 font-display text-lg text-foreground">
              {prev.title}
            </span>
          </span>
        </Link>
      ) : (
        <span aria-hidden className="hidden sm:block sm:flex-1" />
      )}

      {next ? (
        <Link
          to={hrefFor(next) as never}
          className="group flex flex-1 items-center justify-end gap-3 rounded-xl border border-primary/60 bg-primary/5 px-5 py-4 text-right no-underline transition-colors hover:border-primary hover:bg-primary/10"
        >
          <span className="flex flex-col items-end">
            <span className="text-[10px] font-semibold uppercase tracking-[0.22em] text-primary">
              Continue · {next.label}
            </span>
            <span className="mt-1 font-display text-lg text-foreground">
              {next.title}
            </span>
          </span>
          <span aria-hidden className="text-2xl text-primary">
            →
          </span>
        </Link>
      ) : (
        <span aria-hidden className="hidden sm:block sm:flex-1" />
      )}
    </nav>
  );
}
