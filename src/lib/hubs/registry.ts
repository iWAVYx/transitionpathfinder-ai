/**
 * Content Hub Registry — single source of truth for TransitionForward's hub
 * architecture.
 *
 * IMPORTANT POLICY (set 2026-06-27):
 * - All product hubs are SIGNED-IN ONLY. There are no public marketing hubs.
 * - The only public "hub-style" preview is the Demo Workspace (`/demo/*`),
 *   which uses sample data and is intentionally not modeled in this registry.
 * - Partner hubs MUST NOT reference student PII, documents, voice, goals,
 *   meetings, or pathway reports. Enforced by `PARTNER_FORBIDDEN_SPOKE_TOPICS`
 *   and `tests/unit/hub-registry.test.ts`.
 */

export type HubAudience =
  | "student"
  | "family"
  | "educator"
  | "school_admin"
  | "district_admin"
  | "partner"
  | "admin";

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
  description: string;
  to: string;
  feedsReport: ReportSectionId | null;
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
  /** URL slug after `/hubs/` under `_authenticated`. */
  slug: string;
  audience: HubAudience;
  /** Always true for product hubs — kept for the test invariant. */
  signedIn: true;
  title: string;
  who: string;
  problem: string;
  nextAction: { label: string; to: string };
  spokes: HubSpoke[];
  related: string[];
  pathwayConnection: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Signed-in role hubs
// ─────────────────────────────────────────────────────────────────────────────

const STUDENT_PLANNING: HubDefinition = {
  id: "student-planning",
  slug: "student",
  audience: "student",
  signedIn: true,
  title: "Student Planning Hub",
  who: "You — the student. Your space to shape your pathway.",
  problem:
    "Your IEP, your goals, and the people supporting you are scattered across meetings and paperwork. This hub gives you one place to share what matters and see your plan.",
  nextAction: { label: "Open My Pathway Report", to: "/reports" },
  pathwayConnection:
    "What you share — your voice, your goals, your priorities — becomes the heart of your Pathway Report.",
  spokes: [
    { id: "my-voice", title: "Share My Voice", description: "Tell your team what you want, worry about, and dream of.", to: "/student-voice", feedsReport: "student_voice", topic: "voice", resourceType: "tool" },
    { id: "my-goals", title: "Track My Goals", description: "See progress on IEP goals and add your own.", to: "/goals", feedsReport: "readiness", topic: "goals", resourceType: "tool" },
    { id: "my-readiness", title: "Readiness Areas", description: "Employment, education, independent living, self-advocacy.", to: "/reports", feedsReport: "readiness", topic: "readiness", resourceType: "checklist" },
    { id: "my-report", title: "My Pathway Report", description: "Your plan, in one family-friendly document.", to: "/reports", feedsReport: null, topic: "report", resourceType: "example" },
    { id: "my-meetings", title: "Prep For Meetings", description: "Walk into your PPT with the questions you want answered.", to: "/ppt-prep", feedsReport: "questions_for_team", topic: "meeting", resourceType: "questions" },
    { id: "my-next-steps", title: "Next Steps", description: "Concrete actions for the next 30, 60, and 90 days.", to: "/reports", feedsReport: "plan_30_60_90", topic: "planning", resourceType: "template" },
  ],
  related: [],
};

const FAMILY_PLANNING: HubDefinition = {
  id: "family-planning",
  slug: "family",
  audience: "family",
  signedIn: true,
  title: "Family Planning Hub",
  who: "Parents and guardians supporting a student through transition planning.",
  problem:
    "Forms, acronyms, and meeting prep pile up fast. This hub gives families a single place to share priorities, review documents, and walk into the next PPT prepared.",
  nextAction: { label: "Open Our Pathway Report", to: "/reports" },
  pathwayConnection:
    "Family Priorities and Questions For The Team in the Pathway Report draw directly from what families share here.",
  spokes: [
    { id: "family-priorities", title: "Family Priorities", description: "What matters most for life after high school.", to: "/pathway", feedsReport: "family_priorities", topic: "family", resourceType: "tool" },
    { id: "family-documents", title: "Documents", description: "IEPs, evaluations, and assessments — organized and searchable.", to: "/documents", feedsReport: "documents", topic: "documents", resourceType: "tool" },
    { id: "family-questions", title: "Questions For The Team", description: "Family-ready questions to bring to the next PPT.", to: "/ppt-prep", feedsReport: "questions_for_team", topic: "meeting", resourceType: "questions" },
    { id: "family-meetings", title: "Meeting Prep", description: "Get ready for the next PPT or IEP meeting.", to: "/meetings", feedsReport: "questions_for_team", topic: "meeting", resourceType: "guide" },
    { id: "family-report", title: "Pathway Report", description: "The family-friendly plan, all in one place.", to: "/reports", feedsReport: null, topic: "report", resourceType: "example" },
    { id: "family-actions", title: "Action Items", description: "The next 30/60/90 days for your student.", to: "/reports", feedsReport: "plan_30_60_90", topic: "planning", resourceType: "template" },
  ],
  related: [],
};

const CASELOAD_PLANNING: HubDefinition = {
  id: "caseload-planning",
  slug: "caseload",
  audience: "educator",
  signedIn: true,
  title: "Caseload Planning Hub",
  who: "Case managers, special educators, and transition coordinators.",
  problem:
    "Educators juggle records, reviews, and meetings across many students. This hub gathers caseload tools, document review, and Pathway Report workflows in one place.",
  nextAction: { label: "Open My Caseload", to: "/caseload" },
  pathwayConnection:
    "Educator Input flows into every Pathway Report — readiness ratings, observations, and recommended next steps live here.",
  spokes: [
    { id: "case-caseload", title: "My Caseload", description: "Your assigned students and recent activity.", to: "/caseload", feedsReport: null, topic: "educator", resourceType: "tool" },
    { id: "case-documents", title: "Document Review", description: "Review IEPs and evaluations across your caseload.", to: "/documents", feedsReport: "documents", topic: "documents", resourceType: "tool" },
    { id: "case-input", title: "Educator Input", description: "Capture observations, supports, and recommendations.", to: "/pathway", feedsReport: "educator_input", topic: "educator", resourceType: "tool" },
    { id: "case-readiness", title: "Readiness Tracking", description: "Track readiness across the four transition domains.", to: "/goals", feedsReport: "readiness", topic: "readiness", resourceType: "checklist" },
    { id: "case-meetings", title: "Meeting Prep", description: "Templates and agendas for upcoming PPTs.", to: "/meeting-templates", feedsReport: "questions_for_team", topic: "meeting", resourceType: "template" },
    { id: "case-reports", title: "Pathway Reports", description: "Draft and share Pathway Reports with families.", to: "/reports", feedsReport: null, topic: "report", resourceType: "example" },
  ],
  related: [],
};

const SCHOOL_IMPLEMENTATION: HubDefinition = {
  id: "school-implementation",
  slug: "school",
  audience: "school_admin",
  signedIn: true,
  title: "School Implementation Hub",
  who: "School-level special education leaders and administrators.",
  problem:
    "Schools need visibility into caseloads, team coordination, and compliance without losing sight of the student. This hub keeps school operations and transition planning aligned.",
  nextAction: { label: "Open School Overview", to: "/school/overview" },
  pathwayConnection:
    "School-level implementation makes the Pathway Report a shared document instead of one more form.",
  spokes: [
    { id: "school-overview", title: "School Overview", description: "Caseloads, services, and team activity at a glance.", to: "/school/overview", feedsReport: null, topic: "school", resourceType: "tool" },
    { id: "school-team", title: "Staff & Team", description: "Coordinate transition staff and service providers.", to: "/school/team", feedsReport: null, topic: "school", resourceType: "tool" },
    { id: "school-reports", title: "School Reports", description: "Pathway Report status and compliance signals.", to: "/school/reports", feedsReport: null, topic: "report", resourceType: "example" },
    { id: "school-impl", title: "Implementation", description: "Rollout checklists and adoption playbook.", to: "/school/implementation", feedsReport: null, topic: "implementation", resourceType: "implementation" },
  ],
  related: [],
};

const DISTRICT_STRATEGY: HubDefinition = {
  id: "district-strategy",
  slug: "district",
  audience: "district_admin",
  signedIn: true,
  title: "District Strategy Hub",
  who: "District-level special education and transition leadership.",
  problem:
    "Districts need program-level signal — readiness, service gaps, and adoption across schools — without losing FERPA discipline.",
  nextAction: { label: "Open District Overview", to: "/district/overview" },
  pathwayConnection:
    "Aggregate readiness and Pathway Report adoption help districts target supports where they matter most.",
  spokes: [
    { id: "district-overview", title: "District Overview", description: "Program-level readiness and transition activity.", to: "/district/overview", feedsReport: null, topic: "district", resourceType: "tool" },
    { id: "district-schools", title: "Schools", description: "Coverage and adoption across district schools.", to: "/district/schools", feedsReport: null, topic: "district", resourceType: "tool" },
    { id: "district-team", title: "People & Access", description: "Manage district staff, roles, and access.", to: "/district/team", feedsReport: null, topic: "district", resourceType: "implementation" },
    { id: "district-reports", title: "District Reports", description: "Aggregate signals — no student PII.", to: "/district/reports", feedsReport: null, topic: "report", resourceType: "example" },
  ],
  related: [],
};

const PARTNER_OPPORTUNITY: HubDefinition = {
  id: "partner-opportunity",
  slug: "partner",
  audience: "partner",
  signedIn: true,
  title: "Partner Opportunity Hub",
  who: "Community partners, employers, agencies, and post-secondary programs.",
  problem:
    "Partners need to publish opportunities and find supports without ever touching student records. This hub keeps partner work focused on programs and outcomes.",
  nextAction: { label: "Open Partner Workspace", to: "/partners-manage" },
  pathwayConnection:
    "Partner-published opportunities surface to families and educators through the matching engine — never the other way around.",
  spokes: [
    { id: "partner-profile", title: "Partner Profile & Opportunities", description: "Publish and manage opportunities for CT students.", to: "/partners-manage", feedsReport: null, topic: "partnerforward", resourceType: "tool" },
    { id: "partner-impact", title: "Partner Impact", description: "Aggregate impact across published opportunities.", to: "/partners-manage/impact", feedsReport: null, topic: "partnerforward", resourceType: "example" },
    { id: "partner-incentives", title: "Incentives & Support", description: "PartnerForward incentives, tax credits, and grants.", to: "/partnerforward/incentives", feedsReport: null, topic: "incentives", resourceType: "funding" },
  ],
  related: [],
};

const PLATFORM_OPERATIONS: HubDefinition = {
  id: "platform-operations",
  slug: "admin",
  audience: "admin",
  signedIn: true,
  title: "Platform Operations Hub",
  who: "Platform owners and administrators.",
  problem:
    "Operations span waitlist, contacts, users, and demo content. This hub keeps platform oversight clean and auditable.",
  nextAction: { label: "Open Admin", to: "/admin" },
  pathwayConnection:
    "Platform operations keep the Pathway Report pipeline healthy across districts and partners.",
  spokes: [
    { id: "admin-overview", title: "Admin Overview", description: "Platform-wide signal and queues.", to: "/admin", feedsReport: null, topic: "admin", resourceType: "tool" },
    { id: "admin-insights", title: "Insights", description: "Cross-cutting insights across the platform.", to: "/insights", feedsReport: null, topic: "admin", resourceType: "example" },
    { id: "admin-analytics", title: "Analytics", description: "Adoption and engagement analytics.", to: "/analytics", feedsReport: null, topic: "admin", resourceType: "example" },
  ],
  related: [],
};

// ─────────────────────────────────────────────────────────────────────────────
// Exports
// ─────────────────────────────────────────────────────────────────────────────

export const HUBS: Record<string, HubDefinition> = {
  [STUDENT_PLANNING.id]: STUDENT_PLANNING,
  [FAMILY_PLANNING.id]: FAMILY_PLANNING,
  [CASELOAD_PLANNING.id]: CASELOAD_PLANNING,
  [SCHOOL_IMPLEMENTATION.id]: SCHOOL_IMPLEMENTATION,
  [DISTRICT_STRATEGY.id]: DISTRICT_STRATEGY,
  [PARTNER_OPPORTUNITY.id]: PARTNER_OPPORTUNITY,
  [PLATFORM_OPERATIONS.id]: PLATFORM_OPERATIONS,
};

export const HUB_IDS = Object.keys(HUBS);

export function getHub(id: string): HubDefinition | undefined {
  return HUBS[id];
}

export function signedInHubsFor(audience: HubAudience): HubDefinition[] {
  return Object.values(HUBS).filter((h) => h.audience === audience);
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
  "readiness",
  "family",
  "educator",
  "school",
  "district",
];
