import type { ReactNode } from "react";

/**
 * DashboardSection — lightweight grouping wrapper used outside the approved
 * Workspace section on each role hub. Renders a compact eyebrow + optional
 * title/description so stacked cards read as intentional dashboard zones
 * instead of a wall of tiles. Purely presentational — no data, no CTAs.
 */
export interface DashboardSectionProps {
  eyebrow: string;
  title?: string;
  description?: string;
  /** Children stack with their own internal spacing. */
  children: ReactNode;
  /** Optional slot rendered on the right of the header row (e.g. link). */
  action?: ReactNode;
  /** Inner spacing between direct children (default: 5). */
  gap?: "tight" | "default" | "loose";
}

const GAP_CLASS: Record<NonNullable<DashboardSectionProps["gap"]>, string> = {
  tight: "space-y-3",
  default: "space-y-5",
  loose: "space-y-8",
};

export function DashboardSection({
  eyebrow,
  title,
  description,
  action,
  gap = "default",
  children,
}: DashboardSectionProps) {
  return (
    <section
      aria-label={title ?? eyebrow}
      className="rounded-2xl border border-border/40 bg-muted/20 p-4 shadow-[0_1px_0_0_hsl(var(--border)/0.5)] sm:p-5"
    >
      <div className="mb-4 flex flex-wrap items-end justify-between gap-2 border-b border-border/40 pb-3">
        <div className="min-w-0">
          <p className="text-[10.5px] font-semibold uppercase tracking-[0.18em] text-primary">
            {eyebrow}
          </p>
          {title ? (
            <h2 className="mt-1 font-display text-base font-semibold tracking-tight text-foreground sm:text-lg">
              {title}
            </h2>
          ) : null}
          {description ? (
            <p className="mt-1 max-w-2xl text-[12.5px] leading-snug text-muted-foreground">
              {description}
            </p>
          ) : null}
        </div>
        {action ? <div className="shrink-0">{action}</div> : null}
      </div>
      <div className={GAP_CLASS[gap]}>{children}</div>
    </section>
  );
}
