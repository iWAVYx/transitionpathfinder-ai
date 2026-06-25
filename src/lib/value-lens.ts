/**
 * Value Lens — single source of truth for the product-value test applied
 * across the Pathway Report, Demo Workspace, and role dashboards.
 *
 * Every section in TransitionForward should be able to answer these
 * questions in plain language. Sections that can't should be improved,
 * combined, or removed.
 *
 * The seven product-value questions:
 *   1. What real user problem does this solve?
 *   2. Which role benefits from it?
 *   3. What information does the user provide?
 *   4. What insight or output does TransitionForward return?
 *   5. What decision does this help the user make?
 *   6. What next step does it recommend?
 *   7. How does it connect to the Pathway Report?
 */

export type AppRole =
  | "student"
  | "family"
  | "educator"
  | "school"
  | "district"
  | "partner"
  | "owner";

export type ValueCallout = {
  /** Plain-language reading of what the section means. ≤ 2 sentences. */
  whatThisMeans: string;
  /** Why it matters for transition planning. ≤ 2 sentences. */
  whyItMatters: string;
  /** Concrete next action — verb first. */
  recommendedNextStep: string;
  /** Questions the user should bring to the planning team. */
  questionsForTeam: string[];
  /** Data sources used to generate this section (intake, IEP, voice, etc.). */
  informationUsed: string[];
  /** Optional explicit owner of the recommended next step. */
  owner?: "student" | "family" | "case_manager" | "school" | "partner" | "team";
  /** Optional plain-language timeframe ("before the next PPT", "this month"). */
  timeframe?: string;
};

export type RoleValue = {
  /** One-line answer to "why does this page matter to me?" */
  headline: string;
  /** Single concrete next action a user in this role can take here. */
  nextAction: string;
};

export const ROLE_VALUE: Record<AppRole, RoleValue> = {
  student: {
    headline:
      "Your strengths, interests, and goals — in language that helps you take the next step.",
    nextAction: "Add one thing you want your team to know.",
  },
  family: {
    headline:
      "Organize concerns, documents, priorities, and meeting prep so nothing slips between meetings.",
    nextAction: "Pick one priority to bring to the next PPT.",
  },
  educator: {
    headline:
      "Student information, document insights, and meeting prep in one place — without duplicating work.",
    nextAction: "Review readiness gaps and assign the next action.",
  },
  school: {
    headline:
      "See caseload load, service gaps, and planning consistency across your building.",
    nextAction: "Spot a gap and route it to the right team member.",
  },
  district: {
    headline:
      "Program-level readiness, transition service gaps, and partner needs across your district.",
    nextAction: "Identify where supports should be strengthened next quarter.",
  },
  partner: {
    headline:
      "Post opportunities and connect to transition pathways — without seeing private student data.",
    nextAction: "Publish or refresh an opportunity students can apply to.",
  },
  owner: {
    headline:
      "Manage waitlist, users, contacts, partners, demos, and operations from one clean hub.",
    nextAction: "Clear the highest-priority queue first.",
  },
};

/** Standard chapter keys used by the Pathway Report. */
export type ReportChapterKey =
  | "self_determination"
  | "education_training"
  | "employment"
  | "independent_living"
  | "community"
  | "bring_to_team";

/**
 * Default value-callout language by report chapter. Components can override
 * any field with content derived from the actual student's data.
 */
export const CHAPTER_VALUE_DEFAULTS: Record<ReportChapterKey, ValueCallout> = {
  self_determination: {
    whatThisMeans:
      "How well the student can speak up for what they need, want, and decide.",
    whyItMatters:
      "Self-advocacy predicts post-school success more than almost any other skill.",
    recommendedNextStep:
      "Pick one upcoming meeting where the student leads part of the conversation.",
    questionsForTeam: [
      "Where can the student practice leading a portion of the next PPT?",
      "What scaffolds (script, visuals, role-play) would help?",
    ],
    informationUsed: ["Student Voice responses", "Intake answers", "IEP transition plan"],
    owner: "student",
    timeframe: "before the next PPT",
  },
  education_training: {
    whatThisMeans:
      "Where the student is headed after high school for learning — college, training, certification, or guided exploration.",
    whyItMatters:
      "Decisions made now (courses, tours, accommodations) directly shape what's possible next year.",
    recommendedNextStep:
      "Schedule one program visit or info session in the next 30 days.",
    questionsForTeam: [
      "Which course sequence keeps the most postsecondary options open?",
      "What accommodations need to be documented now for college disability services?",
    ],
    informationUsed: ["IEP goals", "Intake interests", "Student Voice", "Document extractions"],
    owner: "case_manager",
    timeframe: "this quarter",
  },
  employment: {
    whatThisMeans:
      "What work, training, or career exposure the student is ready for next.",
    whyItMatters:
      "Paid or supported work experience in high school is one of the strongest predictors of post-school employment.",
    recommendedNextStep:
      "Match the student to one opportunity (job shadow, internship, or supported work).",
    questionsForTeam: [
      "Who connects the student to the opportunity, and by when?",
      "What supports travel, schedule, or job coaching need?",
    ],
    informationUsed: ["Intake employment goals", "Partner opportunities", "Readiness scores"],
    owner: "team",
    timeframe: "this semester",
  },
  independent_living: {
    whatThisMeans:
      "Daily-living skills — money, transportation, cooking, health, time management.",
    whyItMatters:
      "These skills determine how independently the student can live, work, and participate.",
    recommendedNextStep:
      "Choose one skill to practice weekly at home or in school.",
    questionsForTeam: [
      "Which skill should be added to the IEP this year?",
      "Who teaches it — family, school, community provider?",
    ],
    informationUsed: ["Intake daily-living section", "Family priorities", "IEP services"],
    owner: "family",
    timeframe: "this month",
  },
  community: {
    whatThisMeans:
      "Adult-service connections (DDS, BRS, ABLE, Medicaid waivers) and community supports.",
    whyItMatters:
      "Adult services don't start automatically. Applications take months — sometimes years.",
    recommendedNextStep:
      "Confirm which agency applications are open and which still need to start.",
    questionsForTeam: [
      "Which agencies has the student applied to, and what's outstanding?",
      "Who owns each application from here?",
    ],
    informationUsed: ["Intake services section", "Document extractions", "Family input"],
    owner: "family",
    timeframe: "within 60 days",
  },
  bring_to_team: {
    whatThisMeans:
      "A consolidated checklist of every open question and recommended action from this report.",
    whyItMatters:
      "Meetings move faster when everyone arrives with the same list and known owners.",
    recommendedNextStep:
      "Print this section and bring it to the next PPT or planning meeting.",
    questionsForTeam: [],
    informationUsed: ["All report chapters"],
    owner: "team",
    timeframe: "next meeting",
  },
};

/** Validates a value callout — used in tests to ensure no chapter is empty. */
export function isValidValueCallout(v: Partial<ValueCallout> | undefined): v is ValueCallout {
  if (!v) return false;
  return Boolean(
    v.whatThisMeans &&
      v.whyItMatters &&
      v.recommendedNextStep &&
      Array.isArray(v.informationUsed) &&
      v.informationUsed.length > 0,
  );
}
