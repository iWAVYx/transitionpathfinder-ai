import { useState } from "react";
import { cn } from "@/lib/utils";
import { AnimatedCounter } from "@/components/effects/AnimatedCounter";

type Stage = "saved" | "contacted" | "applied" | "enrolled" | "not_fit";

export interface PipelineCard {
  id: string;
  student: string;
  program: string;
  stage: Stage;
  updatedAgo?: string;
}

const STAGES: { key: Stage; label: string; tone: string }[] = [
  { key: "saved", label: "Saved", tone: "bg-muted/60 text-foreground" },
  { key: "contacted", label: "Contacted", tone: "bg-sky-soft text-ink" },
  { key: "applied", label: "Applied", tone: "bg-primary/15 text-primary" },
  { key: "enrolled", label: "Enrolled", tone: "bg-primary/30 text-primary" },
  { key: "not_fit", label: "Not A Fit", tone: "bg-destructive/10 text-destructive" },
];

const SAMPLE: PipelineCard[] = [
  { id: "1", student: "Jordan R.", program: "MCC Animal Care Cert", stage: "contacted", updatedAgo: "2d" },
  { id: "2", student: "Kai M.", program: "Life-Skills Studio", stage: "applied", updatedAgo: "5d" },
  { id: "3", student: "Priya S.", program: "Self-Advocacy Cohort", stage: "enrolled", updatedAgo: "1w" },
  { id: "4", student: "Alex T.", program: "Culinary Pathway", stage: "saved", updatedAgo: "today" },
  { id: "5", student: "Sam L.", program: "Vet Clinic Shadow", stage: "contacted", updatedAgo: "3d" },
  { id: "6", student: "River B.", program: "Retail Ready Program", stage: "not_fit", updatedAgo: "2w" },
];

interface Props {
  cards?: PipelineCard[];
  className?: string;
}

export function OpportunityPipelineBoard({ cards = SAMPLE, className }: Props) {
  const [items, setItems] = useState(cards);

  const move = (id: string, nextStage: Stage) => {
    setItems((prev) => prev.map((c) => (c.id === id ? { ...c, stage: nextStage } : c)));
  };

  const byStage = STAGES.map((s) => ({ ...s, cards: items.filter((c) => c.stage === s.key) }));
  const totalActive = items.filter((c) => c.stage !== "not_fit").length;
  const enrolled = items.filter((c) => c.stage === "enrolled").length;

  return (
    <section aria-label="Opportunity pipeline" className={cn("rounded-3xl border bg-card p-5 shadow-soft sm:p-6", className)}>
      <header className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="font-display text-lg">Opportunity Pipeline</h3>
          <p className="text-sm text-muted-foreground">Click a stage on a card to advance it.</p>
        </div>
        <div className="flex gap-4 text-sm">
          <p className="text-muted-foreground">
            Active: <AnimatedCounter className="font-display text-base text-foreground" value={totalActive} />
          </p>
          <p className="text-muted-foreground">
            Enrolled: <AnimatedCounter className="font-display text-base text-primary" value={enrolled} />
          </p>
        </div>
      </header>

      <div className="grid gap-3 md:grid-cols-5">
        {byStage.map((col) => (
          <div key={col.key} className="rounded-2xl border bg-background p-3">
            <div className={cn("mb-2 flex items-center justify-between rounded-md px-2 py-1 text-xs font-semibold uppercase tracking-wider", col.tone)}>
              <span>{col.label}</span>
              <span>{col.cards.length}</span>
            </div>
            <ul className="space-y-2">
              {col.cards.map((c) => (
                <li key={c.id} className="rounded-xl border bg-card p-2 text-xs shadow-soft animate-fade-in">
                  <p className="font-semibold">{c.student}</p>
                  <p className="truncate text-muted-foreground">{c.program}</p>
                  {c.updatedAgo ? <p className="mt-1 text-[10px] uppercase tracking-wider text-muted-foreground">{c.updatedAgo}</p> : null}
                  <div className="mt-2 flex flex-wrap gap-1">
                    {STAGES.filter((s) => s.key !== c.stage).map((s) => (
                      <button
                        key={s.key}
                        type="button"
                        onClick={() => move(c.id, s.key)}
                        className="rounded-full border px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground transition hover:border-primary/50 hover:text-primary"
                        aria-label={`Move ${c.student} to ${s.label}`}
                      >
                        → {s.label}
                      </button>
                    ))}
                  </div>
                </li>
              ))}
              {col.cards.length === 0 ? (
                <li className="rounded-xl border border-dashed p-3 text-center text-[11px] text-muted-foreground">Empty</li>
              ) : null}
            </ul>
          </div>
        ))}
      </div>
    </section>
  );
}
