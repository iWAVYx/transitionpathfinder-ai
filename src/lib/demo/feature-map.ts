/**
 * Demo → Product Feature Map
 *
 * Single source of truth that connects every visible /demo/* element back to a
 * real TransitionForward product feature. Drives:
 *   - <FeatureFootnote elementId="..."/> shown inline at the bottom of demo panels
 *   - /demo/connection internal audit page
 *   - docs/demo-feature-map.md
 *   - tests/unit/demo-feature-map.test.ts
 *
 * Keep entries short and accurate. If an element is future-phase, label it.
 */

export type DemoStatus = "live" | "partial" | "future-phase";

export type DemoRole =
  | "student"
  | "parent"
  | "educator"
  | "school"
  | "district"
  | "partner"
  | "platform";

export interface DemoFeatureEntry {
  /** Human-readable name shown on the connection page. */
  element: string;
  /** Real product feature this demo surface represents. */
  product: string;
  /** Where the real feature lives in the signed-in app (route or "future-phase"). */
  livesAt: string;
  /** Roles that actually use this feature in the signed-in product. */
  roles: DemoRole[];
  /** Underlying data shape (intake, voice, document, report, plan, ...). */
  dataSource: string;
  /** What a signed-in user does next with this feature. */
  nextAction: string;
  /** Implementation status. */
  status: DemoStatus;
  /** Optional clarifying note. */
  notes?: string;
}

export const DEMO_FEATURE_MAP = {
  /* ---------- Overview ---------- */
  "demo.overview": {
    element: "Demo overview grid",
    product: "Marketing landing for product walkthrough",
    livesAt: "/demo",
    roles: ["student", "parent", "educator", "school", "district", "partner", "platform"],
    dataSource: "Fictional sample student (Jordan Rivera)",
    nextAction: "Click a step to start the guided walkthrough",
    status: "live",
  },

  /* ---------- Intake ---------- */
  "intake.categories": {
    element: "Intake category list",
    product: "Student onboarding / intake profile",
    livesAt: "/intake (signed-in)",
    roles: ["student", "parent", "educator"],
    dataSource: "intake_responses + student_profiles",
    nextAction: "Sign in and complete real intake fields for the student",
    status: "live",
  },
  "intake.roleLens": {
    element: "Role lens on intake",
    product: "Role-targeted intake prompts",
    livesAt: "/intake (signed-in, role-aware)",
    roles: ["student", "parent", "educator", "school", "district", "partner"],
    dataSource: "Static role copy",
    nextAction: "Pick a role to preview how prompts adapt",
    status: "partial",
    notes: "Real product personalizes prompts based on signed-in role + grade band.",
  },

  /* ---------- Student Voice ---------- */
  "voice.prompts": {
    element: "Student Voice prompt cards",
    product: "Student Voice capture",
    livesAt: "/voice (signed-in)",
    roles: ["student"],
    dataSource: "student_voice_responses",
    nextAction: "Sign in as a student to record real responses",
    status: "live",
  },

  /* ---------- Documents / IEP ---------- */
  "documents.insights": {
    element: "IEP / document insight panel",
    product: "Document upload + AI-assisted summary",
    livesAt: "/documents (signed-in, educator or family)",
    roles: ["educator", "parent", "school"],
    dataSource: "documents + document_insights",
    nextAction: "Sign in to upload an IEP/PPT and review the AI summary",
    status: "partial",
    notes: "AI summaries are planning aids — never replace official CT-SEDS records.",
  },
  "documents.needsReview": {
    element: "Needs Review flags",
    product: "Document insight review queue",
    livesAt: "/documents (signed-in)",
    roles: ["educator", "school"],
    dataSource: "document_insights.needs_review",
    nextAction: "Educator reviews and confirms or edits the flagged item",
    status: "partial",
  },

  /* ---------- Pathway Report ---------- */
  "report.snapshot": {
    element: "Student Snapshot section",
    product: "Pathway Report — student snapshot",
    livesAt: "/report/$reportId (signed-in)",
    roles: ["student", "parent", "educator", "school"],
    dataSource: "pathway_reports.snapshot",
    nextAction: "Open the live report from the dashboard",
    status: "live",
  },
  "report.voice": {
    element: "Student Voice summary",
    product: "Pathway Report — voice summary",
    livesAt: "/report/$reportId#voice",
    roles: ["student", "parent", "educator"],
    dataSource: "student_voice_responses",
    nextAction: "Sign in to view the live student voice summary",
    status: "live",
  },
  "report.family": {
    element: "Family Priorities",
    product: "Family input on Pathway Report",
    livesAt: "/report/$reportId#family",
    roles: ["parent", "educator"],
    dataSource: "family_priorities",
    nextAction: "Parent adds priorities during onboarding or before a PPT",
    status: "live",
  },
  "report.educator": {
    element: "Educator Input",
    product: "Educator / case-manager notes on report",
    livesAt: "/report/$reportId#educator",
    roles: ["educator", "school"],
    dataSource: "educator_notes",
    nextAction: "Educator adds context before generating an updated report",
    status: "live",
  },
  "report.documentInsights": {
    element: "IEP / Document Insights section",
    product: "Document insights summarized in report",
    livesAt: "/report/$reportId#documents",
    roles: ["educator", "parent", "school"],
    dataSource: "document_insights",
    nextAction: "Upload the most recent IEP and regenerate the report",
    status: "partial",
  },
  "report.spin": {
    element: "Strengths / Preferences / Interests / Needs",
    product: "Pathway Report SPIN block",
    livesAt: "/report/$reportId#spin",
    roles: ["student", "parent", "educator"],
    dataSource: "intake_responses + voice + documents",
    nextAction: "Refine SPIN by completing intake and voice steps",
    status: "live",
  },
  "report.readiness": {
    element: "Readiness Indicators",
    product: "Pathway Report — readiness scoring",
    livesAt: "/report/$reportId#readiness",
    roles: ["educator", "school", "district"],
    dataSource: "readiness_indicators (derived)",
    nextAction: "Indicators recompute as new data arrives",
    status: "partial",
  },
  "report.pathways": {
    element: "Recommended Pathways",
    product: "Pathway recommendations",
    livesAt: "/report/$reportId#pathways",
    roles: ["student", "parent", "educator", "school"],
    dataSource: "pathway_recommendations",
    nextAction: "Save a pathway to drive resource and partner matching",
    status: "live",
  },
  "report.resources": {
    element: "Matched Resources",
    product: "Resource library match",
    livesAt: "/resources (signed-in)",
    roles: ["student", "parent", "educator"],
    dataSource: "resources + saved_resources",
    nextAction: "Save resources to the student's plan",
    status: "live",
  },
  "report.opportunities": {
    element: "Matched Opportunities",
    product: "Partner directory matching",
    livesAt: "/opportunities (signed-in)",
    roles: ["student", "parent", "educator", "partner"],
    dataSource: "partner_opportunities",
    nextAction: "Request more info or shortlist for a PPT meeting",
    status: "partial",
    notes: "Partners do not see private student data — they receive matched interest only.",
  },
  "report.meetingPrep": {
    element: "Meeting Prep",
    product: "PPT / meeting prep packet",
    livesAt: "/meetings (signed-in)",
    roles: ["parent", "educator", "school"],
    dataSource: "meeting_prep + action_items",
    nextAction: "Print or share the prep packet before the PPT",
    status: "live",
  },
  "report.plan": {
    element: "30 / 60 / 90 Day Plan",
    product: "Action plan timeline",
    livesAt: "/plan (signed-in)",
    roles: ["student", "parent", "educator"],
    dataSource: "action_items",
    nextAction: "Assign owners and due dates",
    status: "live",
  },
  "report.needsReview": {
    element: "Needs Review flags",
    product: "Report quality flags",
    livesAt: "/report/$reportId#review",
    roles: ["educator", "school"],
    dataSource: "report_flags",
    nextAction: "Resolve each flag before sharing with family",
    status: "partial",
  },
  "report.whatChanged": {
    element: "What Changed Since Last Report",
    product: "Report diff between versions",
    livesAt: "/report/$reportId#changes",
    roles: ["educator", "school", "parent"],
    dataSource: "pathway_reports (versioned)",
    nextAction: "Reviewer confirms changes are accurate",
    status: "future-phase",
    notes: "Diff view UI is planned; underlying versioning exists.",
  },

  /* ---------- Resources ---------- */
  "resources.cards": {
    element: "Resource match cards",
    product: "Resource library",
    livesAt: "/resources (signed-in)",
    roles: ["student", "parent", "educator"],
    dataSource: "resources",
    nextAction: "Save resources to the student plan",
    status: "live",
  },
  "resources.rationale": {
    element: "Recommendation rationale",
    product: "Why-this-matched explanation",
    livesAt: "/resources/$id (signed-in)",
    roles: ["student", "parent", "educator"],
    dataSource: "resources.match_rationale",
    nextAction: "Use rationale during family conversations",
    status: "partial",
  },

  /* ---------- Opportunities ---------- */
  "opportunities.cards": {
    element: "Partner opportunity cards",
    product: "Partner directory + opportunity matching",
    livesAt: "/opportunities (signed-in)",
    roles: ["student", "parent", "educator", "partner"],
    dataSource: "partner_opportunities",
    nextAction: "Shortlist an opportunity and notify the family",
    status: "partial",
  },
  "opportunities.requestInfo": {
    element: "Request more info button",
    product: "Family/partner intro request",
    livesAt: "/opportunities/$id (signed-in)",
    roles: ["parent", "educator"],
    dataSource: "opportunity_intro_requests",
    nextAction: "Sign in to send a real introduction request",
    status: "future-phase",
  },
  "opportunities.introStatus": {
    element: "Intro request status chip",
    product: "Opportunity intro lifecycle (not started → connected)",
    livesAt: "/opportunities (signed-in, family + educator)",
    roles: ["parent", "educator"],
    dataSource: "opportunity_intro_requests.status",
    nextAction: "Family/educator advances the status through the lifecycle",
    status: "future-phase",
    notes: "Demo shows 5 states; signed-in product wires them to real intro request rows.",
  },
  "opportunities.partnerSideView": {
    element: "Partner-side view callout",
    product: "Partner workspace privacy boundary",
    livesAt: "/partner (signed-in, partner)",
    roles: ["partner"],
    dataSource: "partner_opportunities + aggregate interest counts",
    nextAction: "Partner sees matched interest and intro requests — never student PII",
    status: "live",
    notes: "Enforced by RLS on partner_opportunities + partner_organizations.",
  },


  /* ---------- Action Plan ---------- */
  "plan.timeline": {
    element: "30/60/90 day timeline",
    product: "Action plan",
    livesAt: "/plan (signed-in)",
    roles: ["student", "parent", "educator"],
    dataSource: "action_items",
    nextAction: "Assign and track action items",
    status: "live",
  },

  /* ---------- Meeting Prep ---------- */
  "meeting.agenda": {
    element: "Meeting agenda + talking points",
    product: "PPT / IEP meeting prep",
    livesAt: "/meetings/$id (signed-in)",
    roles: ["parent", "educator", "school"],
    dataSource: "meetings + meeting_prep",
    nextAction: "Share prep packet ahead of the meeting",
    status: "live",
  },
  "meeting.summary": {
    element: "Sample meeting summary",
    product: "AI-assisted meeting summary",
    livesAt: "/meetings/$id/summary",
    roles: ["educator", "school"],
    dataSource: "meeting_summaries",
    nextAction: "Educator reviews and finalizes the summary",
    status: "future-phase",
    notes: "AI summaries are drafts only — never replace official PPT minutes.",
  },
  "meeting.minutes": {
    element: "Previous meeting minutes (read-only)",
    product: "PPT minutes capture",
    livesAt: "/meetings/$id (signed-in, educator)",
    roles: ["educator", "school", "parent"],
    dataSource: "meetings + meeting_action_items",
    nextAction: "Educator captures decisions during the live meeting",
    status: "partial",
    notes: "Demo shows the read-only display; live capture UI is being deepened.",
  },
  "meeting.reportLinks": {
    element: "Agenda → Pathway Report linkage table",
    product: "Single-source-of-truth between prep packet and report",
    livesAt: "/meetings/$id (signed-in)",
    roles: ["educator", "school", "parent"],
    dataSource: "meeting_agenda_items → pathway_reports.content",
    nextAction: "Decisions flow into the next report version + 30/60/90 plan",
    status: "live",
  },


  /* ---------- Calendar ---------- */
  "calendar.month": {
    element: "Month view with sample milestones",
    product: "Transition calendar",
    livesAt: "/calendar (signed-in)",
    roles: ["student", "parent", "educator", "school"],
    dataSource: "calendar_events",
    nextAction: "Add real events from the signed-in calendar",
    status: "live",
  },

  /* ---------- Role hub previews ---------- */
  "hub.student": {
    element: "Student dashboard preview",
    product: "Student dashboard",
    livesAt: "/student",
    roles: ["student"],
    dataSource: "student_profiles + action_items + voice",
    nextAction: "Sign in as a student to see the live dashboard",
    status: "live",
  },
  "hub.parent": {
    element: "Parent dashboard preview",
    product: "Parent / guardian dashboard",
    livesAt: "/parent",
    roles: ["parent"],
    dataSource: "linked_students + family_priorities",
    nextAction: "Sign in as a parent to see the live dashboard",
    status: "live",
  },
  "hub.educator": {
    element: "Educator dashboard preview",
    product: "Educator / case-manager dashboard",
    livesAt: "/dashboard",
    roles: ["educator"],
    dataSource: "caseload + action_items + meetings",
    nextAction: "Sign in as an educator to see live caseload data",
    status: "live",
  },
  "hub.school": {
    element: "School admin dashboard preview",
    product: "School admin dashboard",
    livesAt: "/school",
    roles: ["school"],
    dataSource: "school_students + reports + readiness",
    nextAction: "Sign in as a school admin to see live data",
    status: "live",
    notes: "School admins do not automatically see every private document.",
  },
  "hub.district": {
    element: "District admin dashboard preview",
    product: "District admin dashboard",
    livesAt: "/district",
    roles: ["district"],
    dataSource: "district_aggregates",
    nextAction: "Sign in as a district admin to see live aggregates",
    status: "partial",
    notes: "District admins see aggregates by default, not raw IEPs.",
  },
  "hub.partner": {
    element: "Partner workspace preview",
    product: "Partner organization workspace + PartnerForward",
    livesAt: "/partner",
    roles: ["partner"],
    dataSource: "partner_orgs + opportunities + intro_requests",
    nextAction: "Apply to become a verified partner",
    status: "partial",
    notes: "Partners only see matched interest — never private student data.",
  },
  "hub.platform": {
    element: "Platform admin hub preview",
    product: "Platform Admin Hub",
    livesAt: "/admin",
    roles: ["platform"],
    dataSource: "waitlist + invites + roles",
    nextAction: "Sign in as a platform admin to operate the hub",
    status: "live",
  },

  /* ---------- CTAs ---------- */
  "cta.waitlist": {
    element: "Join the waitlist CTA",
    product: "Waitlist signup",
    livesAt: "/waitlist",
    roles: ["student", "parent", "educator", "school", "district"],
    dataSource: "waitlist_entries",
    nextAction: "Join the waitlist — does NOT grant immediate access",
    status: "live",
  },
  "cta.getStarted": {
    element: "Create account / get started CTA",
    product: "Account signup explainer",
    livesAt: "/get-started",
    roles: ["student", "parent", "educator", "school", "district", "partner"],
    dataSource: "—",
    nextAction: "Choose the appropriate signup path for your role",
    status: "live",
  },
  "cta.partner": {
    element: "Apply as partner CTA",
    product: "Partner application",
    livesAt: "/contact?intent=partner",
    roles: ["partner"],
    dataSource: "partner_applications",
    nextAction: "Submit partner application for review",
    status: "live",
  },
  "cta.demoRequest": {
    element: "Request a demo CTA",
    product: "Sales / school pilot contact",
    livesAt: "/contact?intent=demo",
    roles: ["school", "district"],
    dataSource: "contact_requests",
    nextAction: "TransitionForward team replies within 2 business days",
    status: "live",
  },
  /* ---------- Transition Channel (demo preview of signed-in feature) ---------- */
  "channel.tile": {
    element: "Transition Channel dashboard tile",
    product: "Transition Channel — dashboard tile",
    livesAt: "/transition-channel (signed-in)",
    roles: ["student", "parent", "educator", "school", "district", "partner"],
    dataSource: "channels + channel_members + channel_messages",
    nextAction: "Open the channel to reply, pin, or accept a connection request",
    status: "live",
    notes: "Demo tile reads role- and context-scoped fictional bundle; no live query.",
  },
  "channel.page": {
    element: "Transition Channel preview page",
    product: "Transition Channel — full conversation view",
    livesAt: "/transition-channel (signed-in)",
    roles: ["student", "parent", "educator", "school", "district", "partner"],
    dataSource: "channels + channel_messages + channel_connection_requests",
    nextAction: "Sign in to send real replies, pin messages, and accept requests",
    status: "live",
    notes:
      "Every action (send, pin, mark read, add action item, accept/decline request, change notifications) mutates isolated in-memory demo state. No live realtime, mutation, or notification is triggered.",
  },
} as const satisfies Record<string, DemoFeatureEntry>;

export type DemoElementId = keyof typeof DEMO_FEATURE_MAP;

export const DEMO_ELEMENT_IDS = Object.keys(DEMO_FEATURE_MAP) as DemoElementId[];

export function getDemoFeature(id: DemoElementId): DemoFeatureEntry {
  return DEMO_FEATURE_MAP[id];
}
