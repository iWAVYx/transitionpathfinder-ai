import { Link } from "@tanstack/react-router";
import { ArrowRight, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  IllustratedEmptyState,
  type EmptyKind,
} from "@/components/empty/IllustratedEmptyState";
import { toTitleCase } from "@/lib/title-case";

/**
 * ModuleEmptyState — the shared, premium empty state used by every
 * Student / Family / Educator dashboard module (Pathway Report,
 * Student Profile, Action Items, Meeting Prep, …).
 *
 * One visual + interaction contract so any surface that has no data
 * yet reads the same way: illustrated hero, tight title + supportive
 * body, a single primary CTA that opens the tool that unlocks the
 * data, and an optional secondary link for context.
 */
export interface ModuleEmptyStateProps {
  /** Illustration variant that best matches the module surface. */
  kind?: EmptyKind;
  /** Optional eyebrow (Title Cased automatically). */
  eyebrow?: string;
  title: string;
  description: string;
  primaryAction: { label: string; to: string };
  secondaryAction?: { label: string; to: string };
  /** Override outer classes (spacing / max-width). */
  className?: string;
}

export function ModuleEmptyState({
  kind = "generic",
  eyebrow,
  title,
  description,
  primaryAction,
  secondaryAction,
  className,
}: ModuleEmptyStateProps) {
  return (
    <div className={className ?? "mt-4"} data-testid="module-empty-state">
      {eyebrow && (
        <p className="mb-2 inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">
          <Sparkles className="h-3 w-3" aria-hidden /> {toTitleCase(eyebrow)}
        </p>
      )}
      <IllustratedEmptyState
        kind={kind}
        size="lg"
        title={toTitleCase(title)}
        description={description}
        action={
          <div className="flex flex-wrap items-center justify-center gap-2">
            <Button asChild size="lg" className="shadow-elegant">
              <Link to={primaryAction.to as never}>
                {toTitleCase(primaryAction.label)}
                <ArrowRight className="ml-1.5 h-4 w-4" aria-hidden />
              </Link>
            </Button>
            {secondaryAction && (
              <Button asChild size="lg" variant="outline">
                <Link to={secondaryAction.to as never}>
                  {toTitleCase(secondaryAction.label)}
                </Link>
              </Button>
            )}
          </div>
        }
      />
    </div>
  );
}
