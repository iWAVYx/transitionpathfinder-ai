import { z } from "zod";

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

export const PathwayIntakeFormSchema = z.object({
  submitter_role: z.enum(["family", "student", "educator"]),
  student_first_name: z.string().trim().min(1, "Please add a first name to continue.").max(80),
  grade_band: z.enum(["9-10", "11-12", "post-secondary", "not-applicable"]).optional(),
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
});

export type PathwayIntakeFormValues = z.infer<typeof PathwayIntakeFormSchema>;
export type PathwayIntakeRole = PathwayIntakeFormValues["submitter_role"];

export function createPathwayIntakeDefaults(): PathwayIntakeFormValues {
  return {
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

  const educator_input = [
    values.educator_input?.trim() || "",
    join("Teacher observations", values.teacher_observations),
  ]
    .filter(Boolean)
    .join("\n\n");

  return {
    submitter_role: values.submitter_role,
    student_first_name: values.student_first_name,
    grade_band: values.grade_band,
    strengths: values.strengths,
    interests: values.interests,
    needs,
    supports: values.supports,
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
    family_concerns_extended: values.family_concerns_extended,
    student_worries: values.student_worries,
    services_received: values.services_received,
    desired_postsecondary_outcomes: values.desired_postsecondary_outcomes,
    upcoming_meetings: values.upcoming_meetings,
  };
}
