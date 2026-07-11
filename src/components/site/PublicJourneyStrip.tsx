/**
 * PublicJourneyStrip — the marketing-surface version of the nine-stage
 * transition workspace rail.
 *
 * The workspace `StageSpine`, dashboard `StageJourneyCard`, and Pathway
 * Report `PathwayReportSpine` all render the same connected nine-stage
 * rail. This strip is that same primitive, shrunk to a horizontal scroll
 * for pricing / waitlist / landing hero surfaces — so a prospective
 * buyer sees the same journey their team will actually work through
 * once they're in the product.
 *
 * NOT a card grid. Do not swap it for one. The whole point is that the
 * ecosystem visually reads as one connected pathway from marketing to
 * signed-in workspace to report.
 */
import { WORKSPACE_STAGES } from "@/lib/workspace/stages";
import { cn } from "@/lib/utils";

export interface PublicJourneyStripProps {
  /** Compact eyebrow above the rail. Omit to hide. */
  eyebrow?: string;
  /** Optional caption below. */
  caption?: string;
  className?: string;
}

export function PublicJourneyStrip({
  eyebrow = "The Transition Workspace",
  caption = "One connected journey — from getting started to real next steps and community connections.",
  className,
}: PublicJourneyStripProps) {
  return (
    <section
      aria-label="Nine-stage transition workspace"
      data-testid="public-journey-strip"
      className={cn(
        "p-5 sm:p-6",
        className,
      )}
    >
      {eyebrow ? (
        <p className="text-center text-[11px] font-semibold uppercase tracking-[0.22em] text-primary">
          {eyebrow}
        </p>
      ) : null}

      <ol className="tfws-public-journey relative mt-4 flex snap-x snap-mandatory items-start gap-2 overflow-x-auto pb-2 sm:justify-between sm:gap-1 sm:overflow-visible">
        {WORKSPACE_STAGES.map((stage) => (
          <li
            key={stage.id}
            data-stage={stage.id}
            className="relative flex min-w-[6.5rem] shrink-0 snap-start flex-col items-center gap-1.5 px-1 sm:min-w-0 sm:flex-1"
          >
            <span
              aria-hidden
              className="relative z-10 grid h-10 w-10 place-items-center rounded-full bg-background text-[11px] font-semibold tracking-wide text-muted-foreground/80"
            >
              {stage.order}
            </span>
            <p className="text-center text-[10px] font-semibold uppercase tracking-[0.18em] text-primary">
              {stage.label}
            </p>
            <p className="text-center text-[11px] leading-tight text-muted-foreground">
              {stage.title}
            </p>
          </li>
        ))}
      </ol>

      {caption ? (
        <p className="mt-4 text-center text-xs text-muted-foreground">
          {caption}
        </p>
      ) : null}
    </section>
  );
}
