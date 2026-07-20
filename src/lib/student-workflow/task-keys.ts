/**
 * Workstream 5 — Student navigation contract.
 *
 * Canonical, stable `task_key` values used by student workflow drafts.
 * Keeping them centralized guarantees the "Resume where you left off"
 * surface can round-trip a user back to the same task/route.
 */

export const STUDENT_TASK_KEYS = {
  studentVoice: "student.voice",
  pathwayIntake: "student.pathway.intake",
  meetingPrep: "student.meeting.prep",
  goalDraft: "student.goal.draft",
} as const;

export type StudentTaskKey =
  (typeof STUDENT_TASK_KEYS)[keyof typeof STUDENT_TASK_KEYS];

/** Human-readable label used in the "Resume where you left off" card. */
export const STUDENT_TASK_LABELS: Record<StudentTaskKey, string> = {
  "student.voice": "Student Voice answers",
  "student.pathway.intake": "Pathway intake",
  "student.meeting.prep": "Meeting prep notes",
  "student.goal.draft": "Goal draft",
};

/** Fallback return-to path for each known task. */
export const STUDENT_TASK_RETURN_TO: Record<StudentTaskKey, string> = {
  "student.voice": "/student-voice",
  "student.pathway.intake": "/pathway/student",
  "student.meeting.prep": "/meetings",
  "student.goal.draft": "/goals",
};

export function isKnownStudentTaskKey(key: string): key is StudentTaskKey {
  return Object.prototype.hasOwnProperty.call(STUDENT_TASK_LABELS, key);
}

export function labelForStudentTask(key: string): string {
  return isKnownStudentTaskKey(key) ? STUDENT_TASK_LABELS[key] : key;
}

export function returnToForStudentTask(
  key: string,
  fallback = "/dashboard",
): string {
  return isKnownStudentTaskKey(key) ? STUDENT_TASK_RETURN_TO[key] : fallback;
}
