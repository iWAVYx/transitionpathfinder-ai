import { Link } from "@tanstack/react-router";
import { CheckCircle2 } from "lucide-react";
import type { NextAction } from "@/lib/next-actions/types";

export function RecentlyCompletedStrip({
  items,
  historyRoute,
}: {
  items: NextAction[];
  historyRoute?: string;
}) {
  if (!items.length) return null;
  return (
    <div
      className="mt-4 rounded-xl border border-dashed border-border/60 bg-muted/30 p-3"
      data-testid="recently-completed-strip"
    >
      <div className="flex items-center justify-between gap-2">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          Recently Completed
        </p>
        {historyRoute ? (
          <Link
            to={historyRoute}
            className="text-xs font-medium text-primary underline-offset-2 hover:underline"
          >
            View Activity History
          </Link>
        ) : null}
      </div>
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
