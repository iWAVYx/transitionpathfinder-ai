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

const asRecord = (value: unknown): Record<string, unknown> | undefined =>
  value !== null && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown> : undefined;
const positiveCount = (value: unknown): number =>
  typeof value === "number" && Number.isInteger(value) && value > 0 ? value : 0;

/** Safe reader metadata shared by the opener and full source panel; never returns IDs. */
export function recordedReportInputs(content: unknown): ReportInputsSummary | undefined {
  const report = asRecord(content);
  const raw = asRecord(report?.inputs_used);
  const summary = asRecord(report?.inputs_used_summary);
  const inputs = raw ?? summary;
  if (!inputs) return undefined;
  const count = (rawKey: string, summaryKey: string) => {
    const value = raw ? raw[rawKey] : summary?.[summaryKey];
    if (!raw) return positiveCount(value);
    return Array.isArray(value)
      ? value.filter(item => typeof item === "string" && item.trim()).length : 0;
  };
  const text = (key: string) => typeof inputs[key] === "string" && inputs[key].trim()
    ? inputs[key] as string : undefined;
  return {
    profile: inputs.profile === true,
    intake: inputs.intake === true,
    student_voice_count: count("student_voice_keys", "student_voice_count"),
    iep_document_count: count("iep_doc_ids", "iep_document_count"),
    iep_extraction_count: count("iep_extraction_ids", "iep_extraction_count"),
    goal_count: count("goal_ids", "goal_count"),
    readiness_at: text("readiness_at"),
    readiness_category_count: positiveCount(inputs.readiness_category_count),
    action_item_count: count("action_item_ids", "action_item_count"),
    meeting_prep_count: count("meeting_prep_ids", "meeting_prep_count"),
    saved_resource_count: count("saved_resource_ids", "saved_resource_count"),
    partner_match_count: count("partner_match_ids", "partner_match_count"),
    family_priorities_count: positiveCount(inputs.family_priorities_count),
    generated_at: text("generated_at"),
  };
}

/** Labels describe recorded generation inputs, never inferred report content. */
export function reportSourceLabels(content: unknown): string[] {
  const inputs = recordedReportInputs(content);
  if (!inputs) return ["The source list was not recorded for this report."];
  const labels: string[] = [];
  if (inputs.profile) labels.push("Student Profile");
  if (inputs.intake) labels.push("Pathway Builder Responses");
  for (const [count, label] of [
    [inputs.student_voice_count, "Student Voice"],
    [inputs.iep_document_count, "IEP Documents"],
    [inputs.iep_extraction_count, "IEP Document Summaries"],
    [inputs.goal_count, "Transition Goals"],
    [inputs.action_item_count, "Open Action Items"],
    [inputs.meeting_prep_count, "Meeting Prep Notes"],
    [inputs.saved_resource_count, "Saved Resources"],
    [inputs.partner_match_count, "Partner Matches"],
  ] as const) if (count) labels.push(label);
  if (inputs.readiness_at || inputs.readiness_category_count) labels.push("Readiness Check");
  if (inputs.family_priorities_count) labels.push("Family Priorities");
  return labels.length ? labels : ["No inputs are listed in this report’s recorded source list."];
}
