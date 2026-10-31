import type { ReactNode } from "react";

/** Shared balanced detail layout; callers retain their source-specific goal fields. */
export function ReportGoalDetails({ children }: { children: ReactNode }) {
  return <div data-report-goal-details className="grid gap-3 pb-2 sm:grid-cols-2">{children}</div>;
}
