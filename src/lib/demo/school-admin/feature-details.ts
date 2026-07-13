/**
 * Static demo fixtures powering the School Admin dashboard feature
 * drawers and the /demo/school-admin preview. Nothing here is real data.
 * Fictional building: Hartford Regional High School.
 *
 * Each feature declares:
 *  - what it does, in one sentence
 *  - where its data comes from
 *  - the primary action a school leader can take
 *  - which other tools it connects to
 *  - illustrative stats and preview rows
 *
 * School Admin is a building-level view. Aggregate signals only —
 * never expose individual student IEPs, Student Voice responses,
 * or private notes.
 */

export type SchoolAdminFeatureId =
  | "school-overview"
  | "team-access"
  | "planning-status"
  | "report-completion"
  | "readiness-trends"
  | "resource-usage"
  | "calendar"
  | "support-needs"
  | "implementation";

export type FeatureBullet = { label: string; value?: string; hint?: string };

export type FeatureRow = {
  primary: string;
  secondary?: string;
  meta?: string;
  status?: "ok" | "warning" | "critical" | "muted";
};

export type SchoolAdminFeatureDetail = {
  id: SchoolAdminFeatureId;
  title: string;
  eyebrow: string;
  summary: string;
  what: string;
  dataSource: string;
  primaryAction: { label: string; to: string };
  connectsTo: string[];
  rows: FeatureRow[];
  stats?: FeatureBullet[];
  emptyHeadline: string;
  emptyBody: string;
};

export const SCHOOL_ADMIN_FEATURE_DETAILS: Record<
  SchoolAdminFeatureId,
  SchoolAdminFeatureDetail
> = {
  "school-overview": {
    id: "school-overview",
    title: "School Overview",
    eyebrow: "Building Snapshot",
    summary:
      "Building-level planning status, students connected, reports completed, and the next best step for your school.",
    what: "See where your school stands today and jump into the highest-leverage next action.",
    dataSource: "Roster · staff activity · Pathway Report signals · readiness rollups",
    primaryAction: { label: "Open School Overview", to: "/school/overview" },
    connectsTo: ["Report Completion", "Readiness Trends", "Implementation Progress"],
    stats: [
      { label: "Students connected", value: "148" },
      { label: "Reports complete", value: "62%" },
      { label: "Active staff", value: "11" },
    ],
    rows: [
      { primary: "Hartford Regional HS · Fall 2026", secondary: "Building lead: Dr. Nguyen", status: "ok" },
      { primary: "Next best step: close 6 blocked reports in G12", secondary: "Owner: Ms. Patel", status: "warning" },
      { primary: "Readiness domains on track", secondary: "3 of 4 · self-advocacy trending up", status: "ok" },
      { primary: "Family engagement", secondary: "72% of families active this month", status: "ok" },
    ],
    emptyHeadline: "Your school is being connected.",
    emptyBody:
      "Once staff and students are onboarded, this snapshot will show planning status, reports, and next best steps.",
  },

  "team-access": {
    id: "team-access",
    title: "Team / Staff Access",
    eyebrow: "Who's Doing The Work",
    summary:
      "Your school staff, their roles, access levels, caseload assignments, and pending invites.",
    what: "Invite staff, adjust access, and confirm every case manager is set up before the year starts.",
    dataSource: "Staff invites · role assignments · caseload roster",
    primaryAction: { label: "Manage Staff", to: "/school/team" },
    connectsTo: ["School Overview", "Report Completion", "Implementation Progress"],
    stats: [
      { label: "Active staff", value: "11" },
      { label: "Pending invites", value: "2" },
      { label: "Unassigned caseload", value: "4" },
    ],
    rows: [
      { primary: "Ms. Patel · case manager", secondary: "Caseload of 12 · G11–G12", status: "ok" },
      { primary: "Mr. Ortiz · case manager", secondary: "Caseload of 10 · G10", status: "ok" },
      { primary: "Ms. Alvarez · transition coordinator", secondary: "Building-wide access", status: "ok" },
      { primary: "j.reid@hartfordregional.org", secondary: "Pending · sent Sep 3", meta: "Case manager", status: "warning" },
      { primary: "Unassigned students", secondary: "4 in G10 · need a case manager", status: "warning" },
    ],
    emptyHeadline: "No staff added yet.",
    emptyBody:
      "Invite case managers, transition coordinators, and building admins to start planning.",
  },

  "planning-status": {
    id: "planning-status",
    title: "Student Planning Status",
    eyebrow: "By Grade & Caseload",
    summary:
      "Where every student stands on planning progress — report, meeting, and document milestones, aggregated for you.",
    what: "Filter by grade or case manager and spot the students furthest behind. No private documents surfaced.",
    dataSource: "Planning milestones · roster · caseload assignments",
    primaryAction: { label: "Open Planning Status", to: "/school/planning-status" },
    connectsTo: ["Report Completion", "Team Access", "Support Needs"],
    stats: [
      { label: "In planning", value: "148" },
      { label: "Behind pace", value: "18" },
      { label: "Ready for PPT", value: "27" },
    ],
    rows: [
      { primary: "G12 · 42 students", secondary: "88% on pace · 3 behind", status: "ok" },
      { primary: "G11 · 51 students", secondary: "78% on pace · 8 behind", status: "warning" },
      { primary: "G10 · 55 students", secondary: "72% on pace · 7 behind · 4 unassigned", status: "warning" },
      { primary: "Ms. Patel caseload", secondary: "12 students · 100% on pace", status: "ok" },
      { primary: "Mr. Ortiz caseload", secondary: "10 students · 2 behind", status: "warning" },
    ],
    emptyHeadline: "No planning progress yet.",
    emptyBody:
      "Planning status appears as case managers begin drafting reports and scheduling PPTs.",
  },

  "report-completion": {
    id: "report-completion",
    title: "Report Completion",
    eyebrow: "Where Reports Stand",
    summary:
      "Completed, in-progress, and missing Pathway Reports by grade and caseload — with blockers and next steps.",
    what: "See exactly which reports are stuck and what's blocking them.",
    dataSource: "Pathway Report versions · educator input queue · family upload queue",
    primaryAction: { label: "Open Report Completion", to: "/school/reports" },
    connectsTo: ["Planning Status", "Team Access", "Support Needs"],
    stats: [
      { label: "Complete", value: "92" },
      { label: "In progress", value: "50" },
      { label: "Missing", value: "6" },
    ],
    rows: [
      { primary: "G12 · 40 of 42 complete", secondary: "2 blocked on transition assessment", status: "ok" },
      { primary: "G11 · 30 of 51 complete", secondary: "6 blocked on educator input", status: "warning" },
      { primary: "G10 · 22 of 55 complete", secondary: "Baseline year · on plan", status: "muted" },
      { primary: "Blocker: educator input", secondary: "Owner: 3 case managers · due this week", status: "warning" },
      { primary: "Blocker: family document upload", secondary: "Owner: family · 4 students", status: "warning" },
    ],
    emptyHeadline: "No reports drafted yet.",
    emptyBody:
      "Report completion appears as case managers publish first drafts of Pathway Reports.",
  },

  "readiness-trends": {
    id: "readiness-trends",
    title: "Readiness Trends",
    eyebrow: "Aggregate Growth",
    summary:
      "How your students are moving across employment, education, independent living, and self-advocacy — aggregated only.",
    what: "Spot common gaps at the grade-band level and route resources or training to close them.",
    dataSource: "Student Voice rollups · educator input · readiness scoring · no individual records shown",
    primaryAction: { label: "Open Readiness Trends", to: "/school/readiness-trends" },
    connectsTo: ["Resource Usage", "Support Needs", "Report Completion"],
    stats: [
      { label: "On track", value: "68%" },
      { label: "Needs support", value: "24%" },
      { label: "Critical", value: "8%" },
    ],
    rows: [
      { primary: "Self-advocacy · trending up", secondary: "+9 pts vs last term", status: "ok" },
      { primary: "Employment readiness · flat", secondary: "G12 cohort at 61%", status: "warning" },
      { primary: "Independent living · watch", secondary: "G11 cohort down 4 pts", status: "warning" },
      { primary: "Post-secondary education · strong", secondary: "All grade bands ≥ 74%", status: "ok" },
    ],
    emptyHeadline: "Not enough data for trends yet.",
    emptyBody:
      "As Student Voice responses and educator inputs accumulate, aggregate trends will appear here.",
  },

  "resource-usage": {
    id: "resource-usage",
    title: "Resource Usage",
    eyebrow: "What Your School Uses",
    summary:
      "The guides and toolkits your staff and families actually open — plus recommendations for gaps.",
    what: "See what's landing, spot resource gaps, and share the top picks with your team.",
    dataSource: "Anonymized open/save events · recommendation engine",
    primaryAction: { label: "Open Resource Usage", to: "/school/resource-usage" },
    connectsTo: ["Readiness Trends", "Support Needs"],
    stats: [
      { label: "Opens this month", value: "412" },
      { label: "Unique resources", value: "38" },
      { label: "Recommended not opened", value: "7" },
    ],
    rows: [
      { primary: "PPT Meeting Questions", secondary: "Family · 62 opens", status: "ok" },
      { primary: "Age-of-Majority Guide", secondary: "Family · 41 opens", status: "ok" },
      { primary: "Employment Readiness Toolkit", secondary: "Staff · 28 opens", status: "ok" },
      { primary: "Adult Services Handoff Guide", secondary: "Recommended · 0 opens in G12", status: "warning" },
      { primary: "Travel Training Toolkit", secondary: "Recommended · 2 opens · gap flagged", status: "warning" },
    ],
    emptyHeadline: "No resource activity yet.",
    emptyBody:
      "Once staff and families start using recommended resources, engagement summaries appear here.",
  },

  calendar: {
    id: "calendar",
    title: "Calendar",
    eyebrow: "School-Wide Dates",
    summary:
      "School-level meetings, transition planning deadlines, and staff implementation dates — one view.",
    what: "See what's this week for the building and export dates to your school calendar.",
    dataSource: "PPT scheduling · staff training calendar · report deadlines",
    primaryAction: { label: "Open Calendar", to: "/school/calendar" },
    connectsTo: ["Team Access", "Implementation Progress"],
    stats: [
      { label: "This week", value: "6" },
      { label: "Next 30 days", value: "23" },
      { label: "Report deadlines", value: "4" },
    ],
    rows: [
      { primary: "PPT block · G12 cohort", secondary: "Sep 15 · 8:00 AM–3:00 PM", meta: "Room 214", status: "warning" },
      { primary: "Case manager sync", secondary: "Sep 16 · 3:15 PM", status: "muted" },
      { primary: "Transition planning training", secondary: "Sep 22 · 2:00 PM · staff PD", status: "muted" },
      { primary: "Q1 report deadline", secondary: "Oct 1 · all G12 reports due", status: "warning" },
    ],
    emptyHeadline: "No school events scheduled.",
    emptyBody:
      "Once meetings, PDs, and report deadlines are set, they'll appear here with filters.",
  },

  "support-needs": {
    id: "support-needs",
    title: "Support Needs",
    eyebrow: "Where Your School Needs Help",
    summary:
      "School-wide support gaps — staffing, training, and implementation blockers — with recommended next actions.",
    what: "Turn observed gaps into concrete asks: coaching, training, or district support.",
    dataSource: "Team activity · report blockers · resource-usage gaps · caseload load",
    primaryAction: { label: "Open Support Needs", to: "/school/support-needs" },
    connectsTo: ["Readiness Trends", "Resource Usage", "Implementation Progress"],
    stats: [
      { label: "Open flags", value: "5" },
      { label: "Staffing", value: "2" },
      { label: "Training", value: "2" },
    ],
    rows: [
      { primary: "G10 caseload has 4 unassigned students", secondary: "Recommend: reassign or add a case manager", status: "critical" },
      { primary: "Employment readiness plateauing in G12", secondary: "Recommend: WBL coordinator PD", status: "warning" },
      { primary: "Adult services handoff guide unused", secondary: "Recommend: 20-min all-staff walkthrough", status: "warning" },
      { primary: "Family upload lag on 4 IEPs", secondary: "Recommend: family outreach nudges", status: "warning" },
      { primary: "Mr. Ortiz caseload overloaded", secondary: "Recommend: rebalance by Oct 1", status: "warning" },
    ],
    emptyHeadline: "No support flags right now.",
    emptyBody:
      "Support needs appear as blockers, staffing gaps, or usage dips are detected.",
  },

  implementation: {
    id: "implementation",
    title: "Implementation Progress",
    eyebrow: "Launch Readiness",
    summary:
      "Onboarding status, staff participation, student connection progress, and the next milestone for your building.",
    what: "See how launch is progressing and confirm the next milestone owner.",
    dataSource: "Onboarding checklist · staff activation · student connection events",
    primaryAction: { label: "Open Implementation", to: "/school/implementation" },
    connectsTo: ["Team Access", "School Overview", "Support Needs"],
    stats: [
      { label: "Milestones done", value: "6 of 9" },
      { label: "Staff active", value: "11 of 13" },
      { label: "Students connected", value: "148 of 160" },
    ],
    rows: [
      { primary: "Staff onboarding", secondary: "11 of 13 complete", status: "ok" },
      { primary: "Roster import", secondary: "Complete · Aug 25", status: "ok" },
      { primary: "Family launch communications", secondary: "Sent · Aug 30", status: "ok" },
      { primary: "First PPT block scheduled", secondary: "Sep 15", status: "ok" },
      { primary: "Milestone: publish first cohort of Pathway Reports", secondary: "Owner: case managers · due Oct 1", status: "warning" },
      { primary: "Milestone: district readiness review", secondary: "Owner: Dr. Nguyen · Oct 15", status: "muted" },
    ],
    emptyHeadline: "Launch hasn't started yet.",
    emptyBody:
      "Milestones appear as your school kicks off onboarding, staff activation, and student connection.",
  },
};

export const SCHOOL_ADMIN_FEATURE_ORDER: SchoolAdminFeatureId[] = [
  "school-overview",
  "team-access",
  "planning-status",
  "report-completion",
  "readiness-trends",
  "resource-usage",
  "calendar",
  "support-needs",
  "implementation",
];
