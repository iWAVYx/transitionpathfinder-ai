import { cn } from "@/lib/utils";

/**
 * PageContainer — the single source of truth for page horizontal padding and
 * max-width on all signed-in and signed-out pages.
 *
 * Spacing system (mobile → desktop):
 *  - Horizontal padding: 16 → 24 → 32 px
 *  - Vertical padding (default `py="lg"`): 24 → 32 → 40 px
 *  - Max-width: 7xl by default (override with `width="md|lg|xl|7xl|full"`)
 */
type Width = "md" | "lg" | "xl" | "7xl" | "full";
type Pad = "none" | "sm" | "md" | "lg";

const WIDTH: Record<Width, string> = {
  md: "max-w-3xl",
  lg: "max-w-5xl",
  xl: "max-w-6xl",
  "7xl": "max-w-7xl",
  full: "max-w-none",
};

const PAD: Record<Pad, string> = {
  none: "",
  sm: "py-4 sm:py-5 lg:py-6",
  md: "py-5 sm:py-6 lg:py-8",
  lg: "py-6 sm:py-8 lg:py-10",
};

export function PageContainer({
  children,
  className,
  width = "7xl",
  py = "lg",
}: {
  children: React.ReactNode;
  className?: string;
  width?: Width;
  py?: Pad;
}) {
  return (
    <div
      className={cn(
        "mx-auto w-full px-4 sm:px-6 lg:px-8",
        WIDTH[width],
        PAD[py],
        className,
      )}
    >
      {children}
    </div>
  );
}
