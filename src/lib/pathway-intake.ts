import { z } from "zod";

import type { DashboardSnapshot } from "@/lib/golden-path.functions";

/**
 * The richer context fields already persisted by student_intakes and consumed
 * by the Pathway Report prompt. Keep this list explicit so the form, mapper,
 * and regression tests cannot silently drift apart.
 */
export const PATHWAY_ENGINE_CONTEXT_FIELDS = [
  "communication_prefs",
  "transportation_needs",
  "family_priorities",
  "family_concerns_extended",
  "student_worries",
  "services_received",
  "desired_postsecondary_outcomes",
  "upcoming_meetings",
] as const;

/**
 * Structured details collected by the live form and folded into the existing
 * bounded intake columns. Keeping these fields explicit prevents a future UI
 * edit from silently dropping assistive technology, accommodation, evidence,
 * or uncertainty context before it reaches the Pathway Engine.
 */
export const PATHWAY_STRUCTURED_DETAIL_FIELDS = [
  "learning_preferences",
  "assistive_technology",
  "accommodations",
  "readiness_evidence",
  "evidence_source_dates",
  "information_to_verify",
] as const;

export const PathwayIntakeFormSchema = z.object({
  student_id: z.string().uuid().optional(),
  submitter_role: z.enum(["family", "student", "educator"]),
  student_first_name: z.string().trim().min(1, "Please add a first name to continue.").max(80),
  grade_band: z.enum(["6-8", "9-10", "11-12", "post-secondary", "not-applicable"]).optional(),
  strengths: z.string().trim().max(2000).optional(),
  interests: z.string().trim().max(2000).optional(),
  career_goals: z.string().trim().max(2000).optional(),
  education_goals: z.string().trim().max(2000).optional(),
  needs: z.string().trim().max(2000).optional(),
  life_skills: z.string().trim().max(2000).optional(),
  supports: z.string().trim().max(2000).optional(),
  transportation: z.string().trim().max(500).optional(),
  communication: z.string().trim().max(500).optional(),
  current_goals: z.string().trim().max(2000).optional(),
  teacher_observations: z.string().trim().max(2000).optional(),
  family_concerns: z.string().trim().max(2000).optional(),
  student_voice: z.string().trim().max(2000).optional(),
  family_voice: z.string().trim().max(2000).optional(),
  educator_input: z.string().trim().max(2000).optional(),
  communication_prefs: z.string().trim().max(1000).optional(),
  transportation_needs: z.string().trim().max(1000).optional(),
  family_priorities: z.string().trim().max(2000).optional(),
  family_concerns_extended: z.string().trim().max(2000).optional(),
  student_worries: z.string().trim().max(2000).optional(),
  services_received: z.string().trim().max(2000).optional(),
  desired_postsecondary_outcomes: z.string().trim().max(2000).optional(),
  upcoming_meetings: z.string().trim().max(1000).optional(),
  learning_preferences: z.string().trim().max(1500).optional(),
  assistive_technology: z.string().trim().max(1500).optional(),
  accommodations: z.string().trim().max(2000).optional(),
  readiness_evidence: z.string().trim().max(2000).optional(),
  evidence_source_dates: z.string().trim().max(1500).optional(),
  information_to_verify: z.string().trim().max(1500).optional(),
});

export type PathwayIntakeFormValues = z.infer<typeof PathwayIntakeFormSchema>;
export type PathwayIntakeRole = PathwayIntakeFormValues["submitter_role"];

export function createPathwayIntakeDefaults(): PathwayIntakeFormValues {
  return {
    student_id: undefined,
    submitter_role: "family",
    student_first_name: "",
    grade_band: undefined,
    strengths: "",
    interests: "",
    career_goals: "",
    education_goals: "",
    needs: "",
    life_skills: "",
    supports: "",
    transportation: "",
    communication: "",
    current_goals: "",
    teacher_observations: "",
    family_concerns: "",
    student_voice: "",
    family_voice: "",
    educator_input: "",
    communication_prefs: "",
    transportation_needs: "",
    family_priorities: "",
    family_concerns_extended: "",
    student_worries: "",
    services_received: "",
    desired_postsecondary_outcomes: "",
    upcoming_meetings: "",
    learning_preferences: "",
    assistive_technology: "",
    accommodations: "",
    readiness_evidence: "",
    evidence_source_dates: "",
    information_to_verify: "",
  };
}

function normalizeGradeBand(value: string | null): PathwayIntakeFormValues["grade_band"] {
  if (
    value === "6-8" ||
    value === "9-10" ||
    value === "11-12" ||
    value === "post-secondary" ||
    value === "not-applicable"
  ) {
    return value;
  }
  return undefined;
}

/**
 * Builds a fresh intake starting point from one authorized dashboard
 * snapshot. Only the profile values already visible to the signed-in caller
 * are copied, and the user must review every field before generation.
 */
export function buildPathwayStudentPrefill(
  snapshot: DashboardSnapshot,
): Partial<PathwayIntakeFormValues> | null {
  const student = snapshot.student;
  if (!student) return null;

  return {
    student_id: student.id,
    student_first_name: student.preferred_name?.trim() || student.first_name,
    grade_band: normalizeGradeBand(student.grade_band),
    strengths: student.strengths_summary ?? "",
    interests: student.interests_summary ?? "",
    needs: student.support_needs_summary ?? "",
    family_priorities: student.family_priorities ?? "",
    student_voice: student.student_voice_statement ?? "",
  };
}

export function mergePathwayIntake(values: PathwayIntakeFormValues) {
  const join = (label: string, value?: string) =>
    value && value.trim() ? `${label}: ${value.trim()}` : "";

  const current_goals = [
    values.current_goals?.trim() || "",
    join("Career goals", values.career_goals),
    join("Education / training goals", values.education_goals),
  ]
    .filter(Boolean)
    .join("\n\n");

  const needs = [values.needs?.trim() || "", join("Life-skills needs", values.life_skills)]
    .filter(Boolean)
    .join("\n\n");

  const supports = [
    values.supports?.trim() || "",
    join("Learning and decision preferences", values.learning_preferences),
    join("Assistive technology", values.assistive_technology),
    join("Accommodations", values.accommodations),
  ]
    .filter(Boolean)
    .join("\n\n");

  const educator_input = [
    values.educator_input?.trim() || "",
    join("Teacher observations", values.teacher_observations),
    join("Readiness evidence", values.readiness_evidence),
    join("Evidence and source dates", values.evidence_source_dates),
  ]
    .filter(Boolean)
    .join("\n\n");

  const family_concerns_extended = [
    values.family_concerns_extended?.trim() || "",
    join("Information to verify", values.information_to_verify),
  ]
    .filter(Boolean)
    .join("\n\n");

  return {
    student_id: values.student_id,
    submitter_role: values.submitter_role,
    student_first_name: values.student_first_name,
    grade_band: values.grade_band,
    strengths: values.strengths,
    interests: values.interests,
    needs,
    supports,
    transportation: values.transportation,
    communication: values.communication,
    current_goals,
    family_concerns: values.family_concerns,
    student_voice: values.student_voice,
    family_voice: values.family_voice,
    educator_input,
    communication_prefs: values.communication_prefs,
    transportation_needs: values.transportation_needs,
    family_priorities: values.family_priorities,
    family_concerns_extended,
    student_worries: values.student_worries,
    services_received: values.services_received,
    desired_postsecondary_outcomes: values.desired_postsecondary_outcomes,
    upcoming_meetings: values.upcoming_meetings,
  };
}
