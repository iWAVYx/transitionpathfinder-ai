/**
 * PathwayReportBody — stage-grouped orchestrator for the Pathway Report.
 *
 * Consumes an already-rendered `sections` map keyed by
 * `PathwayReportSectionId` and lays them out under the nine
 * WORKSPACE_STAGES headers in canonical order. The report body finally
 * reads as the same nine-stage journey the workspace, dashboards, and
 * spine already speak in.
 *
 * Empty stages (no rendered sections after data-driven `null` returns)
 * are skipped entirely so the report and TOC agree on what's present.
 * Non-stage content (timeline, human review, appendix) is passed via
 * the `appendix` slot and rendered below the stage body under an
 * explicit "Appendix" heading.
 */
import type { ReactNode } from "react";
import { WORKSPACE_STAGES, type PathwayReportSectionId, REPORT_SECTION_LABELS } from "@/lib/workspace/stages";

/**
 * Node(s) already rendered for each report section. Multiple JSX
 * blocks may map to the same section (e.g. the primary meeting-prep
 * toolkit AND the fallback "Questions to Bring" list both belong to
 * `meeting_prep_questions`) — pass them as an array in that case.
 */
export type PathwayReportSections = Partial<
  Record<PathwayReportSectionId, ReactNode | ReactNode[]>
>;

export interface PathwayReportBodyProps {
  sections: PathwayReportSections;
  /** Non-stage content rendered under an Appendix heading. */
  appendix?: ReactNode;
}

/**
 * Anchor id for a stage header inside the report. Kept in sync with
 * PathwayReportSpine so external links can deep-link to a stage.
 */
export function reportStageAnchorId(stageId: string): string {
  return `stage-${stageId}`;
}

function isEmpty(node: ReactNode | ReactNode[] | undefined): boolean {
  if (node === undefined || node === null || node === false) return true;
  if (Array.isArray(node)) return node.every(isEmpty);
  return false;
}

export function PathwayReportBody({ sections, appendix }: PathwayReportBodyProps) {
  return (
    <div className="pathway-report-body">
      {WORKSPACE_STAGES.map((stage) => {
        const rendered = stage.reportSections
          .map((sectionId) => ({ sectionId, node: sections[sectionId] }))
          .filter(({ node }) => !isEmpty(node));

        if (rendered.length === 0) return null;

        return (
          <section
            key={stage.id}
            id={reportStageAnchorId(stage.id)}
            data-report-stage={stage.id}
            className="report-stage mt-12 page-break"
          >
            <header className="mb-6 border-t-2 border-primary/30 pt-6">
              <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-primary">
                Stage {stage.order} · {stage.label}
              </p>
              <h2 className="mt-2 font-display text-3xl tracking-tight sm:text-4xl">
                {stage.title}
              </h2>
              <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
                {stage.description}
              </p>
            </header>
            <div className="report-stage-sections space-y-6">
              {rendered.map(({ sectionId, node }) => (
                <div
                  key={sectionId}
                  data-report-section={sectionId}
                  aria-label={REPORT_SECTION_LABELS[sectionId]}
                >
                  {Array.isArray(node) ? node : node}
                </div>
              ))}
            </div>
          </section>
        );
      })}
      {appendix && (
        <section
          id="report-appendix"
          className="report-stage mt-14 page-break"
          aria-labelledby="report-appendix-heading"
        >
          <header className="mb-6 border-t-2 border-muted-foreground/20 pt-6">
            <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-muted-foreground">
              Appendix
            </p>
            <h2
              id="report-appendix-heading"
              className="mt-2 font-display text-3xl tracking-tight sm:text-4xl"
            >
              Supporting Notes
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
              Timeline, items flagged for human review, and other supporting
              material that sits alongside — not inside — the nine-stage
              journey.
            </p>
          </header>
          <div className="space-y-6">{appendix}</div>
        </section>
      )}
    </div>
  );
}
