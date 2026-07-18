/**
 * Student dashboard feature-detail templates.
 *
 * These are TEMPLATES — every profile-specific string (name, grade,
 * school, primary interest, next-meeting date, partner match count,
 * report version) is a `{token}` placeholder resolved at read time by
 * `getStudentFeatureDetails(profileId)`. Do NOT hardcode a student name
 * or grade in this file — that reintroduces the leak this system fixes.
 *
 * The signed-in Student dashboard also uses these as the illustrative
 * baseline whenever a live value is not yet available.
 */

import {
  DEFAULT_DEMO_PROFILE_ID,
  getDemoProfile,
  type DemoProfileId,
} from "@/lib/demo/demo-profiles";
import {
  applyTokensDeep,
  tokensForProfile,
} from "@/lib/demo/student-tokens";

export type StudentFeatureId =
  | "pathway-report"
  | "student-voice"
  | "action-items"
  | "saved-resources"
  | "meeting-prep"
  | "calendar"
  | "documents"
  | "partner-network";

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

const TEMPLATE: Record<StudentFeatureId, StudentFeatureDetail> = {
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
      { label: "Version", value: "{reportVersion}" },
      { label: "Grade", value: "{gradeLabel}" },
      { label: "Sections complete", value: "5 of 7" },
    ],
    rows: [
      { primary: "{postSecondaryLabel}", secondary: "Focus: {planningHorizon}", meta: "{studentShortName}", status: "warning" },
      { primary: "Interests on file", secondary: "{interestList}", meta: "From Student Voice", status: "ok" },
      { primary: "School context", secondary: "{school}", meta: "{region}", status: "ok" },
      { primary: "Self-advocacy", secondary: "Voice prompts complete", meta: "Growing", status: "ok" },
      { primary: "Team & supports", secondary: "Case manager: {caseManager}", meta: "In place", status: "ok" },
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
      "Prompts that let you share strengths, interests, hopes, and worries in your own words. Your team reads these before the meeting.",
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
      { primary: "What are you into right now?", secondary: "Answered: {primaryInterest}", status: "ok" },
      { primary: "What kind of school/program sounds interesting?", secondary: "Answered", status: "ok" },
      { primary: "What help do you want from your team?", secondary: "Answered", status: "ok" },
      { primary: "What worries you about what's next?", secondary: "Not yet", status: "warning" },
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
      { primary: "Bring 3 questions to the {nextMeetingDate} {nextMeetingLabel}", secondary: "Due day before meeting", status: "warning" },
      { primary: "Star one option that fits your {primaryInterest} interest", secondary: "Small step this week", status: "warning" },
      { primary: "Explore one program with {caseManager}", secondary: "Planned", status: "muted" },
      { primary: "Practice one self-advocacy line", secondary: "In progress", status: "ok" },
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
    stats: [
      { label: "Saved", value: "5" },
      { label: "Added this month", value: "2" },
    ],
    rows: [
      { primary: "{postSecondaryLabel} — starter guide", secondary: "Guide · 6 min read" },
      { primary: "Getting ready for your next meeting", secondary: "Checklist · printable" },
      { primary: "Meeting Questions template", secondary: "Template · 1 page" },
      { primary: "Self-advocacy practice cards", secondary: "Cards · 12 prompts" },
      { primary: "Resource for {primaryInterest}", secondary: "Guide · interest-matched" },
    ],
    emptyHeadline: "Nothing saved yet.",
    emptyBody:
      "Bookmark guides, checklists, and tools so you can find them again fast.",
  },

  "meeting-prep": {
    id: "meeting-prep",
    title: "Meeting Prep",
    eyebrow: "Before The Meeting",
    summary:
      "Walk into your next meeting with the questions and goals you want on the table.",
    what: "Add questions, review the agenda, and print a one-pager to bring with you.",
    dataSource: "Meeting template · Student Voice · your action items",
    primaryAction: { label: "Prep For My Next Meeting", to: "/ppt-prep" },
    connectsTo: ["Calendar", "Student Voice", "Pathway Report"],
    stats: [
      { label: "Next meeting", value: "{nextMeetingDate}" },
      { label: "Questions ready", value: "3" },
      { label: "Agenda items open", value: "2" },
    ],
    rows: [
      { primary: "Can I try more of {primaryInterest} next term?", secondary: "Question · yours", status: "ok" },
      { primary: "What supports move with me next year?", secondary: "Question · yours", status: "ok" },
      { primary: "Review {postSecondaryLabel}", secondary: "Agenda item", status: "muted" },
      { primary: "Update self-advocacy goal", secondary: "Agenda item · needs owner", status: "warning" },
    ],
    emptyHeadline: "No meeting scheduled yet.",
    emptyBody:
      "When your team sets a meeting date, prep tools will appear here.",
  },

  calendar: {
    id: "calendar",
    title: "Upcoming Meetings",
    eyebrow: "What's Next",
    summary:
      "Meetings, reviews, tours, and check-ins in one place, so nothing sneaks up on you.",
    what: "See what's coming up, add a meeting to your personal calendar, and jump into prep.",
    dataSource: "Meetings scheduled by your team · deadlines from your report",
    primaryAction: { label: "Open Calendar", to: "/calendar" },
    connectsTo: ["Meeting Prep", "Action Items"],
    stats: [
      { label: "This week", value: "1" },
      { label: "Next 30 days", value: "3" },
    ],
    rows: [
      { primary: "{nextMeetingLabel}", secondary: "{nextMeetingDate} · 2:30 PM", meta: "{school}", status: "warning" },
      { primary: "Explore a {primaryInterest} program", secondary: "Coming month", meta: "Optional · family welcome", status: "muted" },
      { primary: "Check-in with {caseManager}", secondary: "15 min", meta: "Virtual", status: "muted" },
    ],
    emptyHeadline: "Nothing on the calendar.",
    emptyBody:
      "Meetings, tours, and check-ins your team schedules will show up here.",
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
      { primary: "Current IEP", secondary: "PDF · shared by {caseManager}", meta: "{gradeLabel}", status: "ok" },
      { primary: "Transition assessment summary", secondary: "PDF · shared by school", meta: "This term", status: "ok" },
      { primary: "Family notes for the meeting", secondary: "Doc · shared by {familyLead}", meta: "Recent", status: "muted" },
      { primary: "Latest evaluation", secondary: "Awaiting upload", meta: "Ask your case manager", status: "warning" },
    ],
    emptyHeadline: "No documents shared with you yet.",
    emptyBody:
      "When your family or case manager shares your IEP or an evaluation, it will appear here.",
  },

  "partner-network": {
    id: "partner-network",
    title: "Partner Network",
    eyebrow: "Community Partners",
    summary:
      "Programs, internships, and clubs that match your interests, age, and supports — each match is explained.",
    what: "Preview age-eligible opportunities with a plain-English reason for each match, then open the full Partner Network.",
    dataSource: "Verified partner directory · your interests · age · supports",
    primaryAction: { label: "Open Partner Network", to: "/partner-network" },
    connectsTo: ["Pathway Report", "Saved Resources", "Action Items"],
    stats: [
      { label: "Age-eligible", value: "{partnerMatchCount}" },
      { label: "New this week", value: "2" },
      { label: "Coming up", value: "3" },
    ],
    rows: [
      { primary: "{primaryPartnerRow}", secondary: "{primaryPartnerNote}", meta: "{gradeShort}", status: "ok" },
      { primary: "Interest-based match: {primaryInterest}", secondary: "Explainable match on file", meta: "This term", status: "ok" },
      { primary: "Interest-based match: {secondaryInterest}", secondary: "Age-eligible next cycle", meta: "Coming up", status: "muted" },
      { primary: "Local option near {region}", secondary: "Verified partner", meta: "Weekly", status: "ok" },
    ],
    emptyHeadline: "No matches yet.",
    emptyBody:
      "Once your interests and age are on file, explainable partner matches will land here.",
  },
};

export function getStudentFeatureDetails(
  profileId: DemoProfileId = DEFAULT_DEMO_PROFILE_ID,
): Record<StudentFeatureId, StudentFeatureDetail> {
  const tokens = tokensForProfile(getDemoProfile(profileId));
  return applyTokensDeep(TEMPLATE, tokens);
}

/**
 * Back-compat default (Jordan) for legacy call sites that have not yet been
 * migrated to the profile-aware factory. New code MUST call
 * `getStudentFeatureDetails(profileId)`.
 */
export const STUDENT_FEATURE_DETAILS: Record<StudentFeatureId, StudentFeatureDetail> =
  getStudentFeatureDetails(DEFAULT_DEMO_PROFILE_ID);

export const STUDENT_FEATURE_ORDER: StudentFeatureId[] = [
  "pathway-report",
  "student-voice",
  "action-items",
  "meeting-prep",
  "calendar",
  "saved-resources",
  "documents",
];
