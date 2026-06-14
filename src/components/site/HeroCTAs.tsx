import { type ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * HeroCTAs — wrapper that enforces symmetrical, equal-height CTA buttons
 * across hero sections. On mobile, children stack full-width with equal
 * spacing; on sm+ they sit inline with a consistent gap.
 *
 * Children are expected to be <Button>, <SmartLink>, or <a>/<Link>
 * elements. The wrapper applies sizing rules to direct children via a
 * Tailwind child selector so callers don't have to remember the classes.
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
        "flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4",
        align === "center" ? "sm:justify-center" : "sm:justify-start",
        // Equalize direct children: full width on mobile, min-width + h-11 on sm+
        "[&>*]:inline-flex [&>*]:w-full [&>*]:items-center [&>*]:justify-center",
        "[&>*]:h-11 [&>*]:min-h-11 [&>*]:px-5 [&>*]:rounded-full",
        "[&>*]:text-sm [&>*]:font-semibold [&>*]:whitespace-nowrap",
        "sm:[&>*]:w-auto sm:[&>*]:min-w-[180px]",
        className,
      )}
    >
      {children}
    </div>
  );
}
