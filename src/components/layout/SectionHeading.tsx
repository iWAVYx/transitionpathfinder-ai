import type { ReactNode } from "react";

/**
 * SectionHeading — consistent eyebrow + title + optional description used
 * across Demo, dashboards, report and intake. Fixed spacing so blocks
 * line up regardless of page.
 */
export function SectionHeading({
  eyebrow,
  index,
  title,
  description,
  align = "left",
  size = "default",
  actions,
  divider = false,
  className = "",
}: {
  eyebrow?: string;
  /** Optional numeric prefix like "01" that renders in the eyebrow row. */
  index?: string;
  title: ReactNode;
  description?: ReactNode;
  align?: "left" | "center";
  size?: "sm" | "default" | "lg";
  actions?: ReactNode;
  divider?: boolean;
  className?: string;
}) {
  const titleSize =
    size === "sm"
      ? "text-lg sm:text-xl"
      : size === "lg"
        ? "text-3xl sm:text-4xl"
        : "text-2xl sm:text-3xl";
  const wrap = align === "center" ? "text-center items-center" : "text-left items-start";
  return (
    <header
      className={`mb-6 flex flex-col gap-2 ${wrap} ${className}`.trim()}
    >
      {(eyebrow || index) && (
        <div className="flex items-center gap-2">
          {index && (
            <span className="font-mono text-[11px] font-semibold tracking-[0.22em] text-primary">
              {index}
            </span>
          )}
          {eyebrow && (
            <span className="text-[11px] font-semibold uppercase tracking-[0.22em] text-primary/80">
              {eyebrow}
            </span>
          )}
        </div>
      )}
      <div
        className={`flex w-full flex-wrap items-end justify-between gap-3 ${
          align === "center" ? "justify-center" : ""
        }`}
      >
        <h2
          className={`font-display font-medium tracking-tight text-foreground ${titleSize}`}
        >
          {title}
        </h2>
        {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
      </div>
      {description && (
        <p
          className={`max-w-2xl text-sm leading-relaxed text-muted-foreground ${
            align === "center" ? "mx-auto" : ""
          }`}
        >
          {description}
        </p>
      )}
      {divider && <div className="mt-2 h-px w-full bg-border" aria-hidden />}
    </header>
  );
}
