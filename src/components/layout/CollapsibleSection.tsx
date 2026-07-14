import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * CollapsibleSection — wraps a section that should be collapsed by default on
 * mobile/tablet but always-open on desktop. Use for SECONDARY content (extra
 * tools, supplementary panels) — never for primary work or Next Best Action.
 *
 * Pure CSS-driven open state on `lg+` keeps the section always visible and
 * removes the toggle; under `lg`, a button shows/hides the children.
 */
export function CollapsibleSection({
  title,
  description,
  icon,
  defaultOpen = false,
  alwaysOpenAt = "lg",
  children,
  className,
}: {
  title: React.ReactNode;
  description?: React.ReactNode;
  icon?: React.ReactNode;
  defaultOpen?: boolean;
  alwaysOpenAt?: "md" | "lg";
  children: React.ReactNode;
  className?: string;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const breakpointHide =
    alwaysOpenAt === "md" ? "md:hidden" : "lg:hidden";
  const breakpointShow =
    alwaysOpenAt === "md" ? "md:block" : "lg:block";

  return (
    <section
      className={cn(
        "border-y border-border/70",
        className,
      )}
    >
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className={cn(
          "flex w-full items-center justify-between gap-3 py-3 text-left sm:px-2",
          // Hide the toggle at the always-open breakpoint and turn it into a static header.
          breakpointHide,
          "min-h-11",
        )}
      >
        <span className="flex min-w-0 items-center gap-2">
          {icon}
          <span className="flex min-w-0 flex-col">
            <span className="truncate text-sm font-medium">{title}</span>
            {description ? (
              <span className="truncate text-xs text-muted-foreground">
                {description}
              </span>
            ) : null}
          </span>
        </span>
        <ChevronDown
          className={cn(
            "h-4 w-4 shrink-0 text-muted-foreground transition-transform",
            open ? "rotate-180" : "",
          )}
        />
      </button>
      {/* Static header at always-open breakpoint */}
      <div className={cn("hidden border-b py-4 sm:px-2", breakpointShow)}>
        <div className="flex items-center gap-2">
          {icon}
          <h3 className="font-display text-base">{title}</h3>
        </div>
        {description ? (
          <p className="mt-0.5 text-sm text-muted-foreground">{description}</p>
        ) : null}
      </div>
      <div
        className={cn(
          // On mobile: only render when open. At breakpoint: always shown.
          open ? "block" : "hidden",
          breakpointShow,
          "pb-4 pt-2 sm:px-2 sm:pb-5",
        )}
      >
        {children}
      </div>
    </section>
  );
}
