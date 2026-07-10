/**
 * Sample screen fixtures for each Transition Workspace stage.
 *
 * These power the inline "Sample Screen" panel rendered inside
 * StageBody so the stage page previews the tool/workflow for that
 * stage instead of linking out to a disconnected demo route.
 *
 * Sample data only — no real students. Titles use Title Case per the
 * project style rules.
 */

import type { LucideIcon } from "lucide-react";
import {
  AlertTriangle,
  BookOpen,
  CalendarDays,
  ClipboardCheck,
  ClipboardList,
  Compass,
  FileText,
  FolderOpen,
  Handshake,
  Heart,
  MessageCircleQuestion,
  Rocket,
  Sparkles,
  Target,
  UserRound,
} from "lucide-react";

import type { StageId } from "./stages";

export type StageSampleTone =
  | "default"
  | "success"
  | "warning"
  | "critical"
  | "muted";

export interface StageSampleBullet {
  label: string;
  value?: string;
  hint?: string;
}

export interface StageSampleCard {
  icon: LucideIcon;
  /** Title Case, per the project style rules. */
  title: string;
  status?: string;
  tone?: StageSampleTone;
  summary?: string;
  bullets?: StageSampleBullet[];
}

export interface StageSampleScreen {
  /** Title Case heading rendered above the sample cards. */
  title: string;
  /** Sentence-case narrative describing what a user would see and do. */
  description: string;
  /** 2–3 mini tool cards that mirror the real signed-in surface. */
  cards: StageSampleCard[];
  /** Sentence-case caption tying the sample back to the Pathway Report. */
  reportLink: string;
}

export const STAGE_SAMPLE_SCREENS: Record<StageId, StageSampleScreen> = {
  start: {
    title: "Student Snapshot Preview",
    description:
      "The Start stage captures the student's context — grade band, supports already in place, and what's on the current plan — so every later stage builds on the same foundation.",
    cards: [
      {
        icon: UserRound,
        title: "Student Context Card",
        status: "In Progress",
        tone: "default",
        summary:
          "Basic profile the whole team can see: grade, program, and case manager.",
        bullets: [
          { label: "Student", value: "Jordan Rivera" },
          { label: "Grade Band", value: "Transition (11)" },
          { label: "Case Manager", value: "Ms. Nguyen" },
        ],
      },
      {
        icon: ClipboardList,
        title: "Current Supports Snapshot",
        status: "Active",
        tone: "success",
        summary:
          "IEP services and accommodations already documented for this year.",
        bullets: [
          { label: "IEP Status", value: "Active" },
          { label: "504 Plan", value: "N/A" },
          { label: "Related Services", value: "Speech, Counseling" },
        ],
      },
      {
        icon: Sparkles,
        title: "Planning Snapshot",
        status: "Draft",
        tone: "warning",
        summary:
          "What the team knows so far about postsecondary direction.",
        bullets: [
          { label: "Direction", value: "College + Work" },
          { label: "Interests", value: "Design, Coding" },
          { label: "Confidence", value: "Building" },
        ],
      },
    ],
    reportLink:
      "Feeds the Student Snapshot section of the Pathway Report.",
  },
  voice: {
    title: "Student Voice Preview",
    description:
      "The Voice stage centers the student's own strengths, interests, worries, and support preferences before anyone else weighs in.",
    cards: [
      {
        icon: MessageCircleQuestion,
        title: "Student Voice Prompts",
        status: "3 of 6",
        tone: "default",
        summary:
          "Guided prompts the student answers in their own words — voice or text.",
        bullets: [
          { label: "Answered", value: "3" },
          { label: "Skipped", value: "1" },
          { label: "Remaining", value: "2" },
        ],
      },
      {
        icon: Heart,
        title: "Strengths and Interests",
        status: "Captured",
        tone: "success",
        summary: "What the student is proud of and wants more of.",
        bullets: [
          { label: "Top Strength", value: "Visual Thinking" },
          { label: "Top Interest", value: "Game Design" },
          { label: "Would Try", value: "Internship" },
        ],
      },
      {
        icon: Target,
        title: "Support Preferences",
        status: "Shared",
        tone: "default",
        summary: "How the student wants to be supported at school and beyond.",
        bullets: [
          { label: "Best Setting", value: "Small Group" },
          { label: "Needs Time", value: "Reading, Tests" },
          { label: "Advocacy", value: "With A Coach" },
        ],
      },
    ],
    reportLink:
      "Feeds the Student Voice and Strengths, Preferences, Interests, and Needs sections of the Pathway Report.",
  },
  family: {
    title: "Family Perspective Preview",
    description:
      "The Family stage collects hopes, concerns, priorities, and the questions the family wants asked at the next PPT or transition meeting.",
    cards: [
      {
        icon: Heart,
        title: "Family Priorities",
        status: "Captured",
        tone: "success",
        summary:
          "The two or three outcomes the family cares most about this year.",
        bullets: [
          { label: "Priority", value: "Independence" },
          { label: "Priority", value: "Paid Work" },
          { label: "Priority", value: "Safe Travel" },
        ],
      },
      {
        icon: MessageCircleQuestion,
        title: "Meeting Prep Questions",
        status: "5 Drafted",
        tone: "default",
        summary:
          "Questions the family plans to bring into the next PPT meeting.",
        bullets: [
          { label: "For Case Manager", value: "3" },
          { label: "For School Admin", value: "1" },
          { label: "For Related Services", value: "1" },
        ],
      },
      {
        icon: ClipboardCheck,
        title: "Consent and Sharing",
        status: "Review",
        tone: "warning",
        summary: "Who the family agrees to share the Pathway Report with.",
        bullets: [
          { label: "School Team", value: "Yes" },
          { label: "Adult Agencies", value: "Ask First" },
          { label: "Community Partners", value: "Not Yet" },
        ],
      },
    ],
    reportLink:
      "Feeds the Family Action Plan and Meeting Prep Questions sections of the Pathway Report.",
  },
  school: {
    title: "School Team Insight Preview",
    description:
      "The School stage brings in the case manager and educator view — services, accommodations, and readiness notes from the classroom.",
    cards: [
      {
        icon: ClipboardList,
        title: "Case Manager Notes",
        status: "Updated",
        tone: "success",
        summary:
          "Recent observations from the case manager and content teachers.",
        bullets: [
          { label: "Last Updated", value: "2 Days Ago" },
          { label: "Contributors", value: "3 Educators" },
          { label: "Focus", value: "Self-Advocacy" },
        ],
      },
      {
        icon: FileText,
        title: "Services and Accommodations",
        status: "Aligned",
        tone: "default",
        summary:
          "Current IEP services mapped to transition goals for this year.",
        bullets: [
          { label: "Services", value: "4 Active" },
          { label: "Accommodations", value: "6 Active" },
          { label: "Gaps Flagged", value: "1" },
        ],
      },
      {
        icon: Target,
        title: "Classroom Readiness Notes",
        status: "In Review",
        tone: "warning",
        summary:
          "What the team sees working — and where they'd like more data.",
        bullets: [
          { label: "Strong Area", value: "Group Work" },
          { label: "Growth Area", value: "Time Management" },
          { label: "Needs Data", value: "Independent Reading" },
        ],
      },
    ],
    reportLink:
      "Feeds the Educator and Case Manager Action Plan and IEP Translator sections of the Pathway Report.",
  },
  evidence: {
    title: "Documents and Evidence Preview",
    description:
      "The Evidence stage anchors the plan in real documents: IEPs, report cards, progress notes, and formal assessments.",
    cards: [
      {
        icon: FolderOpen,
        title: "Document Upload Status",
        status: "3 of 5",
        tone: "warning",
        summary:
          "Which core documents are in the vault and which are still missing.",
        bullets: [
          { label: "IEP (Current)", value: "Uploaded" },
          { label: "Report Card", value: "Uploaded" },
          { label: "Transition Assessment", value: "Missing" },
        ],
      },
      {
        icon: FileText,
        title: "IEP Evidence Highlights",
        status: "Reviewed",
        tone: "success",
        summary:
          "Key passages from the current IEP tagged to transition domains.",
        bullets: [
          { label: "Postsecondary Goals", value: "3 Tagged" },
          { label: "Services Cited", value: "4" },
          { label: "Assessments Cited", value: "2" },
        ],
      },
      {
        icon: AlertTriangle,
        title: "Missing Information and Gaps",
        status: "Action Needed",
        tone: "critical",
        summary:
          "What's blocking a stronger Pathway Report right now.",
        bullets: [
          { label: "Transition Assessment", value: "Request" },
          { label: "Recent Work Sample", value: "Request" },
          { label: "Family Consent Form", value: "Pending" },
        ],
      },
    ],
    reportLink:
      "Feeds the Missing Information and Data Gaps section of the Pathway Report.",
  },
  ready: {
    title: "Readiness Scorecard Preview",
    description:
      "The Ready stage turns everything captured so far into a readiness picture across academics, self-advocacy, independent living, career, and community.",
    cards: [
      {
        icon: ClipboardCheck,
        title: "Readiness Scorecard",
        status: "Updated",
        tone: "success",
        summary:
          "Overall readiness picture across the five transition domains.",
        bullets: [
          { label: "Academics", value: "Strong" },
          { label: "Self-Advocacy", value: "Building" },
          { label: "Independent Living", value: "Focus" },
        ],
      },
      {
        icon: Sparkles,
        title: "Strengths To Build On",
        status: "Highlighted",
        tone: "default",
        summary: "Where the student already shines across domains.",
        bullets: [
          { label: "Academics", value: "Visual Design" },
          { label: "Community", value: "Peer Mentoring" },
          { label: "Career", value: "Portfolio Started" },
        ],
      },
      {
        icon: Target,
        title: "Priority Focus Areas",
        status: "Team Set",
        tone: "warning",
        summary:
          "The two or three areas the team agreed to focus on this cycle.",
        bullets: [
          { label: "Focus", value: "Time Management" },
          { label: "Focus", value: "Travel Training" },
          { label: "Focus", value: "Self-Advocacy" },
        ],
      },
    ],
    reportLink:
      "Feeds the Readiness Scorecard section of the Pathway Report.",
  },
  roadmap: {
    title: "Pathway Report Preview",
    description:
      "This is the premium deliverable — a shareable, IDEA-aligned report that turns voice, family priorities, educator insight, and evidence into a defensible pathway with matched careers, life goals, and next steps.",

    cards: [
      {
        icon: Compass,
        title: "Recommended Pathway",
        status: "Suggested",
        tone: "default",
        summary:
          "The pathway that best fits the student's voice, readiness, and evidence.",
        bullets: [
          { label: "Direction", value: "College + Work" },
          { label: "Program", value: "TransitionForward" },
          { label: "Confidence", value: "High" },
        ],
      },
      {
        icon: Target,
        title: "Postsecondary Goals",
        status: "Drafted",
        tone: "default",
        summary:
          "Draft goals for education, employment, and independent living.",
        bullets: [
          { label: "Education", value: "2-Year Program" },
          { label: "Employment", value: "Design Internship" },
          { label: "Living", value: "Semi-Independent" },
        ],
      },
      {
        icon: BookOpen,
        title: "Career and Life Matches",
        status: "5 Matches",
        tone: "success",
        summary:
          "Careers and community roles matched to strengths and interests.",
        bullets: [
          { label: "Top Match", value: "UX Assistant" },
          { label: "Top Match", value: "Library Aide" },
          { label: "Top Match", value: "Peer Mentor" },
        ],
      },
    ],
    reportLink:
      "Feeds the Postsecondary Goals, Recommended Pathways, and Career and Life Matches sections of the Pathway Report.",
  },
  action: {
    title: "30 / 90 / 180 / 365 Day Plan Preview",
    description:
      "The Action stage breaks the pathway into concrete next steps with owners, due dates, and meeting follow-up.",
    cards: [
      {
        icon: Rocket,
        title: "30-Day Action Plan",
        status: "3 Steps",
        tone: "default",
        summary: "What happens in the next month, with owners.",
        bullets: [
          { label: "Owner: Student", value: "1" },
          { label: "Owner: Family", value: "1" },
          { label: "Owner: School", value: "1" },
        ],
      },
      {
        icon: CalendarDays,
        title: "90 and 180-Day Steps",
        status: "Scheduled",
        tone: "success",
        summary:
          "Longer-range milestones with due dates and meeting checkpoints.",
        bullets: [
          { label: "PPT Meeting", value: "In 6 Weeks" },
          { label: "College Tour", value: "In 3 Months" },
          { label: "Job Shadow", value: "In 5 Months" },
        ],
      },
      {
        icon: Target,
        title: "365-Day Milestones",
        status: "Draft",
        tone: "warning",
        summary: "Year-out goals the team will revisit each stage.",
        bullets: [
          { label: "Milestone", value: "Program Applied" },
          { label: "Milestone", value: "Paid Work" },
          { label: "Milestone", value: "Travel Independent" },
        ],
      },
    ],
    reportLink:
      "Feeds the 30-Day, 90-Day, 6-Month, and 1-Year Next Steps section of the Pathway Report.",
  },
  connect: {
    title: "Resources and Opportunities Preview",
    description:
      "The Connect stage turns the plan into follow-through — recommended resources, community programs, and partner opportunities the family has agreed to share with.",
    cards: [
      {
        icon: BookOpen,
        title: "Recommended Resources",
        status: "6 Matches",
        tone: "default",
        summary:
          "Curated guides, agencies, and services matched to the plan.",
        bullets: [
          { label: "State Agencies", value: "2" },
          { label: "Family Guides", value: "3" },
          { label: "Self-Advocacy", value: "1" },
        ],
      },
      {
        icon: Handshake,
        title: "Partner Opportunity Matches",
        status: "3 Open",
        tone: "success",
        summary:
          "Partner-hosted opportunities that match — visible only where consent allows.",
        bullets: [
          { label: "Internship", value: "2 Open" },
          { label: "Mentorship", value: "1 Open" },
          { label: "Workshop", value: "Enrolling" },
        ],
      },
      {
        icon: CalendarDays,
        title: "Calendar and Follow-Through",
        status: "On Track",
        tone: "success",
        summary:
          "Upcoming meetings and check-ins tied back to the Action stage.",
        bullets: [
          { label: "Next Meeting", value: "In 2 Weeks" },
          { label: "Check-In", value: "In 30 Days" },
          { label: "Report Review", value: "In 60 Days" },
        ],
      },
    ],
    reportLink:
      "Feeds the Recommended Resources and Partner Opportunity Matches sections of the Pathway Report.",
  },
};

export function getStageSample(id: StageId): StageSampleScreen {
  return STAGE_SAMPLE_SCREENS[id];
}

/* ------------------------------------------------------------------ */
/* Expanded detail — content that used to live on the separate        */
/* "Transition Studio" demo routes, now folded into the Workspace     */
/* Tour so opening a full sample screen expands the current stage     */
/* in place rather than navigating away.                              */
/* ------------------------------------------------------------------ */

export interface StageDetailGroup {
  title: string;
  description?: string;
  items: { label: string; note?: string }[];
}

export interface StageDetailScreen {
  intro: string;
  groups: StageDetailGroup[];
  disclaimer?: string;
}

export const STAGE_SAMPLE_DETAILS: Record<StageId, StageDetailScreen> = {
  start: {
    intro:
      "A closer look at how the Start stage frames the student for the rest of the plan — profile, grade band, school context, and current supports.",
    groups: [
      {
        title: "Student Profile",
        items: [
          { label: "Name", note: "Jordan Rivera (sample)" },
          { label: "Grade", note: "11 · Transition band" },
          { label: "School", note: "Riverbend High" },
          { label: "Pronouns", note: "they / them" },
        ],
      },
      {
        title: "Current Supports",
        items: [
          { label: "IEP", note: "Active, last reviewed March" },
          { label: "Related Services", note: "Speech, Counseling" },
          { label: "Accommodations", note: "Extended time, small group" },
        ],
      },
      {
        title: "Planning Concerns",
        items: [
          { label: "Executive Function", note: "Multi-step tasks need scaffolds" },
          { label: "Anxiety", note: "New environments" },
          { label: "Post-School Direction", note: "Undecided, interested in design" },
        ],
      },
    ],
    disclaimer: "Sample data — no real student information is shown.",
  },
  voice: {
    intro:
      "The Student Voice detail view mirrors the prompts, strengths, interests, and worries a student would answer in their own words.",
    groups: [
      {
        title: "Voice Prompts",
        items: [
          { label: "What Am I Good At", note: "Noticing details, patient with younger kids" },
          { label: "What I Want After School", note: "Keep learning, maybe work with animals" },
          { label: "What Helps Me", note: "Written directions, quiet workspace" },
        ],
      },
      {
        title: "Strengths and Interests",
        items: [
          { label: "Strengths", note: "Visual memory, pattern-spotting, cooking" },
          { label: "Interests", note: "Game design, animals, music production" },
          { label: "Would Try", note: "Internship, weekend workshop" },
        ],
      },
      {
        title: "Worries and Support Preferences",
        items: [
          { label: "Worries", note: "Big rooms, being called on cold" },
          { label: "Best Setting", note: "Small group with a coach" },
          { label: "Advocacy Style", note: "Prefers to prep questions in writing" },
        ],
      },
    ],
    disclaimer:
      "The student-friendly report preview reads these back to the student in plain language.",
  },
  family: {
    intro:
      "The Family Perspective detail view collects hopes, concerns, meeting questions, consent, and document status in one place.",
    groups: [
      {
        title: "Family Priorities",
        items: [
          { label: "Independence", note: "Safe travel + budgeting" },
          { label: "Paid Work", note: "Something Jordan enjoys" },
          { label: "Community", note: "Stay connected with peers" },
        ],
      },
      {
        title: "Meeting Questions",
        items: [
          { label: "For The Case Manager", note: "How does transition assessment work?" },
          { label: "For The School", note: "What supports carry over to college?" },
          { label: "For Adult Services", note: "When do we apply?" },
        ],
      },
      {
        title: "Consent, Sharing, and Uploads",
        items: [
          { label: "Consent To Share", note: "School team: yes · Partners: ask first" },
          { label: "Documents Uploaded", note: "IEP, most recent report card" },
          { label: "Family Action Items", note: "Book college tour, request assessment" },
        ],
      },
    ],
  },
  school: {
    intro:
      "The School Team Insight detail view shows the case manager and educator surface — services, accommodations, readiness notes, and meeting prep.",
    groups: [
      {
        title: "Educator and Case Manager View",
        items: [
          { label: "Caseload Focus", note: "6 transition-band students this cycle" },
          { label: "Workflow", note: "Weekly notes → auto-summary → PPT prep" },
          { label: "Meeting Prep", note: "Draft agenda + open questions" },
        ],
      },
      {
        title: "Services and Accommodations",
        items: [
          { label: "Active Services", note: "Speech, Counseling, Job Coach" },
          { label: "Accommodations", note: "Extended time, chunked work, visual schedules" },
          { label: "Gaps Flagged", note: "Missing recent transition assessment" },
        ],
      },
      {
        title: "Classroom Readiness Notes",
        items: [
          { label: "Working Well", note: "Group projects, hands-on labs" },
          { label: "Growth Area", note: "Sustained independent reading" },
          { label: "Data Needed", note: "Timed writing sample" },
        ],
      },
    ],
  },
  evidence: {
    intro:
      "The Evidence detail view previews the document review — IEP insights, report cards, assessment scores, progress notes, and source citations.",
    groups: [
      {
        title: "IEP and Document Insights",
        items: [
          { label: "Postsecondary Goals Tagged", note: "3 across education, work, living" },
          { label: "Services Cited", note: "4 with page references" },
          { label: "Assessments Cited", note: "2 (WJ-IV, Transition Interest Inventory)" },
        ],
      },
      {
        title: "Report Cards and Progress",
        items: [
          { label: "Latest Grades", note: "B / C average, strongest in Art and CS" },
          { label: "Progress Notes", note: "IEP goals on track: 4 of 6" },
          { label: "Attendance", note: "94%" },
        ],
      },
      {
        title: "Source Notes and Gaps",
        items: [
          { label: "Every AI Insight", note: "Links back to the source line in the document" },
          { label: "Missing", note: "Current transition assessment, updated work sample" },
          { label: "Family Consent Form", note: "Pending signature" },
        ],
      },
    ],
    disclaimer: "AI-generated insights always cite their source and are reviewable by the team.",
  },
  ready: {
    intro:
      "The Readiness detail view breaks the scorecard into the five transition domains with strengths, gaps, and priority focus areas.",
    groups: [
      {
        title: "Readiness By Domain",
        items: [
          { label: "Academic", note: "Strong — visual design, CS" },
          { label: "Self-Advocacy", note: "Building — prep-and-practice model" },
          { label: "Independent Living", note: "Focus — travel, budgeting" },
          { label: "Career", note: "Emerging — portfolio started" },
          { label: "Postsecondary", note: "Building — 2 programs shortlisted" },
        ],
      },
      {
        title: "Strengths To Build On",
        items: [
          { label: "Peer Mentoring", note: "Works well with younger students" },
          { label: "Detail Work", note: "Catches errors others miss" },
          { label: "Cooking", note: "Independent multi-step routines at home" },
        ],
      },
      {
        title: "Priority Focus Areas",
        items: [
          { label: "Time Management", note: "Chunked planners + check-ins" },
          { label: "Travel Training", note: "Route practice with a coach" },
          { label: "Self-Advocacy", note: "Lead one section of next PPT" },
        ],
      },
    ],
  },
  roadmap: {
    intro:
      "The Pathway Report is the shareable deliverable of the whole plan — synthesized from student voice, family priorities, educator insight, and evidence. Every section is IDEA-aligned and cites its source.",
    groups: [
      {
        title: "Executive Summary",
        description:
          "The one-page brief the team reads first — direction, confidence, and top three next steps.",
        items: [
          { label: "Recommended Direction", note: "College + Work (TransitionForward track)" },
          { label: "Confidence", note: "High — aligned across voice, evidence, family" },
          { label: "Top Next Step", note: "Book PPT + request transition assessment" },
        ],
      },
      {
        title: "Student Voice Highlights",
        description: "Direct from the student, in their own words.",
        items: [
          { label: "After School", note: "Keep learning, maybe work with animals" },
          { label: "What Helps Me", note: "Written directions, quiet workspace" },
          { label: "Would Try", note: "Internship, weekend workshop" },
        ],
      },
      {
        title: "Family Priorities",
        items: [
          { label: "Independence", note: "Safe travel + budgeting" },
          { label: "Paid Work", note: "Something Jordan enjoys" },
          { label: "Community", note: "Stay connected with peers" },
        ],
      },
      {
        title: "Educator Insight",
        items: [
          { label: "Strong Area", note: "Group work, hands-on labs" },
          { label: "Growth Area", note: "Sustained independent reading" },
          { label: "Case Manager Focus", note: "Self-advocacy this cycle" },
        ],
      },
      {
        title: "Documents and Evidence",
        description: "Every insight below cites the source page.",
        items: [
          { label: "IEP", note: "Uploaded · 3 goals tagged · 4 services cited" },
          { label: "Report Card", note: "Uploaded · strongest in Art + CS" },
          { label: "Transition Assessment", note: "Requested — flagged as gap" },
        ],
      },
      {
        title: "Readiness Profile",
        items: [
          { label: "Academic", note: "Strong" },
          { label: "Self-Advocacy", note: "Building" },
          { label: "Independent Living", note: "Focus" },
          { label: "Career", note: "Emerging" },
          { label: "Postsecondary", note: "Building" },
        ],
      },
      {
        title: "Recommended Pathway",
        items: [
          { label: "TransitionForward", note: "Best fit — 2-year program + design internship" },
          { label: "Why It Fits", note: "Matches voice, evidence, and family priorities" },
          { label: "What's Next", note: "Two campus tours + one job shadow booked" },
        ],
      },
      {
        title: "Career and Life Matches",
        items: [
          { label: "UX Assistant", note: "Design interest + detail strengths" },
          { label: "Library Aide", note: "Quiet, structured, community-facing" },
          { label: "Peer Mentor", note: "Patience with younger kids" },
        ],
      },
      {
        title: "Role-Specific Views",
        description:
          "The same report, reframed for each reader — one document, three lenses.",
        items: [
          { label: "Student View", note: "Plain language, strengths-first, one-page summary" },
          { label: "Family View", note: "Meeting-ready with questions and consent controls" },
          { label: "Educator View", note: "IDEA-aligned goals with citation trail" },
        ],
      },
    ],
    disclaimer:
      "AI-assisted insights always cite their source and are reviewable by the full team before sharing.",
  },

  action: {
    intro:
      "The Action detail view lays out the 30 / 60 / 90 / 180 / 365-day plan with owners, due dates, and meeting follow-up.",
    groups: [
      {
        title: "30-Day Plan",
        items: [
          { label: "Student", note: "Finish two Voice prompts" },
          { label: "Family", note: "Book PPT date, request assessment" },
          { label: "School", note: "Share updated goals draft" },
        ],
      },
      {
        title: "90 and 180-Day Plan",
        items: [
          { label: "PPT Meeting", note: "In 6 weeks — agenda pre-loaded" },
          { label: "College Tour", note: "In 3 months — two schools" },
          { label: "Job Shadow", note: "In 5 months — via partner network" },
        ],
      },
      {
        title: "Meeting Prep and Follow-Up",
        items: [
          { label: "Pre-Meeting", note: "Questions + goals shared 48h ahead" },
          { label: "During", note: "Live notes captured to the plan" },
          { label: "After", note: "Auto-generated summary + action items" },
        ],
      },
    ],
  },
  connect: {
    intro:
      "The Connect detail view shows the dashboard follow-through — resources, calendar, and partner opportunities where consent allows.",
    groups: [
      {
        title: "Dashboard Follow-Through",
        items: [
          { label: "Open Action Items", note: "3 due this week" },
          { label: "Upcoming Meeting", note: "Transition planning · Tue 3pm" },
          { label: "Last Update", note: "Case manager, 2 days ago" },
        ],
      },
      {
        title: "Recommended Resources",
        items: [
          { label: "CT Transition Task Force", note: "Family guide" },
          { label: "Project SEARCH Hartford", note: "Internship program" },
          { label: "ABLE Accounts", note: "Plain-language setup guide" },
        ],
      },
      {
        title: "Partner Opportunities",
        items: [
          { label: "Design Internship", note: "Two openings — shared with consent" },
          { label: "Peer Mentor Program", note: "One opening — matches strengths" },
          { label: "Weekend Workshop", note: "Enrolling — travel-training pilot" },
        ],
      },
    ],
    disclaimer: "Partner opportunities are only visible where the family has agreed to share.",
  },
};

export function getStageDetail(id: StageId): StageDetailScreen {
  return STAGE_SAMPLE_DETAILS[id];
}
