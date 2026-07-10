import { Link } from "@tanstack/react-router";
import { ArrowRight, type LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

export interface ToolPreviewBullet {
  label: string;
  value?: string | number | null;
  hint?: string;
}

export interface ToolPreviewCardProps {
  icon: LucideIcon;
  title: string;
  /** One-line status shown as a chip (e.g. "3 pending", "Complete"). */
  status?: string;
  /** Semantic tone for the status chip. */
  tone?: "default" | "success" | "warning" | "critical" | "muted";
  /** 1–2 line description of what this tool is / current state. */
  summary?: string;
  /** Up to 3 preview bullets showing live values. */
  bullets?: ToolPreviewBullet[];
  /** Deep-link CTA into the full tool. */
  cta: { label: string; to: string; params?: Record<string, string> };
  /** Optional extra footer content. */
  footer?: ReactNode;
}

const TONE: Record<NonNullable<ToolPreviewCardProps["tone"]>, string> = {
  default: "bg-primary/10 text-primary ring-primary/20",
  success: "bg-emerald-500/10 text-emerald-700 ring-emerald-500/20 dark:text-emerald-300",
  warning: "bg-amber-500/10 text-amber-700 ring-amber-500/20 dark:text-amber-300",
  critical: "bg-destructive/10 text-destructive ring-destructive/20",
  muted: "bg-muted text-muted-foreground ring-border",
};

export function ToolPreviewCard({
  icon: Icon,
  title,
  status,
  tone = "default",
  summary,
  bullets,
  cta,
  footer,
}: ToolPreviewCardProps) {
  return (
    <div className="group relative flex h-full min-h-[15rem] flex-col rounded-2xl border border-border bg-card p-5 shadow-soft transition-all hover:-translate-y-0.5 hover:shadow-lift">
      <div className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary ring-1 ring-primary/20">
          <Icon className="h-5 w-5" aria-hidden />
        </div>
        <span aria-hidden />
        {status ? (
          <span
            className={`inline-flex shrink-0 items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wider ring-1 ${TONE[tone]}`}
          >
            {status}
          </span>
        ) : (
          <span aria-hidden />
        )}
      </div>
      <h3 className="mt-4 font-display text-lg font-medium tracking-tight">{title}</h3>
      {summary && <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{summary}</p>}
      {bullets && bullets.length > 0 && (
        <ul className="mt-4 space-y-1.5 text-sm">
          {bullets.slice(0, 3).map((b, i) => (
            <li key={i} className="flex items-baseline justify-between gap-3">
              <span className="text-muted-foreground">{b.label}</span>
              <span className="font-medium text-foreground text-right">
                {b.value ?? "—"}
                {b.hint && <span className="ml-1 text-[11px] text-muted-foreground">{b.hint}</span>}
              </span>
            </li>
          ))}
        </ul>
      )}
      {footer && <div className="mt-4">{footer}</div>}
      <div className="mt-auto pt-5">
        <Link
          to={cta.to as string}
          params={cta.params as never}
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary underline-offset-4 hover:underline"
        >
          {cta.label}
          <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" aria-hidden />
        </Link>
      </div>
    </div>
  );
}

export function ToolPreviewGrid({ children }: { children: ReactNode }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{children}</div>
  );
}

export function ToolPreviewSection({
  eyebrow,
  title,
  description,
  children,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <section className="mt-10">
      {eyebrow && (
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">
          {eyebrow}
        </p>
      )}
      <h2 className="mt-1 font-display text-2xl font-semibold tracking-tight sm:text-3xl">
        {title}
      </h2>
      {description && (
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">{description}</p>
      )}
      <div className="mt-6">{children}</div>
    </section>
  );
}
