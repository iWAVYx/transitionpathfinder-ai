import { reportV2Contents, type PlanningReportAudience } from "./report-v2-contents";
import type { PathwayReport } from "./pathway-generation-contract";
export type ReportContentsItem = { id: string; label: string };

/** Links must match the sections rendered for this report version. */
export function liveReportContents(report: PathwayReport, name: string, {
  hasV2 = false, audience = "family", hasLinkedStudent = false, hasStudentVoiceResponses = false, extraItems,
}: { hasV2?: boolean; audience?: PlanningReportAudience; hasLinkedStudent?: boolean; hasStudentVoiceResponses?: boolean; extraItems?: ReportContentsItem[] } = {}): ReportContentsItem[] {
  const items: { id: string; label: string }[] = [];
  if (report.student_snapshot) items.push({ id: "sec-snapshot", label: "Student Snapshot" });
  items.push({ id: "sec-strengths", label: "Strengths to Lead With" });
  if (report.spin_analysis) items.push({ id: "sec-spin", label: "Strengths, Preferences, Interests & Needs" });
  if (report.readiness_scorecard?.length) items.push({ id: "sec-readiness", label: "Transition Readiness Scorecard" });
  if (report.recommended_pathways?.length) items.push({ id: "sec-pathways", label: "Recommended Pathways" });
  if (report.career_matches?.length) items.push({ id: "sec-careers", label: "Career & Life Pathway Matches" });
  if (report.postsecondary_goals?.length) items.push({ id: "sec-goals", label: "Postsecondary Goal Breakdown" });
  items.push({ id: "sec-education", label: "Education & Training Options" });
  items.push({ id: "sec-life-skills", label: "Life Skills to Focus On" });
  if (!hasV2 && report.iep_translator?.length) items.push({ id: "sec-iep-translator", label: "IEP / Transition Plan Translator" });
  if (!hasV2 && report.teacher_action_plan) items.push({ id: "sec-educator-plan", label: "Educator / Case Manager Action Plan" });
  if (report.data_gaps?.length) items.push({ id: "sec-data-gaps", label: "What We Still Need to Know" });
  if (hasStudentVoiceResponses) items.push({ id: "sec-your-voice", label: "Your Voice in This Plan" });
  if (report.student_voice_prompts?.length) items.push({ id: "sec-student-voice", label: `In ${name}'s Voice` });
  if (!hasV2 && report.family_action_plan) items.push({ id: "sec-family-plan", label: "Family Action Plan" });
  if (!hasV2 && report.meeting_prep_toolkit) items.push({ id: "sec-meeting-prep", label: "Next PPT / IEP Meeting Prep" });
  if (hasLinkedStudent) items.push({ id: "sec-partner-suggestions", label: "Partner Suggestions" });
  if (!hasV2 && report.opportunity_matches?.length) items.push({ id: "sec-opportunities", label: "Opportunities to Explore" });
  if (report.progress_timeline?.length) items.push({ id: "sec-timeline", label: "Progress Timeline" });
  items.push({ id: "sec-thirty-day", label: "Action Plan" });
  if (report.needs_human_review?.length) items.push({ id: "sec-review", label: "Worth a Human Second Look" });

  if (hasV2) items.push(...reportV2Contents(report, audience));
  if (extraItems) items.push(...extraItems);

  return items;
}
