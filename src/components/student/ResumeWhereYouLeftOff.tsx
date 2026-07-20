import { Link } from "@tanstack/react-router";
import { ArrowRight, RotateCcw } from "lucide-react";

import { useNextBestStep } from "@/hooks/use-next-best-step";

/**
 * Workstream 5 — Student navigation contract.
 *
 * Renders a "Resume where you left off" card on the Student Planning
 * Hub when the signed-in student has a saved workflow draft. When no
 * draft exists, the card renders nothing so the existing Next Actions
 * surface owns the empty state — the loop never dead-ends.
 */
export function ResumeWhereYouLeftOff() {
  const { step, loading } = useNextBestStep();

  if (loading || !step.isResume) return null;

  return (
    <div
      role="region"
      aria-label="Resume where you left off"
      className="rounded-2xl border border-border bg-card p-4 sm:p-5 shadow-sm flex items-start gap-3"
    >
      <div className="mt-0.5 rounded-full bg-primary/10 text-primary p-2" aria-hidden="true">
        <RotateCcw className="h-4 w-4" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs uppercase tracking-wide text-muted-foreground">
          Resume Where You Left Off
        </p>
        <p className="mt-0.5 font-medium text-foreground truncate">
          {step.label}
        </p>
      </div>
      <Link
        to={step.to}
        className="inline-flex items-center gap-1 rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        Continue
        <ArrowRight className="h-4 w-4" aria-hidden="true" />
      </Link>
    </div>
  );
}
