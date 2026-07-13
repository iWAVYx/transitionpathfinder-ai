import { useState } from "react";
import { Check, Circle, Compass } from "lucide-react";
import { cn } from "@/lib/utils";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

export type PathwayStepStatus = "complete" | "current" | "upcoming";

export interface PathwayStep {
  key: string;
  title: string;
  status: PathwayStepStatus;
  detail?: string;
  nextAction?: string;
}

const DEFAULT_STEPS: PathwayStep[] = [
  { key: "explore", title: "Explore", status: "complete", detail: "Interests, strengths, and dreams captured.", nextAction: "Revisit Student Voice quarterly." },
  { key: "prepare", title: "Prepare", status: "complete", detail: "Assessments and goals in place.", nextAction: "Add one new skill goal this month." },
  { key: "connect", title: "Connect", status: "current", detail: "Meeting with 2 partner programs.", nextAction: "Book tour at MCC Animal Care." },
  { key: "apply", title: "Apply", status: "upcoming", detail: "Applications open next spring." },
  { key: "thrive", title: "Thrive", status: "upcoming", detail: "First 90 days after transition." },
];

interface Props {
  steps?: PathwayStep[];
  className?: string;
}

/**
 * Horizontal, keyboard-reachable pathway timeline. Completed steps glow
 * subtly, the current step pulses, upcoming steps stay quiet. Every step is
 * a popover trigger so keyboard/touch users can read the detail.
 */
export function PathwayTimeline({ steps = DEFAULT_STEPS, className }: Props) {
  const [openKey, setOpenKey] = useState<string | null>(null);
  const completedCount = steps.filter((s) => s.status === "complete").length;

  return (
    <section
      aria-label="Pathway timeline"
      className={cn("rounded-3xl border bg-card p-5 shadow-soft sm:p-6", className)}
    >
      <header className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4 sm:flex sm:flex-wrap sm:justify-between">
        <div className="flex min-w-0 items-center gap-2">
          <Compass className="h-5 w-5 shrink-0 text-primary" />
          <h2 className="truncate font-display text-lg">Your Pathway Timeline</h2>
        </div>
        <p className="text-xs font-medium text-muted-foreground">
          {completedCount} of {steps.length} milestones
        </p>
      </header>

      <ol className="mt-6 grid gap-4 sm:grid-cols-5" role="list">
        {steps.map((step, i) => {
          const isComplete = step.status === "complete";
          const isCurrent = step.status === "current";
          return (
            <li key={step.key} className="relative">
              {i < steps.length - 1 ? (
                <span
                  aria-hidden
                  className={cn(
                    "hidden sm:block absolute top-5 left-[calc(50%+1.5rem)] right-[-1rem] h-0.5",
                    isComplete ? "bg-primary/60" : "bg-border",
                  )}
                />
              ) : null}
              <Popover open={openKey === step.key} onOpenChange={(o) => setOpenKey(o ? step.key : null)}>
                <PopoverTrigger asChild>
                  <button
                    type="button"
                    className={cn(
                      "group flex w-full flex-col items-center gap-2 rounded-2xl border bg-background p-3 text-center transition hover:border-primary/50 hover:shadow-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                      isCurrent && "border-primary/60 shadow-soft",
                    )}
                    aria-label={`${step.title} — ${step.status}`}
                  >
                    <span
                      className={cn(
                        "grid h-10 w-10 place-items-center rounded-full border-2",
                        isComplete && "border-primary bg-primary text-primary-foreground tf-milestone-glow",
                        isCurrent && "border-primary text-primary tf-status-pulse",
                        !isComplete && !isCurrent && "border-border text-muted-foreground",
                      )}
                    >
                      {isComplete ? <Check className="h-5 w-5" /> : <Circle className="h-4 w-4" />}
                    </span>
                    <span className="text-sm font-semibold">{step.title}</span>
                    <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
                      {isComplete ? "Done" : isCurrent ? "In Progress" : "Upcoming"}
                    </span>
                  </button>
                </PopoverTrigger>
                <PopoverContent align="center" className="w-64">
                  <p className="text-sm font-semibold">{step.title}</p>
                  {step.detail ? <p className="mt-1 text-sm text-muted-foreground">{step.detail}</p> : null}
                  {step.nextAction ? (
                    <p className="mt-3 rounded-md bg-primary/10 px-2 py-1.5 text-xs text-primary">
                      Next: {step.nextAction}
                    </p>
                  ) : null}
                </PopoverContent>
              </Popover>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
