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
