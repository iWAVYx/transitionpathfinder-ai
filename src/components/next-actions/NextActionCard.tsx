import { useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { ListChecks } from "lucide-react";
import { NextActionRow } from "./NextActionRow";
import { RecentlyCompletedStrip } from "./RecentlyCompletedStrip";
import { NextActionsEmptyState } from "./EmptyState";
import { sortNextActions, isActive } from "@/lib/next-actions/types";
import type { NextAction } from "@/lib/next-actions/types";

interface Props {
  actions: NextAction[];
  recentlyCompleted?: NextAction[];
  /** Route for full activity history / all actions. */
  historyRoute?: string;
  /** Optional route for empty-state "next thing to try" CTA. */
  suggestionLabel?: string;
  suggestionRoute?: string;
  title?: string;
  eyebrow?: string;
  description?: string;
  defaultLimit?: number;
  onComplete?: (id: string) => void;
  completingId?: string | null;
}

/**
 * Shared, role-agnostic Next Action section rendered on every dashboard
 * and demo/workspace preview. Replaces the static NextStepsTimeline.
 */
export function NextActionCard({
  actions,
  recentlyCompleted = [],
  historyRoute,
  suggestionLabel,
  suggestionRoute,
  title = "Your Next Actions",
  eyebrow = "What Needs Attention",
  description = "Ranked by urgency. Complete an item to move it to activity history.",
  defaultLimit = 5,
  onComplete,
  completingId,
}: Props) {
  const [expanded, setExpanded] = useState(false);
  const active = useMemo(
    () => sortNextActions(actions.filter(isActive)),
    [actions],
  );
  const visible = expanded ? active : active.slice(0, defaultLimit);
  const hidden = active.length - visible.length;

  return (
    <section
      aria-labelledby="next-actions-title"
      className="mt-6 rounded-2xl border border-border/70 bg-card/60 p-5 shadow-sm sm:p-6"
      data-testid="next-actions"
    >
      <header className="flex flex-wrap items-start justify-between gap-3 border-b border-border/60 pb-4">
        <div className="min-w-0">
          <p className="tf-eyebrow">{eyebrow}</p>
          <h2
            id="next-actions-title"
            className="mt-1 flex items-center gap-2 font-display text-2xl font-medium tracking-tight"
          >
            <ListChecks className="h-5 w-5 text-primary" aria-hidden />
            {title}
          </h2>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            {description}
          </p>
        </div>
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <span
            className="inline-flex items-center rounded-full bg-primary/10 px-2 py-0.5 font-medium text-primary"
            aria-label={`${active.length} active`}
          >
            {active.length} Active
          </span>
          {historyRoute ? (
            <Link
              to={historyRoute}
              className="font-medium text-primary underline-offset-2 hover:underline"
              aria-label="Open activity history"
            >
              Activity History
            </Link>
          ) : null}
        </div>
      </header>

      {active.length === 0 ? (
        <NextActionsEmptyState
          suggestionLabel={suggestionLabel}
          suggestionRoute={suggestionRoute}
        />
      ) : (
        <>
          <ul className="mt-4 space-y-3">
            {visible.map((a) => (
              <NextActionRow
                key={a.id}
                action={a}
                onComplete={onComplete}
                completing={completingId === a.id}
              />
            ))}
          </ul>
          {hidden > 0 ? (
            <div className="mt-3 flex justify-end">
              <button
                type="button"
                onClick={() => setExpanded(true)}
                className="text-xs font-medium text-primary underline-offset-2 hover:underline"
                aria-label={`Show ${hidden} more next actions`}
              >
                View All ({active.length})
              </button>
            </div>
          ) : null}
        </>
      )}

      <RecentlyCompletedStrip items={recentlyCompleted} historyRoute={historyRoute} />
    </section>
  );
}
