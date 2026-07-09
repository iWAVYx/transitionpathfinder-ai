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
  forceRow = false,
  className,
}: {
  children: ReactNode;
  align?: "start" | "center";
  /** Force a single horizontal row at every viewport (children share width). */
  forceRow?: boolean;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex items-center gap-3",
        forceRow
          ? "flex-row flex-nowrap"
          : "flex-col sm:flex-row sm:flex-wrap sm:items-center",
        align === "center"
          ? forceRow
            ? "justify-center"
            : "sm:justify-center"
          : forceRow
            ? "justify-start"
            : "sm:justify-start",
        forceRow
          ? "[&>*]:min-w-0 [&>*]:flex-1"
          : "[&>*]:w-full sm:[&>*]:w-auto sm:[&>*]:min-w-[180px]",
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

