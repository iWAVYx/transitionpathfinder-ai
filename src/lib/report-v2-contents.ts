import { isV2 } from "@/lib/pathway-v2";
import { recordedReportInputs } from "@/lib/report-source-summary";
import type { ReportContentsItem } from "@/lib/report-contents";
export type PlanningReportAudience = "student" | "family" | "educator";

/** Preserve the reader's existing question visibility rules before rendering/navigation. */
export function reportMeetingQuestions<T extends { for_audience: string }>(questions: readonly T[] | undefined, audience: PlanningReportAudience): T[] {
  return (questions ?? []).filter(question => audience === "student"
    ? question.for_audience === "student" || question.for_audience === "team"
    : audience === "family" ? question.for_audience !== "educator" : true);
}

/** Contents for the newer sections actually rendered for this audience. */
export function reportV2Contents(content: unknown, audience: PlanningReportAudience): ReportContentsItem[] {
  if (!isV2(content)) return [];
  const items: ReportContentsItem[] = [];
  const add = (present: unknown, id: string, label: string) => { if (present) items.push({ id, label }); };
  const list = (key: string) => Array.isArray(content[key]) && content[key].length > 0;
  const spin = content.spin as Record<string, unknown> | undefined;
  add(spin && ["strengths", "preferences", "interests", "needs"].some(key => Array.isArray(spin[key]) && spin[key].length > 0), "v2-spin", "Strengths, Preferences, Interests & Needs");
  add(list("readiness_indicators"), "v2-readiness-indicators", "Readiness Indicators");
  add(list("needs_review_flags"), "v2-needs-review", "Needs Review");
  add(content.confidence, "v2-confidence", "Confidence and Review");
  add(content.iep_plan_summary, "v2-iep-summary", "IEP / Transition Plan Summary");
  for (const [key, id, label] of [
    ["postsecondary_education_recs", "v2-edu", "Education & Training Recommendations"],
    ["employment_pathway_recs", "v2-emp", "Employment Pathway Recommendations"],
    ["independent_living_recs", "v2-il", "Independent Living Recommendations"],
    ["community_participation_recs", "v2-comm", "Community Participation Recommendations"],
    ["resource_matches", "v2-resources", "Resource Matches"],
    ["partner_matches", "v2-partners", "Partner / Opportunity Matches"],
    ["missing_information_v2", "v2-gaps", "Missing Information & Planning Gaps"],
  ]) add(list(key), id, label);
  add(audience !== "educator" && content.student_action_plan, "v2-student-plan", "Student Action Plan");
  add(content.family_action_plan_v2, "v2-family-plan", "Family Action Plan");
  add(audience === "educator" && content.educator_action_plan_v2, "v2-edu-plan", "Educator / Case Manager Action Plan");
  const questions = Array.isArray(content.meeting_prep_questions)
    ? content.meeting_prep_questions as { for_audience: string }[] : undefined;
  add(reportMeetingQuestions(questions, audience).length, "v2-meeting-qs", "Meeting Prep Questions");
  add(content.cross_cutting_horizons, "v2-horizons", "Shared Planning Timeframes");
  add(recordedReportInputs(content), "v2-inputs-used", "Sources Used in This Report");
  return items;
}
