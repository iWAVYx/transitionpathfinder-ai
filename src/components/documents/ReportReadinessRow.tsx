import type { ReactNode } from "react";
import { Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

export const READINESS_LABELS: Record<string, string> = {
  emerging: "Emerging", developing: "Developing", progressing: "Progressing",
  ready: "Ready", approaching_independence: "Approaching Independence",
};

export function ReadinessBadge({ level, compact = false }: { level: string; compact?: boolean }) {
  const tone = level === "ready" ? "bg-primary/15 text-primary border-primary/30"
    : level === "progressing" || level === "approaching_independence" ? "bg-sky-soft/40 text-foreground border-border"
    : level === "developing" ? "bg-muted text-foreground border-border"
    : "bg-amber-100/60 text-amber-900 border-amber-300/60 dark:bg-amber-950/30 dark:text-amber-200";
  return <span data-report-readiness-level={level} className={cn("inline-flex shrink-0 whitespace-nowrap items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-medium", tone, compact ? "text-[11px]" : "")}>
    <Sparkles aria-hidden="true" className="h-3 w-3 shrink-0" />{READINESS_LABELS[level] ?? level}
  </span>;
}

/** A shared label/band row; evidence and actions are supplied only by the caller. */
export function ReportReadinessRow({ title, level, children }: { title: string; level: string; children?: ReactNode }) {
  return <div data-report-readiness-row data-report-detail-row className="border-b border-[color:var(--pub-rule-soft)] py-4">
    <div data-report-readiness-heading className="flex flex-wrap items-start justify-between gap-3">
      <h3 className="text-primary">{title}</h3><ReadinessBadge level={level} compact />
    </div>
    {children}
  </div>;
}
