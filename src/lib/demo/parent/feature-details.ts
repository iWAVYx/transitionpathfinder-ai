/**
 * Family / Parent dashboard feature-detail templates.
 *
 * These are TEMPLATES — every profile-specific string (name, grade,
 * school, primary interest, meeting date, partner match count, report
 * version) is a `{token}` placeholder resolved at read time by
 * `getParentFeatureDetails(profileId)`. Do NOT hardcode a student name
 * or grade in this file — that reintroduces the leak this system fixes.
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

export type ParentFeatureId =
  | "student-profile"
  | "pathway-report"
  | "documents"
  | "recommended-resources"
  | "action-items"
  | "calendar"
  | "meeting-prep"
  | "consent"
  | "invite-team"
  | "partner-network";

export type FeatureBullet = { label: string; value?: string; hint?: string };

export type FeatureRow = {
  primary: string;
  secondary?: string;
  meta?: string;
  status?: "ok" | "warning" | "critical" | "muted";
};

export type ParentFeatureDetail = {
  id: ParentFeatureId;
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

const TEMPLATE: Record<ParentFeatureId, ParentFeatureDetail> = {
  "student-profile": {
    id: "student-profile",
    title: "Connected Student",
    eyebrow: "Your Student",
    summary:
      "One shared snapshot of your student — grade, school, strengths, interests, and how the plan is progressing.",
    what: "Open the student's profile, update basic info, and see who's on the team.",
    dataSource: "You · your student's team · Student Voice responses",
    primaryAction: { label: "Open Student Profile", to: "/students" },
    connectsTo: ["Pathway Report", "Student Voice", "Sharing & Consent"],
    stats: [
      { label: "Grade", value: "{gradeLabel}" },
      { label: "School", value: "{school}" },
      { label: "Team members", value: "4" },
    ],
    rows: [
      { primary: "{studentDisplayName}", secondary: "Pronouns: {pronoun}/{possessive}", meta: "{gradeLabel}", status: "ok" },
      { primary: "Case manager: {caseManager}", secondary: "Special education · lead", status: "ok" },
      { primary: "Related services", secondary: "Support team on file", status: "muted" },
      { primary: "Strengths shared by {studentShortName}", secondary: "From Student Voice", status: "ok" },
      { primary: "Current interests", secondary: "{interestList}", status: "ok" },
    ],
    emptyHeadline: "No student connected yet.",
    emptyBody:
      "Connect your student to see a full profile, plan, and meeting history in one place.",
  },

  "pathway-report": {
    id: "pathway-report",
    title: "Pathway Report — Family View",
    eyebrow: "Flagship Output",
    summary:
      "Your student's transition plan, in plain language — readiness, pathways, action plan, and resources.",
    what: "Read the family view of the report, share it with a coach or advocate, and see what changed since last time.",
    dataSource: "Student Voice · educator input · uploaded documents · readiness signals",
    primaryAction: { label: "Open Family Report", to: "/pathway/family" },
    connectsTo: ["Documents", "Meeting Prep", "Action Items", "Recommended Resources"],
    stats: [
      { label: "Version", value: "{reportVersion}" },
      { label: "Grade", value: "{gradeLabel}" },
      { label: "Sections", value: "5 of 7 complete" },
    ],
    rows: [
      { primary: "Snapshot & strengths", secondary: "Complete", status: "ok" },
      { primary: "Family priorities", secondary: "Complete", status: "ok" },
      { primary: "{postSecondaryLabel}", secondary: "Draft ready · focus on {planningHorizon}", status: "ok" },
      { primary: "Supports & self-advocacy", secondary: "Needs one more input", status: "warning" },
      { primary: "Action plan for the next 90 days", secondary: "Draft ready", status: "ok" },
    ],
    emptyHeadline: "The Pathway Report will appear once your team drafts it.",
    emptyBody:
      "As Student Voice, documents, and readiness data come in, your team will publish the first draft here.",
  },

  documents: {
    id: "documents",
    title: "IEP & Documents",
    eyebrow: "Files & Evidence",
    summary:
      "Upload IEPs, evaluations, and family notes — organized, searchable, and shared with the right people.",
    what: "Upload a new file, tag its type, and choose who can see it.",
    dataSource: "Uploads from you and your team · sharing rules you control",
    primaryAction: { label: "Manage Documents", to: "/documents" },
    connectsTo: ["Pathway Report", "Sharing & Consent", "Meeting Prep"],
    stats: [
      { label: "On file", value: "4" },
      { label: "Needs review", value: "1" },
      { label: "Shared with team", value: "3" },
    ],
    rows: [
      { primary: "Current IEP for {studentShortName}", secondary: "PDF · shared with {caseManager}", meta: "{gradeLabel}", status: "ok" },
      { primary: "Latest evaluation", secondary: "Awaiting upload", meta: "Family action", status: "warning" },
      { primary: "Transition assessment", secondary: "PDF · shared by school", meta: "This term", status: "ok" },
      { primary: "Family notes for the meeting", secondary: "Doc · private to family", status: "muted" },
    ],
    emptyHeadline: "No documents on file yet.",
    emptyBody:
      "Upload the latest IEP or evaluation so your team can build a stronger Pathway Report.",
  },

  "recommended-resources": {
    id: "recommended-resources",
    title: "Recommended Resources",
    eyebrow: "Matched For You",
    summary:
      "Family-friendly guides matched to your student's grade, readiness, and priorities.",
    what: "Open a resource, save it for the next meeting, or share with a family member.",
    dataSource: "Pathway Report priorities · student grade & interests · CT resource library",
    primaryAction: { label: "Open Resources", to: "/resources/saved" },
    connectsTo: ["Pathway Report", "Action Items"],
    stats: [
      { label: "Suggested", value: "6" },
      { label: "Saved", value: "2" },
    ],
    rows: [
      { primary: "{postSecondaryLabel} — family guide", secondary: "Guide · 6 min read" },
      { primary: "Meeting Questions template", secondary: "Template · 1 page" },
      { primary: "Family guide for {gradeLabel}", secondary: "Guide · 10 min read" },
      { primary: "Interest-matched guide: {primaryInterest}", secondary: "Guide · interest-matched" },
      { primary: "Self-Advocacy Practice Cards", secondary: "Cards · 12 prompts" },
    ],
    emptyHeadline: "No matches yet — but that's about to change.",
    emptyBody:
      "As soon as Family Priorities and Student Voice are shared, matched resources will show up here.",
  },

  "action-items": {
    id: "action-items",
    title: "Family Action Items",
    eyebrow: "Small Next Steps",
    summary:
      "Small, doable next steps assigned to family, student, or educator so nothing sits idle between meetings.",
    what: "Mark items complete, add your own, and see what your team owes back to you.",
    dataSource: "Pathway Report · meeting agendas · items you added",
    primaryAction: { label: "Open Action Items", to: "/family/action-items" },
    connectsTo: ["Pathway Report", "Meeting Prep", "Calendar"],
    stats: [
      { label: "Due this week", value: "2" },
      { label: "Overdue", value: "0" },
      { label: "Completed (all time)", value: "18" },
    ],
    rows: [
      { primary: "Upload the latest IEP for {studentShortName}", secondary: "Family · due before {nextMeetingDate}", status: "warning" },
      { primary: "Bring 3 questions to the {nextMeetingDate} {nextMeetingLabel}", secondary: "Family · due day before", status: "warning" },
      { primary: "Confirm transportation for a {primaryInterest} visit", secondary: "Family · upcoming", status: "muted" },
      { primary: "Practice one self-advocacy line with {studentShortName}", secondary: "Student · in progress", status: "ok" },
    ],
    emptyHeadline: "No action items right now.",
    emptyBody:
      "New tasks appear here after each meeting or when your team updates the Pathway Report.",
  },

  calendar: {
    id: "calendar",
    title: "Calendar",
    eyebrow: "What's Next",
    summary:
      "Meetings, IEP reviews, tours, and check-ins in one place, so nothing sneaks up on your family.",
    what: "See what's upcoming, add to your personal calendar, and jump into meeting prep.",
    dataSource: "Meetings scheduled by your team · deadlines from the Pathway Report",
    primaryAction: { label: "Open Calendar", to: "/calendar" },
    connectsTo: ["Meeting Prep", "Action Items"],
    stats: [
      { label: "This week", value: "1" },
      { label: "Next 30 days", value: "3" },
    ],
    rows: [
      { primary: "{nextMeetingLabel}", secondary: "{nextMeetingDate} · 2:30 PM", meta: "{school}", status: "warning" },
      { primary: "Visit a {primaryInterest} program", secondary: "Coming month", meta: "Family welcome", status: "muted" },
      { primary: "Case manager check-in with {caseManager}", secondary: "15 min · virtual", status: "muted" },
    ],
    emptyHeadline: "No meetings scheduled.",
    emptyBody:
      "Once your team schedules the next meeting or check-in, it will appear here with prep prompts.",
  },

  "meeting-prep": {
    id: "meeting-prep",
    title: "Meeting Prep",
    eyebrow: "Before The Meeting",
    summary:
      "Family-ready questions and an agenda you can bring to the next IEP / PPT meeting.",
    what: "Add questions, review the agenda, and print a one-pager for the meeting.",
    dataSource: "Meeting template · Family Priorities · Pathway Report",
    primaryAction: { label: "Prep For Next Meeting", to: "/ppt-prep" },
    connectsTo: ["Calendar", "Pathway Report", "Family Priorities"],
    stats: [
      { label: "Next meeting", value: "{nextMeetingDate}" },
      { label: "Questions ready", value: "3" },
      { label: "Agenda items open", value: "2" },
    ],
    rows: [
      { primary: "What supports move with {studentShortName} next year?", secondary: "Question · family", status: "ok" },
      { primary: "Can {studentShortName} try more of {primaryInterest} this term?", secondary: "Question · family", status: "ok" },
      { primary: "Progress on self-advocacy goals?", secondary: "Question · family", status: "ok" },
      { primary: "Review {postSecondaryLabel}", secondary: "Agenda item", status: "muted" },
      { primary: "Update self-advocacy goal", secondary: "Agenda item · needs owner", status: "warning" },
    ],
    emptyHeadline: "No meeting prep started yet.",
    emptyBody:
      "Start prep for your next meeting — add questions and a family agenda in under five minutes.",
  },

  consent: {
    id: "consent",
    title: "Sharing & Consent",
    eyebrow: "You're In Control",
    summary:
      "Choose who can view or edit your student's plan. Revoke anytime.",
    what: "Add a viewer or editor, copy a shareable family/educator link, and see who's had access.",
    dataSource: "You · your student when they reach age of majority",
    primaryAction: { label: "Manage Sharing", to: "/family/consent" },
    connectsTo: ["Invite Team Members", "Documents", "Pathway Report"],
    stats: [
      { label: "People with access", value: "3" },
      { label: "Active links", value: "1" },
    ],
    rows: [
      { primary: "{caseManager} · case manager", secondary: "Editor · {school}", status: "ok" },
      { primary: "Family advocate", secondary: "Viewer · recently added", status: "ok" },
      { primary: "Family report link", secondary: "Anyone with the link · view only", meta: "Copy", status: "muted" },
      { primary: "Previous case manager access", secondary: "Revoked", status: "muted" },
    ],
    emptyHeadline: "No one else has access yet.",
    emptyBody:
      "Add a case manager, coach, or family member so the right people can help plan with you.",
  },

  "invite-team": {
    id: "invite-team",
    title: "Invite Team Members",
    eyebrow: "Build The Team",
    summary:
      "Bring a case manager, advocate, coach, or another family member into your student's plan.",
    what: "Send an invite by email, choose their role, and track whether they've joined.",
    dataSource: "Emails you enter · role you choose",
    primaryAction: { label: "Send An Invite", to: "/students" },
    connectsTo: ["Sharing & Consent", "Student Profile"],
    stats: [
      { label: "Invited", value: "3" },
      { label: "Pending", value: "1" },
    ],
    rows: [
      { primary: "coach@example.org", secondary: "Editor · sent recently", meta: "Pending", status: "warning" },
      { primary: "grandparent@example.org", secondary: "Viewer · joined", status: "ok" },
      { primary: "advocate@familyfirstct.org", secondary: "Viewer · joined", status: "ok" },
    ],
    emptyHeadline: "No teammates invited yet.",
    emptyBody:
      "Invite a case manager or advocate — they'll be able to help you plan and prep for meetings.",
  },

  "partner-network": {
    id: "partner-network",
    title: "Partner Network",
    eyebrow: "Community Partners",
    summary:
      "Vetted community partners with age-appropriate opportunities and family-ready details — every match is explained.",
    what: "Preview matched programs for your student, see why each fits, and open the full Partner Network.",
    dataSource: "Verified partner directory · student interests · age · supports",
    primaryAction: { label: "Open Partner Network", to: "/partner-network" },
    connectsTo: ["Pathway Report", "Recommended Resources", "Action Items"],
    stats: [
      { label: "Verified partners", value: "7" },
      { label: "Matches for {studentShortName}", value: "{partnerMatchCount}" },
      { label: "Application windows", value: "3" },
    ],
    rows: [
      { primary: "{primaryPartnerRow}", secondary: "{primaryPartnerNote}", meta: "{gradeShort}", status: "ok" },
      { primary: "Interest match: {primaryInterest}", secondary: "Age-appropriate · family welcome", meta: "Coming up", status: "ok" },
      { primary: "Interest match: {secondaryInterest}", secondary: "Age-eligible next cycle", meta: "Coming up", status: "muted" },
      { primary: "Local option near {region}", secondary: "Weekly · verified partner", meta: "This term", status: "ok" },
    ],
    emptyHeadline: "No partners matched yet.",
    emptyBody:
      "Once your student's interests and age are on file, family-ready partner matches will land here.",
  },
};

export function getParentFeatureDetails(
  profileId: DemoProfileId = DEFAULT_DEMO_PROFILE_ID,
): Record<ParentFeatureId, ParentFeatureDetail> {
  const tokens = tokensForProfile(getDemoProfile(profileId));
  return applyTokensDeep(TEMPLATE, tokens);
}

/**
 * Back-compat default (Jordan) for legacy call sites. New code MUST call
 * `getParentFeatureDetails(profileId)`.
 */
export const PARENT_FEATURE_DETAILS: Record<ParentFeatureId, ParentFeatureDetail> =
  getParentFeatureDetails(DEFAULT_DEMO_PROFILE_ID);

export const PARENT_FEATURE_ORDER: ParentFeatureId[] = [
  "student-profile",
  "pathway-report",
  "documents",
  "meeting-prep",
  "calendar",
  "action-items",
  "recommended-resources",
  "consent",
  "invite-team",
];
