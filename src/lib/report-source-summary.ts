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
