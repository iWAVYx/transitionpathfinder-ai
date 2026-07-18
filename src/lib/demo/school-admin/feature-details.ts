/**
 * Static demo fixtures powering the School Admin dashboard feature
 * drawers and the /demo/school-admin preview. Nothing here is real data.
 *
 * The dashboard has TWO fictional school profiles the demo can switch
 * between:
 *   - Riverbend Comprehensive HS (large general-education building)
 *   - Northgate Specialized Learning Center (small specialized program)
 *
 * Each profile owns its own complete dataset — rows, staff, calendar,
 * support needs, and implementation milestones are hand-written per
 * school. Nothing is shared or reused between them.
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
  | "implementation"
  | "partner-network";

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

export type SchoolProfileKey = "comprehensive" | "specialized";

/* ─────────── COMPREHENSIVE: Riverbend HS ─────────── */

const COMPREHENSIVE: Record<SchoolAdminFeatureId, SchoolAdminFeatureDetail> = {
  "school-overview": {
    id: "school-overview",
    title: "School Overview",
    eyebrow: "Building Snapshot",
    summary:
      "Building-level planning status for a comprehensive high school — students, staff, reports, and the next best step.",
    what: "See where Riverbend stands today and jump into the highest-leverage next action.",
    dataSource: "Roster · staff activity · Pathway Report signals · readiness rollups",
    primaryAction: { label: "Open School Overview", to: "/school/overview" },
    connectsTo: ["Report Completion", "Readiness Trends", "Implementation Progress"],
    stats: [
      { label: "Students on IEPs", value: "168" },
      { label: "Reports complete", value: "68%" },
      { label: "Active educators", value: "22" },
    ],
    rows: [
      { primary: "Riverbend Comprehensive HS · Fall 2026", secondary: "Building lead: Dr. Nguyen · 1,420 total enrollment", status: "ok" },
      { primary: "Next best step: unblock 6 G12 reports", secondary: "Blocked on transition assessment · owner: Ms. Patel", status: "warning" },
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
      "Case managers, general-ed teachers, and specialists across a 22-educator building. Roles, access, caseload assignments, and invites.",
    what: "Invite staff, adjust access, and confirm every case manager is set up before the year starts.",
    dataSource: "Staff invites · role assignments · caseload roster",
    primaryAction: { label: "Manage Staff", to: "/school/team" },
    connectsTo: ["School Overview", "Report Completion", "Implementation Progress"],
    stats: [
      { label: "Active educators", value: "22" },
      { label: "Pending invites", value: "3" },
      { label: "Case managers", value: "9" },
    ],
    rows: [
      { primary: "Ms. Patel · case manager", secondary: "Caseload of 18 · G11–G12", status: "ok" },
      { primary: "Mr. Ortiz · case manager", secondary: "Caseload of 21 · G10 · overloaded", status: "warning" },
      { primary: "Ms. Alvarez · transition coordinator", secondary: "Building-wide caseload of 168", status: "ok" },
      { primary: "j.reid@riverbendhs.org", secondary: "Pending · sent Sep 3", meta: "Case manager", status: "warning" },
      { primary: "Unassigned students", secondary: "3 in G10 · need a case manager", status: "warning" },
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
      "Where every one of the 168 IEP students stands on planning progress — aggregated for you.",
    what: "Filter by grade or case manager and spot the students furthest behind. No private documents surfaced.",
    dataSource: "Planning milestones · roster · caseload assignments",
    primaryAction: { label: "Open Planning Status", to: "/school/planning-status" },
    connectsTo: ["Report Completion", "Team Access", "Support Needs"],
    stats: [
      { label: "In planning", value: "168" },
      { label: "Behind pace", value: "24" },
      { label: "Ready for PPT", value: "37" },
    ],
    rows: [
      { primary: "G12 · 46 students", secondary: "88% on pace · 5 behind", status: "ok" },
      { primary: "G11 · 58 students", secondary: "72% on pace · 12 behind · top gap: travel training", status: "warning" },
      { primary: "G10 · 44 students", secondary: "77% on pace · 7 behind · 3 unassigned", status: "warning" },
      { primary: "G9 · 20 students", secondary: "Baseline year · 90% on pace", status: "ok" },
      { primary: "Mr. Ortiz caseload", secondary: "21 students · caseload overloaded", status: "warning" },
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
      "97 completed, 31 in-progress, and 6 missing Pathway Reports across the building — with blockers by grade.",
    what: "See exactly which reports are stuck and what's blocking them.",
    dataSource: "Pathway Report versions · educator input queue · family upload queue",
    primaryAction: { label: "Open Report Completion", to: "/school/reports" },
    connectsTo: ["Planning Status", "Team Access", "Support Needs"],
    stats: [
      { label: "Complete", value: "97" },
      { label: "In progress", value: "31" },
      { label: "Missing", value: "6" },
    ],
    rows: [
      { primary: "G12 · 41 of 46 complete", secondary: "5 blocked on transition assessment", status: "warning" },
      { primary: "G11 · 34 of 58 complete", secondary: "9 in general-ed teacher input", status: "warning" },
      { primary: "G10 · 22 of 44 complete", secondary: "Baseline year · on plan", status: "muted" },
      { primary: "Blocker: educator input", secondary: "Owner: 3 case managers · due this week", status: "warning" },
      { primary: "Blocker: family document upload", secondary: "Owner: family · 6 students", status: "warning" },
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
      "How the 168 IEP students are moving across employment, education, independent living, and self-advocacy — aggregate only.",
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
      { primary: "Self-advocacy · trending up", secondary: "+9 pts vs last term (large cohort)", status: "ok" },
      { primary: "Employment readiness · flat", secondary: "G12 cohort at 61% · WBL slots limited", status: "warning" },
      { primary: "Independent living · watch", secondary: "G11 cohort down 4 pts · travel training gap", status: "warning" },
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
      "412 opens across 38 resources this month — plus recommendations for the gaps a large building always has.",
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
      { primary: "Travel Training Toolkit", secondary: "Recommended · 2 opens · G11 gap flagged", status: "warning" },
      { primary: "Adult Services Handoff Guide", secondary: "Recommended · 0 opens in G12", status: "warning" },
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
      "Meetings, deadlines, and staff PDs across a comprehensive high school — one view.",
    what: "See what's this week for the building and export dates to your school calendar.",
    dataSource: "PPT scheduling · staff training calendar · report deadlines",
    primaryAction: { label: "Open Calendar", to: "/school/calendar" },
    connectsTo: ["Team Access", "Implementation Progress"],
    stats: [
      { label: "This week", value: "6" },
      { label: "Next 30 days", value: "23" },
      { label: "Report deadlines", value: "12" },
    ],
    rows: [
      { primary: "PPT block · G12 cohort", secondary: "Sep 15 · 8:00 AM–3:00 PM", meta: "Room 214", status: "warning" },
      { primary: "Case manager sync", secondary: "Sep 16 · 3:15 PM", status: "muted" },
      { primary: "Transition planning PD (all-staff)", secondary: "Sep 22 · 2:00 PM", status: "muted" },
      { primary: "12 PPTs due within 4 weeks", secondary: "Distributed across 9 case managers", status: "warning" },
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
      "Building-wide gaps — staffing, training, and implementation blockers — with recommended next actions.",
    what: "Turn observed gaps into concrete asks: coaching, training, or district support.",
    dataSource: "Team activity · report blockers · resource-usage gaps · caseload load",
    primaryAction: { label: "Open Support Needs", to: "/school/support-needs" },
    connectsTo: ["Readiness Trends", "Resource Usage", "Implementation Progress"],
    stats: [
      { label: "Open flags", value: "6" },
      { label: "Staffing", value: "2" },
      { label: "Training", value: "3" },
    ],
    rows: [
      { primary: "G11 travel training gap", secondary: "Top gap · 12 students affected · recommend: add community mobility unit", status: "critical" },
      { primary: "Mr. Ortiz caseload overloaded (21)", secondary: "Recommend: rebalance by Oct 1", status: "warning" },
      { primary: "G10 has 3 unassigned students", secondary: "Recommend: reassign or add a case manager", status: "warning" },
      { primary: "Employment readiness plateauing in G12", secondary: "Recommend: WBL coordinator PD", status: "warning" },
      { primary: "Adult services handoff guide unused", secondary: "Recommend: 20-min all-staff walkthrough", status: "warning" },
      { primary: "Family upload lag on 6 IEPs", secondary: "Recommend: family outreach nudges", status: "warning" },
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
      "Onboarding, staff participation, student connection progress across 22 educators and 168 IEPs.",
    what: "See how launch is progressing and confirm the next milestone owner.",
    dataSource: "Onboarding checklist · staff activation · student connection events",
    primaryAction: { label: "Open Implementation", to: "/school/implementation" },
    connectsTo: ["Team Access", "School Overview", "Support Needs"],
    stats: [
      { label: "Milestones done", value: "6 of 9" },
      { label: "Staff active", value: "22 of 25" },
      { label: "Students connected", value: "168 of 175" },
    ],
    rows: [
      { primary: "Staff onboarding", secondary: "22 of 25 complete · 3 pending invites", status: "ok" },
      { primary: "Roster import", secondary: "Complete · Aug 25", status: "ok" },
      { primary: "Family launch communications", secondary: "Sent · Aug 30", status: "ok" },
      { primary: "First PPT block scheduled", secondary: "Sep 15", status: "ok" },
      { primary: "Milestone: publish G12 cohort of Pathway Reports", secondary: "Owner: case managers · due Oct 1", status: "warning" },
      { primary: "Milestone: district readiness review", secondary: "Owner: Dr. Nguyen · Oct 15", status: "muted" },
    ],
    emptyHeadline: "Launch hasn't started yet.",
    emptyBody:
      "Milestones appear as your school kicks off onboarding, staff activation, and student connection.",
  },

  "partner-network": {
    id: "partner-network",
    title: "Partner Network",
    eyebrow: "Community Partners",
    summary:
      "Community partners active with Riverbend — coverage across pathways, programs, and referral flow.",
    what: "See which partners cover which pathways at Riverbend and open the full Partner Network.",
    dataSource: "Verified partner directory · school referrals · MOU status",
    primaryAction: { label: "Open Partner Network", to: "/partner-network" },
    connectsTo: ["Report Completion", "Readiness Trends", "Implementation Progress"],
    stats: [
      { label: "Active partners", value: "12" },
      { label: "Active MOUs", value: "5" },
      { label: "Coverage gaps", value: "2" },
    ],
    rows: [
      { primary: "Oakwood Animal Rescue · vocational strand", secondary: "MOU active · 6 students placed", meta: "Verified", status: "ok" },
      { primary: "Capital CC Applied Tech · dual enrollment", secondary: "3 juniors enrolled this term", meta: "Verified", status: "ok" },
      { primary: "Youth Employment Services · summer track", secondary: "12 students eligible", meta: "MOU renews Oct", status: "warning" },
      { primary: "Coverage gap · independent-living support", secondary: "No verified partner in service area", meta: "Recruit", status: "critical" },
    ],
    emptyHeadline: "No partner coverage yet.",
    emptyBody:
      "As Riverbend refers students and MOUs post, coverage will show up here.",
  },
};

/* ─────────── SPECIALIZED: Northgate Center ─────────── */

const SPECIALIZED: Record<SchoolAdminFeatureId, SchoolAdminFeatureDetail> = {
  "school-overview": {
    id: "school-overview",
    title: "School Overview",
    eyebrow: "Program Snapshot",
    summary:
      "Program-level view of a specialized transition center — 94 students on IEPs, ages 14–22, deep multidisciplinary teams.",
    what: "See where Northgate stands today and confirm the highest-leverage handoff for this week.",
    dataSource: "Roster · multidisciplinary team activity · Pathway Report signals · CBI logs",
    primaryAction: { label: "Open School Overview", to: "/school/overview" },
    connectsTo: ["Report Completion", "Readiness Trends", "Implementation Progress"],
    stats: [
      { label: "Students on IEPs", value: "94" },
      { label: "Reports complete", value: "82%" },
      { label: "Team members", value: "18" },
    ],
    rows: [
      { primary: "Northgate Specialized Learning Center · Fall 2026", secondary: "Director: Ms. Cortez · full IEP caseload (94/94)", status: "ok" },
      { primary: "Next best step: schedule 4 adult-services warm handoffs", secondary: "Ages 18–22 · owner: transition team", status: "warning" },
      { primary: "Community-based instruction", secondary: "6 CBI outings in next 3 weeks", status: "ok" },
      { primary: "Family partnership", secondary: "88% of families in weekly contact", status: "ok" },
    ],
    emptyHeadline: "Your program is being connected.",
    emptyBody:
      "Once your multidisciplinary team is onboarded, this snapshot will show program status and next handoffs.",
  },

  "team-access": {
    id: "team-access",
    title: "Team / Staff Access",
    eyebrow: "Multidisciplinary Team",
    summary:
      "Special educators, SLP, OT, PT, transition coordinators, and job coaches — 18 team members serving 94 students.",
    what: "Confirm every discipline is represented and every student has a lead case manager and a transition partner.",
    dataSource: "Staff invites · discipline roles · caseload roster",
    primaryAction: { label: "Manage Staff", to: "/school/team" },
    connectsTo: ["School Overview", "Report Completion", "Implementation Progress"],
    stats: [
      { label: "Active team", value: "18" },
      { label: "Pending invites", value: "1" },
      { label: "Case managers", value: "12" },
    ],
    rows: [
      { primary: "Ms. Cortez · program director", secondary: "Program-wide access", status: "ok" },
      { primary: "Mr. Diaz · lead job coach", secondary: "12 students in community placements", status: "ok" },
      { primary: "Dr. Hall · SLP", secondary: "Serves 41 students · AAC lead", status: "ok" },
      { primary: "Ms. Lin · OT", secondary: "Serves 33 students", status: "ok" },
      { primary: "k.harper@northgate.org", secondary: "Pending · sent Sep 6", meta: "Transition coordinator", status: "warning" },
    ],
    emptyHeadline: "No team added yet.",
    emptyBody:
      "Invite special educators, related-service providers, and job coaches to start planning.",
  },

  "planning-status": {
    id: "planning-status",
    title: "Student Planning Status",
    eyebrow: "By Age Band & Team",
    summary:
      "Where all 94 students stand — organized by age band 14–17 vs 18–22, with transition-team ownership.",
    what: "Spot students furthest behind on adult-services planning. No private documents surfaced.",
    dataSource: "Planning milestones · roster · discipline assignments",
    primaryAction: { label: "Open Planning Status", to: "/school/planning-status" },
    connectsTo: ["Report Completion", "Team Access", "Support Needs"],
    stats: [
      { label: "In planning", value: "94" },
      { label: "Behind pace", value: "6" },
      { label: "Ready for PPT", value: "14" },
    ],
    rows: [
      { primary: "Ages 18–22 · 34 students", secondary: "88% on pace · 4 need adult-services handoff", status: "warning" },
      { primary: "Ages 16–17 · 30 students", secondary: "93% on pace · CBI plans set", status: "ok" },
      { primary: "Ages 14–15 · 30 students", secondary: "100% on pace · introductory year", status: "ok" },
      { primary: "AAC caseload (Dr. Hall)", secondary: "12 students · 100% on pace", status: "ok" },
      { primary: "Job-coach caseload (Mr. Diaz)", secondary: "12 students · 2 mid-cycle placements", status: "ok" },
    ],
    emptyHeadline: "No planning progress yet.",
    emptyBody:
      "Planning status appears as the team begins drafting reports and scheduling PPTs.",
  },

  "report-completion": {
    id: "report-completion",
    title: "Report Completion",
    eyebrow: "Where Reports Stand",
    summary:
      "71 completed, 18 in-progress, and 5 missing Pathway Reports across the specialized program.",
    what: "See exactly which reports are stuck and which discipline owes the input.",
    dataSource: "Pathway Report versions · discipline input queue · family upload queue",
    primaryAction: { label: "Open Report Completion", to: "/school/reports" },
    connectsTo: ["Planning Status", "Team Access", "Support Needs"],
    stats: [
      { label: "Complete", value: "71" },
      { label: "In progress", value: "18" },
      { label: "Missing", value: "5" },
    ],
    rows: [
      { primary: "Ages 18–22 · 30 of 34 complete", secondary: "4 blocked on agency coordination", status: "warning" },
      { primary: "Ages 16–17 · 26 of 30 complete", secondary: "3 blocked on OT/PT input", status: "warning" },
      { primary: "Ages 14–15 · 15 of 30 complete", secondary: "Introductory year · on plan", status: "muted" },
      { primary: "Blocker: agency coordination", secondary: "Owner: transition team · 4 handoffs pending", status: "warning" },
      { primary: "Blocker: OT input queue", secondary: "Owner: Ms. Lin · 3 students", status: "warning" },
    ],
    emptyHeadline: "No reports drafted yet.",
    emptyBody:
      "Report completion appears as the team publishes first drafts of Pathway Reports.",
  },

  "readiness-trends": {
    id: "readiness-trends",
    title: "Readiness Trends",
    eyebrow: "Aggregate Growth",
    summary:
      "How the 94 students are moving across employment, education, independent living, and self-advocacy — small-cohort resolution.",
    what: "Spot cohort-level gaps and route related-service or CBI resources to close them.",
    dataSource: "Student Voice rollups · discipline input · readiness scoring · no individual records shown",
    primaryAction: { label: "Open Readiness Trends", to: "/school/readiness-trends" },
    connectsTo: ["Resource Usage", "Support Needs", "Report Completion"],
    stats: [
      { label: "On track", value: "76%" },
      { label: "Needs support", value: "18%" },
      { label: "Critical", value: "6%" },
    ],
    rows: [
      { primary: "Independent living · trending up", secondary: "+11 pts · CBI outings driving gains", status: "ok" },
      { primary: "Employment readiness · steady", secondary: "Ages 18–22 at 72% · WBL slots stable", status: "ok" },
      { primary: "Self-advocacy · watch", secondary: "AAC users cohort down 3 pts · voice output practice needed", status: "warning" },
      { primary: "Post-secondary transition · gap", secondary: "Ages 18–22 · 5 without confirmed adult day placement", status: "critical" },
    ],
    emptyHeadline: "Not enough data for trends yet.",
    emptyBody:
      "As Student Voice responses and discipline inputs accumulate, aggregate trends will appear here.",
  },

  "resource-usage": {
    id: "resource-usage",
    title: "Resource Usage",
    eyebrow: "What Your Team Uses",
    summary:
      "138 opens across 24 resources this month — with recommendations tuned to a specialized program.",
    what: "See what's landing, spot resource gaps, and share the top picks with your team.",
    dataSource: "Anonymized open/save events · recommendation engine",
    primaryAction: { label: "Open Resource Usage", to: "/school/resource-usage" },
    connectsTo: ["Readiness Trends", "Support Needs"],
    stats: [
      { label: "Opens this month", value: "138" },
      { label: "Unique resources", value: "24" },
      { label: "Recommended not opened", value: "4" },
    ],
    rows: [
      { primary: "Adult Services Handoff Guide", secondary: "Team · 34 opens", status: "ok" },
      { primary: "AAC in the Community Toolkit", secondary: "Team · 22 opens", status: "ok" },
      { primary: "Age-of-Majority Guide (plain language)", secondary: "Family · 19 opens", status: "ok" },
      { primary: "Person-Centered Planning Facilitator Guide", secondary: "Recommended · 3 opens · gap flagged", status: "warning" },
      { primary: "Guardianship Alternatives Guide", secondary: "Recommended · 1 open · ages 17+ gap", status: "warning" },
    ],
    emptyHeadline: "No resource activity yet.",
    emptyBody:
      "Once the team and families start using recommended resources, engagement summaries appear here.",
  },

  calendar: {
    id: "calendar",
    title: "Calendar",
    eyebrow: "Program-Wide Dates",
    summary:
      "PPTs, CBI outings, agency visits, and multidisciplinary team meetings — one view for the program.",
    what: "See what's this week and export dates to your program calendar.",
    dataSource: "PPT scheduling · CBI calendar · agency meeting calendar",
    primaryAction: { label: "Open Calendar", to: "/school/calendar" },
    connectsTo: ["Team Access", "Implementation Progress"],
    stats: [
      { label: "This week", value: "8" },
      { label: "Next 30 days", value: "31" },
      { label: "CBI outings", value: "6" },
    ],
    rows: [
      { primary: "CBI outing · downtown transit training", secondary: "Sep 15 · 9:00 AM · 6 students", status: "ok" },
      { primary: "Agency visit · DDS regional office", secondary: "Sep 17 · 1:00 PM · 4 families", status: "warning" },
      { primary: "Multidisciplinary team meeting", secondary: "Sep 18 · 3:00 PM · full team", status: "muted" },
      { primary: "6 CBI outings in next 3 weeks", secondary: "Community-based instruction schedule", status: "ok" },
      { primary: "Q1 exit-planning deadline", secondary: "Oct 1 · ages 18–22 cohort", status: "warning" },
    ],
    emptyHeadline: "No program events scheduled.",
    emptyBody:
      "Once PPTs, CBI outings, and agency visits are scheduled, they'll appear here with filters.",
  },

  "support-needs": {
    id: "support-needs",
    title: "Support Needs",
    eyebrow: "Where Your Program Needs Help",
    summary:
      "Program-wide gaps — agency coordination, related-service capacity, and CBI logistics — with recommended next actions.",
    what: "Turn observed gaps into concrete asks: agency handoffs, related-service PD, or transportation.",
    dataSource: "Team activity · report blockers · agency handoff queue · CBI logistics",
    primaryAction: { label: "Open Support Needs", to: "/school/support-needs" },
    connectsTo: ["Readiness Trends", "Resource Usage", "Implementation Progress"],
    stats: [
      { label: "Open flags", value: "5" },
      { label: "Agency coordination", value: "2" },
      { label: "Related services", value: "2" },
    ],
    rows: [
      { primary: "Adult-services handoffs behind", secondary: "Top gap · 4 students in ages 18–22 · recommend: DDS liaison time", status: "critical" },
      { primary: "OT input queue backed up", secondary: "3 report drafts waiting · recommend: OT scheduling audit", status: "warning" },
      { primary: "CBI transportation constraint", secondary: "1 outing per week cap · recommend: van share with sister program", status: "warning" },
      { primary: "AAC voice output PD needed", secondary: "Team-wide · recommend: 60-min PD with Dr. Hall", status: "warning" },
      { primary: "Person-centered planning underutilized", secondary: "Recommend: facilitator training for 3 staff", status: "warning" },
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
      "Onboarding across 18 team members and 94 IEPs, plus the specialized program's next milestone.",
    what: "See how launch is progressing and confirm the next milestone owner.",
    dataSource: "Onboarding checklist · team activation · student connection events",
    primaryAction: { label: "Open Implementation", to: "/school/implementation" },
    connectsTo: ["Team Access", "School Overview", "Support Needs"],
    stats: [
      { label: "Milestones done", value: "8 of 10" },
      { label: "Team active", value: "18 of 19" },
      { label: "Students connected", value: "94 of 94" },
    ],
    rows: [
      { primary: "Team onboarding", secondary: "18 of 19 complete · 1 pending invite", status: "ok" },
      { primary: "Roster import", secondary: "Complete · Aug 22", status: "ok" },
      { primary: "AAC access review", secondary: "Complete · Sep 5", status: "ok" },
      { primary: "CBI schedule published", secondary: "6 outings across 3 weeks", status: "ok" },
      { primary: "Adult-services partner list confirmed", secondary: "DDS · BRS · local voc program", status: "ok" },
      { primary: "Milestone: exit-planning cohort published", secondary: "Owner: transition team · due Oct 1", status: "warning" },
      { primary: "Milestone: district readiness review", secondary: "Owner: Ms. Cortez · Oct 15", status: "muted" },
    ],
    emptyHeadline: "Launch hasn't started yet.",
    emptyBody:
      "Milestones appear as your program kicks off onboarding, team activation, and student connection.",
  },

  "partner-network": {
    id: "partner-network",
    title: "Partner Network",
    eyebrow: "Community Partners",
    summary:
      "Specialized-program partners active with Northgate — CBI sites, adult-services partners, and post-exit connections.",
    what: "See which agencies and community sites serve Northgate students and open the full Partner Network.",
    dataSource: "Verified partner directory · CBI placements · adult-services roster",
    primaryAction: { label: "Open Partner Network", to: "/partner-network" },
    connectsTo: ["Support Needs", "Implementation Progress", "Readiness Trends"],
    stats: [
      { label: "Active partners", value: "8" },
      { label: "CBI sites", value: "4" },
      { label: "Coverage gaps", value: "1" },
    ],
    rows: [
      { primary: "Riverbend Culinary Arts · weekly CBI", secondary: "6 students placed", meta: "Verified", status: "ok" },
      { primary: "DDS regional office · adult-services intake", secondary: "Confirmed for exit cohort", meta: "MOU active", status: "ok" },
      { primary: "BRS · pre-employment services", secondary: "4 students enrolled", meta: "Verified", status: "ok" },
      { primary: "Coverage gap · assistive-tech vendor", secondary: "Sourcing partner in service area", meta: "Recruit", status: "warning" },
    ],
    emptyHeadline: "No partner coverage yet.",
    emptyBody:
      "As Northgate places students at CBI sites and connects adult-services partners, coverage will show up here.",
  },
};

/* ─────────── Exports ─────────── */

export const SCHOOL_ADMIN_FEATURE_DETAILS_BY_SCHOOL: Record<
  SchoolProfileKey,
  Record<SchoolAdminFeatureId, SchoolAdminFeatureDetail>
> = {
  comprehensive: COMPREHENSIVE,
  specialized: SPECIALIZED,
};

/** Back-compat: default export = comprehensive school. */
export const SCHOOL_ADMIN_FEATURE_DETAILS: Record<
  SchoolAdminFeatureId,
  SchoolAdminFeatureDetail
> = COMPREHENSIVE;

export function getSchoolAdminFeatureDetails(
  schoolId: SchoolProfileKey,
): Record<SchoolAdminFeatureId, SchoolAdminFeatureDetail> {
  return SCHOOL_ADMIN_FEATURE_DETAILS_BY_SCHOOL[schoolId] ?? COMPREHENSIVE;
}

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

/* ─────────── Tile metadata per school ─────────── */

export type SchoolTileMeta = {
  status: string;
  tone: "default" | "success" | "warning" | "critical" | "muted";
  bullets: { label: string; value: string }[];
};

export const SCHOOL_ADMIN_TILE_META_BY_SCHOOL: Record<
  SchoolProfileKey,
  Partial<Record<SchoolAdminFeatureId, SchoolTileMeta>>
> = {
  comprehensive: {
    "school-overview": {
      status: "168 IEPs",
      tone: "default",
      bullets: [
        { label: "Reports complete", value: "68%" },
        { label: "Active staff", value: "22" },
      ],
    },
    "team-access": {
      status: "3 pending",
      tone: "warning",
      bullets: [
        { label: "Active", value: "22" },
        { label: "Unassigned caseload", value: "3" },
      ],
    },
    "planning-status": {
      status: "24 behind",
      tone: "warning",
      bullets: [
        { label: "In planning", value: "168" },
        { label: "Ready for PPT", value: "37" },
      ],
    },
    "report-completion": {
      status: "6 missing",
      tone: "warning",
      bullets: [
        { label: "Complete", value: "97" },
        { label: "In progress", value: "31" },
      ],
    },
    "readiness-trends": {
      status: "This term",
      tone: "success",
      bullets: [
        { label: "On track", value: "68%" },
        { label: "Needs support", value: "24%" },
      ],
    },
    "resource-usage": {
      status: "412 opens",
      tone: "muted",
      bullets: [
        { label: "Unique resources", value: "38" },
        { label: "Recommended unopened", value: "7" },
      ],
    },
    calendar: {
      status: "6 this week",
      tone: "muted",
      bullets: [
        { label: "Next 30 days", value: "23" },
        { label: "Report deadlines", value: "12" },
      ],
    },
    "support-needs": {
      status: "6 open",
      tone: "critical",
      bullets: [
        { label: "Staffing", value: "2" },
        { label: "Training", value: "3" },
      ],
    },
    implementation: {
      status: "6 of 9",
      tone: "default",
      bullets: [
        { label: "Staff active", value: "22 of 25" },
        { label: "Students connected", value: "168 of 175" },
      ],
    },
  },
  specialized: {
    "school-overview": {
      status: "94 IEPs",
      tone: "default",
      bullets: [
        { label: "Reports complete", value: "82%" },
        { label: "Team members", value: "18" },
      ],
    },
    "team-access": {
      status: "1 pending",
      tone: "warning",
      bullets: [
        { label: "Active team", value: "18" },
        { label: "Case managers", value: "12" },
      ],
    },
    "planning-status": {
      status: "6 behind",
      tone: "warning",
      bullets: [
        { label: "In planning", value: "94" },
        { label: "Ready for PPT", value: "14" },
      ],
    },
    "report-completion": {
      status: "5 missing",
      tone: "warning",
      bullets: [
        { label: "Complete", value: "71" },
        { label: "In progress", value: "18" },
      ],
    },
    "readiness-trends": {
      status: "This term",
      tone: "success",
      bullets: [
        { label: "On track", value: "76%" },
        { label: "Needs support", value: "18%" },
      ],
    },
    "resource-usage": {
      status: "138 opens",
      tone: "muted",
      bullets: [
        { label: "Unique resources", value: "24" },
        { label: "Recommended unopened", value: "4" },
      ],
    },
    calendar: {
      status: "8 this week",
      tone: "muted",
      bullets: [
        { label: "CBI outings", value: "6" },
        { label: "Next 30 days", value: "31" },
      ],
    },
    "support-needs": {
      status: "5 open",
      tone: "critical",
      bullets: [
        { label: "Agency coordination", value: "2" },
        { label: "Related services", value: "2" },
      ],
    },
    implementation: {
      status: "8 of 10",
      tone: "default",
      bullets: [
        { label: "Team active", value: "18 of 19" },
        { label: "Students connected", value: "94 of 94" },
      ],
    },
  },
};
