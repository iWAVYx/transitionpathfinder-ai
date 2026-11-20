import type { Database } from "../../../src/integrations/supabase/types";
import { creatorStudentInput } from "./pathway-creator-fixture";
type Fixture = { studentId: string; ownerId: string; intakeId: string; marker: string; role: "parent" | "educator" };
export function reportAssistName(role: Fixture["role"]) {
  if (role === "parent") return "Avery";
  if (role === "educator") return "Rowan";
  throw Error("Unexpected report-assist fixture role");
}
export function reportAssistStudentInput(f: Fixture) {
  return { ...creatorStudentInput(f), first_name: reportAssistName(f.role), interests_summary: "Animal care and visual art.", strengths_summary: "Reported patience with animals.", support_needs_summary: "Written checklists and quiet workspaces." } satisfies Database["public"]["Tables"]["students"]["Insert"];
}
export function reportAssistIntakeInput(f: Fixture) {
  return { id: f.intakeId, user_id: f.ownerId, student_id: f.studentId, student_first_name: reportAssistName(f.role), submitter_role: f.role === "parent" ? "family" : "educator", grade_band: "11-12", current_goals: `${f.marker}. Family-reported baseline 2 independent animal-care steps with written directions; proposed target 4; no progress log supplied.` } satisfies Database["public"]["Tables"]["student_intakes"]["Insert"];
}
