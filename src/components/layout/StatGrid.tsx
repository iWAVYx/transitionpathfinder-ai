import { cn } from "@/lib/utils";

/**
 * StatGrid — uniform KPI/metric grid.
 *
 * Default: 2 cols on mobile, 3 on sm, 4 on lg. Override with `cols`.
 * Children should be StatCard or similar fixed-height tiles.
 */
type Cols = 2 | 3 | 4;

const GRID: Record<Cols, string> = {
  2: "grid-cols-2",
  3: "grid-cols-2 sm:grid-cols-3",
  4: "grid-cols-2 sm:grid-cols-2 lg:grid-cols-4",
};

export function StatGrid({
  children,
  cols = 4,
  className,
}: {
  children: React.ReactNode;
  cols?: Cols;
  className?: string;
}) {
  return (
    <div className={cn("grid gap-4 sm:gap-5 lg:gap-6", GRID[cols], className)}>{children}</div>
  );
}

/**
 * StatCard — the canonical KPI tile. Fixed minimum height keeps the row tidy
 * even when one label wraps to two lines.
 */
export function StatCard({
  label,
  value,
  hint,
  icon,
  tone,
  className,
}: {
  label: React.ReactNode;
  value: React.ReactNode;
  hint?: React.ReactNode;
  icon?: React.ReactNode;
  tone?: "default" | "warn" | "danger" | "success";
  className?: string;
}) {
  const valueTone =
    tone === "warn"
      ? "text-amber-700 dark:text-amber-300"
      : tone === "danger"
        ? "text-destructive"
        : tone === "success"
          ? "text-emerald-700 dark:text-emerald-300"
          : "";
  return (
    <div
      className={cn(
        "flex min-h-[5.5rem] flex-col justify-between rounded-2xl border bg-card p-4 shadow-soft",
        className,
      )}
    >
      <div className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
        {icon}
        <span className="truncate">{label}</span>
      </div>
      <div className="mt-2 flex items-baseline justify-between gap-2">
        <p className={cn("font-display text-2xl sm:text-3xl", valueTone)}>{value}</p>
        {hint ? (
          <p className="truncate text-[11px] text-muted-foreground">{hint}</p>
        ) : null}
      </div>
    </div>
  );
}
