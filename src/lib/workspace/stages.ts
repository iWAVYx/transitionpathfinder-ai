/**
 * Transition Workspace — Shared Stage Model
 *
 * SINGLE SOURCE OF TRUTH for the nine-stage transition journey.
 *
 * Everything downstream MUST import from this file:
 *   - Workspace navigation (StageSpine, StagePrevNext, StageProgress)
 *   - Public demo workspace routing
 *   - Pathway Report table of contents + section binding
 *   - Role dashboard "next best step" widgets
 *   - Marketing/framework pages describing the journey
 *
 * DO NOT create parallel stage lists elsewhere. If a surface needs a
 * different slice (e.g. BridgeForward-only), filter this list — don't
 * fork it. The unit test at tests/unit/workspace-stages.test.ts enforces
 * that every stage points at a real route and every report section id
 * used by the report renderer maps back to a stage.
 *
 * Style rules (from the product prompt):
 *   - `label` is intentionally ONE all-caps word (START, VOICE, ...)
 *   - `title` is Title Case for headings and TOC
 *   - `description` is sentence case narrative copy
 */

import type { RoleAudience } from "@/lib/role-policy";

/** Nine canonical stages, in journey order. */
export type StageId =
  | "start"
  | "voice"
  | "family"
  | "school"
  | "evidence"
  | "ready"
  | "roadmap"
  | "action"
  | "connect";

/** Grade bands the stage applies to. */
export type StageGradeBand = "bridgeforward" | "transitionforward";

/**
 * A Pathway Report section rendered on `/reports/$reportId`. Every
 * section id used by the report renderer MUST appear on exactly one
 * stage — that's what keeps the report TOC in sync with the workspace
 * navigation.
 */
export type PathwayReportSectionId =
  // START
  | "student_snapshot"
  // VOICE
  | "student_voice"
  | "strengths_preferences_interests_needs"
  // FAMILY
  | "family_action_plan"
  | "meeting_prep_questions"
  // SCHOOL
  | "educator_action_plan"
  | "iep_transition_translator"
  // EVIDENCE
  | "data_gaps"
  // READY
  | "readiness_scorecard"
  // ROADMAP
  | "postsecondary_goals"
  | "recommended_pathways"
  | "career_life_matches"
  // ACTION
  | "next_steps_30_90_180_365"
  // CONNECT
  | "recommended_resources"
  | "partner_matches";

export interface WorkspaceStage {
  id: StageId;
  /** ONE all-caps word — intentional. */
  label: string;
  /** Title Case heading. */
  title: string;
  /** Sentence case narrative. */
  description: string;
  /** Position in the journey, 1-indexed. */
  order: number;
  /**
   * Signed-in route that hosts this stage's workspace surface. Must
   * exist under src/routes/_authenticated/. Verified by the unit test.
   */
  signedInRoute: string;
  /**
   * Public demo route showing this stage with fictional data. Must
   * exist under src/routes/. Verified by the unit test.
   */
  demoRoute: string;
  /**
   * Which audiences see this stage in their workspace. Partners are
   * intentionally excluded from every stage that touches private
   * student planning data.
   */
  audiences: RoleAudience[];
  /**
   * Which grade bands surface this stage. Every stage applies to both
   * bands today; kept explicit so BridgeForward-only or TF-only stages
   * can be added later without another list.
   */
  gradeBands: StageGradeBand[];
  /**
   * Pathway Report sections rendered under this stage. Order here is
   * the render order inside the report.
   */
  reportSections: PathwayReportSectionId[];
}

export const WORKSPACE_STAGES: readonly WorkspaceStage[] = [
  {
    id: "start",
    label: "START",
    title: "Getting Started",
    description:
      "Set the scene — who the student is, what grade band they're in, and what supports are already in place.",
    order: 1,
    signedInRoute: "/students",
    demoRoute: "/demo/intake",
    audiences: ["student", "family", "educator", "school_admin", "district_admin", "admin"],
    gradeBands: ["bridgeforward", "transitionforward"],
    reportSections: ["student_snapshot"],
  },
  {
    id: "voice",
    label: "VOICE",
    title: "Student Voice",
    description:
      "Center the student's own strengths, interests, worries, and support preferences before anyone else weighs in.",
    order: 2,
    signedInRoute: "/student-voice",
    demoRoute: "/demo/voice",
    audiences: ["student", "family", "educator", "school_admin", "district_admin", "admin"],
    gradeBands: ["bridgeforward", "transitionforward"],
    reportSections: ["student_voice", "strengths_preferences_interests_needs"],
  },
  {
    id: "family",
    label: "FAMILY",
    title: "Family Perspective",
    description:
      "Capture family hopes, concerns, priorities, and questions to bring into the next meeting.",
    order: 3,
    signedInRoute: "/family/priorities",
    demoRoute: "/demo/meeting",
    audiences: ["family", "educator", "school_admin", "district_admin", "admin"],
    gradeBands: ["bridgeforward", "transitionforward"],
    reportSections: ["family_action_plan", "meeting_prep_questions"],
  },
  {
    id: "school",
    label: "SCHOOL",
    title: "School Team Insight",
    description:
      "Bring in the case manager and educator view — services, accommodations, and readiness notes from the classroom.",
    order: 4,
    signedInRoute: "/teacher-portal",
    demoRoute: "/demo/plan",
    audiences: ["educator", "school_admin", "district_admin", "admin"],
    gradeBands: ["bridgeforward", "transitionforward"],
    reportSections: ["educator_action_plan", "iep_transition_translator"],
  },
  {
    id: "evidence",
    label: "EVIDENCE",
    title: "Documents and Evidence",
    description:
      "Upload IEPs, report cards, progress notes, and assessments so the plan is grounded in what already exists.",
    order: 5,
    signedInRoute: "/documents",
    demoRoute: "/demo/documents",
    audiences: ["family", "educator", "school_admin", "district_admin", "admin"],
    gradeBands: ["bridgeforward", "transitionforward"],
    reportSections: ["data_gaps"],
  },
  {
    id: "ready",
    label: "READY",
    title: "Readiness Scorecard",
    description:
      "See where the student is strong and where to focus — academics, self-advocacy, independent living, career, and more.",
    order: 6,
    signedInRoute: "/insights",
    demoRoute: "/demo/next",
    audiences: ["family", "educator", "school_admin", "district_admin", "admin"],
    gradeBands: ["bridgeforward", "transitionforward"],
    reportSections: ["readiness_scorecard"],
  },
  {
    id: "roadmap",
    label: "ROADMAP",
    title: "Pathway and Goals",
    description:
      "Turn everything so far into a personalized pathway — postsecondary goals plus career and life matches.",
    order: 7,
    signedInRoute: "/pathway",
    demoRoute: "/demo/report",
    audiences: ["student", "family", "educator", "school_admin", "district_admin", "admin"],
    gradeBands: ["bridgeforward", "transitionforward"],
    reportSections: ["postsecondary_goals", "recommended_pathways", "career_life_matches"],
  },
  {
    id: "action",
    label: "ACTION",
    title: "30 / 90 / 180 / 365 Day Plan",
    description:
      "Break the pathway into concrete next steps with owners, due dates, and meeting follow-up.",
    order: 8,
    signedInRoute: "/action-items",
    demoRoute: "/demo/next",
    audiences: ["student", "family", "educator", "school_admin", "district_admin", "admin"],
    gradeBands: ["bridgeforward", "transitionforward"],
    reportSections: ["next_steps_30_90_180_365"],
  },
  {
    id: "connect",
    label: "CONNECT",
    title: "Resources and Opportunities",
    description:
      "Follow through with recommended resources, community programs, and partner opportunities where the family agrees to share.",
    order: 9,
    signedInRoute: "/opportunities",
    demoRoute: "/demo/opportunities",
    audiences: ["student", "family", "educator", "school_admin", "district_admin", "admin", "partner"],
    gradeBands: ["bridgeforward", "transitionforward"],
    reportSections: ["recommended_resources", "partner_matches"],
  },
] as const;

/* ------------------------------------------------------------------ */
/* Lookups                                                             */
/* ------------------------------------------------------------------ */

const BY_ID = new Map<StageId, WorkspaceStage>(
  WORKSPACE_STAGES.map((s) => [s.id, s]),
);

export function getStage(id: StageId): WorkspaceStage {
  const s = BY_ID.get(id);
  if (!s) throw new Error(`Unknown workspace stage: ${id}`);
  return s;
}

export function stagesForAudience(audience: RoleAudience): WorkspaceStage[] {
  return WORKSPACE_STAGES.filter((s) => s.audiences.includes(audience));
}

export function stagesForGradeBand(band: StageGradeBand): WorkspaceStage[] {
  return WORKSPACE_STAGES.filter((s) => s.gradeBands.includes(band));
}

export function nextStage(id: StageId): WorkspaceStage | null {
  const s = getStage(id);
  return WORKSPACE_STAGES[s.order] ?? null; // order is 1-indexed → next is at [order]
}

export function previousStage(id: StageId): WorkspaceStage | null {
  const s = getStage(id);
  return s.order <= 1 ? null : WORKSPACE_STAGES[s.order - 2];
}

/**
 * Flat, ordered list of every report section, with its stage. This is
 * what the Pathway Report renderer iterates to build the TOC + body.
 */
export function reportSectionsInOrder(): Array<{
  section: PathwayReportSectionId;
  stage: WorkspaceStage;
}> {
  const out: Array<{ section: PathwayReportSectionId; stage: WorkspaceStage }> = [];
  for (const stage of WORKSPACE_STAGES) {
    for (const section of stage.reportSections) {
      out.push({ section, stage });
    }
  }
  return out;
}

/** Human labels for report sections. Title Case per style rules. */
export const REPORT_SECTION_LABELS: Record<PathwayReportSectionId, string> = {
  student_snapshot: "Student Snapshot",
  student_voice: "Student Voice",
  strengths_preferences_interests_needs: "Strengths, Preferences, Interests, and Needs",
  family_action_plan: "Family Action Plan",
  meeting_prep_questions: "Meeting Prep Questions",
  educator_action_plan: "Educator and Case Manager Action Plan",
  iep_transition_translator: "IEP and Transition Plan Translator",
  data_gaps: "Missing Information and Data Gaps",
  readiness_scorecard: "Readiness Scorecard",
  postsecondary_goals: "Postsecondary Goals",
  recommended_pathways: "Recommended Pathways",
  career_life_matches: "Career and Life Pathway Matches",
  next_steps_30_90_180_365: "30-Day, 90-Day, 6-Month, and 1-Year Next Steps",
  recommended_resources: "Recommended Resources",
  partner_matches: "Partner and Opportunity Matches",
};
