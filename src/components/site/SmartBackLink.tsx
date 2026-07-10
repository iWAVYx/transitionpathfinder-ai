import { useRouter } from "@tanstack/react-router";
import { ArrowLeft, Loader2 } from "lucide-react";
import { useState } from "react";
import { SmartLink } from "./SmartLink";
import { cn } from "@/lib/utils";

/**
 * SmartBackLink — context-aware "Back" control.
 *
 * Behavior:
 *  - If the router has history beyond the current entry, go back.
 *  - Otherwise navigate to `fallbackTo` (a sensible page-specific default).
 *
 * Renders as an <a> so cmd/ctrl-click still opens the fallback in a new tab.
 * Shows a brief loading state while navigating so the user knows the click
 * registered, especially on slower connections.
 *
 * Optional `delayMs` + `onBeforeNavigate` let a parent run an exit animation
 * before the actual navigation (e.g. fading the Transition Workspace out on the
 * way back to the Demo Overview).
 */
export function SmartBackLink({
  fallbackTo,
  label = "Back",
  className,
  delayMs = 0,
  onBeforeNavigate,
}: {
  fallbackTo: string;
  label?: string;
  className?: string;
  /** Milliseconds to wait before performing the navigation. Useful when a parent
   *  needs to play an exit animation. */
  delayMs?: number;
  /** Called immediately on a valid click, before any navigation delay. */
  onBeforeNavigate?: () => void;
}) {
  const router = useRouter();
  const [isNavigating, setIsNavigating] = useState(false);

  const onClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    // Let modified clicks open in new tab using the fallback href.
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;

    setIsNavigating(true);
    onBeforeNavigate?.();

    const hasHistory =
      typeof window !== "undefined" && window.history.length > 1;

    const performNavigation = () => {
      if (hasHistory) {
        router.history.back();
      } else {
        router.navigate({ to: fallbackTo });
      }
    };

    if (delayMs > 0) {
      // Give the parent time to render an exit animation before we unmount.
      e.preventDefault();
      setTimeout(performNavigation, delayMs);
      return;
    }

    if (hasHistory) {
      // Stop the link from navigating to the fallback; use history.back()
      // instead. Defer one frame so the spinner renders before unmount.
      e.preventDefault();
      requestAnimationFrame(() => router.history.back());
      return;
    }

    // No history and no delay: let the SmartLink fall back to `fallbackTo`
    // normally while the loading state gives immediate click feedback.
  };

  return (
    <SmartLink
      to={fallbackTo}
      onClick={onClick}
      aria-busy={isNavigating}
      aria-disabled={isNavigating}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground",
        isNavigating && "pointer-events-none opacity-80",
        className,
      )}
    >
      {isNavigating ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <ArrowLeft className="h-4 w-4" />
      )}
      {isNavigating ? "Returning..." : label}
    </SmartLink>
  );
}

