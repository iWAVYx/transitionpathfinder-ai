import type { Database } from "../../../src/integrations/supabase/types";

/** Uses the actual student profile schema, not Pathway Builder response field names. */
export function creatorStudentInput(f: { studentId: string; ownerId: string; marker: string }) {
  return {
    id: f.studentId,
    owner_id: f.ownerId,
    first_name: f.marker,
    last_name: "Synthetic",
    notes: f.marker,
    is_demo: true,
    student_user_id: null,
    grade_band: "11-12",
    interests_summary: "Culinary arts and robotics.",
    strengths_summary: "Careful problem solving.",
    support_needs_summary: "Written directions.",
  } satisfies Database["public"]["Tables"]["students"]["Insert"];
}
