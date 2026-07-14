import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

/**
 * Pill — the single shared status/tag/chip primitive used across every
 * signed-in role dashboard (Student, Family, Educator, School Admin,
 * District Admin, Partner, Platform Admin) and the demo previews that
 * mirror them.
 *
 * Every pill has the same height, padding, radius, font size, and
 * uppercase weight so rows of tags line up cleanly across tiles.
 * Use the `tone` prop for the semantic color; use the `size` prop only
 * when a denser row is needed (e.g. inline metadata chips).
 */
const pillVariants = cva(
  "inline-flex shrink-0 items-center rounded-full font-semibold uppercase tracking-wider leading-none ring-1 whitespace-nowrap",
  {
    variants: {
      tone: {
        default: "bg-primary/10 text-primary ring-primary/20",
        success:
          "bg-emerald-500/10 text-emerald-700 ring-emerald-500/20 dark:text-emerald-300",
        warning:
          "bg-amber-500/10 text-amber-700 ring-amber-500/20 dark:text-amber-300",
        critical: "bg-destructive/10 text-destructive ring-destructive/20",
        muted: "bg-muted text-muted-foreground ring-border",
        outline: "bg-transparent text-foreground ring-border",
      },
      size: {
        sm: "h-5 px-2 text-[10px]",
        md: "h-6 px-2.5 text-[11px]",
        lg: "h-7 px-3 text-xs",
      },
    },
    defaultVariants: {
      tone: "default",
      size: "md",
    },
  },
);

export type PillTone = NonNullable<VariantProps<typeof pillVariants>["tone"]>;
export type PillSize = NonNullable<VariantProps<typeof pillVariants>["size"]>;

export interface PillProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof pillVariants> {}

export const Pill = React.forwardRef<HTMLSpanElement, PillProps>(
  ({ className, tone, size, ...props }, ref) => (
    <span
      ref={ref}
      className={cn(pillVariants({ tone, size }), className)}
      {...props}
    />
  ),
);
Pill.displayName = "Pill";

export { pillVariants };
