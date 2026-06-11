import { cn } from "@/lib/utils";

/**
 * Section — semantic <section> with a consistent header pattern and vertical
 * rhythm. Use this instead of hand-rolling section headings so spacing is
 * uniform across every page.
 *
 * - Top spacing controlled by parent's `space-y-6 sm:space-y-8`.
 * - Heading row spacing is normalized (gap + alignment same everywhere).
 */
export function Section({
  title,
  description,
  action,
  children,
  className,
  contentClassName,
  level = 2,
}: {
  title?: React.ReactNode;
  description?: React.ReactNode;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  contentClassName?: string;
  level?: 2 | 3;
}) {
  const Heading = (level === 3 ? "h3" : "h2") as "h2" | "h3";
  const hasHeader = title || description || action;
  return (
    <section className={cn("space-y-3 sm:space-y-4", className)}>
      {hasHeader ? (
        <div className="flex flex-wrap items-end justify-between gap-x-4 gap-y-1">
          <div className="min-w-0">
            {title ? (
              <Heading
                className={cn(
                  "font-display font-medium tracking-tight",
                  level === 3 ? "text-base sm:text-lg" : "text-lg sm:text-xl",
                )}
              >
                {title}
              </Heading>
            ) : null}
            {description ? (
              <p className="mt-0.5 text-sm text-muted-foreground">{description}</p>
            ) : null}
          </div>
          {action ? <div className="shrink-0">{action}</div> : null}
        </div>
      ) : null}
      <div className={contentClassName}>{children}</div>
    </section>
  );
}
