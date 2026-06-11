import { cn } from "@/lib/utils";

/**
 * PageHeader — consistent title block across every page.
 *
 * Layout rules:
 *  - Title truncates on mobile (`min-w-0` + `truncate`) so long names don't
 *    push the action off-screen.
 *  - Action stacks BELOW the title under `sm`, sits to the right at `sm+`.
 *  - Optional eyebrow (small uppercase label) and description.
 *  - All spacing uses the project token system; never hand-rolled.
 */
export function PageHeader({
  title,
  description,
  eyebrow,
  action,
  className,
}: {
  title: React.ReactNode;
  description?: React.ReactNode;
  eyebrow?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <header
      className={cn(
        // Grid prevents text from clipping the action on tight widths.
        "grid grid-cols-[minmax(0,1fr)_auto] items-end gap-x-4 gap-y-3",
        // At sm+, flex-wrap looks more balanced and lets the action wrap below
        // the title on extra-narrow tablet portrait rather than truncating.
        "sm:flex sm:flex-wrap sm:items-end sm:justify-between",
        className,
      )}
    >
      <div className="col-span-2 min-w-0 sm:col-span-1">
        {eyebrow ? (
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">
            {eyebrow}
          </p>
        ) : null}
        <h1
          className={cn(
            "font-display font-medium tracking-tight",
            "text-2xl sm:text-3xl lg:text-4xl",
            eyebrow ? "mt-1.5" : "",
          )}
        >
          {title}
        </h1>
        {description ? (
          <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground sm:text-[15px]">
            {description}
          </p>
        ) : null}
      </div>
      {action ? (
        <div className="col-span-2 flex flex-wrap items-center gap-2 sm:col-span-1 sm:justify-end">
          {action}
        </div>
      ) : null}
    </header>
  );
}
