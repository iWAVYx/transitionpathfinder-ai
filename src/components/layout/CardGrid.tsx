import { Children, type ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * CardGrid — opinionated responsive grid that keeps tile heights equal
 * (via auto-rows-fr) and optionally centers an odd final tile at the
 * largest breakpoint when the grid would otherwise leave a gap.
 *
 * Defaults: 1 col on mobile, 2 cols on sm, 3 cols on lg. Card children
 * should set `h-full flex flex-col` internally so CTAs align.
 */
export function CardGrid({
  children,
  columns = 3,
  centerOddLast = false,
  className,
}: {
  children: ReactNode;
  columns?: 2 | 3 | 4;
  centerOddLast?: boolean;
  className?: string;
}) {
  const count = Children.count(children);
  const lgClass =
    columns === 2 ? "lg:grid-cols-2" : columns === 4 ? "lg:grid-cols-4" : "lg:grid-cols-3";

  // Center the last child on lg when the count is odd on a 3-col grid.
  const centerLast =
    centerOddLast && columns === 3 && count % 3 === 1
      ? "[&>*:last-child]:lg:col-start-2"
      : "";

  return (
    <div
      className={cn(
        "grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5 auto-rows-fr",
        lgClass,
        centerLast,
        className,
      )}
    >
      {children}
    </div>
  );
}
