/**
 * PathwayReportLayout — wraps the existing ReportView (and v2 sections)
 * with the workspace-bound PathwayReportSpine sidebar plus a compact
 * horizontal stage-progress rail that highlights the reader's current
 * stage as they scroll.
 *
 * Non-invasive: injects `id="section-<id>"` alias anchors next to the
 * legacy `id="sec-*"` blocks so the spine and any external link keep a
 * stable anchor contract, and observes the stage-grouped body emitted
 * by PathwayReportBody for scroll-driven stage highlighting.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import {
  PathwayReportSpine,
  reportSectionAnchorId,
} from "./PathwayReportSpine";
import { PathwayReportStageProgress } from "./PathwayReportStageProgress";
import { WORKSPACE_STAGES, type PathwayReportSectionId, type StageId } from "@/lib/workspace/stages";

/**
 * Legacy `sec-*` id → new `PathwayReportSectionId` mapping. Multiple
 * legacy ids may map to the same section (e.g. sec-student-voice AND
 * sec-your-voice both surface the student's voice); the first one found
 * in the DOM wins for scroll-spy purposes.
 */
const LEGACY_TO_SECTION: Record<string, PathwayReportSectionId> = {
  "sec-snapshot": "student_snapshot",
  "sec-student-voice": "student_voice",
  "sec-your-voice": "student_voice",
  "sec-spin": "strengths_preferences_interests_needs",
  "sec-strengths": "strengths_preferences_interests_needs",
  "sec-family-plan": "family_action_plan",
  "sec-meeting-prep": "meeting_prep_questions",
  "sec-iep-translator": "iep_transition_translator",
  "sec-data-gaps": "data_gaps",
  "sec-readiness": "readiness_scorecard",
  "sec-self-advocacy-readiness": "readiness_scorecard",
  "sec-independent-living-readiness": "readiness_scorecard",
  "sec-goals": "postsecondary_goals",
  "sec-pathways": "recommended_pathways",
  "sec-careers": "career_life_matches",
  "sec-education": "recommended_pathways",
  "sec-life-skills": "next_steps_30_90_180_365",
  "sec-thirty-day": "next_steps_30_90_180_365",
  "sec-role-next-steps": "next_steps_30_90_180_365",
  "sec-opportunities": "recommended_resources",
  "sec-partner-suggestions": "partner_matches",
};

const STAGE_ORDER: readonly string[] = WORKSPACE_STAGES.map((s) => s.id satisfies StageId);

export interface PathwayReportLayoutProps {
  children: React.ReactNode;
}

export function PathwayReportLayout({ children }: PathwayReportLayoutProps) {
  const contentRef = useRef<HTMLDivElement>(null);
  const [present, setPresent] = useState<Set<PathwayReportSectionId>>(new Set());
  const [active, setActive] = useState<PathwayReportSectionId | null>(null);
  const [activeStage, setActiveStage] = useState<string | null>(null);
  const [completedStages, setCompletedStages] = useState<ReadonlySet<string>>(
    () => new Set<string>(),
  );
  const [presentStages, setPresentStages] = useState<ReadonlySet<string>>(
    () => new Set<string>(),
  );

  // After the report mounts, walk the DOM once, install alias anchors,
  // and record which sections we found.
  useEffect(() => {
    const root = contentRef.current;
    if (!root) return;

    const found = new Set<PathwayReportSectionId>();
    const anchors: Array<{ el: HTMLElement; section: PathwayReportSectionId }> = [];

    for (const [legacyId, section] of Object.entries(LEGACY_TO_SECTION)) {
      const el = root.querySelector<HTMLElement>(`#${CSS.escape(legacyId)}`);
      if (!el) continue;
      found.add(section);
      const aliasId = reportSectionAnchorId(section);
      if (!document.getElementById(aliasId)) {
        const alias = document.createElement("span");
        alias.id = aliasId;
        alias.setAttribute("aria-hidden", "true");
        alias.style.display = "block";
        alias.style.position = "relative";
        alias.style.top = "-6rem";
        alias.style.height = "0";
        el.parentNode?.insertBefore(alias, el);
      }
      anchors.push({ el, section });
    }
    setPresent(found);

    // Discover stage headers emitted by PathwayReportBody.
    const stageEls = Array.from(
      root.querySelectorAll<HTMLElement>("[data-report-stage]"),
    );
    const foundStages = new Set<string>(
      stageEls.map((el) => el.dataset.reportStage!).filter(Boolean),
    );
    setPresentStages(foundStages);

    const OFFSET = 140;

    const onScroll = () => {
      // Section-level scroll-spy (drives the spine subsection highlight).
      let currentSection: PathwayReportSectionId | null = null;
      for (const { el, section } of anchors) {
        const top = el.getBoundingClientRect().top;
        if (top - OFFSET <= 0) currentSection = section;
        else break;
      }
      setActive(currentSection);

      // Stage-level scroll-spy (drives the stage rail + spine circle).
      let currentStage: string | null = null;
      const completed = new Set<string>();
      for (const el of stageEls) {
        const id = el.dataset.reportStage;
        if (!id) continue;
        const top = el.getBoundingClientRect().top;
        if (top - OFFSET <= 0) {
          currentStage = id;
        } else {
          break;
        }
      }
      if (currentStage) {
        const currentIdx = STAGE_ORDER.indexOf(currentStage);
        for (let i = 0; i < currentIdx; i++) {
          if (foundStages.has(STAGE_ORDER[i])) completed.add(STAGE_ORDER[i]);
        }
      }
      setActiveStage(currentStage);
      setCompletedStages(completed);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [children]);

  const presentSectionsMemo = useMemo(
    () => (present.size > 0 ? present : undefined),
    [present],
  );

  return (
    <div className="mx-auto grid w-full max-w-[92rem] gap-6 px-3 pt-4 sm:gap-8 sm:px-6 sm:pt-6 lg:grid-cols-[16rem_minmax(0,1fr)] lg:px-8">
      <aside className="no-print hidden lg:block">
        <div className="sticky top-24">
          <PathwayReportSpine
            activeSectionId={active}
            activeStageId={activeStage}
            completedStageIds={completedStages}
            presentSections={presentSectionsMemo}
          />
        </div>
      </aside>
      <div ref={contentRef} className="min-w-0">
        <PathwayReportStageProgress
          activeStageId={activeStage}
          completedStageIds={completedStages}
          presentStageIds={presentStages.size > 0 ? presentStages : undefined}
        />
        {children}
      </div>
    </div>
  );
}
