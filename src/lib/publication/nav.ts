/**
 * Canonical publication navigation — the SINGLE source of truth for:
 *   - the top reader chrome (MagazineReader)
 *   - the Table Of Contents drawer
 *   - the Pathway Timeline (PathwaySpine)
 *   - Prev / Next controls (MagazinePageTurn, ReportChapterPager)
 *   - folio / page numbers, kickers, roman numerals
 *   - milestone → page mapping (DEMO_CHAPTER_TO_MILESTONE)
 *   - report section → milestone mapping (REPORT_SECTION_TO_MILESTONE)
 *
 * Two ordered lists are defined here:
 *
 *   PUBLICATION_PAGES — the 12 page-routes that make up the demo workspace
 *                        (drives prev/next, TOC, top menu, folio).
 *   REPORT_SECTIONS    — the 12 anchored sections inside /demo/report and
 *                        the signed-in Pathway Report (drives the in-report
 *                        chapter pager).
 *
 * Every other consumer derives its data from these two lists. Do NOT
 * introduce parallel arrays elsewhere.
 */
import type { ComponentType } from "react";
import {
  ClipboardList,
  Mic,
  FileSearch,
  FileText,
  Briefcase,
  BookOpen,
  Users,
  CalendarDays,
  CalendarRange,
  LayoutDashboard,
  Compass,
  Sparkles,
} from "lucide-react";

import type { PathwayMilestoneId } from "@/lib/publication/chapters";

export type PublicationPart = "Listen" | "Synthesize" | "Plan" | "Stay Together";

export interface PublicationPage {
  id: string;
  /** Route this page lives at (no trailing slash, no search). */
  route: string;
  /** 1-based folio / page number for display ("p. 14"). */
  folio: number;
  /** Roman numeral for the chapter opener. */
  numeral: string;
  /** Editorial kicker ("Chapter Two · Listen"). */
  kicker: string;
  /** Short menu/timeline label. */
  label: string;
  /** Full editorial title for TOC and chapter opener. */
  title: string;
  /** One-sentence description used in TOC and page-turn. */
  dek: string;
  /** Which planning stage this page contributes to. */
  milestone: PathwayMilestoneId;
  /** Section grouping for TOC. */
  part: PublicationPart;
  /** Icon shown in TOC / page-turn. */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  icon: ComponentType<any>;
  /** Optional checklist of what the chapter covers. */
  covers?: readonly string[];
}

/**
 * Master sequence. Order is meaningful — drives prev/next and folio.
 * Keep IDs stable: external tests, feature-map, and route components
 * import them by id.
 */
export const PUBLICATION_PAGES: readonly PublicationPage[] = [
  {
    id: "cover",
    route: "/demo",
    folio: 1,
    numeral: "—",
    kicker: "Overview",
    label: "Cover",
    title: "An Interactive Transition-Planning Report",
    dek: "A guided walk through how scattered inputs become a clear pathway forward.",
    milestone: "intake",
    part: "Listen",
    icon: Sparkles,
  },
  {
    id: "intake",
    route: "/demo/intake",
    folio: 8,
    numeral: "I",
    kicker: "Chapter One · Listen",
    label: "Starting Point",
    title: "The Starting Point",
    dek: "A guided planning interview that gathers strengths, interests, and supports from three voices — student, family, and educator.",
    milestone: "intake",
    part: "Listen",
    icon: ClipboardList,
    covers: [
      "How intake is organized into three voices",
      "What information moves into the Pathway Report",
      "How families can pause and return without losing work",
    ],
  },
  {
    id: "voice",
    route: "/demo/voice",
    folio: 14,
    numeral: "II",
    kicker: "Chapter Two · Listen",
    label: "Student Voice",
    title: "Student Voice",
    dek: "What the student actually said, and how each answer shapes the recommendations that follow.",
    milestone: "voice",
    part: "Listen",
    icon: Mic,
    covers: [
      "Eight short prompts in the student's own words",
      "Pull quotes used inside the Pathway Report",
      "How answers shape pathway and accommodation choices",
    ],
  },
  {
    id: "documents",
    route: "/demo/documents",
    folio: 22,
    numeral: "III",
    kicker: "Chapter Three · Listen",
    label: "Documents & Evidence",
    title: "Documents & Evidence",
    dek: "The IEP, evaluations, and 504 — organized into one planning companion the whole team can read.",
    milestone: "documents",
    part: "Listen",
    icon: FileSearch,
    covers: [
      "How uploaded documents are tagged and summarized",
      "What stays private and who can see what",
      "How evidence is cited inside the Pathway Report",
    ],
  },
  {
    id: "report",
    route: "/demo/report",
    folio: 30,
    numeral: "IV",
    kicker: "Feature Issue · Synthesize",
    label: "The Pathway Report",
    title: "The Pathway Report",
    dek: "Readiness, pathways, IEP translation, and the next-meeting plan — in plain language.",
    milestone: "readiness",
    part: "Synthesize",
    icon: FileText,
    covers: [
      "Readiness scorecard and recommended pathways",
      "Plain-language IEP and transition-plan translation",
      "Student, family, and educator views of the same report",
    ],
  },
  {
    id: "opportunities",
    route: "/demo/opportunities",
    folio: 44,
    numeral: "V",
    kicker: "Chapter Five · Synthesize",
    label: "Opportunity Matches",
    title: "Opportunity Matches",
    dek: "Apprenticeships, internships, and community programs matched to the student's interests, needs, and supports.",
    milestone: "pathway",
    part: "Synthesize",
    icon: Briefcase,
    covers: [
      "How matches are ranked and explained",
      "Partner privacy and contact rules",
      "How to save matches into the action plan",
    ],
  },
  {
    id: "resources",
    route: "/demo/resources",
    folio: 50,
    numeral: "VI",
    kicker: "Chapter Six · Synthesize",
    label: "Resource Matches",
    title: "Resource Matches",
    dek: "Curated supports — what it is, who it helps, and how to use it — pulled from the planning library.",
    milestone: "pathway",
    part: "Synthesize",
    icon: BookOpen,
    covers: [
      "How resources are categorized for families",
      "Quick filters by topic and grade band",
      "What to bring to the next team meeting",
    ],
  },
  {
    id: "meeting",
    route: "/demo/meeting",
    folio: 58,
    numeral: "VII",
    kicker: "Chapter Seven · Plan",
    label: "Questions For The Team",
    title: "Questions For The Team",
    dek: "A meeting-ready packet — agenda, questions, strengths to highlight, and follow-ups for after the meeting.",
    milestone: "plan",
    part: "Plan",
    icon: Users,
    covers: [
      "Agenda and discussion prompts",
      "Strengths and concerns to bring forward",
      "Follow-up checklist after the meeting",
    ],
  },
  {
    id: "calendar",
    route: "/demo/calendar",
    folio: 64,
    numeral: "VIII",
    kicker: "Chapter Eight · Plan",
    label: "Shared Calendar",
    title: "Shared Calendar",
    dek: "Meetings, deadlines, tours, and weekly action steps — on one shared calendar so nobody has to chase dates.",
    milestone: "plan",
    part: "Plan",
    icon: CalendarDays,
    covers: [
      "Meetings, tours, and key deadlines in one view",
      "Reminders for families and the care team",
      "Adding events without leaving the workspace",
    ],
  },
  {
    id: "plan",
    route: "/demo/plan",
    folio: 70,
    numeral: "IX",
    kicker: "Chapter Nine · Plan",
    label: "30 / 60 / 90-Day Plan",
    title: "30 / 60 / 90-Day Plan",
    dek: "Doable steps with named owners and clear success markers — the three months after the meeting, mapped together.",
    milestone: "plan",
    part: "Plan",
    icon: CalendarRange,
    covers: [
      "What happens in the first 30 days",
      "How the 60- and 90-day milestones fit together",
      "Owner, due date, and success marker for each step",
    ],
  },
  {
    id: "hub",
    route: "/demo/hub",
    folio: 78,
    numeral: "X",
    kicker: "Chapter Ten · Stay Together",
    label: "Student Hub",
    title: "The Student Hub",
    dek: "The ongoing workspace where families and the care team track goals, milestones, and updates between meetings.",
    milestone: "plan",
    part: "Stay Together",
    icon: LayoutDashboard,
    covers: [
      "Goals, milestones, and weekly check-ins",
      "How updates reach the right people",
      "A single source of truth between meetings",
    ],
  },
  {
    id: "next",
    route: "/demo/next",
    folio: 84,
    numeral: "XI",
    kicker: "Closing · Stay Together",
    label: "What Comes Next",
    title: "What Comes Next",
    dek: "Clear paths for families, educators, schools, districts, and partners — pick a starting point and we'll walk it with you.",
    milestone: "plan",
    part: "Stay Together",
    icon: Compass,
    covers: [
      "Next steps for families and students",
      "Next steps for educators and schools",
      "Bringing TransitionForward to a district or partner",
    ],
  },
] as const;

export type PublicationPageId = (typeof PUBLICATION_PAGES)[number]["id"];

export const PUBLICATION_PARTS: readonly PublicationPart[] = [
  "Listen",
  "Synthesize",
  "Plan",
  "Stay Together",
] as const;

/* ---------------------------- Helpers (pages) ---------------------------- */

export function getPageById(id: string): PublicationPage | undefined {
  return PUBLICATION_PAGES.find((p) => p.id === id);
}

export function getPageByRoute(pathname: string): PublicationPage | undefined {
  const clean = pathname.replace(/\/$/, "") || "/demo";
  return PUBLICATION_PAGES.find((p) => p.route === clean);
}

export function pageIndex(id: string): number {
  return PUBLICATION_PAGES.findIndex((p) => p.id === id);
}

export function prevPage(id: string): PublicationPage | undefined {
  const i = pageIndex(id);
  return i > 0 ? PUBLICATION_PAGES[i - 1] : undefined;
}

export function nextPage(id: string): PublicationPage | undefined {
  const i = pageIndex(id);
  return i >= 0 && i < PUBLICATION_PAGES.length - 1
    ? PUBLICATION_PAGES[i + 1]
    : undefined;
}

export function pagesForMilestone(m: PathwayMilestoneId): PublicationPage[] {
  return PUBLICATION_PAGES.filter((p) => p.milestone === m);
}

export function firstPageForMilestone(m: PathwayMilestoneId): PublicationPage | undefined {
  return PUBLICATION_PAGES.find((p) => p.milestone === m);
}

export function pagesByPart(): Array<{ part: PublicationPart; pages: PublicationPage[] }> {
  return PUBLICATION_PARTS.map((part) => ({
    part,
    pages: PUBLICATION_PAGES.filter((p) => p.part === part),
  }));
}

/* ------------------------- Report sections (in-page) --------------------- */

export interface ReportSection {
  /** DOM anchor id (the section in ReportView already has `id="sec-*"`). */
  id: string;
  label: string;
  part: "Snapshot" | "Pathways" | "Translate" | "Team" | "Next";
  milestone: PathwayMilestoneId;
}

export const REPORT_SECTIONS: readonly ReportSection[] = [
  { id: "sec-snapshot",       label: "Student Snapshot",                          part: "Snapshot", milestone: "intake"     },
  { id: "sec-spin",           label: "Strengths, Preferences, Interests & Needs", part: "Snapshot", milestone: "readiness"  },
  { id: "sec-readiness",      label: "Readiness Profile",                         part: "Snapshot", milestone: "readiness"  },
  { id: "sec-pathways",       label: "Recommended Pathways",                      part: "Pathways", milestone: "pathway"    },
  { id: "sec-careers",        label: "Career & Life Pathway Matches",             part: "Pathways", milestone: "pathway"    },
  { id: "sec-goals",          label: "Postsecondary Goal Breakdown",              part: "Pathways", milestone: "pathway"    },
  { id: "sec-iep-translator", label: "IEP / Transition Plan Translator",          part: "Translate", milestone: "documents" },
  { id: "sec-student-voice",  label: "In The Student's Voice",                    part: "Translate", milestone: "voice"     },
  { id: "sec-family-plan",    label: "Family Action Plan",                        part: "Team",     milestone: "family"     },
  { id: "sec-meeting-prep",   label: "Questions For The Team",                    part: "Team",     milestone: "educator"   },
  { id: "sec-opportunities",  label: "Opportunities To Explore",                  part: "Next",     milestone: "pathway"    },
  { id: "sec-thirty-day",     label: "30 / 60 / 90-Day Plan",                     part: "Next",     milestone: "plan"       },
] as const;

export function reportSectionIndex(id: string): number {
  return REPORT_SECTIONS.findIndex((s) => s.id === id);
}

export function reportSectionsByPart(): Array<{
  part: ReportSection["part"];
  sections: ReportSection[];
}> {
  const order: ReportSection["part"][] = ["Snapshot", "Pathways", "Translate", "Team", "Next"];
  return order.map((part) => ({
    part,
    sections: REPORT_SECTIONS.filter((s) => s.part === part),
  }));
}
