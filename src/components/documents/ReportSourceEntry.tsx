import type { ReactNode } from "react";

/** Record labels stay verbatim; metadata and optional explanation are separate readable rows. */
export function ReportSourceEntry({ title, details, children }: { title: string; details: string; children?: ReactNode }) {
  return <div data-report-source-entry className="border-b border-[color:var(--pub-rule-soft)] py-3">
    <p data-report-source-title className="text-sm font-medium text-foreground/90">{title}</p>
    <p data-report-source-metadata className="text-xs text-muted-foreground">{details}</p>
    {children && <p data-report-source-summary className="mt-2 text-sm">{children}</p>}
  </div>;
}
