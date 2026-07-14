import type { ReactNode } from "react";

/**
 * DashboardSection — lightweight grouping wrapper used *outside* the
 * approved Workspace section on each role hub.
 *
 * Design intent: this should read as a quiet "zone divider" — a small
 * eyebrow + heading + hairline — not another card. Its children are
 * usually cards themselves; wrapping them in a second card produced the
 * card-in-card / stacked-box feel the dashboard redesign is trying to
 * kill. Keep this component visually flat.
 *
 * Use `surface="card"` only when a real container is genuinely needed
 * (rare — e.g. a group of loose rows that need a boundary).
 */
export interface DashboardSectionProps {
  eyebrow: string;
  title?: string;
  description?: string;
  /** Children stack with their own internal spacing. */
  children: ReactNode;
  /** Optional slot rendered on the right of the header row (e.g. link). */
  action?: ReactNode;
  /** Inner spacing between direct children (default: 4). */
  gap?: "tight" | "default" | "loose";
  /**
   * Visual weight of the section wrapper. Default is `flat` — a hairline
   * header with no surrounding card, so child cards read cleanly. Use
   * `card` only when the children are loose rows that need containment.
   */
  surface?: "flat" | "card";
  /**
   * Layout for direct children. `stack` (default) keeps existing vertical
   * stacking; `grid-2` / `grid-3` place children on a responsive grid so
   * multi-card zones stop reading as a single tall column.
   */
  layout?: "stack" | "grid-2" | "grid-3";
}

const STACK_GAP: Record<NonNullable<DashboardSectionProps["gap"]>, string> = {
  tight: "space-y-3",
  default: "space-y-4",
  loose: "space-y-6",
};
const GRID_GAP: Record<NonNullable<DashboardSectionProps["gap"]>, string> = {
  tight: "gap-3",
  default: "gap-4",
  loose: "gap-6",
};

export function DashboardSection({
  eyebrow,
  title,
  description,
  action,
  gap = "default",
  surface = "flat",
  layout = "stack",
  children,
}: DashboardSectionProps) {
  const wrapperClass =
    surface === "card"
      ? "rounded-2xl border border-border/60 bg-card p-4 shadow-sm sm:p-5"
      : "";

  const bodyClass =
    layout === "grid-2"
      ? `grid ${GRID_GAP[gap]} md:grid-cols-2`
      : layout === "grid-3"
        ? `grid ${GRID_GAP[gap]} md:grid-cols-2 lg:grid-cols-3`
        : STACK_GAP[gap];

  return (
    <section aria-label={title ?? eyebrow} className={wrapperClass}>
      <div className="mb-3 flex flex-wrap items-end justify-between gap-2 border-b border-border/50 pb-2">
        <div className="min-w-0">
          <p className="text-[10.5px] font-semibold uppercase tracking-[0.18em] text-primary">
            {eyebrow}
          </p>
          {title ? (
            <h2 className="mt-0.5 font-display text-[15px] font-semibold tracking-tight text-foreground sm:text-base">
              {title}
            </h2>
          ) : null}
          {description ? (
            <p className="mt-0.5 max-w-2xl text-[12.5px] leading-snug text-muted-foreground">
              {description}
            </p>
          ) : null}
        </div>
        {action ? <div className="shrink-0">{action}</div> : null}
      </div>
      <div className={bodyClass}>{children}</div>
    </section>
  );
}
