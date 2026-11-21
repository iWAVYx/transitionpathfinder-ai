import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

type ProfileRow = Pick<Database["public"]["Tables"]["students"]["Row"],
  "id" | "first_name" | "last_name" | "grade_band" |
  "interests_summary" | "strengths_summary" | "support_needs_summary">;

/** A recorded narrative stays one complete input, without inventing a list. */
function recordedSummary(value: string | null): string[] | null {
  return value?.trim() ? [value.trim()] : null;
}

export function toRegenerationStudentProfile(row: ProfileRow) {
  return {
    id: row.id,
    first_name: row.first_name,
    last_name: row.last_name,
    grade_band: row.grade_band,
    interests: recordedSummary(row.interests_summary),
    strengths: recordedSummary(row.strengths_summary),
    needs: recordedSummary(row.support_needs_summary),
  };
}

/** Use the authenticated caller client; an unavailable profile cannot reach AI. */
export async function loadRegenerationStudentProfile(client: SupabaseClient<Database>, studentId: string) {
  const { data, error } = await client.from("students")
    .select("id, first_name, last_name, grade_band, interests_summary, strengths_summary, support_needs_summary")
    .eq("id", studentId)
    .maybeSingle();
  if (error || !data) throw new Error("Couldn't load the linked student.");
  return toRegenerationStudentProfile(data);
}
