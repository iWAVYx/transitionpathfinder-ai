import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

/**
 * Inline jargon tooltip. Wrap special-ed acronyms or technical terms
 * so families can hover/tap for a plain-language definition.
 *
 * <Term definition="Individualized Education Program — the legal plan that…">IEP</Term>
 */
export function Term({
  children,
  definition,
  className,
}: {
  children: React.ReactNode;
  definition: React.ReactNode;
  className?: string;
}) {
  return (
    <TooltipProvider delayDuration={150}>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            className={cn(
              "cursor-help underline decoration-dotted decoration-primary/60 underline-offset-4 hover:decoration-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2 rounded-sm",
              className,
            )}
          >
            {children}
          </button>
        </TooltipTrigger>
        <TooltipContent className="max-w-xs text-sm leading-relaxed">
          {definition}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

/**
 * Pre-defined glossary for the most common special-education terms used
 * across TransitionForward. Import and reuse anywhere instead of hand-rolling
 * the same definitions.
 */
export const GLOSSARY = {
  IEP: "Individualized Education Program — the legal plan that spells out a student's goals, services, and supports at school.",
  PPT: "Planning & Placement Team — the meeting where school staff and family review the IEP together.",
  Transition:
    "Transition planning is everything that helps a student move from high school into adult life: college, work, training, or independent living.",
  Accommodations:
    "Changes to how a student learns or is tested (e.g. extra time, quiet room) so they can access the same material as peers.",
  "Post-secondary":
    "Anything that happens after high school — college, technical training, work, or supported life-skills programs.",
  "504 Plan":
    "A plan under Section 504 that gives accommodations to students with disabilities who don't qualify for an IEP.",
} as const;
