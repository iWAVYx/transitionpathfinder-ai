import { cn } from "@/lib/utils";

/**
 * TransitionForward brand mark — the single reusable logo component.
 *
 * Assets are the approved production files served from `/brand/*`:
 *  - `transitionforward-app-icon.svg`  (authoritative vector, never redrawn)
 *  - `transitionforward-wordmark.png`  (light-background wordmark, 1320×220)
 *
 * Variants
 *  - `lockup` — icon + approved wordmark image, for light surfaces.
 *  - `icon`   — compact app icon only.
 *  - `dark`   — icon + accessible live text (Transition white / Forward teal),
 *               because the supplied wordmark image is light-background only.
 *
 * Accessibility: informative marks expose the accessible name
 * "TransitionForward". Pass `decorative` when adjacent text already provides
 * that name. Clear space is preserved by padding; the mark is never stretched.
 */

export type BrandLogoVariant = "lockup" | "icon" | "dark";
export type BrandLogoSize = "sm" | "md" | "lg";

const BRAND_NAME = "TransitionForward";

export const BRAND_ICON_SRC = "/brand/transitionforward-app-icon.svg";
export const BRAND_WORDMARK_SRC = "/brand/transitionforward-wordmark.png";

const ICON_SIZE: Record<BrandLogoSize, string> = {
  sm: "h-7 w-7",
  md: "h-9 w-9",
  lg: "h-11 w-11",
};

/** Wordmark keeps its native 6:1 aspect ratio — height only, width auto. */
const WORDMARK_SIZE: Record<BrandLogoSize, string> = {
  sm: "h-[14px]",
  md: "h-[18px]",
  lg: "h-[24px]",
};

const TEXT_SIZE: Record<BrandLogoSize, string> = {
  sm: "text-xl",
  md: "text-2xl",
  lg: "text-3xl",
};

export interface BrandLogoProps {
  variant?: BrandLogoVariant;
  size?: BrandLogoSize;
  /** True when adjacent text already names the brand. */
  decorative?: boolean;
  className?: string;
}

export function BrandLogo({
  variant = "lockup",
  size = "md",
  decorative = false,
  className,
}: BrandLogoProps) {
  const iconAlt = decorative || variant !== "icon" ? "" : BRAND_NAME;

  const icon = (
    <img
      src={BRAND_ICON_SRC}
      alt={iconAlt}
      {...(iconAlt ? {} : { "aria-hidden": true })}
      width={40}
      height={40}
      className={cn("shrink-0 object-contain", ICON_SIZE[size])}
      data-testid="brand-logo-icon"
    />
  );

  if (variant === "icon") {
    return (
      <span className={cn("inline-flex items-center p-0.5", className)} data-brand-logo="icon">
        {icon}
      </span>
    );
  }

  if (variant === "dark") {
    return (
      <span
        className={cn("inline-flex items-center gap-2 p-0.5", className)}
        data-brand-logo="dark"
        {...(decorative ? { "aria-hidden": true } : { role: "img", "aria-label": BRAND_NAME })}
      >
        {icon}
        <span
          aria-hidden
          className={cn(
            "font-brand font-semibold tracking-[var(--brand-tracking-wordmark)] text-brand-on-inverse",
            TEXT_SIZE[size],
          )}
        >
          Transition<span className="text-brand-teal">Forward</span>
        </span>
      </span>
    );
  }

  return (
    <span
      className={cn("inline-flex items-center gap-2 p-0.5", className)}
      data-brand-logo="lockup"
    >
      {icon}
      <img
        src={BRAND_WORDMARK_SRC}
        alt={decorative ? "" : BRAND_NAME}
        {...(decorative ? { "aria-hidden": true } : {})}
        width={1320}
        height={220}
        className={cn("w-auto max-w-full object-contain", WORDMARK_SIZE[size])}
        data-testid="brand-logo-wordmark"
      />
    </span>
  );
}

export default BrandLogo;
