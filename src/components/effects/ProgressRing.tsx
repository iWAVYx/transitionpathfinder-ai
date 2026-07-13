import { cn } from "@/lib/utils";

interface Props {
  /** 0–100 */
  value: number;
  size?: number;
  stroke?: number;
  label?: string;
  sublabel?: string;
  className?: string;
  /** Extra ring tint class, e.g. "text-primary" (default) or "text-accent". */
  tone?: string;
}

/**
 * Motion-safe SVG progress ring. Animation is CSS-driven via `.tf-ring-fill`
 * (which is gated behind prefers-reduced-motion), so users without motion
 * see the final filled arc immediately.
 */
export function ProgressRing({
  value,
  size = 96,
  stroke = 8,
  label,
  sublabel,
  className,
  tone = "text-primary",
}: Props) {
  const pct = Math.max(0, Math.min(100, value));
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ - (pct / 100) * circ;
  return (
    <div className={cn("inline-flex flex-col items-center gap-1", className)}>
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90" role="img" aria-label={label ? `${label}: ${pct}%` : `${pct}%`}>
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            strokeWidth={stroke}
            className="text-muted/40"
            stroke="currentColor"
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            strokeWidth={stroke}
            strokeLinecap="round"
            className={cn("tf-ring-fill", tone)}
            stroke="currentColor"
            strokeDasharray={circ}
            strokeDashoffset={offset}
            style={{ ["--ring-circ" as string]: `${circ}` }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="font-display text-xl leading-none">{Math.round(pct)}%</span>
          {sublabel ? <span className="mt-0.5 text-[10px] uppercase tracking-wider text-muted-foreground">{sublabel}</span> : null}
        </div>
      </div>
      {label ? <span className="text-xs font-medium text-foreground/80">{label}</span> : null}
    </div>
  );
}
