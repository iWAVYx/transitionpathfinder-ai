import type { ReactNode } from "react";

/**
 * PageSection — shared vertical rhythm + max width + gutter for every page
 * section. Prefer this over ad-hoc `mx-auto max-w-* px-* py-*` blocks so
 * the Demo, dashboards, report and intake all share the same spacing.
 *
 * Rhythm: 40/56/64 vertical, 16/24/32 gutter.
 */
export function PageSection({
  children,
  as: Tag = "section",
  size = "default",
  spacing = "default",
  className = "",
  id,
  ariaLabel,
}: {
  children: ReactNode;
  as?: keyof React.JSX.IntrinsicElements;
  size?: "narrow" | "default" | "wide" | "full";
  spacing?: "tight" | "default" | "loose" | "none";
  className?: string;
  id?: string;
  ariaLabel?: string;
}) {
  const width =
    size === "narrow"
      ? "max-w-3xl"
      : size === "wide"
        ? "max-w-7xl"
        : size === "full"
          ? "max-w-none"
          : "max-w-6xl";
  const pad =
    spacing === "none"
      ? ""
      : spacing === "tight"
        ? "py-6 sm:py-8"
        : spacing === "loose"
          ? "py-14 sm:py-20"
          : "py-10 sm:py-14";
  const Component = Tag as any;
  return (
    <Component
      id={id}
      aria-label={ariaLabel}
      className={`mx-auto w-full ${width} px-4 sm:px-6 lg:px-8 ${pad} ${className}`.trim()}
    >
      {children}
    </Component>
  );
}
