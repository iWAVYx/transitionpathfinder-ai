import { useRouter } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
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
 */
export function SmartBackLink({
  fallbackTo,
  label = "Back",
  className,
}: {
  fallbackTo: string;
  label?: string;
  className?: string;
}) {
  const router = useRouter();

  const onClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    // Let modified clicks open in new tab using the fallback href.
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
    const hasHistory =
      typeof window !== "undefined" && window.history.length > 1;
    if (hasHistory) {
      e.preventDefault();
      router.history.back();
    }
  };

  return (
    <SmartLink
      to={fallbackTo}
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground",
        className,
      )}
    >
      <ArrowLeft className="h-4 w-4" />
      {label}
    </SmartLink>
  );
}
