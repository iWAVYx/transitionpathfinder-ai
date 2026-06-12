import { CalendarClock } from "lucide-react";
import { ageFromDob, transitionBand, TRANSITION_PROMPTS } from "@/lib/transition-age";

type Props = {
  dateOfBirth: string | null;
  age: number | null;
  gradeBand: string | null;
};

/**
 * Tiny CT-specific transition planning prompt strip. Pure derivation; no
 * fetches. Surfaces the right reminder for the student's age band.
 */
export function CtTransitionPrompts({ dateOfBirth, age, gradeBand }: Props) {
  const effectiveAge = age ?? ageFromDob(dateOfBirth);
  const band = transitionBand(effectiveAge, gradeBand);
  const prompt = TRANSITION_PROMPTS[band];
  return (
    <div className="mt-3 flex items-start gap-3 rounded-2xl border bg-card p-4">
      <CalendarClock className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-sm font-semibold">{prompt.title}</p>
          <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            CT transition planning
          </span>
        </div>
        <p className="mt-1 text-xs text-muted-foreground">{prompt.body}</p>
      </div>
    </div>
  );
}
