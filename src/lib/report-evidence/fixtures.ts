import type { EvidenceLink } from "./types";

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
];
