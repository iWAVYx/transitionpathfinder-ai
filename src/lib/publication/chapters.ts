/**
 * Canonical Pathway Spine — the eight milestones that thread every page of
 * the Demo Workspace and the signed-in Pathway Report. Each milestone is a
 * stage in turning scattered inputs into a clear pathway forward:
 *
 *   Intake → Voice → Family → Educator → Documents → Readiness → Pathway → Plan
 *
 * Used by:
 *   - PathwaySpine (visual rail in the reader chrome)
 *   - MagazineReader (demo workspace)
 *   - ReportChapterPager (signed-in / demo report)
 *
 * Order is meaningful: it represents the planning flow the user is walking
 * through. The spine fills up to (and including) the node matching the
 * current chapter so the reader can see "where I am in the pathway."
 */

export type PathwayMilestoneId =
  | "intake"
  | "voice"
  | "family"
  | "educator"
  | "documents"
  | "readiness"
  | "pathway"
  | "plan";

export interface PathwayMilestone {
  id: PathwayMilestoneId;
  /** Stage label as it appears on the spine. Title Case. */
  label: string;
  /** One-line contribution shown on hover/tap. Sentence case. */
  contribution: string;
}

export const PATHWAY_SPINE: readonly PathwayMilestone[] = [
  { id: "intake",     label: "Intake",     contribution: "The starting point — who the student is today." },
  { id: "voice",      label: "Voice",      contribution: "Direction and preferences in the student's own words." },
  { id: "family",     label: "Family",     contribution: "Hopes, concerns and the questions families bring." },
  { id: "educator",   label: "Educator",   contribution: "Classroom observations and case-manager insight." },
  { id: "documents",  label: "Documents",  contribution: "IEPs, evaluations and 504s turned into evidence." },
  { id: "readiness",  label: "Readiness",  contribution: "Strengths and growth areas across transition domains." },
  { id: "pathway",    label: "Pathway",    contribution: "The recommended direction, grounded in the evidence." },
  { id: "plan",       label: "Plan",       contribution: "30 / 60 / 90 days of named, doable next steps." },
] as const;

/**
 * Map a demo chapter id (MagazinePageId) to the spine milestone it
 * contributes to. Several demo chapters share a milestone (e.g. opportunities
 * and resources both sit under "pathway") because they are different cuts of
 * the same stage of the pathway story.
 */
export const DEMO_CHAPTER_TO_MILESTONE: Record<string, PathwayMilestoneId> = {
  cover: "intake",
  intake: "intake",
  voice: "voice",
  documents: "documents",
  report: "readiness",
  opportunities: "pathway",
  resources: "pathway",
  meeting: "plan",
  calendar: "plan",
  plan: "plan",
  hub: "plan",
  next: "plan",
};

/**
 * Map a signed-in report section anchor (`id="sec-*"`) to the spine
 * milestone it advances. Used by ReportChapterPager so the spine moves as
 * the reader scrolls the report.
 */
export const REPORT_SECTION_TO_MILESTONE: Record<string, PathwayMilestoneId> = {
  "sec-snapshot":         "intake",
  "sec-spin":             "readiness",
  "sec-readiness":        "readiness",
  "sec-pathways":         "pathway",
  "sec-careers":          "pathway",
  "sec-goals":            "pathway",
  "sec-iep-translator":   "documents",
  "sec-student-voice":    "voice",
  "sec-family-plan":      "family",
  "sec-meeting-prep":     "educator",
  "sec-opportunities":    "pathway",
  "sec-thirty-day":       "plan",
};

export function milestoneIndex(id: PathwayMilestoneId): number {
  return PATHWAY_SPINE.findIndex((m) => m.id === id);
}
