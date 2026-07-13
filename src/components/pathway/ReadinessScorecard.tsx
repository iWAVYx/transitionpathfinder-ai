import { cn } from "@/lib/utils";
import { ArrowUpRight, ArrowDownRight, Minus } from "lucide-react";

export type ReadinessDomain = {
  key: string;
  label: string;
  score: number; // 0-100
  delta?: number; // change since last report
  note?: string;
};

const DEFAULT: ReadinessDomain[] = [
  { key: "academic", label: "Academic", score: 72, delta: +6, note: "Passing target courses" },
  { key: "employment", label: "Employment", score: 58, delta: +12, note: "New job trial in progress" },
  { key: "independent-living", label: "Independent Living", score: 65, delta: 0, note: "Transportation goal ongoing" },
  { key: "community", label: "Community", score: 48, delta: -4, note: "Reconnect with peer group" },
];

function tone(score: number) {
  if (score >= 75) return "bg-emerald-100 text-emerald-900";
  if (score >= 55) return "bg-amber-100 text-amber-900";
  return "bg-destructive/10 text-destructive";
}

function DeltaBadge({ delta }: { delta?: number }) {
  if (typeof delta !== "number") return null;
  if (delta === 0) {
    return (
      <span className="inline-flex items-center gap-0.5 text-[11px] text-muted-foreground">
        <Minus className="h-3 w-3" aria-hidden /> Flat
      </span>
    );
  }
  const up = delta > 0;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-0.5 text-[11px] font-medium",
        up ? "text-emerald-700" : "text-destructive",
      )}
    >
      {up ? <ArrowUpRight className="h-3 w-3" aria-hidden /> : <ArrowDownRight className="h-3 w-3" aria-hidden />}
      {up ? "+" : ""}{delta}
    </span>
  );
}

interface Props {
  domains?: ReadinessDomain[];
  className?: string;
}

export function ReadinessScorecard({ domains = DEFAULT, className }: Props) {
  const overall = Math.round(domains.reduce((s, d) => s + d.score, 0) / domains.length);
  return (
    <section
      aria-label="Readiness scorecard"
      className={cn("rounded-3xl border bg-card p-5 shadow-soft sm:p-6", className)}
    >
      <header className="mb-4 flex flex-wrap items-end justify-between gap-2">
        <div>
          <h3 className="font-display text-lg">Readiness Scorecard</h3>
          <p className="text-sm text-muted-foreground">
            One number per domain, with change since the last report.
          </p>
        </div>
        <div className="text-right">
          <div className={cn("inline-flex items-baseline gap-1 rounded-full px-3 py-1 font-display text-2xl", tone(overall))}>
            {overall}
            <span className="text-xs font-medium">/100</span>
          </div>
          <p className="mt-1 text-[11px] uppercase tracking-wider text-muted-foreground">Overall</p>
        </div>
      </header>

      <ul className="grid gap-3 sm:grid-cols-2">
        {domains.map((d) => (
          <li key={d.key} className="rounded-2xl border bg-background/60 p-3">
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-semibold">{d.label}</p>
              <DeltaBadge delta={d.delta} />
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className={cn("rounded-md px-2 py-0.5 font-display text-lg", tone(d.score))}>{d.score}</span>
              <span className="text-[11px] text-muted-foreground">/100</span>
            </div>
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
              <div
                className={cn(
                  "h-full transition-all",
                  d.score >= 75 ? "bg-emerald-500" : d.score >= 55 ? "bg-amber-500" : "bg-destructive",
                )}
                style={{ width: `${d.score}%` }}
              />
            </div>
            {d.note && <p className="mt-2 text-xs text-muted-foreground">{d.note}</p>}
          </li>
        ))}
      </ul>
    </section>
  );
}
