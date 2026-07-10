import { Link } from "@tanstack/react-router";
import { ArrowRight, Sparkles, type LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

export interface DemoToolPreviewBullet {
  label: string;
  value?: string | number | null;
  hint?: string;
}

export interface DemoToolPreviewCardProps {
  icon: LucideIcon;
  title: string;
  status?: string;
  tone?: "default" | "success" | "warning" | "critical" | "muted";
  summary?: string;
  bullets?: DemoToolPreviewBullet[];
  /** Optional in-demo CTA (kept inside /demo/*). */
  cta?: { label: string; to: string; params?: Record<string, string> };
  footer?: ReactNode;
}

const TONE: Record<NonNullable<DemoToolPreviewCardProps["tone"]>, string> = {
  default: "bg-primary/10 text-primary ring-primary/20",
  success:
    "bg-emerald-500/10 text-emerald-700 ring-emerald-500/20 dark:text-emerald-300",
  warning:
    "bg-amber-500/10 text-amber-700 ring-amber-500/20 dark:text-amber-300",
  critical: "bg-destructive/10 text-destructive ring-destructive/20",
  muted: "bg-muted text-muted-foreground ring-border",
};

export function DemoToolPreviewCard({
  icon: Icon,
  title,
  status,
  tone = "default",
  summary,
  bullets,
  cta,
  footer,
}: DemoToolPreviewCardProps) {
  return (
    <div className="group relative flex flex-col rounded-2xl border border-border bg-card p-5 shadow-soft transition-all hover:-translate-y-0.5 hover:shadow-lift">
      <span
        className="absolute right-3 top-3 inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-primary ring-1 ring-primary/20"
        aria-label="Sample data"
      >
        <Sparkles className="h-2.5 w-2.5" aria-hidden /> Sample
      </span>
      <div className="flex items-start justify-between gap-3 pr-16">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary ring-1 ring-primary/20">
          <Icon className="h-5 w-5" aria-hidden />
        </div>
        {status && (
          <span
            className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wider ring-1 ${TONE[tone]}`}
          >
            {status}
          </span>
        )}
      </div>
      <h3 className="mt-4 font-display text-lg font-medium tracking-tight">
        {title}
      </h3>
      {summary && (
        <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
          {summary}
        </p>
      )}
      {bullets && bullets.length > 0 && (
        <ul className="mt-4 space-y-1.5 text-sm">
          {bullets.slice(0, 3).map((b, i) => (
            <li
              key={i}
              className="flex items-baseline justify-between gap-3 border-b border-dashed border-border/60 pb-1.5 last:border-b-0 last:pb-0"
            >
              <span className="text-muted-foreground">{b.label}</span>
              <span className="text-right font-medium text-foreground">
                {b.value ?? "—"}
                {b.hint && (
                  <span className="ml-1 text-[11px] text-muted-foreground">
                    {b.hint}
                  </span>
                )}
              </span>
            </li>
          ))}
        </ul>
      )}
      {footer && <div className="mt-4">{footer}</div>}
      {cta && (
        <div className="mt-auto pt-5">
          <Link
            to={cta.to as string}
            params={cta.params as never}
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary underline-offset-4 hover:underline"
          >
            {cta.label}
            <ArrowRight
              className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5"
              aria-hidden
            />
          </Link>
        </div>
      )}
    </div>
  );
}

export function DemoToolPreviewGrid({ children }: { children: ReactNode }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{children}</div>
  );
}
