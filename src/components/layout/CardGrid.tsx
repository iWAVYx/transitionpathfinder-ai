import { Children, type ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * CardGrid — opinionated responsive grid that keeps tile heights equal
 * (via auto-rows-fr) and optionally centers an odd final row at the
 * sm and lg breakpoints when the grid would otherwise leave a gap.
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

  // For 2-col layouts (sm) with an odd final row, use a 4-col grid on sm
  // so the trailing card can be centered (each card spans 2 of 4).
  const useFourColSm = columns === 3 && centerOddLast && count % 2 === 1;

  // For 3-col layouts with a partial final row, use a 6-col grid on lg
  // so trailing card(s) can be perfectly centered (each card spans 2 of 6).
  const useSixCol = columns === 3 && centerOddLast && count % 3 !== 0;

  const smClass = useFourColSm
    ? "sm:grid-cols-4 sm:[&>*]:col-span-2"
    : "sm:grid-cols-2";

  const lgClass = useSixCol
    ? "lg:grid-cols-6 lg:[&>*]:col-span-2"
    : columns === 2
      ? "lg:grid-cols-2"
      : columns === 4
        ? "lg:grid-cols-4"
        : "lg:grid-cols-3";

  // Center trailing card in the middle of the 4-col row on sm.
  const centerLastSm = useFourColSm
    ? "[&>*:last-child]:sm:col-start-2"
    : "";

  // Center trailing items symmetrically around the middle of the 6-col row on lg.
  const centerLastLg = useSixCol
    ? count % 3 === 1
      ? "[&>*:last-child]:lg:col-start-3"
      : // 2 trailing → cols 2 and 4, balanced around center
        "[&>*:nth-last-child(2)]:lg:col-start-2 [&>*:last-child]:lg:col-start-4"
    : "";

  return (
    <div
      className={cn(
        "grid grid-cols-1 gap-dashboard-sm sm:gap-dashboard-md lg:gap-dashboard-lg auto-rows-fr",
        smClass,
        lgClass,
        centerLastSm,
        centerLastLg,
        className,
      )}
    >
      {children}
    </div>
  );
}
