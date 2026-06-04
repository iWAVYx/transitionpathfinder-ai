import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { ArrowRight, Sparkles, CheckCircle2, AlertCircle } from "lucide-react";

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
  const fetchAction = useServerFn(getNextBestAction);
  const [action, setAction] = useState<NBA | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    fetchAction({ data: { surface } })
      .then((res) => {
        if (alive) setAction(res);
      })
      .catch(() => {
        if (alive) setAction(null);
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [fetchAction, surface]);

  if (loading) {
    return (
      <div
        className={cn(
          "rounded-3xl border bg-card p-5 shadow-soft sm:p-6 animate-pulse",
          className,
        )}
      >
        <div className="h-3 w-24 rounded bg-muted" />
        <div className="mt-3 h-5 w-2/3 rounded bg-muted" />
        <div className="mt-2 h-4 w-full rounded bg-muted" />
      </div>
    );
  }

  if (!action) return null;

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
        "rounded-3xl border p-5 shadow-soft sm:p-6",
        toneClasses,
        className,
      )}
      role="region"
      aria-label="Next best action"
    >
      <div className="flex items-start gap-4">
        <div
          className={cn(
            "mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-background/80 shadow-soft",
            iconTone,
          )}
        >
          <Icon className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            Next best action
          </p>
          <h3 className="mt-1 font-display text-xl font-medium leading-snug tracking-tight">
            {action.headline}
          </h3>
          <p className="mt-1.5 text-sm leading-relaxed text-foreground/75">
            {action.body}
          </p>
          <div className="mt-4">
            <Link
              to={action.ctaHref}
              className={cn(
                "inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold shadow-soft transition hover:shadow-lift",
                action.tone === "success"
                  ? "bg-emerald-600 text-white hover:bg-emerald-700"
                  : action.tone === "warning"
                    ? "bg-amber-600 text-white hover:bg-amber-700"
                    : "bg-primary text-primary-foreground",
              )}
            >
              {action.ctaLabel}
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
