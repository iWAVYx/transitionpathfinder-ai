import { Children, type ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * CardGrid — opinionated responsive grid that keeps tile heights equal
 * (via auto-rows-fr) and optionally centers an odd final row at the
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

  // For 3-col layouts with a partial final row, use a 6-col grid on lg
  // so trailing card(s) can be perfectly centered (each card spans 2 of 6).
  const useSixCol = columns === 3 && centerOddLast && count % 3 !== 0;

  const lgClass = useSixCol
    ? "lg:grid-cols-6 lg:[&>*]:col-span-2"
    : columns === 2
      ? "lg:grid-cols-2"
      : columns === 4
        ? "lg:grid-cols-4"
        : "lg:grid-cols-3";

  // Center trailing items symmetrically around the middle of the 6-col row.
  const centerLast = useSixCol
    ? count % 3 === 1
      ? "[&>*:last-child]:lg:col-start-3"
      : // 2 trailing → cols 2 and 4, balanced around center
        "[&>*:nth-last-child(2)]:lg:col-start-2 [&>*:last-child]:lg:col-start-4"
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
