/**
 * Content Hub Registry — single source of truth for TransitionForward's hub
 * architecture. Drives nav, footers, related-links rails, and the resource
 * library facets.
 *
 * Rules:
 * - Public hubs use demo/sample content only — never private student data.
 * - Signed-in hubs live behind the standard `_authenticated` gate.
 * - Partner hubs MUST NOT reference student PII, documents, voice, or reports.
 * - Every spoke should declare how it feeds the Pathway Report (or null
 *   if it doesn't — most hub spokes will).
 *
 * The registry is intentionally static TS. No backend reads, no migrations.
 */

export type HubAudience =
  | "public"
  | "family"
  | "student"
  | "educator"
  | "school_admin"
  | "district_admin"
  | "partner"
  | "owner";

/**
 * Pathway Report sections a spoke can feed. Keep aligned with the actual
 * chapters in `src/components/pathway/ReportView.tsx` so the cross-links
 * are real, not aspirational.
 */
export type ReportSectionId =
  | "snapshot"
  | "student_voice"
  | "family_priorities"
  | "educator_input"
  | "documents"
  | "readiness"
  | "pathways"
  | "self_advocacy"
  | "independent_living"
  | "plan_30_60_90"
  | "questions_for_team"
  | "partner_matches";

export interface HubSpoke {
  id: string;
  title: string;
  /** One-line value statement — keep human, no SEO filler. */
  description: string;
  /** Internal route the spoke links to (existing route — don't invent). */
  to: string;
  /** Pathway Report section this spoke informs, if any. */
  feedsReport: ReportSectionId | null;
  /** Optional: tag for the resource-library filters. */
  topic?: string;
  resourceType?:
    | "guide"
    | "checklist"
    | "questions"
    | "template"
    | "tool"
    | "example"
    | "funding"
    | "implementation";
}

export interface HubDefinition {
  id: string;
  /** URL slug after `/hubs/` (public) or `/hubs/` under `_authenticated`. */
  slug: string;
  audience: HubAudience;
  signedIn: boolean;
  /** Pillar headline — what the hub is. */
  title: string;
  /** Who it's for. */
  who: string;
  /** Problem it solves. */
  problem: string;
  /** What action the user should take next on this hub. */
  nextAction: { label: string; to: string };
  spokes: HubSpoke[];
  /** Other hub ids this one links to. Used by RelatedLinksRail. */
  related: string[];
  /** Short statement of how this hub connects to the Pathway Report. */
  pathwayConnection: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Public hubs
// ─────────────────────────────────────────────────────────────────────────────

const TRANSITION_PLANNING: HubDefinition = {
  id: "transition-planning",
  slug: "transition-planning",
  audience: "public",
  signedIn: false,
  title: "Transition Planning Hub",
  who: "Families, students, and educators new to Connecticut transition planning.",
  problem:
    "Transition planning lives across IEPs, meetings, forms, and conversations. This hub gathers every input that shapes a student's pathway in one place.",
  nextAction: { label: "See A Sample Pathway Report", to: "/demo/report" },
  pathwayConnection:
    "Every spoke on this hub becomes a section of the Pathway Report — student voice, family priorities, educator input, documents, and readiness all flow into one plan.",
  spokes: [
    {
      id: "student-voice",
      title: "Student Voice",
      description: "What the student wants — interests, goals, worries, and dreams.",
      to: "/demo/voice",
      feedsReport: "student_voice",
      topic: "voice",
      resourceType: "tool",
    },
    {
      id: "family-priorities",
      title: "Family Priorities",
      description: "What matters most to the family for life after high school.",
      to: "/families",
      feedsReport: "family_priorities",
      topic: "family",
      resourceType: "guide",
    },
    {
      id: "educator-input",
      title: "Educator Input",
      description: "Case manager observations, supports, and team recommendations.",
      to: "/educators",
      feedsReport: "educator_input",
      topic: "educator",
      resourceType: "guide",
    },
    {
      id: "documents",
      title: "Document Uploads",
      description: "IEPs, evaluations, and assessments — read into structured insights.",
      to: "/demo/documents",
      feedsReport: "documents",
      topic: "documents",
      resourceType: "tool",
    },
    {
      id: "readiness-areas",
      title: "Readiness Areas",
      description: "Employment, education, independent living, and self-advocacy.",
      to: "/demo/intake",
      feedsReport: "readiness",
      topic: "readiness",
      resourceType: "checklist",
    },
    {
      id: "pathway-report",
      title: "Pathway Report",
      description: "The flagship plan — one family-friendly document with every input.",
      to: "/demo/report",
      feedsReport: null,
      topic: "report",
      resourceType: "example",
    },
    {
      id: "plan-30-60-90",
      title: "30/60/90 Planning",
      description: "Concrete next steps for the next month, quarter, and semester.",
      to: "/demo/plan",
      feedsReport: "plan_30_60_90",
      topic: "planning",
      resourceType: "template",
    },
    {
      id: "questions-for-team",
      title: "Questions For The Team",
      description: "Family-ready questions to bring to the next PPT meeting.",
      to: "/demo/meeting",
      feedsReport: "questions_for_team",
      topic: "meeting",
      resourceType: "questions",
    },
  ],
  related: ["bridgeforward", "family-resource", "demo-sample", "school-district"],
};

// ─────────────────────────────────────────────────────────────────────────────
// Signed-in hubs
// ─────────────────────────────────────────────────────────────────────────────

const STUDENT_PLANNING: HubDefinition = {
  id: "student-planning",
  slug: "student",
  audience: "student",
  signedIn: true,
  title: "Student Planning Hub",
  who: "You — the student. This is your space to shape your pathway.",
  problem:
    "Your IEP, your goals, and the people supporting you are scattered across meetings and paperwork. This hub gives you one place to share what matters and see your plan.",
  nextAction: { label: "Open My Pathway Report", to: "/reports" },
  pathwayConnection:
    "What you share here — your voice, your goals, your priorities — becomes the heart of your Pathway Report. Nothing about you, without you.",
  spokes: [
    {
      id: "my-voice",
      title: "Share My Voice",
      description: "Tell your team what you want, what you're worried about, and what you dream of.",
      to: "/student-voice",
      feedsReport: "student_voice",
      topic: "voice",
      resourceType: "tool",
    },
    {
      id: "my-goals",
      title: "Track My Goals",
      description: "See progress on the goals in your IEP and add your own.",
      to: "/goals",
      feedsReport: "readiness",
      topic: "goals",
      resourceType: "tool",
    },
    {
      id: "my-documents",
      title: "My Documents",
      description: "Your IEP and evaluations, organized and searchable.",
      to: "/documents",
      feedsReport: "documents",
      topic: "documents",
      resourceType: "tool",
    },
    {
      id: "my-meetings",
      title: "Prep For Meetings",
      description: "Walk into your PPT with the questions you want answered.",
      to: "/ppt-prep",
      feedsReport: "questions_for_team",
      topic: "meeting",
      resourceType: "questions",
    },
    {
      id: "my-report",
      title: "My Pathway Report",
      description: "Your plan, in one family-friendly document.",
      to: "/reports",
      feedsReport: null,
      topic: "report",
      resourceType: "example",
    },
    {
      id: "my-opportunities",
      title: "Opportunities For Me",
      description: "Partner-matched programs that fit your interests and readiness.",
      to: "/opportunities",
      feedsReport: "partner_matches",
      topic: "opportunities",
      resourceType: "tool",
    },
  ],
  related: ["transition-planning"],
};

// ─────────────────────────────────────────────────────────────────────────────
// Exports
// ─────────────────────────────────────────────────────────────────────────────

export const HUBS: Record<string, HubDefinition> = {
  [TRANSITION_PLANNING.id]: TRANSITION_PLANNING,
  [STUDENT_PLANNING.id]: STUDENT_PLANNING,
};

export const HUB_IDS = Object.keys(HUBS);

export function getHub(id: string): HubDefinition | undefined {
  return HUBS[id];
}

export function publicHubs(): HubDefinition[] {
  return Object.values(HUBS).filter((h) => !h.signedIn);
}

export function signedInHubsFor(audience: HubAudience): HubDefinition[] {
  return Object.values(HUBS).filter((h) => h.signedIn && h.audience === audience);
}

/**
 * Partner-safety check used by `tests/unit/hub-registry.test.ts`.
 * Partner hubs MUST NOT reference student PII surfaces.
 */
export const PARTNER_FORBIDDEN_SPOKE_TOPICS = [
  "voice",
  "documents",
  "report",
  "goals",
  "meeting",
];
