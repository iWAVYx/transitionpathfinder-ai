import { ArrowRight } from "lucide-react";

import { ROLE_VALUE, type AppRole } from "@/lib/value-lens";
import { cn } from "@/lib/utils";

interface Props {
  role: AppRole;
  /** Optional override headline — defaults to the role's standard one-liner. */
  headline?: string;
  /** Optional override next-action — defaults to the role's standard CTA. */
  nextAction?: string;
  className?: string;
}

/**
 * One-line "why this page matters to you" strip pinned at the top of every
 * dashboard and demo step. Keeps the product-value test visible.
 */
export function RoleValueStrip({ role, headline, nextAction, className }: Props) {
  const v = ROLE_VALUE[role];
  return (
    <div
      className={cn(
        "flex flex-wrap items-start gap-3 rounded-2xl border border-primary/20 bg-gradient-to-r from-primary/[0.06] to-transparent px-4 py-3 text-sm sm:px-5",
        className,
      )}
    >
      <div className="min-w-0 flex-1">
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">
          Why This Page Matters
        </p>
        <p className="mt-0.5 text-foreground/90">{headline ?? v.headline}</p>
      </div>
      <div className="flex items-center gap-1.5 rounded-full bg-background/70 px-3 py-1.5 text-xs text-foreground/80">
        <ArrowRight className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
        <span>{nextAction ?? v.nextAction}</span>
      </div>
    </div>
  );
}
