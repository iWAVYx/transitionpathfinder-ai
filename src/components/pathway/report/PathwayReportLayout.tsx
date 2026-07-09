/**
 * PathwayReportLayout — wraps the existing ReportView (and v2 sections)
 * with the workspace-bound PathwayReportSpine sidebar.
 *
 * This is intentionally non-invasive: rather than rewriting the 2704-line
 * ReportView renderer, we inject `id="section-<id>"` alias anchors as
 * siblings just before each legacy `id="sec-*"` block after mount. That
 * gives the spine and any external link a stable anchor contract
 * (documented on PathwayReportSpine) while the deeper per-section rewrite
 * lands slice-by-slice.
 *
 * Also runs a lightweight scroll-spy to light up the current section in
 * the spine, and derives `presentSections` from which legacy anchors are
 * actually in the DOM — so the spine only lists sections the renderer
 * currently emits.
 */
import { useEffect, useRef, useState } from "react";
import {
  PathwayReportSpine,
  reportSectionAnchorId,
} from "./PathwayReportSpine";
import type { PathwayReportSectionId } from "@/lib/workspace/stages";

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

export interface PathwayReportLayoutProps {
  children: React.ReactNode;
}

export function PathwayReportLayout({ children }: PathwayReportLayoutProps) {
  const contentRef = useRef<HTMLDivElement>(null);
  const [present, setPresent] = useState<Set<PathwayReportSectionId>>(new Set());
  const [active, setActive] = useState<PathwayReportSectionId | null>(null);

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

    if (anchors.length === 0) return;

    // Scroll-spy: pick the topmost section whose anchor has crossed the
    // viewport's top edge (with a small offset for sticky headers).
    const OFFSET = 120;
    const onScroll = () => {
      let current: PathwayReportSectionId | null = null;
      for (const { el, section } of anchors) {
        const top = el.getBoundingClientRect().top;
        if (top - OFFSET <= 0) current = section;
        else break;
      }
      setActive(current);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [children]);

  return (
    <div className="mx-auto grid max-w-[92rem] gap-8 px-4 pt-6 sm:px-6 lg:grid-cols-[16rem_minmax(0,1fr)] lg:px-8">
      <aside className="no-print hidden lg:block">
        <div className="sticky top-24">
          <PathwayReportSpine
            activeSectionId={active}
            presentSections={present.size > 0 ? present : undefined}
          />
        </div>
      </aside>
      <div ref={contentRef} className="min-w-0">
        {children}
      </div>
    </div>
  );
}
