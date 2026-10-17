import { reportMeetingQuestions, type PlanningReportAudience } from "@/lib/report-v2-contents";
const record = (value: unknown): Record<string, unknown> =>
  value !== null && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
const strings = (value: unknown): string[] => Array.isArray(value)
  ? value.filter((item): item is string => typeof item === "string" && item.trim().length > 0) : [];

/** Complete recorded questions for the chosen reader; preserve wording and source order. */
export function reportTeamQuestions(content: unknown, audience: PlanningReportAudience, hasV2: boolean): string[] {
  const report = record(content);
  if (!hasV2) return [...new Set([
    ...strings(report.family_questions_for_ppt),
    ...strings(record(report.meeting_prep_toolkit).questions_to_ask),
  ])];
  const questions = Array.isArray(report.meeting_prep_questions) ? report.meeting_prep_questions.map(record)
    .filter((item): item is { question: string; for_audience: string } =>
      typeof item.question === "string" && item.question.trim().length > 0
      && typeof item.for_audience === "string" && ["student", "family", "educator", "team"].includes(item.for_audience)) : [];
  return [...new Set(reportMeetingQuestions(questions, audience).map(item => item.question))];
}
