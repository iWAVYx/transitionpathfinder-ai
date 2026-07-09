/**
 * PathwayReportSpine — the workspace-bound Table of Contents for
 * /reports/$reportId (and the demo report).
 *
 * NOT a tile grid. Same connected-rail primitive as the workspace
 * StageSpine, so the Pathway Report visibly reads as the deliverable
 * of the nine-stage workspace journey.
 *
 * Each entry is a Pathway Report section grouped under its owning
 * workspace stage. Section anchor ids come from the shared stage
 * model (PathwayReportSectionId) — the report renderer MUST expose
 * matching `id="section-<id>"` anchors. This gives us a stable
 * contract for the per-section rewrite in the next slice.
 */
import {
  WORKSPACE_STAGES,
  REPORT_SECTION_LABELS,
  type PathwayReportSectionId,
  type WorkspaceStage,
} from "@/lib/workspace/stages";

export const REPORT_SECTION_ANCHOR_PREFIX = "section-";

export function reportSectionAnchorId(section: PathwayReportSectionId): string {
  return `${REPORT_SECTION_ANCHOR_PREFIX}${section}`;
}

export interface PathwayReportSpineProps {
  /** Optional — highlight the section currently in view (scroll-spy). */
  activeSectionId?: PathwayReportSectionId | null;
  /** Optional — narrow to stages that are actually present in this report. */
  presentSections?: ReadonlySet<PathwayReportSectionId>;
}

export function PathwayReportSpine({
  activeSectionId = null,
  presentSections,
}: PathwayReportSpineProps) {
  return (
    <nav
      aria-label="Pathway report sections"
      className="tfws-spine tfws-report-spine"
      data-testid="pathway-report-spine"
    >
      <p className="mb-4 text-[11px] font-semibold uppercase tracking-[0.28em] text-primary">
        Pathway Report
      </p>
      <ol className="relative m-0 list-none space-y-6 p-0">
        <span
          aria-hidden
          className="absolute left-[19px] top-2 bottom-2 w-px bg-border"
        />
        {WORKSPACE_STAGES.map((stage) => (
          <StageBlock
            key={stage.id}
            stage={stage}
            activeSectionId={activeSectionId}
            presentSections={presentSections}
          />
        ))}
      </ol>
    </nav>
  );
}

function StageBlock({
  stage,
  activeSectionId,
  presentSections,
}: {
  stage: WorkspaceStage;
  activeSectionId: PathwayReportSectionId | null;
  presentSections?: ReadonlySet<PathwayReportSectionId>;
}) {
  const sections = presentSections
    ? stage.reportSections.filter((s) => presentSections.has(s))
    : stage.reportSections;
  if (sections.length === 0) return null;

  return (
    <li className="relative">
      <div className="flex items-start gap-4">
        <span
          aria-hidden
          className="relative z-10 mt-0.5 grid h-10 w-10 shrink-0 place-items-center rounded-full border-2 border-border bg-background text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground"
        >
          {stage.order}
        </span>
        <div className="min-w-0 flex-1 pt-1.5">
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-primary">
            {stage.label}
          </p>
          <ul className="mt-2 space-y-1.5">
            {sections.map((section) => {
              const active = section === activeSectionId;
              return (
                <li key={section}>
                  <a
                    href={`#${reportSectionAnchorId(section)}`}
                    data-report-section={section}
                    data-state={active ? "current" : undefined}
                    aria-current={active ? "location" : undefined}
                    className="block rounded-md px-2 py-1 text-sm leading-snug text-foreground no-underline transition-colors hover:bg-muted/60 data-[state=current]:bg-muted data-[state=current]:font-medium data-[state=current]:text-primary"
                  >
                    {REPORT_SECTION_LABELS[section]}
                  </a>
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </li>
  );
}
