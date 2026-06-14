import { type ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * HeroCTAs — layout wrapper that enforces symmetrical hero CTA buttons.
 *
 * Children are expected to be one or more clickable elements (Link,
 * Button asChild Link, anchor, etc.). The wrapper:
 *   - stacks them full-width on mobile with consistent gap,
 *   - lays them out inline on sm+ with min-width so paired CTAs match,
 *   - lets each child keep its own visual styling (primary vs outline).
 *
 * Direct children should render as block-level clickable elements; if
 * they are buttons inside <Link>, the outer <Link> is what gets sized.
 * Use the inline-flex utility on the inner button so it fills the link.
 */
export function HeroCTAs({
  children,
  align = "start",
  className,
}: {
  children: ReactNode;
  align?: "start" | "center";
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:gap-3",
        align === "center" ? "sm:justify-center" : "sm:justify-start",
        // Equal widths on mobile, min-width on sm+ so paired CTAs look balanced.
        "[&>*]:w-full sm:[&>*]:w-auto sm:[&>*]:min-w-[180px]",
        // If a direct child is a <Link>/<a> wrapping a <Button>, make sure
        // the inner button fills the link width.
        "[&>a>button]:w-full [&>a]:inline-flex",
        className,
      )}
    >
      {children}
    </div>
  );
}
