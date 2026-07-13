import { useState } from "react";
import { ProgressRing } from "@/components/effects/ProgressRing";
import { cn } from "@/lib/utils";

export interface CompletionCluster {
  key: string;
  label: string;
  pct: number;
  blockers?: string[];
}

const SAMPLE: CompletionCluster[] = [
  { key: "g9", label: "Grade 9", pct: 92 },
  { key: "g10", label: "Grade 10", pct: 78, blockers: ["3 missing IEP uploads"] },
  { key: "g11", label: "Grade 11", pct: 61, blockers: ["Transition assessments overdue", "2 staff not yet trained"] },
  { key: "g12", label: "Grade 12", pct: 88, blockers: ["Final PPTs pending for 4 students"] },
];

interface Props {
  clusters?: CompletionCluster[];
  className?: string;
}

/**
 * School-level rollout snapshot: a completion ring per cluster (grade or
 * caseload) with hover/focus revealing the current blockers.
 */
export function CompletionRingsBoard({ clusters = SAMPLE, className }: Props) {
  const [active, setActive] = useState<string | null>(null);
  return (
    <section aria-label="Implementation completion" className={cn("rounded-3xl border bg-card p-5 shadow-soft sm:p-6", className)}>
      <header className="mb-4">
        <h3 className="font-display text-lg">Implementation By Grade</h3>
        <p className="text-sm text-muted-foreground">Hover a ring for open blockers.</p>
      </header>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {clusters.map((c) => {
          const isActive = active === c.key;
          return (
            <button
              key={c.key}
              type="button"
              onMouseEnter={() => setActive(c.key)}
              onMouseLeave={() => setActive((k) => (k === c.key ? null : k))}
              onFocus={() => setActive(c.key)}
              onBlur={() => setActive((k) => (k === c.key ? null : k))}
              className={cn(
                "flex flex-col items-center gap-2 rounded-2xl border bg-background p-3 text-center transition hover:border-primary/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                isActive && "border-primary/60 shadow-soft",
              )}
              aria-label={`${c.label}: ${c.pct}% complete`}
            >
              <ProgressRing value={c.pct} size={88} label={c.label} sublabel="done" />
              {isActive && c.blockers?.length ? (
                <ul className="mt-1 space-y-1 text-left text-[11px] text-muted-foreground animate-fade-in">
                  {c.blockers.map((b) => <li key={b}>• {b}</li>)}
                </ul>
              ) : (
                <p className="text-[11px] text-muted-foreground">
                  {c.blockers?.length ? `${c.blockers.length} blocker${c.blockers.length > 1 ? "s" : ""}` : "On track"}
                </p>
              )}
            </button>
          );
        })}
      </div>
    </section>
  );
}
