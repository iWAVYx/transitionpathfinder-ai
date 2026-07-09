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
  /** Optional — highlight the stage currently in view (scroll-spy). */
  activeStageId?: string | null;
  /** Stages the reader has already scrolled past. */
  completedStageIds?: ReadonlySet<string>;
  /** Optional — narrow to stages that are actually present in this report. */
  presentSections?: ReadonlySet<PathwayReportSectionId>;
}

export function PathwayReportSpine({
  activeSectionId = null,
  activeStageId = null,
  completedStageIds,
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
            activeStageId={activeStageId}
            completedStageIds={completedStageIds}
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
  activeStageId,
  completedStageIds,
  presentSections,
}: {
  stage: WorkspaceStage;
  activeSectionId: PathwayReportSectionId | null;
  activeStageId: string | null;
  completedStageIds?: ReadonlySet<string>;
  presentSections?: ReadonlySet<PathwayReportSectionId>;
}) {
  const sections = presentSections
    ? stage.reportSections.filter((s) => presentSections.has(s))
    : stage.reportSections;
  if (sections.length === 0) return null;

  const isActive = stage.id === activeStageId;
  const isComplete = completedStageIds?.has(stage.id) ?? false;
  const state = isActive ? "current" : isComplete ? "complete" : "upcoming";

  return (
    <li className="relative" data-report-stage-item={stage.id} data-state={state}>
      <div className="flex items-start gap-4">
        <a
          href={`#stage-${stage.id}`}
          aria-current={isActive ? "step" : undefined}
          aria-label={`Stage ${stage.order}, ${stage.title}`}
          className="relative z-10 mt-0.5 grid h-10 w-10 shrink-0 place-items-center rounded-full border-2 text-[11px] font-semibold uppercase tracking-[0.16em] no-underline transition-colors border-border bg-background text-muted-foreground data-[state=complete]:border-primary/50 data-[state=complete]:bg-primary/10 data-[state=complete]:text-primary data-[state=current]:border-primary data-[state=current]:bg-primary data-[state=current]:text-primary-foreground data-[state=current]:shadow-[0_0_0_4px_hsl(var(--primary)/0.15)]"
          data-state={state}
        >
          {stage.order}
        </a>
        <div className="min-w-0 flex-1 pt-1.5">
          <p
            className="text-[11px] font-semibold uppercase tracking-[0.22em] text-muted-foreground data-[state=current]:text-primary data-[state=complete]:text-foreground/80"
            data-state={state}
          >
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

