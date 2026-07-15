import type { ReportSectionId } from "@/lib/hubs/registry";

export type EvidenceSourceKind =
  | "document"
  | "note"
  | "goal"
  | "meeting"
  | "voice_response"
  | "assessment"
  | "opportunity"
  | "other";

export interface EvidenceLink {
  id: string;
  studentId: string;
  reportSection: ReportSectionId;
  sourceKind: EvidenceSourceKind;
  sourceId?: string | null;
  sourceLabel: string;
  note?: string | null;
  createdAt: string;
}

/** Canonical order of report sections for display. */
export const REPORT_SECTIONS: ReportSectionId[] = [
  "snapshot",
  "student_voice",
  "family_priorities",
  "educator_input",
  "documents",
  "readiness",
  "pathways",
  "self_advocacy",
  "independent_living",
  "plan_30_60_90",
  "questions_for_team",
  "partner_matches",
];

export const REPORT_SECTION_LABELS: Record<ReportSectionId, string> = {
  snapshot: "Student Snapshot",
  student_voice: "Student Voice",
  family_priorities: "Family Priorities",
  educator_input: "Educator Input",
  documents: "Document Insights",
  readiness: "Readiness Areas",
  pathways: "Recommended Pathways",
  self_advocacy: "Self-Advocacy",
  independent_living: "Independent Living",
  plan_30_60_90: "30/60/90 Plan",
  questions_for_team: "Questions For The Team",
  partner_matches: "Partner Matches",
};

export const SOURCE_KIND_LABELS: Record<EvidenceSourceKind, string> = {
  document: "Document",
  note: "Case Note",
  goal: "Goal",
  meeting: "Meeting",
  voice_response: "Student Voice",
  assessment: "Assessment",
  opportunity: "Opportunity",
  other: "Other",
};

/** Group evidence links by report section, preserving canonical order. */
export function groupEvidenceBySection(
  links: EvidenceLink[],
): Record<ReportSectionId, EvidenceLink[]> {
  const out = {} as Record<ReportSectionId, EvidenceLink[]>;
  for (const s of REPORT_SECTIONS) out[s] = [];
  for (const l of links) {
    if (out[l.reportSection]) out[l.reportSection].push(l);
  }
  return out;
}

export function evidenceCoveragePct(links: EvidenceLink[]): number {
  const covered = new Set(links.map((l) => l.reportSection));
  return Math.round((covered.size / REPORT_SECTIONS.length) * 100);
}
