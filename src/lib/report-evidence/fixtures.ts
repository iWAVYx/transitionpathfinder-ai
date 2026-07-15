import type { EvidenceLink } from "./types";
import { REPORT_SECTIONS } from "./types";
import { summarizeEvidenceUsed, type EvidenceUsedSummary } from "@/lib/pathway-evidence";
import type { ReportSectionId } from "@/lib/hubs/registry";

const DEMO_STUDENT_ID = "00000000-0000-0000-0000-000000000000";

/** Sample evidence links used by the demo dashboards. */
export const DEMO_EVIDENCE_LINKS: EvidenceLink[] = [
  {
    id: "demo-ev-1",
    studentId: DEMO_STUDENT_ID,
    reportSection: "snapshot",
    sourceKind: "document",
    sourceLabel: "IEP 2025-2026 (uploaded Sep 3)",
    note: "Present levels + services page.",
    createdAt: "2025-09-04T14:20:00Z",
  },
  {
    id: "demo-ev-2",
    studentId: DEMO_STUDENT_ID,
    reportSection: "student_voice",
    sourceKind: "voice_response",
    sourceLabel: "\"What I want after high school\" — Sep survey",
    createdAt: "2025-09-12T18:05:00Z",
  },
  {
    id: "demo-ev-3",
    studentId: DEMO_STUDENT_ID,
    reportSection: "family_priorities",
    sourceKind: "note",
    sourceLabel: "Parent phone call notes — Sep 18",
    note: "Family wants independent living focus.",
    createdAt: "2025-09-18T20:00:00Z",
  },
  {
    id: "demo-ev-4",
    studentId: DEMO_STUDENT_ID,
    reportSection: "educator_input",
    sourceKind: "note",
    sourceLabel: "Case manager quarterly observation",
    createdAt: "2025-09-25T15:10:00Z",
  },
  {
    id: "demo-ev-5",
    studentId: DEMO_STUDENT_ID,
    reportSection: "documents",
    sourceKind: "document",
    sourceLabel: "WJ-IV Achievement — 2024 evaluation",
    createdAt: "2024-11-02T13:00:00Z",
  },
  {
    id: "demo-ev-6",
    studentId: DEMO_STUDENT_ID,
    reportSection: "readiness",
    sourceKind: "assessment",
    sourceLabel: "Transition Planning Inventory — Aug",
    createdAt: "2025-08-22T16:45:00Z",
  },
  {
    id: "demo-ev-7",
    studentId: DEMO_STUDENT_ID,
    reportSection: "pathways",
    sourceKind: "opportunity",
    sourceLabel: "CT Culinary Apprenticeship — matched",
    createdAt: "2025-10-01T12:00:00Z",
  },
  {
    id: "demo-ev-8",
    studentId: DEMO_STUDENT_ID,
    reportSection: "plan_30_60_90",
    sourceKind: "meeting",
    sourceLabel: "PPT notes — Sep 15",
    note: "Team agreed on next-30-day tasks.",
    createdAt: "2025-09-15T19:00:00Z",
  },
  {
    id: "demo-ev-9",
    studentId: DEMO_STUDENT_ID,
    reportSection: "questions_for_team",
    sourceKind: "note",
    sourceLabel: "Family question list — pre-PPT",
    createdAt: "2025-09-14T22:10:00Z",
  },
  {
    id: "demo-ev-10",
    studentId: DEMO_STUDENT_ID,
    reportSection: "self_advocacy",
    sourceKind: "voice_response",
    sourceLabel: "Self-advocacy check-in — Oct",
    note: "Student rehearsed asking for extended time.",
    createdAt: "2025-10-05T13:30:00Z",
  },
  {
    id: "demo-ev-11",
    studentId: DEMO_STUDENT_ID,
    reportSection: "independent_living",
    sourceKind: "assessment",
    sourceLabel: "Independent Living Skills checklist",
    note: "Uses public transit independently on weekends.",
    createdAt: "2025-09-28T17:00:00Z",
  },
  {
    id: "demo-ev-12",
    studentId: DEMO_STUDENT_ID,
    reportSection: "partner_matches",
    sourceKind: "opportunity",
    sourceLabel: "CT Bureau of Rehab Services — pre-ETS enrollment",
    createdAt: "2025-10-10T14:00:00Z",
  },
];

/**
 * Sample generated Pathway Report body used by the demo. Mirrors the shape
 * produced by `generatePathwayReport` in Slice C so the demo can preview
 * evidence-aware output without hitting the AI or real student data.
 */
export interface DemoReportSection {
  section: ReportSectionId;
  family_plain: string;
  professional: string;
  missing_evidence: string[];
  follow_up_questions: string[];
}

export const DEMO_REPORT_BODY: {
  sections: DemoReportSection[];
  evidence_used: EvidenceUsedSummary;
  weak_summary_flag: boolean;
} = {
  weak_summary_flag: false,
  evidence_used: summarizeEvidenceUsed(
    DEMO_EVIDENCE_LINKS.map((l) => ({
      id: l.id,
      report_section: l.reportSection,
      source_kind: l.sourceKind,
      source_id: l.sourceId ?? null,
      source_label: l.sourceLabel,
      note: l.note ?? null,
    })),
  ),
  sections: [
    {
      section: "snapshot",
      family_plain:
        "Alex is a rising senior who learns best with hands-on practice and short written instructions. Cooking and food service are consistent strengths.",
      professional:
        "Grade 12 student with an active IEP (specific learning disability). Present levels reflect grade-level reading comprehension with support and below-grade written expression.",
      missing_evidence: [],
      follow_up_questions: [],
    },
    {
      section: "student_voice",
      family_plain: "Alex wants to work in a professional kitchen and eventually run a food truck.",
      professional:
        "Student-reported postsecondary goals: competitive employment in culinary arts within 12 months of exit; long-term entrepreneurship goal.",
      missing_evidence: [],
      follow_up_questions: ["Would Alex like to shadow a working chef before graduation?"],
    },
    {
      section: "family_priorities",
      family_plain: "Family's top priority is independent living skills — cooking, budgeting, and getting to work on their own.",
      professional:
        "Family prioritizes independent living outcomes (meal preparation, personal finance, community mobility) alongside employment.",
      missing_evidence: [],
      follow_up_questions: [],
    },
    {
      section: "readiness",
      family_plain: "Alex is close to ready for a supported culinary apprenticeship. Next step is practicing time management.",
      professional:
        "Transition Planning Inventory indicates strong Employment and Daily Living scores; below-average Self-Determination score suggests targeted instruction.",
      missing_evidence: ["Updated vocational assessment (last on file: 2024)"],
      follow_up_questions: [],
    },
    {
      section: "pathways",
      family_plain: "Recommended next step: the CT Culinary Apprenticeship program that already matched Alex's profile.",
      professional:
        "Primary pathway: CT Culinary Apprenticeship (registered pre-apprenticeship). Secondary: community college culinary certificate with BRS supports.",
      missing_evidence: [],
      follow_up_questions: [],
    },
    {
      section: "plan_30_60_90",
      family_plain:
        "Next 30 days: tour the culinary program. 60 days: apply for BRS services. 90 days: begin apprenticeship intake.",
      professional:
        "30/60/90 milestones align with PPT decisions (Sep 15). Assign owners at next team meeting.",
      missing_evidence: [],
      follow_up_questions: [],
    },
    {
      section: "partner_matches",
      family_plain: "CT Bureau of Rehabilitation Services (BRS) pre-ETS enrollment is a strong match.",
      professional: "Referral in progress to BRS pre-ETS; awaiting eligibility determination.",
      missing_evidence: [],
      follow_up_questions: [],
    },
  ],
};

/** Handy re-export so demo pages don't reach into ../pathway-evidence. */
export const DEMO_EVIDENCE_USED_SUMMARY: EvidenceUsedSummary = DEMO_REPORT_BODY.evidence_used;

/** Sanity used by contract tests — every referenced section is canonical. */
export const DEMO_REPORT_SECTION_IDS: ReportSectionId[] = DEMO_REPORT_BODY.sections.map((s) => s.section);
export const DEMO_CANONICAL_SECTIONS = REPORT_SECTIONS;
