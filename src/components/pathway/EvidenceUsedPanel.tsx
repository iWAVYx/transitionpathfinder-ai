import { CheckCircle2, CircleDashed, FileSearch } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { REPORT_SECTION_LABELS } from "@/lib/report-evidence/types";
import type { ReportSectionId } from "@/lib/hubs/registry";
import type { EvidenceUsedSummary } from "@/lib/pathway-evidence";

/**
 * Read-only side panel that shows which report sections were grounded in
 * evidence when the latest version was generated, and which are still
 * missing. Rendered on the Pathway Report page only — not a dashboard tile.
 */
export function EvidenceUsedPanel({
  summary,
  weakSummaryFlag,
}: {
  summary: EvidenceUsedSummary | null | undefined;
  weakSummaryFlag?: boolean;
}) {
  if (!summary) {
    return (
      <aside
        aria-label="Evidence used in this report"
        className="rounded-2xl border bg-card p-4 text-sm shadow-soft"
      >
        <header className="flex items-center gap-2 text-muted-foreground">
          <FileSearch className="h-4 w-4" />
          <span className="font-medium">Evidence used</span>
        </header>
        <p className="mt-2 text-xs text-muted-foreground">
          Regenerate this report to see which sections are backed by uploaded
          documents, intake answers, and meeting notes.
        </p>
      </aside>
    );
  }

  const covered = summary.covered_sections;
  const missing = summary.missing_sections;

  return (
    <aside
      aria-label="Evidence used in this report"
      className="rounded-2xl border bg-card p-4 text-sm shadow-soft"
    >
      <header className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <FileSearch className="h-4 w-4 text-primary" />
          <span className="font-medium">Evidence used</span>
        </div>
        <Badge variant="secondary" className="text-[11px]">
          {summary.total} link{summary.total === 1 ? "" : "s"}
        </Badge>
      </header>

      {weakSummaryFlag && (
        <p className="mt-2 rounded-md border border-amber-300/60 bg-amber-50 px-2 py-1 text-[11px] text-amber-900 dark:bg-amber-950/40 dark:text-amber-200">
          Some summaries looked thin. Add more evidence and regenerate for
          stronger grounding.
        </p>
      )}

      <section className="mt-3">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          Covered ({covered.length})
        </p>
        {covered.length === 0 ? (
          <p className="mt-1 text-xs text-muted-foreground">
            No sections backed by evidence yet.
          </p>
        ) : (
          <ul className="mt-1 space-y-1">
            {covered.map((s) => {
              const label =
                REPORT_SECTION_LABELS[s as ReportSectionId] ?? s;
              const count = summary.by_section[s]?.count ?? 0;
              return (
                <li
                  key={s}
                  className="flex items-center justify-between gap-2 text-xs"
                >
                  <span className="flex items-center gap-1.5">
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                    {label}
                  </span>
                  <span className="text-muted-foreground">{count}</span>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {missing.length > 0 && (
        <section className="mt-4">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Missing ({missing.length})
          </p>
          <ul className="mt-1 flex flex-wrap gap-1.5">
            {missing.map((s) => {
              const label =
                REPORT_SECTION_LABELS[s as ReportSectionId] ?? s;
              return (
                <li key={s}>
                  <Badge
                    variant="outline"
                    className="gap-1 text-[10px] text-muted-foreground"
                  >
                    <CircleDashed className="h-3 w-3" />
                    {label}
                  </Badge>
                </li>
              );
            })}
          </ul>
          <p className="mt-2 text-[11px] text-muted-foreground">
            Add evidence on the Documents, Intake, or Meetings page and press
            "Extract evidence" to fill these in.
          </p>
        </section>
      )}
    </aside>
  );
}
