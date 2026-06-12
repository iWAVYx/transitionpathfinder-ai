/**
 * Connecticut transition planning age bands.
 *
 * CT requires transition planning by the first IEP in effect when the
 * student turns 14, with annual updates. Rights generally transfer at 18.
 */

export type TransitionBand =
  | "early"
  | "age_14"
  | "age_16"
  | "age_17"
  | "age_18_plus"
  | "exit_year";

export function ageFromDob(dob: string | null | undefined): number | null {
  if (!dob) return null;
  const d = new Date(dob);
  if (Number.isNaN(d.getTime())) return null;
  const now = new Date();
  let age = now.getFullYear() - d.getFullYear();
  const m = now.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < d.getDate())) age--;
  return age;
}

export function transitionBand(age: number | null, gradeBand?: string | null): TransitionBand {
  // Treat senior/exit grade as exit_year regardless of age.
  if (gradeBand && /exit|post[-\s]?secondary|22/i.test(gradeBand)) return "exit_year";
  if (age === null) return "early";
  if (age >= 18) return "age_18_plus";
  if (age >= 17) return "age_17";
  if (age >= 16) return "age_16";
  if (age >= 14) return "age_14";
  return "early";
}

export const TRANSITION_PROMPTS: Record<TransitionBand, { title: string; body: string }> = {
  early: {
    title: "Start early transition exploration",
    body: "If appropriate, begin exploring interests, strengths, and community connections. Formal transition planning is required by age 14 in Connecticut.",
  },
  age_14: {
    title: "Transition planning is active",
    body: "In Connecticut, transition planning is part of the IEP starting at age 14 and should be reviewed annually. Focus on goals, supports, and student voice.",
  },
  age_16: {
    title: "Strengthen work-based learning and self-advocacy",
    body: "At 16+, focus on work experience, agency connections, self-advocacy, and concrete postsecondary planning.",
  },
  age_17: {
    title: "Prepare for transfer of rights",
    body: "Rights generally transfer to the student at age 18 in Connecticut. Discuss decision-making options (supported decision-making, continued parent/guardian involvement with consent, etc.) with the team.",
  },
  age_18_plus: {
    title: "Student controls sharing",
    body: "Unless another legal arrangement applies, the student now controls who can access their education records. Confirm sharing preferences with the student.",
  },
  exit_year: {
    title: "Focus on final transition steps",
    body: "Wrap up adult-service connections, employment / training / college pathway, and documentation the student will need after exit.",
  },
};
