import type { ReactNode } from "react";
import { toTitleCase } from "@/lib/title-case";

/** Equivalent recorded goal facts start evenly; callers supply only their own source fields. */
export function ReportGoalFact({ label, children }: { label: string; children: ReactNode }) {
  return <div data-report-goal-fact data-report-labeled-field className="min-w-0">
    <p data-document-subheading className="text-xs font-semibold text-foreground">{toTitleCase(label)}</p>
    <p className="text-sm text-foreground/80">{children}</p>
  </div>;
}
