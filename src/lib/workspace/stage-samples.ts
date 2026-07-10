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
        status: "High Confidence",
        tone: "success",
        summary:
          "The pathway that best fits the student's voice, readiness, and evidence — with a plain-language rationale.",
        bullets: [
          { label: "Direction", value: "College + Work" },
          { label: "Program", value: "TransitionForward" },
          { label: "Alternate", value: "BridgeForward" },
        ],
      },
      {
        icon: Target,
        title: "Postsecondary Goals",
        status: "IDEA-Aligned",
        tone: "default",
        summary:
          "Education, employment, and independent living goals translated into plain language, with linked services and accommodations.",
        bullets: [
          { label: "Education", value: "2-Year Program" },
          { label: "Employment", value: "Design Internship" },
          { label: "Living", value: "Semi-Independent" },
        ],
      },
      {
        icon: BookOpen,
        title: "Matches + Next Steps",
        status: "5 Careers · 3 Partners",
        tone: "success",
        summary:
          "Career and community matches, recommended resources, partner opportunities, and 30/90/180/365-day next steps with owners.",
        bullets: [
          { label: "Top Match", value: "UX Assistant" },
          { label: "Top Partner", value: "Design Studio" },
          { label: "This Month", value: "Book PPT" },
        ],
      },
    ],
    reportLink:
      "Feeds the Snapshot, Voice, Family, Educator, Evidence, Readiness, Pathways, Matches, Meeting Prep, and Next Steps sections of the Pathway Report.",
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

export type StageDetailPhase = "input" | "insight" | "pathway" | "action";

export const STAGE_DETAIL_PHASE_LABEL: Record<StageDetailPhase, string> = {
  input: "Input",
  insight: "Insight",
  pathway: "Pathway",
  action: "Action",
};

export interface StageDetailGroup {
  title: string;
  description?: string;
  /**
   * Which phase of the Pathway Report flow this group represents.
   * Groups are ordered Input → Insight → Pathway → Action so the
   * expanded panel mirrors how the report itself reads.
   */
  phase?: StageDetailPhase;
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
      "The Start stage sets the foundation the rest of the report builds on — who the student is, what's already in place, and where the plan is heading.",
    groups: [
      {
        phase: "input",
        title: "Student Profile",
        description: "The context every reader of the report sees first.",
        items: [
          { label: "Name", note: "Jordan Rivera (sample)" },
          { label: "Grade", note: "11 · Transition band" },
          { label: "School", note: "Riverbend High" },
          { label: "Pronouns", note: "they / them" },
        ],
      },
      {
        phase: "insight",
        title: "Current Supports and Concerns",
        description: "What the team already knows before planning starts.",
        items: [
          { label: "IEP", note: "Active, last reviewed March" },
          { label: "Related Services", note: "Speech, Counseling" },
          { label: "Planning Concerns", note: "Executive function, new environments" },
        ],
      },
      {
        phase: "pathway",
        title: "Direction Hypothesis",
        description: "The working pathway the report will test as evidence comes in.",
        items: [
          { label: "Interest Area", note: "Design, creative tech" },
          { label: "Likely Direction", note: "College + Work" },
          { label: "Confidence", note: "Building — needs student voice" },
        ],
      },
      {
        phase: "action",
        title: "What To Gather Next",
        description: "The two or three inputs that unlock the next stage.",
        items: [
          { label: "Student", note: "Complete Voice prompts" },
          { label: "Family", note: "Upload most recent IEP" },
          { label: "School", note: "Confirm case manager + services" },
        ],
      },
    ],
    disclaimer: "Sample data — no real student information is shown.",
  },
  voice: {
    intro:
      "The Voice stage centers the student's own words — strengths, interests, worries, and support preferences — before anyone else weighs in.",
    groups: [
      {
        phase: "input",
        title: "Voice Prompts Answered",
        description: "What the student answered in their own words — voice or text.",
        items: [
          { label: "What Am I Good At", note: "Noticing details, patient with younger kids" },
          { label: "What I Want After School", note: "Keep learning, maybe work with animals" },
          { label: "What Helps Me", note: "Written directions, quiet workspace" },
        ],
      },
      {
        phase: "insight",
        title: "Strengths, Interests, Worries",
        description: "The student themes surfaced from the prompts.",
        items: [
          { label: "Strengths", note: "Visual memory, pattern-spotting, cooking" },
          { label: "Interests", note: "Game design, animals, music production" },
          { label: "Worries", note: "Big rooms, being called on cold" },
        ],
      },
      {
        phase: "pathway",
        title: "How Voice Shapes The Pathway",
        description: "What the report will reflect back to the team.",
        items: [
          { label: "Direction Signal", note: "Creative + hands-on college programs" },
          { label: "Support Signal", note: "Small group, coached advocacy" },
          { label: "Match Signal", note: "UX assistant, library aide, peer mentor" },
        ],
      },
      {
        phase: "action",
        title: "What The Student Brings To The Meeting",
        items: [
          { label: "Lead One Section", note: "Introduce strengths at next PPT" },
          { label: "Pre-Written Questions", note: "Two questions ready for the team" },
          { label: "Advocacy Style", note: "Prep-and-practice with a coach" },
        ],
      },
    ],
    disclaimer:
      "The student-friendly report preview reads these back to the student in plain language.",
  },
  family: {
    intro:
      "The Family stage captures hopes, concerns, meeting questions, and consent — so the family walks into the PPT prepared, not surprised.",
    groups: [
      {
        phase: "input",
        title: "Family Priorities",
        description: "The two or three outcomes the family cares most about.",
        items: [
          { label: "Independence", note: "Safe travel + budgeting" },
          { label: "Paid Work", note: "Something Jordan enjoys" },
          { label: "Community", note: "Stay connected with peers" },
        ],
      },
      {
        phase: "insight",
        title: "Meeting Questions",
        description: "What the family plans to ask at the next PPT.",
        items: [
          { label: "For The Case Manager", note: "How does transition assessment work?" },
          { label: "For The School", note: "What supports carry over to college?" },
          { label: "For Adult Services", note: "When do we apply?" },
        ],
      },
      {
        phase: "pathway",
        title: "How Family Voice Shapes The Pathway",
        items: [
          { label: "Direction Alignment", note: "College + Work matches priorities" },
          { label: "Guardrails", note: "Travel training before independent commute" },
          { label: "Concerns To Address", note: "Backup plan if internship pauses" },
        ],
      },
      {
        phase: "action",
        title: "Consent, Sharing, and Family Steps",
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
      "The School stage surfaces the case manager and educator view — services, accommodations, and readiness notes from the classroom.",
    groups: [
      {
        phase: "input",
        title: "Case Manager and Educator Notes",
        description: "Recent observations from the people who see the student daily.",
        items: [
          { label: "Caseload Focus", note: "6 transition-band students this cycle" },
          { label: "Contributors", note: "3 educators added notes this week" },
          { label: "Focus Theme", note: "Self-advocacy" },
        ],
      },
      {
        phase: "insight",
        title: "Services, Accommodations, and Gaps",
        items: [
          { label: "Active Services", note: "Speech, Counseling, Job Coach" },
          { label: "Accommodations", note: "Extended time, chunked work, visual schedules" },
          { label: "Gaps Flagged", note: "Missing recent transition assessment" },
        ],
      },
      {
        phase: "pathway",
        title: "Educator Recommendation",
        description: "What the school team recommends the report reflect.",
        items: [
          { label: "Strong Area", note: "Group work, hands-on labs" },
          { label: "Growth Area", note: "Sustained independent reading" },
          { label: "Recommended Direction", note: "Structured 2-year program + internship" },
        ],
      },
      {
        phase: "action",
        title: "PPT Prep and Next Steps",
        items: [
          { label: "Draft Agenda", note: "Ready 48h before the meeting" },
          { label: "Open Questions", note: "Two flagged for family input" },
          { label: "Data Needed", note: "Timed writing sample this week" },
        ],
      },
    ],
  },
  evidence: {
    intro:
      "The Evidence stage anchors the plan in real documents: IEPs, report cards, progress notes, and assessments — every insight cites its source.",
    groups: [
      {
        phase: "input",
        title: "Documents Uploaded",
        items: [
          { label: "Current IEP", note: "Uploaded · March" },
          { label: "Report Card", note: "Uploaded · latest quarter" },
          { label: "Transition Assessment", note: "Missing — request pending" },
        ],
      },
      {
        phase: "insight",
        title: "Auto-Tagged Citations",
        description: "Key passages tagged to transition domains, with page references.",
        items: [
          { label: "Postsecondary Goals", note: "3 tagged across education, work, living" },
          { label: "Services Cited", note: "4 with page references" },
          { label: "Assessments Cited", note: "2 (WJ-IV, Transition Interest Inventory)" },
        ],
      },
      {
        phase: "pathway",
        title: "Evidence-Backed Pathway Signals",
        items: [
          { label: "Academic Strength", note: "B / C average — strongest in Art and CS" },
          { label: "IEP Goal Progress", note: "On track: 4 of 6" },
          { label: "Attendance", note: "94% — supports internship readiness" },
        ],
      },
      {
        phase: "action",
        title: "Gaps To Close Before The Meeting",
        items: [
          { label: "Transition Assessment", note: "Request from district" },
          { label: "Recent Work Sample", note: "Add to portfolio" },
          { label: "Family Consent Form", note: "Pending signature" },
        ],
      },
    ],
    disclaimer:
      "AI-generated insights always cite their source and are reviewable by the team.",
  },
  ready: {
    intro:
      "The Ready stage turns everything captured so far into a readiness picture across the five transition domains.",
    groups: [
      {
        phase: "input",
        title: "Data From Prior Stages",
        description: "Signals rolled up from Voice, Family, School, and Evidence.",
        items: [
          { label: "Student Voice Signals", note: "6 prompts · 3 strengths" },
          { label: "Family Priorities", note: "3 top outcomes" },
          { label: "Educator Notes", note: "12 observations this cycle" },
        ],
      },
      {
        phase: "insight",
        title: "Readiness Scorecard By Domain",
        items: [
          { label: "Academic", note: "Strong — visual design, CS" },
          { label: "Self-Advocacy", note: "Building — prep-and-practice model" },
          { label: "Independent Living", note: "Focus — travel, budgeting" },
          { label: "Career", note: "Emerging — portfolio started" },
          { label: "Postsecondary", note: "Building — 2 programs shortlisted" },
        ],
      },
      {
        phase: "pathway",
        title: "Strengths Matched To Direction",
        items: [
          { label: "Peer Mentoring", note: "Supports Peer Mentor role match" },
          { label: "Detail Work", note: "Supports UX Assistant match" },
          { label: "Cooking Routines", note: "Supports independent living goal" },
        ],
      },
      {
        phase: "action",
        title: "Priority Focus Areas This Cycle",
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
      "The Pathway Report is the shareable deliverable of the whole plan — synthesized from student voice, family priorities, educator insight, and evidence. Every section is IDEA-aligned, cites its source, and reads in three lenses (student, family, educator) from a single document.",
    groups: [
      {
        phase: "input",
        title: "Student Snapshot",
        description: "The cover-page context every reader sees first.",
        items: [
          { label: "Student", note: "Jordan Rivera · they / them · Age 17" },
          { label: "Grade + School", note: "Grade 11 · Riverbend High" },
          { label: "Case Manager", note: "Ms. Nguyen · Transition Team" },
          { label: "Plan Type", note: "Active IEP · last reviewed March" },
          { label: "Headline", note: "College + Work direction with a design focus" },
        ],
      },
      {
        phase: "input",
        title: "Student Voice (In Their Own Words)",
        description: "Quoted directly from the Voice stage — never paraphrased by staff.",
        items: [
          { label: "What I'm Good At", note: "\"Noticing details, patient with younger kids\"" },
          { label: "What I Want After School", note: "\"Keep learning, maybe work with animals\"" },
          { label: "What Helps Me", note: "\"Written directions, quiet workspace\"" },
          { label: "What Worries Me", note: "\"Big rooms, being called on cold\"" },
        ],
      },
      {
        phase: "input",
        title: "Family Priorities",
        description: "The two or three outcomes the family cares most about.",
        items: [
          { label: "Independence", note: "Safe travel + budgeting" },
          { label: "Paid Work", note: "Something Jordan enjoys" },
          { label: "Community", note: "Stay connected with peers" },
          { label: "Consent To Share", note: "School team: yes · Partners: ask first" },
        ],
      },
      {
        phase: "input",
        title: "Educator Insights",
        description: "Recent observations from the case manager and classroom team.",
        items: [
          { label: "Case Manager Note", note: "Strong in group work + hands-on labs" },
          { label: "Growth Area", note: "Sustained independent reading" },
          { label: "Contributors", note: "3 educators added notes this cycle" },
          { label: "Recommended Direction", note: "Structured 2-year program + internship" },
        ],
      },
      {
        phase: "input",
        title: "Documents and Evidence",
        description: "Every insight below cites the source page.",
        items: [
          { label: "Current IEP", note: "Uploaded March · 3 goals + 4 services tagged" },
          { label: "Report Card", note: "Uploaded · strongest in Art + CS" },
          { label: "Transition Interest Inventory", note: "On file · design + community themes" },
          { label: "Transition Assessment", note: "Requested — flagged in Data Gaps" },
        ],
      },
      {
        phase: "insight",
        title: "Readiness Scorecard",
        description: "Five transition domains rated Emerging → Ready.",
        items: [
          { label: "Academic", note: "Strong — visual design, CS" },
          { label: "Self-Advocacy", note: "Building — prep-and-practice model" },
          { label: "Independent Living", note: "Focus — travel, budgeting" },
          { label: "Career Awareness", note: "Emerging — portfolio started" },
          { label: "Postsecondary", note: "Building — 2 programs shortlisted" },
        ],
      },
      {
        phase: "insight",
        title: "IEP + Transition Translator",
        description: "Plain-language translation of the current IEP goals and services.",
        items: [
          { label: "Postsecondary Goal (Education)", note: "\"Enroll in a 2-year design or CS program\"" },
          { label: "Postsecondary Goal (Employment)", note: "\"Hold a paid role tied to a career interest\"" },
          { label: "Postsecondary Goal (Living)", note: "\"Travel and manage a weekly budget independently\"" },
          { label: "Key Accommodations", note: "Extended time · chunked work · visual schedules" },
          { label: "Related Services", note: "Speech · Counseling · Job Coach" },
        ],
      },
      {
        phase: "insight",
        title: "Data Gaps + Needs Review",
        description: "What's missing, why it matters, and who owns closing it.",
        items: [
          { label: "Transition Assessment", note: "Blocks Career section · owner: case manager" },
          { label: "Recent Work Sample", note: "Strengthens portfolio · owner: student" },
          { label: "Family Consent Form", note: "Pending signature · owner: family" },
          { label: "Confidence", note: "High overall — one gap flagged for team review" },
        ],
      },
      {
        phase: "insight",
        title: "Executive Summary",
        description: "The one-page brief the team reads first.",
        items: [
          { label: "Recommended Direction", note: "College + Work (TransitionForward track)" },
          { label: "Confidence", note: "High — aligned across voice, evidence, family" },
          { label: "Top Next Step", note: "Book PPT + request transition assessment" },
          { label: "Change Since Last Version", note: "+1 IEP doc, +2 Voice responses, +3 readiness scores" },
        ],
      },
      {
        phase: "pathway",
        title: "Recommended Pathways",
        description: "Ranked with a plain-language reason and cited sources.",
        items: [
          { label: "TransitionForward (Best Fit)", note: "2-year program + design internship · voice + evidence aligned" },
          { label: "BridgeForward (Alternate)", note: "Bridge year with paid work first · matches family caution" },
          { label: "Why Not Now: Full 4-Year", note: "Executive-function support runway needed first" },
        ],
      },
      {
        phase: "pathway",
        title: "Career and Life Matches",
        description: "Careers and community roles matched to strengths and interests.",
        items: [
          { label: "UX Assistant", note: "Design interest + detail strengths" },
          { label: "Library Aide", note: "Quiet, structured, community-facing" },
          { label: "Peer Mentor", note: "Patience with younger kids" },
          { label: "Animal Shelter Volunteer", note: "Direct match to student voice interest" },
        ],
      },
      {
        phase: "pathway",
        title: "Recommended Resources",
        description: "Curated guides, agencies, and services matched to the plan.",
        items: [
          { label: "CT Bureau Of Rehabilitation Services", note: "Adult-services intake — apply age 16+" },
          { label: "Family Guide To Transition", note: "Read before next PPT" },
          { label: "Self-Advocacy Toolkit", note: "Coached practice for leading a meeting section" },
        ],
      },
      {
        phase: "pathway",
        title: "Partner Matches (Where Consent Allows)",
        description: "Partner-hosted opportunities visible only where the family has opted in.",
        items: [
          { label: "Design Studio Internship", note: "Fall cohort · 8 weeks · paid" },
          { label: "Community Library Aide", note: "Rolling · 4 hrs/wk · structured onboarding" },
          { label: "Peer Mentor Program", note: "Enrolling now · matches student voice" },
        ],
      },
      {
        phase: "action",
        title: "Meeting Prep Questions",
        description: "Pre-written questions the team can bring straight into the PPT.",
        items: [
          { label: "For The Student", note: "Which strength do you want the team to lead with?" },
          { label: "For The Family", note: "What's one worry you want addressed on the record?" },
          { label: "For The Educator", note: "What data would strengthen the Career section?" },
          { label: "For The Team", note: "Who owns each 30-day action, and when do we check in?" },
        ],
      },
      {
        phase: "action",
        title: "Role-Specific Views",
        description: "The same report, reframed for each reader — one document, three lenses.",
        items: [
          { label: "Student View", note: "Plain language, strengths-first, one-page summary" },
          { label: "Family View", note: "Meeting-ready with questions and consent controls" },
          { label: "Educator View", note: "IDEA-aligned goals with citation trail" },
        ],
      },
      {
        phase: "action",
        title: "30 / 90 / 180 / 365-Day Next Steps",
        description: "Concrete steps with owners, laddered to postsecondary goals.",
        items: [
          { label: "30 Days", note: "Book PPT · request transition assessment · finish Voice prompts" },
          { label: "90 Days", note: "PPT held with report-driven agenda · consent form signed" },
          { label: "180 Days", note: "Two college tours + one job shadow completed" },
          { label: "365 Days", note: "Program applied · paid work started · travel independent" },
        ],
      },
      {
        phase: "action",
        title: "Source Notes + AI Disclaimer",
        description: "How to read this report responsibly.",
        items: [
          { label: "Every Insight Cites A Source", note: "Profile · Voice · IEP page · educator note · readiness score" },
          { label: "AI-Assisted, Team-Reviewed", note: "Suggestions are drafts — the team decides what ships" },
          { label: "Version History", note: "Regeneration diff shows what changed since last review" },
          { label: "Sharing", note: "Family controls who sees the report and which sections" },
        ],
      },
    ],
    disclaimer:
      "AI-assisted insights always cite their source and are reviewable by the full team before sharing. Sample data — no real student information is shown.",
  },
  action: {
    intro:
      "The Action stage turns the pathway into concrete next steps — 30 / 90 / 180 / 365-day owners, due dates, and meeting follow-up.",
    groups: [
      {
        phase: "input",
        title: "Approved Pathway and Owners",
        description: "What the team signed off on at the last meeting.",
        items: [
          { label: "Pathway", note: "TransitionForward · College + Work" },
          { label: "Owners Assigned", note: "Student · Family · School · Partner" },
          { label: "Meeting Cadence", note: "Every 6 weeks" },
        ],
      },
      {
        phase: "insight",
        title: "On Track vs. At Risk",
        items: [
          { label: "On Track", note: "Voice prompts, IEP goal progress" },
          { label: "At Risk", note: "Transition assessment still pending" },
          { label: "Blocked", note: "Family consent form awaiting signature" },
        ],
      },
      {
        phase: "pathway",
        title: "How Actions Ladder Up To Goals",
        items: [
          { label: "Education Goal", note: "Program tours + application steps" },
          { label: "Employment Goal", note: "Job shadow + resume prep" },
          { label: "Living Goal", note: "Travel training + budgeting practice" },
        ],
      },
      {
        phase: "action",
        title: "30 / 90 / 180 / 365-Day Plan",
        items: [
          { label: "30 Days", note: "Book PPT, request assessment, finish Voice prompts" },
          { label: "90 Days", note: "PPT held, agenda pre-loaded from the report" },
          { label: "180 Days", note: "Two college tours + one job shadow" },
          { label: "365 Days", note: "Program applied, paid work started, travel independent" },
        ],
      },
    ],
  },
  connect: {
    intro:
      "The Connect stage extends the plan into follow-through — recommended resources, calendar, and partner opportunities where consent allows.",
    groups: [
      {
        phase: "input",
        title: "Consent and Plan Needs",
        items: [
          { label: "Consent To Share", note: "School: yes · Partners: ask first" },
          { label: "Plan Needs", note: "Internship, travel training, family guide" },
          { label: "Active Owners", note: "Family + case manager" },
        ],
      },
      {
        phase: "insight",
        title: "Matched Resources",
        description: "Curated guides and agencies matched to this student's plan.",
        items: [
          { label: "CT Transition Task Force", note: "Family guide" },
          { label: "Project SEARCH Hartford", note: "Internship program" },
          { label: "ABLE Accounts", note: "Plain-language setup guide" },
        ],
      },
      {
        phase: "pathway",
        title: "Partner Opportunities",
        description: "Only visible where the family has agreed to share.",
        items: [
          { label: "Design Internship", note: "Two openings — matches direction" },
          { label: "Peer Mentor Program", note: "One opening — matches strengths" },
          { label: "Weekend Workshop", note: "Enrolling — travel-training pilot" },
        ],
      },
      {
        phase: "action",
        title: "Calendar and Follow-Through",
        items: [
          { label: "Open Action Items", note: "3 due this week" },
          { label: "Upcoming Meeting", note: "Transition planning · Tue 3pm" },
          { label: "Report Review", note: "In 60 days" },
        ],
      },
    ],
    disclaimer:
      "Partner opportunities are only visible where the family has agreed to share.",
  },
};

export function getStageDetail(id: StageId): StageDetailScreen {
  return STAGE_SAMPLE_DETAILS[id];
}

