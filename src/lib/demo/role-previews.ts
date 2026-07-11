/**
 * Role-based preview content for the signed-out Demo Workspace.
 *
 * These fixtures power the /demo/<role> preview pages. Everything here is
 * fictional sample data — no real students, no real caseloads, no real
 * districts. The shared student across Student / Family / Educator views is
 * Jordan Rivera, matching src/lib/demo-data.ts.
 */

import type { LucideIcon } from "lucide-react";
import {
  GraduationCap,
  Users,
  Briefcase,
  School,
  Building2,
  Handshake,
  MessageCircleQuestion,
  Compass,
  ClipboardCheck,
  BookmarkCheck,
  CalendarDays,
  FileText,
  Target,
  FolderOpen,
  Heart,
  ShieldCheck,
  Sparkles,
  Users2,
  BarChart3,
  TrendingUp,
  AlertTriangle,
  Rocket,
  Building,
  Megaphone,
  BadgeCheck,
  Gift,
  BookOpen,
  ClipboardList,
  StickyNote,
} from "lucide-react";

export type DemoRoleId =
  | "student"
  | "family"
  | "educator"
  | "school-admin"
  | "district-admin"
  | "partner";

export type DashboardTile = {
  label: string;
  value: string;
  hint?: string;
};

export type DemoToolPreview = {
  icon: LucideIcon;
  title: string;
  status?: string;
  tone?: "default" | "success" | "warning" | "critical" | "muted";
  summary?: string;
  bullets?: { label: string; value?: string; hint?: string }[];
  cta?: { label: string; to: string };
  /**
   * Optional in-place preview id. When set, the tile renders a compact
   * read-only preview from `src/components/demo/previews/` inline instead
   * of only linking away. See `DEMO_PREVIEWS` for available ids.
   */
  previewId?: import("@/components/demo/previews").DemoPreviewId;
};

export type DemoRolePreview = {
  id: DemoRoleId;
  path: string;
  label: string;
  tagline: string;
  headline: string;
  intro: string;
  icon: LucideIcon;
  accent: string; // tailwind color class family, e.g. "primary"
  sharedStudent: boolean;
  dashboardTitle: string;
  dashboardTiles: DashboardTile[];
  toolPreviews: DemoToolPreview[];
  tools: string[];
  actions: string[];
  outputs: string[];
  valueBullets: string[];
  ctaPrimary: { label: string; to: string };
  ctaSecondary?: { label: string; to: string };
  boundary?: { title: string; items: string[] };
  next?: DemoRoleId;
};

export const DEMO_ROLE_ORDER: DemoRoleId[] = [
  "student",
  "family",
  "educator",
  "school-admin",
  "district-admin",
  "partner",
];

export const DEMO_ROLES: Record<DemoRoleId, DemoRolePreview> = {
  student: {
    id: "student",
    path: "/demo/student",
    label: "Student",
    tagline: "My transition home base.",
    headline: "See what a student would see.",
    intro:
      "A calm, encouraging space where a student like Jordan can share what matters to them, understand their goals, and see the next step clearly.",
    icon: GraduationCap,
    accent: "primary",
    sharedStudent: true,
    dashboardTitle: "Jordan's dashboard",
    dashboardTiles: [
      { label: "My Pathway", value: "Stage 4 of 9", hint: "Readiness · developing" },
      { label: "Student Voice", value: "3 of 5 shared", hint: "Interests, strengths, hopes" },
      { label: "Action items", value: "2 due this week", hint: "Meeting prep · shadow visit" },
      { label: "Next meeting", value: "Sep 15", hint: "Annual PPT" },
    ],
    toolPreviews: [
      {
        icon: MessageCircleQuestion,
        title: "Student Voice",
        status: "3 of 5 shared",
        tone: "default",
        summary: "Tell your team what you want, worry about, and hope for.",
        bullets: [
          { label: "Prompts answered", value: "3 of 5" },
          { label: "Last update", value: "2 days ago" },
        ],
        cta: { label: "Preview Student Voice", to: "/demo/voice" },
      },
      {
        icon: Compass,
        title: "My Pathway",
        status: "Stage 4 of 9",
        tone: "warning",
        summary: "Where Jordan is across employment, education, living, and advocacy.",
        bullets: [
          { label: "Readiness", value: "Developing" },
          { label: "Goals tracked", value: "3" },
        ],
        cta: { label: "Preview pathway", to: "/demo/plan" },
      },
      {
        icon: ClipboardCheck,
        title: "Next Action",
        status: "2 due",
        tone: "warning",
        summary: "One small next step so momentum keeps moving.",
        bullets: [
          { label: "This week", value: "2 due" },
          { label: "Overdue", value: "0" },
        ],
        cta: { label: "See next steps", to: "/demo/next" },
      },
      {
        icon: BookmarkCheck,
        title: "Saved Resources",
        previewId: "saved-resources",
        status: "5 saved",
        tone: "muted",
        summary: "Guides, checklists, and tools your team bookmarked for you.",
        bullets: [{ label: "Bookmarks", value: "5" }],
        cta: { label: "Preview resources", to: "/demo/resources" },
      },
      {
        icon: FileText,
        title: "Meeting Prep",
        previewId: "meeting-prep",
        status: "3 questions",
        tone: "default",
        summary: "Walk into your PPT with the questions you want answered.",
        cta: { label: "Preview prep", to: "/demo/meeting" },
      },
      {
        icon: CalendarDays,
        title: "Upcoming Meetings",
        previewId: "calendar",
        status: "Sep 15",
        tone: "muted",
        summary: "PPTs, IEP reviews, and check-ins in one place.",
        cta: { label: "Preview calendar", to: "/demo/calendar" },
      },
      {
        icon: Target,
        title: "Pathway Report — Student View",
        status: "Ready",
        tone: "success",
        summary: "Your plan, in one student-friendly document.",
        cta: { label: "Preview report", to: "/demo/report" },
      },
    ],
    tools: [
      "Student Voice — share strengths, interests, hopes in your own words",
      "My Pathway snapshot",
      "Saved resources & meeting prep checklist",
      "Calendar of upcoming meetings and deadlines",
      "Student-view Pathway Report",
    ],
    actions: [
      "Answer Student Voice prompts",
      "Star a resource to bring to the next meeting",
      "Mark an action item done",
    ],
    outputs: [
      "A student-friendly Pathway Report",
      "A meeting-prep sheet for PPT/IEP",
      "A running list of goals and next steps",
    ],
    valueBullets: [
      "I can share what matters to me.",
      "I can understand my goals.",
      "I can see what steps come next.",
    ],
    ctaPrimary: { label: "Walk Jordan's Pathway", to: "/demo/workspace/start" },
    ctaSecondary: { label: "See the Pathway Report", to: "/demo/report" },
    next: "family",
  },

  family: {
    id: "family",
    path: "/demo/family",
    label: "Parent / Guardian",
    tagline: "Family planning overview.",
    headline: "See what a parent or guardian would see.",
    intro:
      "An organized, calming view of your student's plan — the pathway report in plain language, meeting prep, documents, and next steps in one place.",
    icon: Users,
    accent: "warm-sand",
    sharedStudent: true,
    dashboardTitle: "Rivera family dashboard",
    dashboardTiles: [
      { label: "Connected student", value: "Jordan Rivera", hint: "Grade 11 · Hartford Regional" },
      { label: "Pathway Report", value: "Ready to review", hint: "Family view" },
      { label: "Documents", value: "1 needed", hint: "Latest IEP · optional" },
      { label: "Next meeting", value: "Sep 15 · PPT", hint: "3 prep items open" },
    ],
    toolPreviews: [
      {
        icon: Users2,
        title: "Connected Student",
        status: "Jordan Rivera",
        tone: "default",
        summary: "One shared view of your student's plan and progress.",
        bullets: [
          { label: "Grade", value: "11" },
          { label: "School", value: "Hartford Regional" },
        ],
        cta: { label: "Preview family view", to: "/demo/hub" },
      },
      {
        icon: FolderOpen,
        title: "Documents",
        previewId: "documents",
        status: "1 needed",
        tone: "warning",
        summary: "Upload the latest IEP, evaluation, or family note.",
        bullets: [
          { label: "On file", value: "4" },
          { label: "Awaiting", value: "1", hint: "Latest IEP" },
        ],
        cta: { label: "Preview documents", to: "/demo/documents" },
      },
      {
        icon: Heart,
        title: "Family Priorities",
        status: "2 of 4 shared",
        tone: "default",
        summary: "What matters most to your family, guiding the plan.",
        cta: { label: "Preview priorities", to: "/demo/intake" },
      },
      {
        icon: FileText,
        title: "Pathway Report — Family View",
        status: "Ready",
        tone: "success",
        summary: "Your student's plan, in plain language.",
        cta: { label: "Preview report", to: "/demo/report" },
      },
      {
        icon: ClipboardList,
        title: "Meeting Prep",
        previewId: "meeting-prep",
        status: "3 open",
        tone: "warning",
        summary: "Questions and agenda for the next PPT.",
        cta: { label: "Preview prep", to: "/demo/meeting" },
      },
      {
        icon: ClipboardCheck,
        title: "Action Items",
        status: "2 due",
        tone: "warning",
        summary: "Small next steps you can take this week.",
        cta: { label: "Preview next steps", to: "/demo/next" },
      },
      {
        icon: ShieldCheck,
        title: "Sharing & Consent",
        previewId: "consent",
        status: "2 shared",
        tone: "muted",
        summary: "Control who can view or edit your student's plan.",
        bullets: [{ label: "Shared with", value: "Case manager · Advocate" }],
      },
      {
        icon: BookmarkCheck,
        title: "Recommended Resources",
        previewId: "saved-resources",
        status: "6 suggested",
        tone: "muted",
        summary: "Family-friendly guides matched to Jordan's plan.",
        cta: { label: "Preview resources", to: "/demo/resources" },
      },
    ],
    tools: [
      "Pathway Report — family view, in plain language",
      "Document upload for IEPs, evaluations, notes",
      "Family action items and meeting prep",
      "Calendar of PPT / IEP meetings, tours, deadlines",
      "Sharing & consent controls",
      "Recommended resources for the family",
    ],
    actions: [
      "Upload the latest IEP",
      "Review the Pathway Report with your student",
      "Prepare 3 questions for the next PPT",
      "Share view access with a coach or advocate",
    ],
    outputs: [
      "A plain-language Pathway Report you can share",
      "A meeting agenda and questions list",
      "A single home for documents and consent",
    ],
    valueBullets: [
      "I can understand what the plan means.",
      "I can prepare for meetings.",
      "I can organize documents and next steps.",
    ],
    ctaPrimary: { label: "Read Jordan's Pathway Report", to: "/demo/report" },
    ctaSecondary: { label: "Walk the Family Workspace", to: "/demo/workspace/start" },
    next: "educator",
  },

  educator: {
    id: "educator",
    path: "/demo/educator",
    label: "Educator / Case Manager",
    tagline: "Caseload command center.",
    headline: "See what an educator or case manager would see.",
    intro:
      "A workflow-oriented dashboard for your caseload — readiness gaps at a glance, pending inputs, meeting prep, and a shared pathway with each family.",
    icon: Briefcase,
    accent: "sage",
    sharedStudent: true,
    dashboardTitle: "Caseload dashboard — Ms. Patel",
    dashboardTiles: [
      { label: "Assigned students", value: "18", hint: "3 flagged this week" },
      { label: "Report completion", value: "12 of 18", hint: "6 in progress" },
      { label: "Readiness gaps", value: "Self-advocacy · travel", hint: "Top 2 across caseload" },
      { label: "Upcoming meetings", value: "4 this week", hint: "2 need agendas" },
    ],
    toolPreviews: [
      {
        icon: Users2,
        title: "Caseload Snapshot",
        previewId: "caseload",
        status: "18 students",
        tone: "default",
        summary: "Every student on your caseload with readiness signals.",
        bullets: [
          { label: "Flagged", value: "3", hint: "this week" },
          { label: "PPTs due", value: "4" },
        ],
        cta: { label: "Preview caseload", to: "/demo/hub" },
      },
      {
        icon: BarChart3,
        title: "Readiness Signals",
        previewId: "readiness-gaps",
        status: "2 gaps",
        tone: "warning",
        summary: "Top gaps across your caseload right now.",
        bullets: [
          { label: "Self-advocacy", value: "9 students" },
          { label: "Travel training", value: "6 students" },
        ],
      },
      {
        icon: ClipboardCheck,
        title: "Pending Educator Input",
        status: "5 waiting",
        tone: "warning",
        summary: "Transition assessments and evidence still needed.",
        cta: { label: "Preview inputs", to: "/demo/workspace/start" },
      },
      {
        icon: FileText,
        title: "Pathway Reports",
        previewId: "report-completion",
        status: "12 of 18",
        tone: "success",
        summary: "Reports drafted, in progress, or ready for the PPT.",
        cta: { label: "Preview report", to: "/demo/report" },
      },
      {
        icon: ClipboardList,
        title: "Meeting Prep",
        previewId: "meeting-prep",
        status: "2 need agendas",
        tone: "warning",
        summary: "PPT agendas and questions organized per student.",
        cta: { label: "Preview meeting prep", to: "/demo/meeting" },
      },
      {
        icon: StickyNote,
        title: "Case Notes",
        previewId: "notes",
        status: "New this week",
        tone: "muted",
        summary: "Running log of conversations, calls, and evidence.",
      },
      {
        icon: Target,
        title: "Action Items",
        status: "7 assigned",
        tone: "default",
        summary: "Tasks assigned across students and families.",
        cta: { label: "Preview next steps", to: "/demo/next" },
      },
      {
        icon: CalendarDays,
        title: "Calendar",
        previewId: "calendar",
        status: "4 this week",
        tone: "muted",
        summary: "PPTs, evaluations, and transition meetings.",
        cta: { label: "Preview calendar", to: "/demo/calendar" },
      },
    ],
    tools: [
      "Caseload strip with readiness signals",
      "Pathway Reports per student",
      "Educator input — assessments, notes, evidence",
      "Meeting prep & agenda builder",
      "Calendar of PPTs, evaluations, transitions",
      "Recommended resources for students & families",
    ],
    actions: [
      "Complete a transition assessment for Jordan",
      "Draft the PPT agenda for next week",
      "Log a case note after a family conversation",
      "Recommend an assistive-tech evaluation",
    ],
    outputs: [
      "A Pathway Report per student, ready for the PPT",
      "Readiness signals across your caseload",
      "A running log of notes and evidence",
    ],
    valueBullets: [
      "I can organize transition planning across students.",
      "I can see readiness gaps.",
      "I can prepare reports and next steps.",
    ],
    ctaPrimary: { label: "Open Jordan's Workspace", to: "/demo/workspace/start" },
    ctaSecondary: { label: "See the Pathway Report", to: "/demo/report" },
    next: "school-admin",
  },

  "school-admin": {
    id: "school-admin",
    path: "/demo/school-admin",
    label: "School Admin",
    tagline: "School transition overview.",
    headline: "See what a school admin would see.",
    intro:
      "A school-level view of transition planning — how many students have a plan, where teams need support, and how readiness is trending across grades.",
    icon: School,
    accent: "ocean",
    sharedStudent: false,
    dashboardTitle: "Hartford Regional High School",
    dashboardTiles: [
      { label: "Students in planning", value: "142", hint: "Grades 9–12+" },
      { label: "Pathway Reports complete", value: "68%", hint: "+9% vs. last quarter" },
      { label: "Team activity", value: "22 educators", hint: "3 need onboarding" },
      { label: "Support gaps", value: "Travel training", hint: "Top across grade 11" },
    ],
    toolPreviews: [
      {
        icon: School,
        title: "School Overview",
        status: "142 students",
        tone: "default",
        summary: "Planning status across every grade in your school.",
        bullets: [
          { label: "In planning", value: "142" },
          { label: "Grade 12+", value: "38" },
        ],
      },
      {
        icon: ClipboardCheck,
        title: "Planning Status",
        status: "68% complete",
        tone: "success",
        summary: "Pathway Reports drafted, reviewed, and finalized.",
        bullets: [
          { label: "Complete", value: "97" },
          { label: "In progress", value: "31" },
        ],
      },
      {
        icon: Users2,
        title: "Team Activity",
        previewId: "team-activity",
        status: "22 educators",
        tone: "default",
        summary: "Who's active this week and where support is needed.",
        bullets: [{ label: "Onboarding", value: "3" }],
      },
      {
        icon: FileText,
        title: "Report Completion",
        previewId: "report-completion",
        status: "+9% vs. Q3",
        tone: "success",
        summary: "Trend of finalized reports over the last quarter.",
        cta: { label: "Preview report", to: "/demo/report" },
      },
      {
        icon: TrendingUp,
        title: "Readiness Trends",
        previewId: "trends",
        status: "Developing",
        tone: "warning",
        summary: "School-wide movement across four readiness domains.",
      },
      {
        icon: BookOpen,
        title: "Resource Usage",
        previewId: "resource-usage",
        status: "Top 5",
        tone: "muted",
        summary: "Which guides staff and families are using most.",
        cta: { label: "Preview resources", to: "/demo/resources" },
      },
      {
        icon: AlertTriangle,
        title: "Support Needs",
        previewId: "support-needs",
        status: "Travel training",
        tone: "critical",
        summary: "Where teams are asking for more capacity.",
      },
    ],
    tools: [
      "School overview: planning status by grade",
      "Team roster and educator activity",
      "Report completion trends",
      "Readiness trend chart",
      "Resource usage across staff & families",
      "Upcoming school-level milestones",
    ],
    actions: [
      "Assign a new case manager to the transition team",
      "Follow up on 3 flagged students",
      "Share a resource pack with grade 11 team",
      "Schedule a mid-year planning huddle",
    ],
    outputs: [
      "A school-wide readiness snapshot",
      "A support-needs report for staff planning",
      "A team activity dashboard",
    ],
    valueBullets: [
      "I can see transition planning progress across my school.",
      "I can identify support gaps.",
      "I can help teams stay coordinated.",
    ],
    ctaPrimary: { label: "Request a pilot", to: "/waitlist" },
    ctaSecondary: { label: "Talk with our team", to: "/contact" },
    next: "district-admin",
  },

  "district-admin": {
    id: "district-admin",
    path: "/demo/district-admin",
    label: "District Admin",
    tagline: "District transition strategy overview.",
    headline: "See what a district admin would see.",
    intro:
      "A district-wide strategy view — school-by-school readiness, implementation status, and where to invest partnership and resource capacity.",
    icon: Building2,
    accent: "navy",
    sharedStudent: false,
    dashboardTitle: "Capital Region District",
    dashboardTiles: [
      { label: "Schools connected", value: "7 of 8", hint: "1 pending onboarding" },
      { label: "District readiness", value: "Developing", hint: "Trending up" },
      { label: "Reports complete", value: "612", hint: "Across 4 grade bands" },
      { label: "Service gaps", value: "Travel · employment", hint: "District-wide" },
    ],
    toolPreviews: [
      {
        icon: Building2,
        title: "District Overview",
        status: "7 of 8 schools",
        tone: "default",
        summary: "Students, schools, and reports across the district.",
        bullets: [
          { label: "Students", value: "3,214" },
          { label: "Reports", value: "612" },
        ],
      },
      {
        icon: School,
        title: "Connected Schools",
        status: "Manage",
        tone: "muted",
        summary: "Every school onboarded and their transition team.",
      },
      {
        icon: BarChart3,
        title: "School-By-School Progress",
        status: "Compare",
        tone: "default",
        summary: "Planning status and report completion, side by side.",
      },
      {
        icon: TrendingUp,
        title: "Readiness Trend",
        status: "+6% this term",
        tone: "success",
        summary: "District-wide movement across the four readiness domains.",
      },
      {
        icon: Rocket,
        title: "Implementation Progress",
        status: "Track",
        tone: "warning",
        summary: "Where each school is — onboarding, active, mature.",
      },
      {
        icon: FileText,
        title: "District Reports",
        status: "612 complete",
        tone: "muted",
        summary: "Aggregate Pathway Reports and outcomes.",
        cta: { label: "Preview report", to: "/demo/report" },
      },
      {
        icon: AlertTriangle,
        title: "Service Gaps",
        previewId: "service-gaps",
        status: "2 flagged",
        tone: "critical",
        summary: "Programs and supports missing where students need them.",
      },
    ],
    tools: [
      "District overview & connected schools table",
      "School-by-school progress",
      "District transition readiness trends",
      "Implementation status by school",
      "Staff & team access",
      "District reports and calendar",
    ],
    actions: [
      "Compare readiness across schools",
      "Flag two schools for implementation support",
      "Publish a district-wide employment resource pack",
      "Schedule the quarterly strategy review",
    ],
    outputs: [
      "A district readiness report",
      "A service-gap and partnership plan",
      "An implementation status view per school",
    ],
    valueBullets: [
      "I can understand transition readiness across schools.",
      "I can identify service gaps.",
      "I can support implementation and planning at scale.",
    ],
    ctaPrimary: { label: "Request a district pilot", to: "/waitlist" },
    ctaSecondary: { label: "Talk with our team", to: "/contact" },
    next: "partner",
  },

  partner: {
    id: "partner",
    path: "/demo/partner",
    label: "Partner",
    tagline: "Partner opportunity management overview.",
    headline: "See what a partner organization would see.",
    intro:
      "A focused workspace for posting opportunities, managing programs and deadlines, and staying connected to PartnerForward — with no access to private student data.",
    icon: Handshake,
    accent: "ember",
    sharedStudent: false,
    dashboardTitle: "The Kennedy Collective — partner dashboard",
    dashboardTiles: [
      { label: "Profile status", value: "Verified", hint: "Public directory listing" },
      { label: "Active opportunities", value: "4", hint: "2 accepting applicants" },
      { label: "Upcoming deadlines", value: "Nov 15 · Jan 3", hint: "Summer program cycle" },
      { label: "PartnerForward", value: "3 supports available", hint: "Grants · training · co-design" },
    ],
    toolPreviews: [
      {
        icon: BadgeCheck,
        title: "Partner Profile",
        previewId: "partner-profile",
        status: "Verified",
        tone: "success",
        summary: "Your public listing in the partner directory.",
        bullets: [
          { label: "Profile complete", value: "92%" },
          { label: "Listed since", value: "Jan 2025" },
        ],
        cta: { label: "Preview directory", to: "/demo/partner" },
      },
      {
        icon: Megaphone,
        title: "Active Opportunities",
        previewId: "opportunities",
        status: "4 live",
        tone: "default",
        summary: "Programs currently posted and accepting interest.",
        bullets: [
          { label: "Accepting", value: "2" },
          { label: "Draft", value: "1" },
        ],
        cta: { label: "Preview opportunities", to: "/demo/opportunities" },
      },
      {
        icon: ClipboardList,
        title: "Submitted Programs",
        previewId: "partner-submissions",
        status: "9 lifetime",
        tone: "muted",
        summary: "Everything you've posted, with status and history.",
      },
      {
        icon: CalendarDays,
        title: "Upcoming Deadlines",
        status: "Nov 15",
        tone: "warning",
        summary: "Program dates, application windows, and cycles.",
        bullets: [
          { label: "Summer cycle", value: "Nov 15" },
          { label: "Spring cycle", value: "Jan 3" },
        ],
      },
      {
        icon: Sparkles,
        title: "Opportunity Management",
        status: "Edit anytime",
        tone: "muted",
        summary: "Update deadlines, edit descriptions, close programs.",
      },
      {
        icon: Gift,
        title: "PartnerForward",
        status: "3 supports",
        tone: "success",
        summary: "Grants, training, and co-design supports for partners.",
        cta: { label: "Explore PartnerForward", to: "/partnerforward" },
      },
      {
        icon: BookOpen,
        title: "Partner Resources",
        status: "Library",
        tone: "muted",
        summary: "Playbooks and training built for partner organizations.",
      },
      {
        icon: Building,
        title: "Directory Reach",
        status: "1.2k views",
        tone: "default",
        summary: "How families and educators find your programs.",
      },
    ],
    tools: [
      "Partner profile & directory listing",
      "Opportunity posting and management",
      "Submitted programs and status",
      "Program dates & deadlines calendar",
      "PartnerForward incentives & supports",
      "Partner resources & training",
    ],
    actions: [
      "Post a new summer job-shadow program",
      "Update the deadline for an existing opportunity",
      "Edit the public partner profile",
      "Explore a PartnerForward grant",
    ],
    outputs: [
      "Live, searchable opportunities in the partner directory",
      "Deadline reminders and program status",
      "A record of PartnerForward supports used",
    ],
    valueBullets: [
      "I can post opportunities.",
      "I can manage program deadlines.",
      "I can support students without accessing private student data.",
    ],
    ctaPrimary: { label: "Apply to become a partner", to: "/partner-interest" },
    ctaSecondary: { label: "Explore PartnerForward", to: "/partnerforward" },
    boundary: {
      title: "Partners never see private student data.",
      items: [
        "IEPs, evaluations, or uploaded documents",
        "Student Voice responses",
        "Pathway Reports",
        "Individual goals, meetings, or case notes",
        "Family or educator dashboards",
        "Readiness details for any individual student",
      ],
    },
  },
};

export function getDemoRole(id: DemoRoleId): DemoRolePreview {
  return DEMO_ROLES[id];
}

export const SHARED_DEMO_STUDENT = {
  name: "Jordan Rivera",
  pronouns: "they/them",
  grade: "11",
  school: "Hartford Regional High School",
  quote:
    "I want to keep learning about computers and maybe work with animals too.",
};
