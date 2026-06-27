import { ChapterOpener } from "@/components/site/MagazinePage";
import type { PathwayMilestoneId } from "@/lib/publication/chapters";

/**
 * Pathway Report — Editorial part dividers.
 *
 * Each part opens with a full-bleed `ChapterOpener` matching the publication
 * system: oversized Instrument Serif italic numeral, Urbanist kicker,
 * hairline rule, teal background, plus a warm milestone badge so families
 * can recognise each part visually.
 */
export type ReportPart =
  | "snapshot"
  | "pathways"
  | "translate"
  | "team"
  | "next";

interface PartMeta {
  numeral: string;
  kicker: string;
  title: string;
  dek: string;
  covers: string[];
  milestone: PathwayMilestoneId;
}

const REPORT_PARTS: Record<ReportPart, PartMeta> = {
  snapshot: {
    numeral: "I",
    kicker: "Part One · Where We Are",
    title: "Student Snapshot",
    dek: "A one-page picture of the student today — strengths, interests, supports, and readiness — written for the family and the team.",
    covers: [
      "Who the student is, in their own words",
      "Strengths, interests, and needs at a glance",
      "Current readiness across the transition areas",
    ],
  },
  pathways: {
    numeral: "II",
    kicker: "Part Two · Where We Could Go",
    title: "Pathways & Possibilities",
    dek: "Multiple realistic directions — not just one. Each pathway lists supports, steps, and a timeline.",
    covers: [
      "Best-fit, backup, and stretch pathways",
      "Career and life-pathway matches",
      "Goals broken down into doable steps",
    ],
  },
  translate: {
    numeral: "III",
    kicker: "Part Three · Make It Plain",
    title: "Translate & Listen",
    dek: "The IEP and transition plan in plain language, side-by-side with what the student actually said.",
    covers: [
      "Plain-English translation of IEP goal language",
      "Student voice — quotes pulled directly from intake",
      "Where the document and the student agree (and don't)",
    ],
  },
  team: {
    numeral: "IV",
    kicker: "Part Four · Bring To The Team",
    title: "For The Next Meeting",
    dek: "Everything a family needs to walk into the next PPT — agenda, questions, strengths to highlight, and opportunities to bring up.",
    covers: [
      "Questions and prompts for the next meeting",
      "Family action plan and follow-ups",
      "Opportunities and partners to consider",
    ],
  },
  next: {
    numeral: "V",
    kicker: "Part Five · What Happens Next",
    title: "The 30 / 60 / 90 Plan",
    dek: "Doable steps with named owners and clear success markers — the three months after the meeting, mapped out together.",
    covers: [
      "First 30 days — start here",
      "60- and 90-day milestones",
      "Owner, due date, and success marker for each step",
    ],
  },
};

export function ReportPartOpener({ part }: { part: ReportPart }) {
  const meta = REPORT_PARTS[part];
  return (
    <div className="page-break mt-12 scroll-mt-24">
      <ChapterOpener
        numeral={meta.numeral}
        kicker={meta.kicker}
        title={meta.title}
        dek={meta.dek}
        covers={meta.covers}
      />
    </div>
  );
}
