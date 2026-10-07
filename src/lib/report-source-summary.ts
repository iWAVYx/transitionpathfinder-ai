import type { InputsUsed } from "@/lib/pathway-v2";

/** Display-only metadata; no record identifiers or fabricated source records. */
export type ReportSourceCount = { source_count?: number };
export function summarizeReportInputs(inputs: InputsUsed) {
  return {
    profile: inputs.profile,
    intake: inputs.intake,
    student_voice_count: inputs.student_voice_keys?.length ?? 0,
    iep_document_count: inputs.iep_doc_ids?.length ?? 0,
    iep_extraction_count: inputs.iep_extraction_ids?.length ?? 0,
    goal_count: inputs.goal_ids?.length ?? 0,
    readiness_at: inputs.readiness_at,
    readiness_category_count: inputs.readiness_category_count,
    action_item_count: inputs.action_item_ids?.length ?? 0,
    meeting_prep_count: inputs.meeting_prep_ids?.length ?? 0,
    saved_resource_count: inputs.saved_resource_ids?.length ?? 0,
    partner_match_count: inputs.partner_match_ids?.length ?? 0,
    family_priorities_count: inputs.family_priorities_count,
    generated_at: inputs.generated_at,
  };
}
export type ReportInputsSummary = ReturnType<typeof summarizeReportInputs>;

/** Labels describe recorded generation inputs, never inferred report content. */
export function reportSourceLabels(content: unknown): string[] {
  const record = (value: unknown): Record<string, unknown> | undefined =>
    value !== null && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : undefined;
  const report = record(content);
  const raw = record(report?.inputs_used);
  const summary = record(report?.inputs_used_summary);
  const inputs = raw ?? summary;
  if (!inputs) return ["The source list was not recorded for this report."];
  const count = (rawKey: string, summaryKey: string) => {
    const value = raw ? raw[rawKey] : summary?.[summaryKey];
    return raw && Array.isArray(value) ? value.filter(item => typeof item === "string" && item.trim()).length
      : !raw && typeof value === "number" && Number.isInteger(value) && value > 0 ? value : 0;
  };
  const positive = (key: string) => typeof inputs[key] === "number" && Number.isInteger(inputs[key]) && (inputs[key] as number) > 0;
  const labels: string[] = [];
  if (inputs.profile === true) labels.push("Student Profile");
  if (inputs.intake === true) labels.push("Pathway Builder Responses");
  for (const [rawKey, summaryKey, label] of [
    ["student_voice_keys", "student_voice_count", "Student Voice"],
    ["iep_doc_ids", "iep_document_count", "IEP Documents"],
    ["iep_extraction_ids", "iep_extraction_count", "IEP Document Summaries"],
    ["goal_ids", "goal_count", "Transition Goals"],
    ["action_item_ids", "action_item_count", "Open Action Items"],
    ["meeting_prep_ids", "meeting_prep_count", "Meeting Prep Notes"],
    ["saved_resource_ids", "saved_resource_count", "Saved Resources"],
    ["partner_match_ids", "partner_match_count", "Partner Matches"],
  ]) if (count(rawKey, summaryKey)) labels.push(label);
  if ((typeof inputs.readiness_at === "string" && inputs.readiness_at.trim()) || positive("readiness_category_count")) labels.push("Readiness Check");
  if (positive("family_priorities_count")) labels.push("Family Priorities");
  return labels.length ? labels : ["No inputs are listed in this report’s recorded source list."];
}
