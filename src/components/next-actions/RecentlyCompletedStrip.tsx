import { CheckCircle2 } from "lucide-react";
import type { NextAction } from "@/lib/next-actions/types";

export function RecentlyCompletedStrip({
  items,
  historyRoute: _historyRoute,
}: {
  items: NextAction[];
  /**
   * Retained for API compatibility with existing call sites, but the strip
   * no longer renders its own "View Activity History" link — the parent
   * `NextActionCard` header already links to the same href, and rendering
   * both produced duplicate-href warnings inside `<main>` (dashboard
   * regression test). The recently-completed list itself still renders.
   */
  historyRoute?: string;
}) {
  if (!items.length) return null;
  return (
    <div
      className="mt-4 rounded-xl border border-dashed border-border/60 bg-muted/30 p-3"
      data-testid="recently-completed-strip"
    >
      <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
        Recently Completed
      </p>
      <ul className="mt-2 space-y-1.5">
        {items.slice(0, 3).map((a) => (
          <li
            key={a.id}
            className="flex items-start gap-2 text-xs text-muted-foreground"
          >
            <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-600" aria-hidden />
            <span className="text-foreground/90">{a.title}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
