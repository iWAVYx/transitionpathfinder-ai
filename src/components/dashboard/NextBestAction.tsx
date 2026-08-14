import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { ArrowRight, Sparkles, CheckCircle2, AlertCircle, RefreshCw } from "lucide-react";

import {
  getNextBestAction,
  type NextBestAction as NBA,
} from "@/lib/next-best-action.functions";
import { cn } from "@/lib/utils";

type Surface =
  | "family"
  | "student"
  | "educator"
  | "school_admin"
  | "district_admin"
  | "partner"
  | "admin";

export function NextBestAction({
  surface,
  className,
}: {
  surface: Surface;
  className?: string;
}) {
  const navigate = useNavigate();
  const fetchAction = useServerFn(getNextBestAction);
  const [action, setAction] = useState<NBA | null>(null);
  const [loading, setLoading] = useState(true);
  const [errored, setErrored] = useState(false);

  const load = useCallback(() => {
    let alive = true;
    setLoading(true);
    setErrored(false);
    fetchAction({ data: { surface } })
      .then((res) => {
        if (!alive) return;
        setAction(res);
      })
      .catch(() => {
        if (!alive) return;
        setAction(null);
        setErrored(true);
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [fetchAction, surface]);

  useEffect(() => load(), [load]);

  if (loading) {
    return (
      <section
        className={cn(
          "border-y border-border/70 bg-primary/[0.025] py-5 sm:py-6",
          className,
        )}
        aria-label="Next best step"
        aria-busy="true"
      >
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          Next Best Step
        </p>
        <h3 className="mt-1 font-display text-xl font-medium leading-snug tracking-tight">
          Finding your next best step…
        </h3>
        <div className="mt-3 h-4 w-2/3 animate-pulse rounded bg-muted" />
      </section>
    );
  }

  if (errored) {
    return (
      <section
        className={cn(
          "border-y border-amber-200 bg-amber-50/60 py-5 sm:py-6 dark:bg-amber-950/20",
          className,
        )}
        aria-label="Next best step"
      >
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          Next Best Step
        </p>
        <h3 className="mt-1 font-display text-xl font-medium leading-snug tracking-tight">
          Couldn't load your next step
        </h3>
        <p className="mt-1.5 text-sm leading-relaxed text-foreground/75">
          Check your connection and try again. Your data is safe.
        </p>
        <button
          type="button"
          onClick={() => load()}
          className="mt-4 inline-flex items-center justify-center gap-2 rounded-full bg-amber-700 px-4 py-2 text-sm font-semibold text-white shadow-soft transition hover:bg-amber-800"
        >
          <RefreshCw className="h-4 w-4" />
          Try again
        </button>
      </section>
    );
  }

  if (!action) {
    return (
      <section
        className={cn(
          "border-y border-border/70 bg-primary/[0.025] py-5 sm:py-6",
          className,
        )}
        aria-label="Next best step"
      >
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          Next Best Step
        </p>
        <h3 className="mt-1 font-display text-xl font-medium leading-snug tracking-tight">
          You're all caught up
        </h3>
        <p className="mt-1.5 text-sm leading-relaxed text-foreground/75">
          No urgent next step right now. Keep moving your plan forward when you're ready.
        </p>
      </section>
    );
  }


  const Icon =
    action.tone === "success"
      ? CheckCircle2
      : action.tone === "warning"
        ? AlertCircle
        : Sparkles;

  const toneClasses =
    action.tone === "success"
      ? "border-emerald-200 bg-emerald-50/60 dark:bg-emerald-950/20"
      : action.tone === "warning"
        ? "border-amber-200 bg-amber-50/60 dark:bg-amber-950/20"
        : "border-primary/30 bg-gradient-hero";

  const iconTone =
    action.tone === "success"
      ? "text-emerald-700 dark:text-emerald-300"
      : action.tone === "warning"
        ? "text-amber-700 dark:text-amber-300"
        : "text-primary";

  return (
    <div
      className={cn(
        "border-y py-5 sm:py-6",
        toneClasses,
        className,
      )}
      role="region"
      aria-label="Next best step"
    >
      <div className="flex items-start gap-4">
        <div
          className={cn(
            "mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-background/80",
            iconTone,
          )}
        >
          <Icon className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            Next Best Step
          </p>
          <h3 className="mt-1 font-display text-xl font-medium leading-snug tracking-tight">
            {action.headline}
          </h3>
          <p className="mt-1.5 text-sm leading-relaxed text-foreground/75">
            {action.body}
          </p>
          {action.reason ? (
            <p className="mt-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
              {action.reason}
            </p>
          ) : null}
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => navigate({ to: action.ctaHref })}
              className={cn(
                "inline-flex items-center gap-2 rounded-md px-4 py-2 text-sm font-semibold transition hover:opacity-90",
                action.tone === "success"
                  ? "bg-emerald-600 text-white hover:bg-emerald-700"
                  : action.tone === "warning"
                    ? "bg-amber-700 text-white hover:bg-amber-800"
                    : "bg-primary text-primary-foreground",
              )}
            >
              {action.ctaLabel}
              <ArrowRight className="h-4 w-4" />
            </button>
            {action.secondaryHref && action.secondaryLabel ? (
              <button
                type="button"
                onClick={() => navigate({ to: action.secondaryHref! })}
                className="inline-flex items-center gap-1.5 rounded-full border border-foreground/15 bg-background/70 px-3.5 py-2 text-sm font-medium text-foreground/80 transition hover:bg-background"
              >
                {action.secondaryLabel}
              </button>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
