/**
 * Static demo fixtures powering Student dashboard feature-detail drawers
 * and the /demo/student preview. Nothing here is real data. The signed-in
 * dashboard also uses these as the illustrative baseline whenever a live
 * value is not yet available for the tile preview footer.
 */

export type StudentFeatureId =
  | "pathway-report"
  | "student-voice"
  | "action-items"
  | "saved-resources"
  | "meeting-prep"
  | "calendar"
  | "documents";

export type FeatureBullet = { label: string; value?: string; hint?: string };

export type FeatureRow = {
  primary: string;
  secondary?: string;
  meta?: string;
  status?: "ok" | "warning" | "critical" | "muted";
};

export type StudentFeatureDetail = {
  id: StudentFeatureId;
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

export const STUDENT_FEATURE_DETAILS: Record<StudentFeatureId, StudentFeatureDetail> = {
  "pathway-report": {
    id: "pathway-report",
    title: "My Pathway Report",
    eyebrow: "Flagship Output",
    summary:
      "The living plan your team builds with you — readiness across four domains, updated as new evidence arrives.",
    what: "See the current version of your Pathway Report, what's inside each section, and what's still missing.",
    dataSource: "Student Voice · educator input · uploaded documents · readiness signals",
    primaryAction: { label: "Open My Report", to: "/pathway/student" },
    connectsTo: ["Student Voice", "Action Items", "Meeting Prep", "Recommended Resources"],
    stats: [
      { label: "Version", value: "v4 · draft" },
      { label: "Last updated", value: "3 days ago" },
      { label: "Sections complete", value: "5 of 7" },
    ],
    rows: [
      { primary: "Employment readiness", secondary: "Emerging", meta: "2 goals · 1 gap", status: "warning" },
      { primary: "Education & training", secondary: "Developing", meta: "3 goals", status: "ok" },
      { primary: "Independent living", secondary: "Emerging", meta: "1 gap · travel training", status: "warning" },
      { primary: "Self-advocacy", secondary: "Growing", meta: "Voice prompts complete", status: "ok" },
      { primary: "Team & supports", secondary: "In place", meta: "Case manager · family", status: "ok" },
    ],
    emptyHeadline: "Your report is being built.",
    emptyBody:
      "As you answer Student Voice prompts and your team adds input, your Pathway Report will appear here.",
  },

  "student-voice": {
    id: "student-voice",
    title: "Student Voice",
    eyebrow: "Your Words",
    summary:
      "Prompts that let you share strengths, interests, hopes, and worries in your own words. Your team reads these before the PPT.",
    what: "Answer short prompts. Your responses feed the Pathway Report and meeting prep.",
    dataSource: "You — anytime, from any device",
    primaryAction: { label: "Answer Prompts", to: "/student-voice" },
    connectsTo: ["Pathway Report", "Meeting Prep"],
    stats: [
      { label: "Prompts answered", value: "4 of 6" },
      { label: "Last update", value: "Yesterday" },
    ],
    rows: [
      { primary: "What are you good at?", secondary: "Answered", status: "ok" },
      { primary: "What kind of job sounds interesting?", secondary: "Answered", status: "ok" },
      { primary: "Where do you want to live after high school?", secondary: "Answered", status: "ok" },
      { primary: "What help do you want from your team?", secondary: "Answered", status: "ok" },
      { primary: "What worries you about after school?", secondary: "Not yet", status: "warning" },
      { primary: "What do you want to say at the meeting?", secondary: "Not yet", status: "warning" },
    ],
    emptyHeadline: "No prompts answered yet.",
    emptyBody:
      "Answer a few short prompts about your strengths and hopes — your team will read them before your next meeting.",
  },

  "action-items": {
    id: "action-items",
    title: "My Action Items",
    eyebrow: "Small Next Steps",
    summary:
      "Small, doable next steps for you and your team so momentum keeps moving between meetings.",
    what: "See what's due, mark items done, and add your own follow-ups.",
    dataSource: "Pathway Report goals · meeting agendas · things you added",
    primaryAction: { label: "Open Action Items", to: "/action-items" },
    connectsTo: ["Pathway Report", "Meeting Prep", "Calendar"],
    stats: [
      { label: "Due this week", value: "2" },
      { label: "Overdue", value: "0" },
      { label: "Completed (all time)", value: "14" },
    ],
    rows: [
      { primary: "Bring 3 questions to the Sep 15 PPT", secondary: "Due Sep 14", status: "warning" },
      { primary: "Star one job you'd like to try", secondary: "Due Sep 12", status: "warning" },
      { primary: "Tour Capital Community College", secondary: "Planned · Oct 2", status: "muted" },
      { primary: "Practice travel-training route", secondary: "In progress", status: "ok" },
    ],
    emptyHeadline: "No action items yet.",
    emptyBody:
      "Once your team assigns next steps or you add your own, they'll show up here.",
  },

  "saved-resources": {
    id: "saved-resources",
    title: "Saved Resources",
    eyebrow: "Your Library",
    summary:
      "Guides, checklists, and tools you or your team bookmarked. Bring them to a meeting or share with family.",
    what: "Open a saved resource, remove one, or find more from the resource library.",
    dataSource: "Bookmarks from you, your family, and your case manager",
    primaryAction: { label: "Open Saved Resources", to: "/resources/saved" },
    connectsTo: ["Pathway Report", "Recommended Resources"],
    stats: [{ label: "Saved", value: "5" }, { label: "Added this month", value: "2" }],
    rows: [
      { primary: "Age-of-Majority Guide (family-friendly)", secondary: "Guide · 6 min read" },
      { primary: "First-Job Checklist", secondary: "Checklist · printable" },
      { primary: "PPT Meeting Questions", secondary: "Template · 1 page" },
      { primary: "Travel Training Toolkit", secondary: "Toolkit · video + PDF" },
      { primary: "Self-Advocacy Practice Cards", secondary: "Cards · 12 prompts" },
    ],
    emptyHeadline: "Nothing saved yet.",
    emptyBody:
      "Bookmark guides, checklists, and tools so you can find them again fast.",
  },

  "meeting-prep": {
    id: "meeting-prep",
    title: "Meeting Prep",
    eyebrow: "Before The PPT",
    summary:
      "Walk into your PPT / IEP with the questions and goals you want on the table.",
    what: "Add questions, review the agenda, and print a one-pager to bring with you.",
    dataSource: "Meeting template · Student Voice · your action items",
    primaryAction: { label: "Prep For My Next Meeting", to: "/ppt-prep" },
    connectsTo: ["Calendar", "Student Voice", "Pathway Report"],
    stats: [
      { label: "Next meeting", value: "Sep 15" },
      { label: "Questions ready", value: "3" },
      { label: "Agenda items open", value: "2" },
    ],
    rows: [
      { primary: "Can I try a work-based learning placement this spring?", secondary: "Question · yours", status: "ok" },
      { primary: "What supports move with me after graduation?", secondary: "Question · yours", status: "ok" },
      { primary: "Review employment goal progress", secondary: "Agenda item", status: "muted" },
      { primary: "Update self-advocacy goal", secondary: "Agenda item · needs owner", status: "warning" },
    ],
    emptyHeadline: "No meeting scheduled yet.",
    emptyBody:
      "When your team sets a PPT or IEP date, prep tools will appear here.",
  },

  calendar: {
    id: "calendar",
    title: "Upcoming Meetings",
    eyebrow: "What's Next",
    summary:
      "PPTs, IEP reviews, tours, and check-ins in one place, so nothing sneaks up on you.",
    what: "See what's coming up, add a meeting to your personal calendar, and jump into prep.",
    dataSource: "Meetings scheduled by your team · deadlines from your report",
    primaryAction: { label: "Open Calendar", to: "/meetings" },
    connectsTo: ["Meeting Prep", "Action Items"],
    stats: [
      { label: "This week", value: "1" },
      { label: "Next 30 days", value: "3" },
    ],
    rows: [
      { primary: "PPT — annual review", secondary: "Sep 15 · 2:30 PM", meta: "Hartford Regional · Room 214", status: "warning" },
      { primary: "College tour — Capital CC", secondary: "Oct 2 · morning", meta: "Optional · family welcome", status: "muted" },
      { primary: "Check-in with case manager", secondary: "Oct 9 · 15 min", meta: "Virtual", status: "muted" },
    ],
    emptyHeadline: "Nothing on the calendar.",
    emptyBody:
      "PPTs, tours, and check-ins your team schedules will show up here.",
  },

  documents: {
    id: "documents",
    title: "Documents Shared With Me",
    eyebrow: "Files & Evidence",
    summary:
      "Files your team has shared with you — IEP, evaluations, transition assessments, and family notes.",
    what: "Open a document, request access, or ask your team to share the latest version.",
    dataSource: "Uploaded by your family or case manager · access controlled by sharing rules",
    primaryAction: { label: "Open Documents", to: "/documents" },
    connectsTo: ["Pathway Report", "Meeting Prep"],
    stats: [
      { label: "Shared with me", value: "4" },
      { label: "New this month", value: "1" },
    ],
    rows: [
      { primary: "Current IEP", secondary: "PDF · shared by Ms. Patel", meta: "Updated Aug 24", status: "ok" },
      { primary: "Transition assessment summary", secondary: "PDF · shared by school", meta: "May 2026", status: "ok" },
      { primary: "Family notes for the PPT", secondary: "Doc · shared by parent", meta: "Sep 3", status: "muted" },
      { primary: "Latest evaluation", secondary: "Awaiting upload", meta: "Ask your case manager", status: "warning" },
    ],
    emptyHeadline: "No documents shared with you yet.",
    emptyBody:
      "When your family or case manager shares your IEP or an evaluation, it will appear here.",
  },
};

export const STUDENT_FEATURE_ORDER: StudentFeatureId[] = [
  "pathway-report",
  "student-voice",
  "action-items",
  "meeting-prep",
  "calendar",
  "saved-resources",
  "documents",
];
