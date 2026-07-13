/**
 * Static demo fixtures powering the Educator / Case Manager dashboard
 * feature drawers and the /demo/educator preview. Nothing here is real
 * data. Shared fictional caseload includes Jordan Rivera (G11), Maya
 * Chen (G12), Aiden Brooks (G10), and 5 others.
 *
 * Each feature declares:
 *  - what it does, in one sentence
 *  - where its data comes from
 *  - the primary action an educator can take
 *  - which other tools it connects to
 *  - illustrative stats and preview rows
 *
 * The shared drawer renders polished loading / empty / error / permission
 * / ready states based on the `state` prop passed in at render time.
 */

export type EducatorFeatureId =
  | "caseload"
  | "readiness"
  | "pending-input"
  | "pathway-reports"
  | "meeting-prep"
  | "case-notes"
  | "action-items"
  | "calendar"
  | "documents";

export type FeatureBullet = { label: string; value?: string; hint?: string };

export type FeatureRow = {
  primary: string;
  secondary?: string;
  meta?: string;
  status?: "ok" | "warning" | "critical" | "muted";
};

export type EducatorFeatureDetail = {
  id: EducatorFeatureId;
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

export const EDUCATOR_FEATURE_DETAILS: Record<EducatorFeatureId, EducatorFeatureDetail> = {
  caseload: {
    id: "caseload",
    title: "Caseload Snapshot",
    eyebrow: "Your Students",
    summary:
      "Every student on your caseload — grade, readiness, and the next action they need from you.",
    what: "Open a student's profile, sort by readiness or next PPT, and jump straight to their Pathway Report.",
    dataSource: "Roster from your school · role-based access · Pathway Report signals",
    primaryAction: { label: "Open Caseload", to: "/caseload" },
    connectsTo: ["Student Readiness", "Pathway Reports", "Meeting Prep"],
    stats: [
      { label: "Students", value: "8" },
      { label: "Next PPT ≤14d", value: "3" },
      { label: "Flagged", value: "2" },
    ],
    rows: [
      { primary: "Jordan Rivera · G11", secondary: "PPT Sep 15 · draft ready", meta: "Ms. Patel", status: "warning" },
      { primary: "Maya Chen · G12", secondary: "Transition plan overdue", meta: "You", status: "critical" },
      { primary: "Aiden Brooks · G10", secondary: "Baseline complete", status: "ok" },
      { primary: "Sam Ortega · G12", secondary: "Adult services referral pending", status: "warning" },
      { primary: "Riley Nguyen · G11", secondary: "On track · check-in Oct 2", status: "ok" },
    ],
    emptyHeadline: "No students on your caseload yet.",
    emptyBody:
      "Once your school assigns students to your role, they'll appear here with readiness and next-action signals.",
  },

  readiness: {
    id: "readiness",
    title: "Student Readiness",
    eyebrow: "Where To Focus",
    summary:
      "Employment, education, independent living, and self-advocacy scores across your caseload.",
    what: "Filter by domain, spot gaps, and route each student to the right intervention.",
    dataSource: "Student Voice · educator input · uploaded evaluations",
    primaryAction: { label: "See Readiness Gaps", to: "/educator/readiness-gaps" },
    connectsTo: ["Caseload", "Pathway Reports", "Action Items"],
    stats: [
      { label: "On track", value: "5" },
      { label: "Needs support", value: "2" },
      { label: "Critical", value: "1" },
    ],
    rows: [
      { primary: "Employment domain", secondary: "3 students below benchmark", status: "warning" },
      { primary: "Independent living", secondary: "1 student critical · Maya C.", status: "critical" },
      { primary: "Self-advocacy", secondary: "Growth trend across G11 cohort", status: "ok" },
      { primary: "Post-secondary education", secondary: "All students have a plan", status: "ok" },
    ],
    emptyHeadline: "No readiness data yet.",
    emptyBody:
      "Once Student Voice responses and educator inputs are recorded, readiness domains populate here.",
  },

  "pending-input": {
    id: "pending-input",
    title: "Pending Educator Input",
    eyebrow: "Action Needed",
    summary:
      "Sections of Pathway Reports waiting on your input before they can move to draft.",
    what: "Open the exact section that needs input, add it in under two minutes, and unblock the report.",
    dataSource: "Pathway Report drafts · teacher portal assignments",
    primaryAction: { label: "Add Input", to: "/teacher-portal" },
    connectsTo: ["Pathway Reports", "Caseload"],
    stats: [
      { label: "Open items", value: "4" },
      { label: "Overdue", value: "1" },
      { label: "Due this week", value: "2" },
    ],
    rows: [
      { primary: "Jordan R. · Adult services handoff", secondary: "Due Sep 12", status: "warning" },
      { primary: "Maya C. · Transition assessment summary", secondary: "Overdue Sep 3", status: "critical" },
      { primary: "Aiden B. · Employment goal narrative", secondary: "Due Sep 18", status: "muted" },
      { primary: "Sam O. · Independent living notes", secondary: "Due Sep 20", status: "muted" },
    ],
    emptyHeadline: "You're all caught up.",
    emptyBody:
      "New input requests will appear here as your team drafts and updates Pathway Reports.",
  },

  "pathway-reports": {
    id: "pathway-reports",
    title: "Pathway Reports",
    eyebrow: "Flagship Output",
    summary:
      "Latest Pathway Reports for your caseload — snapshot, pathways, and questions for the team.",
    what: "Open a report, review changes since last version, and share the family-friendly view.",
    dataSource: "Student Voice · educator input · uploaded documents · readiness signals",
    primaryAction: { label: "Open Reports", to: "/reports" },
    connectsTo: ["Caseload", "Meeting Prep", "Documents"],
    stats: [
      { label: "Drafts ready", value: "5" },
      { label: "Published", value: "2" },
      { label: "Needs input", value: "1" },
    ],
    rows: [
      { primary: "Jordan Rivera · v4 draft", secondary: "5 of 7 sections complete", status: "ok" },
      { primary: "Maya Chen · v2 draft", secondary: "Blocked on transition assessment", status: "warning" },
      { primary: "Aiden Brooks · v1 published", secondary: "Family view shared", status: "ok" },
      { primary: "Sam Ortega · v3 draft", secondary: "Pending adult services", status: "warning" },
      { primary: "Riley Nguyen · v1 published", secondary: "On track", status: "ok" },
    ],
    emptyHeadline: "No Pathway Reports drafted yet.",
    emptyBody:
      "Reports build automatically as Student Voice, evaluations, and educator input arrive.",
  },

  "meeting-prep": {
    id: "meeting-prep",
    title: "Meeting Prep",
    eyebrow: "Before The PPT",
    summary:
      "PPT prep templates and question sets tailored to each student on your caseload.",
    what: "Open a prep pack, customize the agenda, and share it with family before the meeting.",
    dataSource: "Meeting template · Pathway Report · Family Priorities",
    primaryAction: { label: "Prep For Meetings", to: "/ppt-prep" },
    connectsTo: ["Calendar", "Pathway Reports", "Case Notes"],
    stats: [
      { label: "Next meeting", value: "Sep 15" },
      { label: "Prep packs open", value: "3" },
      { label: "Shared with family", value: "1" },
    ],
    rows: [
      { primary: "Jordan Rivera · PPT annual review", secondary: "Sep 15 · agenda ready", status: "ok" },
      { primary: "Maya Chen · IEP amendment", secondary: "Sep 22 · needs prep", status: "warning" },
      { primary: "Aiden Brooks · transition check-in", secondary: "Oct 4 · scheduled", status: "muted" },
    ],
    emptyHeadline: "No meetings need prep right now.",
    emptyBody:
      "As soon as a PPT or IEP meeting is scheduled, a prep pack will appear here with a starter agenda.",
  },

  "case-notes": {
    id: "case-notes",
    title: "Case Notes",
    eyebrow: "Timestamped Record",
    summary:
      "Quick notes tied to each student, timestamped and searchable — for you and your team.",
    what: "Add a note in seconds, tag the student, and choose who else can read it.",
    dataSource: "Notes you write · notes shared by teammates · optional voice-to-text",
    primaryAction: { label: "Open Notes", to: "/educator/notes" },
    connectsTo: ["Caseload", "Meeting Prep"],
    stats: [
      { label: "This week", value: "12" },
      { label: "Private to you", value: "5" },
      { label: "Shared", value: "7" },
    ],
    rows: [
      { primary: "Jordan R. — mentioned interest in vet tech", secondary: "Sep 8 · shared with team", status: "ok" },
      { primary: "Maya C. — transportation barrier for tours", secondary: "Sep 7 · private", status: "muted" },
      { primary: "Aiden B. — WBL placement request", secondary: "Sep 5 · shared with family", status: "ok" },
      { primary: "Sam O. — DDS referral discussion", secondary: "Sep 3 · shared with case team", status: "ok" },
    ],
    emptyHeadline: "No case notes yet.",
    emptyBody:
      "Add your first note to build a timestamped record of conversations, decisions, and follow-ups.",
  },

  "action-items": {
    id: "action-items",
    title: "Action Items",
    eyebrow: "Owned & Tracked",
    summary:
      "Assign next steps to family, student, or yourself — with due dates and completion tracking.",
    what: "Assign an item, set a due date, and get a nudge when something's overdue.",
    dataSource: "Pathway Report · meeting agendas · items you create",
    primaryAction: { label: "See Action Items", to: "/educator/action-items" },
    connectsTo: ["Meeting Prep", "Case Notes", "Calendar"],
    stats: [
      { label: "Open", value: "9" },
      { label: "Due this week", value: "4" },
      { label: "Overdue", value: "1" },
    ],
    rows: [
      { primary: "Send adult services referral · Sam O.", secondary: "You · due Sep 18", status: "warning" },
      { primary: "Confirm PPT room · Jordan R.", secondary: "You · due Sep 12", status: "warning" },
      { primary: "Upload transition assessment · Maya C.", secondary: "Family · overdue", status: "critical" },
      { primary: "Draft employment narrative · Aiden B.", secondary: "You · due Sep 20", status: "muted" },
    ],
    emptyHeadline: "No open action items.",
    emptyBody:
      "As you plan meetings and update reports, action items will collect here so nothing slips.",
  },

  calendar: {
    id: "calendar",
    title: "Calendar",
    eyebrow: "What's Next",
    summary:
      "PPTs, IEP reviews, and check-ins across your caseload — in one place.",
    what: "See what's this week, jump into prep, and sync to your school calendar.",
    dataSource: "Meetings you schedule · deadlines from Pathway Reports",
    primaryAction: { label: "Open Calendar", to: "/calendar" },
    connectsTo: ["Meeting Prep", "Action Items"],
    stats: [
      { label: "This week", value: "2" },
      { label: "Next 30 days", value: "7" },
    ],
    rows: [
      { primary: "PPT · Jordan Rivera", secondary: "Sep 15 · 2:30 PM · Room 214", status: "warning" },
      { primary: "IEP amendment · Maya Chen", secondary: "Sep 22 · 9:00 AM", status: "muted" },
      { primary: "Transition check-in · Aiden Brooks", secondary: "Oct 4 · virtual", status: "muted" },
      { primary: "Caseload sync w/ Ms. Patel", secondary: "Oct 6 · 30 min", status: "muted" },
    ],
    emptyHeadline: "Nothing scheduled yet.",
    emptyBody:
      "Once meetings are booked, they'll appear here with prep prompts and shared agendas.",
  },

  documents: {
    id: "documents",
    title: "Document Review",
    eyebrow: "Files & Evidence",
    summary:
      "IEPs, evaluations, and family uploads — organized by student and reviewable in one queue.",
    what: "Open a document, add notes, and mark it reviewed so the report can move forward.",
    dataSource: "Family uploads · school-shared files · your uploads",
    primaryAction: { label: "Open Documents", to: "/documents" },
    connectsTo: ["Pathway Reports", "Pending Input"],
    stats: [
      { label: "In queue", value: "6" },
      { label: "Reviewed today", value: "2" },
      { label: "Awaiting family", value: "1" },
    ],
    rows: [
      { primary: "Jordan R. — current IEP (Aug 2026)", secondary: "PDF · shared", status: "ok" },
      { primary: "Maya C. — transition assessment", secondary: "Awaiting upload", status: "warning" },
      { primary: "Aiden B. — WBL placement letter", secondary: "PDF · new", status: "ok" },
      { primary: "Sam O. — DDS eligibility letter", secondary: "PDF · needs review", status: "warning" },
    ],
    emptyHeadline: "No documents to review.",
    emptyBody:
      "New family and school uploads will appear here for quick review and tagging.",
  },
};

export const EDUCATOR_FEATURE_ORDER: EducatorFeatureId[] = [
  "caseload",
  "readiness",
  "pending-input",
  "pathway-reports",
  "meeting-prep",
  "case-notes",
  "action-items",
  "calendar",
  "documents",
];
