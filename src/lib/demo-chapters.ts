/**
 * Editorial Hybrid — chapter metadata shared between the demo step pages
 * and the Magazine reader chrome. Numerals, kickers, titles, and the
 * "What This Chapter Covers" handbook lists live in one place so the
 * cover, TOC, chapter openers, and folio counters all stay in sync.
 */
export interface ChapterMeta {
  id:
    | "intake"
    | "voice"
    | "documents"
    | "report"
    | "opportunities"
    | "resources"
    | "meeting"
    | "calendar"
    | "plan"
    | "hub"
    | "next";
  numeral: string;       // Roman numeral for chapter opener
  page: string;          // Magazine-style page folio (cosmetic)
  kicker: string;        // Small uppercase kicker
  title: string;         // Display title (Title Case)
  dek: string;           // One-sentence chapter summary
  covers: string[];      // Bullet list for "What This Chapter Covers"
}

export const CHAPTER_META: Record<ChapterMeta["id"], ChapterMeta> = {
  intake: {
    id: "intake",
    numeral: "I",
    page: "08",
    kicker: "Chapter One · Listen",
    title: "The Starting Point",
    dek: "A guided planning interview that gathers strengths, interests, supports, and three voices — student, family, and educator — into one shared starting point.",
    covers: [
      "How intake is organized into three voices",
      "What information moves into the Pathway Report",
      "How families can pause and return without losing work",
    ],
  },
  voice: {
    id: "voice",
    numeral: "II",
    page: "14",
    kicker: "Chapter Two · Listen",
    title: "Student Voice",
    dek: "What the student actually said, and how each answer shapes the recommendations that follow.",
    covers: [
      "Eight short prompts in the student's own words",
      "Pull quotes used inside the Pathway Report",
      "How answers shape pathway and accommodation choices",
    ],
  },
  documents: {
    id: "documents",
    numeral: "III",
    page: "22",
    kicker: "Chapter Three · Listen",
    title: "Documents & Evidence",
    dek: "The IEP, evaluations, and 504 documents — organized into one planning companion the whole team can read.",
    covers: [
      "How uploaded documents are tagged and summarized",
      "What stays private and who can see what",
      "How evidence is cited inside the Pathway Report",
    ],
  },
  report: {
    id: "report",
    numeral: "IV",
    page: "30",
    kicker: "Feature Issue · Synthesize",
    title: "The Pathway Report",
    dek: "Pathways, IEP translation, accommodations, and the next-meeting plan — written in plain language for families and the team.",
    covers: [
      "Readiness scorecard and recommended pathways",
      "Plain-language IEP and transition-plan translation",
      "Student, family, and educator views of the same report",
    ],
  },
  opportunities: {
    id: "opportunities",
    numeral: "V",
    page: "44",
    kicker: "Chapter Five · Synthesize",
    title: "Opportunity Matches",
    dek: "Apprenticeships, internships, and community programs matched to the student's interests, needs, and supports.",
    covers: [
      "How matches are ranked and explained",
      "Partner privacy and contact rules",
      "How to save matches into the action plan",
    ],
  },
  resources: {
    id: "resources",
    numeral: "VI",
    page: "50",
    kicker: "Chapter Six · Synthesize",
    title: "Resource Matches",
    dek: "Curated supports — with what it is, who it helps, and how to use it — pulled from the planning library.",
    covers: [
      "How resources are categorized for families",
      "Quick filters by topic and grade band",
      "What to bring to the next team meeting",
    ],
  },
  meeting: {
    id: "meeting",
    numeral: "VII",
    page: "58",
    kicker: "Chapter Seven · Plan",
    title: "Questions For The Team",
    dek: "A meeting-ready packet — agenda, questions to ask, strengths to highlight, and follow-ups for after the meeting.",
    covers: [
      "Agenda and discussion prompts",
      "Strengths and concerns to bring forward",
      "Follow-up checklist after the meeting",
    ],
  },
  calendar: {
    id: "calendar",
    numeral: "VIII",
    page: "64",
    kicker: "Chapter Eight · Plan",
    title: "Shared Calendar",
    dek: "Meetings, deadlines, tours, and weekly action steps — kept on one shared calendar so nobody has to chase dates.",
    covers: [
      "Meetings, tours, and key deadlines in one view",
      "Reminders for families and the care team",
      "Adding events without leaving the workspace",
    ],
  },
  plan: {
    id: "plan",
    numeral: "IX",
    page: "70",
    kicker: "Chapter Nine · Plan",
    title: "30 / 60 / 90-Day Plan",
    dek: "Doable steps with named owners and clear success markers — the three months after the meeting, mapped out together.",
    covers: [
      "What happens in the first 30 days",
      "How the 60- and 90-day milestones fit together",
      "Owner, due date, and success marker for each step",
    ],
  },
  hub: {
    id: "hub",
    numeral: "X",
    page: "78",
    kicker: "Chapter Ten · Stay Together",
    title: "The Student Hub",
    dek: "The ongoing workspace where families and the care team track goals, milestones, and updates between meetings.",
    covers: [
      "Goals, milestones, and weekly check-ins",
      "How updates reach the right people",
      "A single source of truth between meetings",
    ],
  },
  next: {
    id: "next",
    numeral: "XI",
    page: "84",
    kicker: "Closing · Stay Together",
    title: "What Comes Next",
    dek: "Clear paths for families, educators, schools, districts, and partners — pick a starting point and we'll walk it with you.",
    covers: [
      "Next steps for families and students",
      "Next steps for educators and schools",
      "Bringing TransitionForward to a district or partner",
    ],
  },
};
