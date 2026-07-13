/**
 * Sample calendar events used by the demo previews and empty-state
 * fallbacks. Dates are computed relative to "today" so the calendar
 * always looks live no matter when a visitor loads the page.
 *
 * Product-value notes per stakeholder (referenced in feature-augment.ts):
 *  - Students see a clear "what's next" surface with prep entry points.
 *  - Families see the PPT rhythm + document/consent deadlines.
 *  - Educators see caseload-wide meetings, report deadlines, and student
 *    action-item due dates — the calendar is a triage surface.
 *  - School admins see planning-status and staff-implementation milestones.
 *  - District admins see rollout, training, and reporting milestones.
 *  - Partners see program dates, application windows, and renewals.
 *  - Owner/Admin sees launch/review-queue/system-check checkpoints.
 */

export type CalendarEventType =
  | "meeting"
  | "action-item"
  | "document"
  | "report"
  | "opportunity"
  | "milestone"
  | "program";

export interface CalendarEvent {
  id: string;
  title: string;
  /** ISO datetime. All-day events use 00:00 local. */
  start: string;
  /** Optional end ISO for multi-hour blocks. */
  end?: string;
  type: CalendarEventType;
  allDay?: boolean;
  location?: string;
  /** Related student / school / partner label shown in agenda / tooltip. */
  scope?: string;
  /** Optional route to open when a user clicks the event. */
  href?: string;
  /** Short one-line description shown in the agenda / hover. */
  description?: string;
  /**
   * Pathway Report goal or horizon this event feeds. Renders as a chip in
   * the agenda and drives the "Pathway-Linked" focus rail summary.
   */
  pathwayGoal?: { label: string; href?: string };
  /** Concrete prep prompts a user can knock out before this event. */
  prep?: string[];
  /**
   * Human reminder cadence, e.g. "2 days before" — surfaced in the
   * reminders rail. Absent = no automatic reminder.
   */
  reminder?: string;
  /** Owner label shown on the agenda pill, e.g. "Family action". */
  owner?: string;
}


const DAY = 24 * 60 * 60 * 1000;

function iso(offsetDays: number, hour = 9, min = 0): string {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  const t = d.getTime() + offsetDays * DAY;
  const out = new Date(t);
  out.setHours(hour, min, 0, 0);
  return out.toISOString();
}

const STUDENT_EVENTS: CalendarEvent[] = [
  { id: "s1", title: "PPT — annual review", start: iso(2, 14, 30), end: iso(2, 15, 30), type: "meeting", location: "Hartford Regional · Room 214", href: "/ppt-prep", description: "Bring your top three questions and priorities.",
    pathwayGoal: { label: "Postsecondary goal · college pathway", href: "/pathway/student" },
    prep: ["Answer this week's Student Voice prompt", "Pick your top three PPT questions", "Print or star your updated goal"],
    reminder: "2 days before", owner: "Your action" },
  { id: "s2", title: "Action: update self-advocacy goal", start: iso(4, 15, 0), type: "action-item", href: "/action-items", description: "Add one sentence in your own words.",
    pathwayGoal: { label: "Self-advocacy · 30-day plan", href: "/pathway/student" },
    prep: ["Reread your last goal", "Rewrite it in your own words"], reminder: "1 day before", owner: "Your action" },
  { id: "s3", title: "Capital CC campus tour", start: iso(9, 10, 0), end: iso(9, 12, 0), type: "opportunity", location: "New Britain, CT", href: "/opportunities", description: "Optional · family welcome.",
    pathwayGoal: { label: "Explore college pathways", href: "/pathway/student" },
    prep: ["Look up two programs before you go", "Write one question for the tour guide"], reminder: "3 days before" },
  { id: "s4", title: "Check-in with case manager", start: iso(14, 11, 15), end: iso(14, 11, 30), type: "meeting", location: "Virtual", href: "/meetings",
    prep: ["Skim last week's action items", "Note anything that felt hard"], reminder: "1 hour before" },
  { id: "s5", title: "Answer Student Voice prompt", start: iso(1, 16, 0), type: "action-item", href: "/student-voice",
    pathwayGoal: { label: "Student Voice · 30-day plan", href: "/pathway/student" },
    prep: ["Open Student Voice", "Answer this week's question"], reminder: "Day of", owner: "Your action" },
  { id: "s6", title: "Review Pathway Report", start: iso(6, 17, 0), type: "report", href: "/pathway/student",
    pathwayGoal: { label: "Your Pathway Report", href: "/pathway/student" },
    prep: ["Read the summary at the top", "Star two things you agree with", "Flag one thing to change"], reminder: "1 day before" },
];

const FAMILY_EVENTS: CalendarEvent[] = [
  { id: "f1", title: "PPT — annual review", start: iso(2, 14, 30), end: iso(2, 15, 30), type: "meeting", location: "Hartford Regional · Room 214", href: "/ppt-prep", scope: "Daniel", description: "Bring the family priority list and updated consent.",
    pathwayGoal: { label: "Daniel's Pathway Report", href: "/pathway/family" },
    prep: ["Finalize the family priority list", "Confirm consent is signed", "Review the meeting-prep translator"], reminder: "3 days before", owner: "Family action" },
  { id: "f2", title: "Return signed consent forms", start: iso(-1, 12, 0), type: "document", href: "/family/consent", scope: "Daniel", description: "Renews sharing with two partner organizations.",
    pathwayGoal: { label: "Sharing & consent", href: "/family/consent" },
    prep: ["Read the two partner descriptions", "Sign and upload the form"], reminder: "Overdue", owner: "Family action" },
  { id: "f3", title: "Upload latest evaluation", start: iso(5, 12, 0), type: "document", href: "/documents", scope: "Daniel", description: "Adds evidence into the next Pathway Report draft.",
    pathwayGoal: { label: "Feeds the next report draft", href: "/pathway/family" },
    prep: ["Locate the PDF", "Upload to Documents"], reminder: "1 day before", owner: "Family action" },
  { id: "f4", title: "Capital CC tour with Daniel", start: iso(9, 10, 0), end: iso(9, 12, 0), type: "opportunity", href: "/opportunities", scope: "Daniel",
    pathwayGoal: { label: "Explore college pathways", href: "/pathway/family" },
    prep: ["Confirm ride and timing", "Bring two questions for the tour"], reminder: "2 days before" },
  { id: "f5", title: "Family action: draft PPT questions", start: iso(1, 19, 0), type: "action-item", href: "/family/priorities", scope: "Daniel",
    pathwayGoal: { label: "PPT priorities", href: "/pathway/family" },
    prep: ["Write three questions together", "Rank them 1–3"], reminder: "Day of", owner: "Family action" },
  { id: "f6", title: "Review Pathway Report together", start: iso(7, 19, 30), type: "report", href: "/pathway/family", scope: "Daniel",
    pathwayGoal: { label: "Daniel's Pathway Report", href: "/pathway/family" },
    prep: ["Read the summary out loud", "Star two goals as a family", "Flag one item to raise at PPT"], reminder: "1 day before" },
  { id: "f7", title: "Annual review of family sharing", start: iso(21, 9, 0), type: "milestone", href: "/family/consent", scope: "Household",
    prep: ["Confirm which partners still need access"], reminder: "1 week before" },
];

const EDUCATOR_EVENTS: CalendarEvent[] = [
  { id: "e1", title: "Daniel P. — PPT annual review", start: iso(2, 14, 30), end: iso(2, 15, 30), type: "meeting", scope: "Daniel P.", location: "Room 214", href: "/ppt-prep",
    pathwayGoal: { label: "Daniel's Pathway Report", href: "/pathway/educator" },
    prep: ["Confirm evidence is attached", "Review family priority list", "Send agenda 24 hrs prior"], reminder: "2 days before", owner: "Case manager" },
  { id: "e2", title: "Maya S. — transition planning", start: iso(3, 10, 0), end: iso(3, 11, 0), type: "meeting", scope: "Maya S.", location: "Virtual", href: "/ppt-prep",
    pathwayGoal: { label: "Maya's transition plan", href: "/pathway/educator" },
    prep: ["Pull latest transition assessment", "Draft two goal-language options"], reminder: "1 day before" },
  { id: "e3", title: "Report review: Jordan T.", start: iso(1, 15, 30), type: "report", scope: "Jordan T.", href: "/pathway/educator", description: "Reviewer sign-off required before family share.",
    pathwayGoal: { label: "Jordan's Pathway Report", href: "/pathway/educator" },
    prep: ["Read reviewer notes", "Verify evidence coverage", "Sign off or route back"], reminder: "Day of", owner: "Reviewer" },
  { id: "e4", title: "Report review: Aliyah R.", start: iso(5, 15, 30), type: "report", scope: "Aliyah R.", href: "/pathway/educator",
    pathwayGoal: { label: "Aliyah's Pathway Report", href: "/pathway/educator" },
    prep: ["Confirm data gaps closed", "Approve for family share"], reminder: "1 day before", owner: "Reviewer" },
  { id: "e5", title: "Case notes due — Kevin O.", start: iso(0, 16, 0), type: "action-item", scope: "Kevin O.", href: "/educator/notes",
    prep: ["Log this week's session note", "Tag related goal"], reminder: "Day of", owner: "Case manager" },
  { id: "e6", title: "Missing input: Ana G. transition assessment", start: iso(4, 9, 0), type: "action-item", scope: "Ana G.", href: "/educator/pending-input",
    pathwayGoal: { label: "Closes Ana's evidence gap", href: "/pathway/educator" },
    prep: ["Schedule the assessment", "Attach results to Ana's file"], reminder: "2 days before", owner: "Case manager" },
  { id: "e7", title: "Grade-band team meeting", start: iso(6, 13, 0), end: iso(6, 14, 0), type: "meeting", scope: "Team", location: "Conference A",
    prep: ["Bring caseload readiness digest"], reminder: "1 day before" },
  { id: "e8", title: "Send caseload readiness digest", start: iso(10, 8, 0), type: "milestone", scope: "Team", href: "/caseload",
    pathwayGoal: { label: "Caseload rollup", href: "/caseload" },
    prep: ["Confirm rollup numbers", "Add narrative for two flagged students"], reminder: "1 day before", owner: "Case manager" },
  { id: "e9", title: "Signed IEP due — Sam K.", start: iso(8, 17, 0), type: "document", scope: "Sam K.", href: "/documents",
    prep: ["Verify signatures collected", "Upload to Documents"], reminder: "2 days before", owner: "Case manager" },
];


const SCHOOL_ADMIN_EVENTS: CalendarEvent[] = [
  { id: "sa1", title: "Staff PD — transition rubric", start: iso(3, 14, 0), end: iso(3, 15, 30), type: "milestone", location: "Media Center", scope: "Staff" },
  { id: "sa2", title: "Monthly readiness review", start: iso(7, 9, 0), end: iso(7, 10, 0), type: "meeting", scope: "Leadership", href: "/school/readiness-trends" },
  { id: "sa3", title: "Report completion deadline", start: iso(10, 17, 0), type: "report", scope: "School", href: "/school/report-completion" },
  { id: "sa4", title: "Family engagement night", start: iso(14, 18, 0), end: iso(14, 20, 0), type: "milestone", location: "Auditorium", scope: "Community" },
  { id: "sa5", title: "Implementation checklist review", start: iso(21, 15, 0), type: "milestone", scope: "Leadership", href: "/school/implementation" },
];

const DISTRICT_ADMIN_EVENTS: CalendarEvent[] = [
  { id: "d1", title: "District rollout — cohort 2 kickoff", start: iso(2, 10, 0), end: iso(2, 11, 30), type: "milestone", scope: "District", href: "/district/implementation" },
  { id: "d2", title: "Cross-school leadership sync", start: iso(4, 13, 0), end: iso(4, 14, 0), type: "meeting", scope: "District", href: "/district/schools" },
  { id: "d3", title: "Q4 readiness report to board", start: iso(9, 18, 0), type: "report", scope: "Board", href: "/district/reports" },
  { id: "d4", title: "Service-gap review", start: iso(6, 11, 0), end: iso(6, 12, 0), type: "meeting", scope: "District", href: "/district/service-gaps" },
  { id: "d5", title: "PD — new case managers", start: iso(12, 9, 0), end: iso(12, 12, 0), type: "milestone", scope: "Staff" },
  { id: "d6", title: "Annual planning window opens", start: iso(20, 9, 0), type: "milestone", scope: "District" },
];

const PARTNER_EVENTS: CalendarEvent[] = [
  { id: "p1", title: "Summer cohort applications open", start: iso(1, 9, 0), type: "program", scope: "Youth Employment", href: "/partners-manage/opportunities" },
  { id: "p2", title: "Fall program info session", start: iso(5, 17, 0), end: iso(5, 18, 0), type: "meeting", scope: "Prospective students", href: "/partners-manage" },
  { id: "p3", title: "Application deadline — Summer cohort", start: iso(21, 17, 0), type: "opportunity", scope: "Youth Employment", href: "/partners-manage/deadlines" },
  { id: "p4", title: "Renewal — partner profile", start: iso(28, 9, 0), type: "milestone", scope: "Org", href: "/partners-manage/profile" },
  { id: "p5", title: "Site visit with district", start: iso(9, 10, 0), end: iso(9, 12, 0), type: "meeting", scope: "District" },
  { id: "p6", title: "Impact snapshot due", start: iso(14, 12, 0), type: "report", scope: "Org", href: "/partners-manage/impact" },
];

const OWNER_EVENTS: CalendarEvent[] = [
  { id: "o1", title: "Launch review — release gate", start: iso(3, 10, 0), end: iso(3, 11, 0), type: "milestone", scope: "Platform", href: "/owner/launch" },
  { id: "o2", title: "Feedback triage", start: iso(1, 15, 0), type: "meeting", scope: "Team", href: "/owner/feedback" },
  { id: "o3", title: "Partner submissions review", start: iso(4, 14, 0), type: "meeting", scope: "Team", href: "/owner/partner-submissions" },
  { id: "o4", title: "System health check", start: iso(0, 8, 0), type: "milestone", scope: "Ops", href: "/owner/health" },
  { id: "o5", title: "Waitlist outreach batch", start: iso(6, 9, 0), type: "action-item", scope: "GTM", href: "/owner/waitlist" },
  { id: "o6", title: "Weekly analytics review", start: iso(7, 13, 0), end: iso(7, 14, 0), type: "meeting", scope: "Team", href: "/owner/analytics" },
];

export type SampleCalendarRole =
  | "student"
  | "family"
  | "educator"
  | "school-admin"
  | "district-admin"
  | "partner"
  | "owner";

export function getSampleCalendarEvents(role: SampleCalendarRole): CalendarEvent[] {
  switch (role) {
    case "student": return STUDENT_EVENTS;
    case "family": return FAMILY_EVENTS;
    case "educator": return EDUCATOR_EVENTS;
    case "school-admin": return SCHOOL_ADMIN_EVENTS;
    case "district-admin": return DISTRICT_ADMIN_EVENTS;
    case "partner": return PARTNER_EVENTS;
    case "owner": return OWNER_EVENTS;
  }
}
