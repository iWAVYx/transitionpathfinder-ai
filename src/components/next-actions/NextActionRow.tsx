import { Link } from "@tanstack/react-router";
import { CheckCircle2, ChevronRight, Clock, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { NextAction } from "@/lib/next-actions/types";
import { STATUS_LABEL, STATUS_CLASS } from "./status-badges";

interface Props {
  action: NextAction;
  onComplete?: (id: string) => void;
  completing?: boolean;
}

/**
 * A single interactive Next Action row.
 * - Title (Title Case)
 * - Reason
 * - Status badge + urgency
 * - Primary CTA (link) + optional secondary + Complete button
 */
export function NextActionRow({ action, onComplete, completing }: Props) {
  const overdue = action.urgency === "overdue";
  const dueSoon = action.urgency === "due_soon";
  return (
    <li
      className={cn(
        "group flex flex-col gap-3 rounded-xl border border-border/70 bg-card p-4 transition hover:border-border sm:flex-row sm:items-center sm:gap-4",
        overdue && "border-red-500/40",
      )}
      data-testid="next-action-row"
      data-kind={action.kind}
    >
      <div className="min-w-0 flex-1 space-y-1.5">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="font-display text-base font-medium tracking-tight text-foreground">
            {action.title}
          </h3>
          <span
            className={cn(
              "inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium",
              STATUS_CLASS[action.status],
            )}
          >
            {STATUS_LABEL[action.status]}
          </span>
          {action.dueLabel ? (
            <span
              className={cn(
                "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium",
                overdue
                  ? "bg-red-500/10 text-red-700 dark:text-red-300"
                  : dueSoon
                  ? "bg-orange-500/10 text-orange-700 dark:text-orange-300"
                  : "bg-muted text-muted-foreground",
              )}
            >
              {overdue ? (
                <AlertTriangle className="h-3 w-3" aria-hidden />
              ) : (
                <Clock className="h-3 w-3" aria-hidden />
              )}
              {action.dueLabel}
            </span>
          ) : null}
        </div>
        <p className="text-sm leading-relaxed text-muted-foreground">{action.reason}</p>
        <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
          Owner: {action.ownerLabel}
        </p>
      </div>

      <div className="flex shrink-0 flex-wrap items-center gap-2 sm:flex-nowrap">
        {action.secondaryLabel && action.secondaryRoute ? (
          <Button
            asChild
            type="button"
            variant="ghost"
            size="sm"
            aria-label={`${action.secondaryLabel} for ${action.title}`}
          >
            <Link to={action.secondaryRoute}>{action.secondaryLabel}</Link>
          </Button>
        ) : null}
        <Button
          asChild
          type="button"
          size="sm"
          variant={overdue ? "default" : "secondary"}
          aria-label={`${action.ctaLabel}: ${action.title}`}
        >
          <Link to={action.ctaRoute}>
            {action.ctaLabel}
            <ChevronRight className="ml-1 h-3.5 w-3.5" aria-hidden />
          </Link>
        </Button>
        {onComplete ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => onComplete(action.id)}
            disabled={completing}
            aria-label={`Mark ${action.title} as complete`}
          >
            <CheckCircle2 className="h-4 w-4" aria-hidden />
            <span className="sr-only">Complete</span>
          </Button>
        ) : null}
      </div>
    </li>
  );
}
