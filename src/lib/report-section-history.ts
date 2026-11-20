import { recordedReportInputs } from "./report-source-summary";
import { readSectionUpdates } from "./report-section-updates";
import type { ReportContentsItem } from "./report-contents";
import type { PlanningReportAudience } from "./report-v2-contents";
export type SectionHistoryRow = { field: string; label: string; operation?: "generated" | "saved"; recordedAt?: string; earlier?: true };
const fields: Record<string, string> = {
  "sec-snapshot": "student_snapshot", "sec-student-voice": "student_voice_prompts",
  "sec-spin": "spin_analysis", "sec-strengths": "strengths_snapshot", "sec-family-plan": "family_action_plan",
  "sec-meeting-prep": "meeting_prep_toolkit", "sec-educator-plan": "teacher_action_plan", "sec-iep-translator": "iep_translator",
  "sec-data-gaps": "data_gaps", "sec-readiness": "readiness_scorecard", "sec-goals": "postsecondary_goals",
  "sec-pathways": "recommended_pathways", "sec-education": "education_training_options", "sec-careers": "career_matches",
  "sec-life-skills": "life_skills_focus", "sec-thirty-day": "thirty_day_plan", "sec-opportunities": "opportunity_matches",
  "sec-timeline": "progress_timeline", "sec-review": "needs_human_review", "v2-spin": "spin",
  "v2-readiness-indicators": "readiness_indicators", "v2-needs-review": "needs_review_flags", "v2-confidence": "confidence",
  "v2-iep-summary": "iep_plan_summary", "v2-edu": "postsecondary_education_recs", "v2-emp": "employment_pathway_recs",
  "v2-il": "independent_living_recs", "v2-comm": "community_participation_recs", "v2-resources": "resource_matches",
  "v2-partners": "partner_matches", "v2-gaps": "missing_information_v2", "v2-student-plan": "student_action_plan",
  "v2-family-plan": "family_action_plan_v2", "v2-edu-plan": "educator_action_plan_v2", "v2-meeting-qs": "meeting_prep_questions",
  "v2-horizons": "cross_cutting_horizons", "v2-inputs-used": "inputs_used",
};
/** Contents scope the rows to the actual reader. No raw identifiers or unrendered fields. */
export function reportSectionHistory(content: unknown, items: readonly ReportContentsItem[], audience: PlanningReportAudience, hasV2: boolean, customPlan = false): SectionHistoryRow[] {
  const r = content && typeof content === "object" ? content as Record<string, unknown> : {};
  const updates = readSectionUpdates(content)?.fields ?? {};
  const generationAt = hasV2 ? Date.parse(recordedReportInputs(content)?.generated_at ?? "") : NaN;
  const rows: SectionHistoryRow[] = [], seen = new Set<string>();
  const add = (field: string, label: string) => {
    if (seen.has(field)) return;
    seen.add(field); const status = updates[field];
    const earlier = status && Number.isFinite(generationAt) && Date.parse(status.recorded_at) < generationAt;
    rows.push({ field, label, operation: status?.operation, recordedAt: status?.recorded_at,
      ...(earlier ? { earlier: true as const } : {}),
    });
  };
  const text = (value: unknown) => typeof value === "string" && value.trim().length > 0;
  const summaryFields = audience === "educator" ? ["professional_summary", "plain_language_summary"] : ["plain_language_summary", "professional_summary"];
  const summaryField = hasV2 ? summaryFields.find(field => text(r[field])) : text(r.summary) ? "summary" : undefined;
  if (summaryField) add(summaryField, "At a Glance Summary");
  if (hasV2 && r.student_snapshot && !items.some(item => item.id === "sec-snapshot")) add("student_snapshot", "Student Profile");
  for (const item of items) {
    const field = Object.hasOwn(fields, item.id) ? fields[item.id] : undefined;
    if (!field || customPlan && item.id === "sec-thirty-day") continue;
    const label = item.id === "sec-spin" && hasV2 ? `${item.label} · Detailed Profile`
      : item.id === "v2-spin" ? `${item.label} · Profile Summary` : item.label;
    add(field, label);
  }
  if (!hasV2 && !r.teacher_action_plan && Array.isArray(r.teacher_next_steps) && r.teacher_next_steps.length) add("teacher_next_steps", "Teacher Next Steps");
  if (!hasV2 && Array.isArray(r.family_questions_for_ppt) && r.family_questions_for_ppt.length) add("family_questions_for_ppt", "Questions for the Team");
  if (text(r.encouragement_to_student)) add("encouragement_to_student", "Closing Note");
  return rows;
}
