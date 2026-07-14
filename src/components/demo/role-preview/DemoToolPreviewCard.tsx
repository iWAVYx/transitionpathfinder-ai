import { Link } from "@tanstack/react-router";
import { ArrowRight, Sparkles, type LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { toTitleCase } from "@/lib/title-case";

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
    <div className="group relative flex h-full flex-col overflow-hidden rounded-xl border border-border/60 bg-card shadow-sm transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md">
      <span className="h-1 w-full bg-gradient-to-r from-primary/70 via-primary/30 to-transparent" aria-hidden />
      <div className="flex items-start justify-between gap-2 px-3.5 pt-3">
        <div className="flex min-w-0 items-center gap-2.5">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary ring-1 ring-primary/20">
            <Icon className="h-4 w-4" aria-hidden />
          </div>
          <h3 className="min-w-0 truncate font-display text-[15px] font-semibold tracking-tight">
            {toTitleCase(title)}
          </h3>
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          <span
            className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-primary ring-1 ring-primary/20"
            aria-label="Sample data"
          >
            <Sparkles className="h-2.5 w-2.5" aria-hidden /> Sample
          </span>
          {status && (
            <span
              className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ring-1 ${TONE[tone]}`}
            >
              {status}
            </span>
          )}
        </div>
      </div>
      {summary && (
        <p className="mt-1.5 line-clamp-2 px-3.5 text-[13px] leading-snug text-muted-foreground">
          {summary}
        </p>
      )}
      {bullets && bullets.length > 0 && (
        <dl className="mx-3.5 mt-2.5 grid grid-cols-2 gap-x-3 gap-y-1.5 rounded-md border border-border/60 bg-muted/40 px-2.5 py-2">
          {bullets.slice(0, 4).map((b, i) => (
            <div key={i} className="flex min-w-0 flex-col">
              <dt className="truncate text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                {b.label}
              </dt>
              <dd className="truncate text-[13px] font-semibold text-foreground">
                {b.value ?? "—"}
                {b.hint && (
                  <span className="ml-1 text-[10px] font-normal text-muted-foreground">
                    {b.hint}
                  </span>
                )}
              </dd>
            </div>
          ))}
        </dl>
      )}
      {footer && <div className="mt-2 px-3.5">{footer}</div>}
      {cta && (
        <div className="mt-auto flex items-center justify-end gap-2 border-t border-border/60 bg-muted/20 px-3.5 py-2">
          <Link
            to={cta.to as string}
            params={cta.params as never}
            data-testid="demo-tool-preview-cta"
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary underline-offset-4 hover:underline"
          >
            {toTitleCase(cta.label)}
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
