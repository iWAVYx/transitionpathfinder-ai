import { z } from "zod";
// URL selection is navigation state only. The caller-visible roster and audit RLS remain authoritative.
export const validateHistorySearch = (search: unknown) =>
  z.object({ student_id: z.string().uuid().optional() }).passthrough().parse(search);

export type HistoryRouteRole =
  | "student"
  | "family"
  | "educator"
  | "school"
  | "district"
  | "partner";
/** Clear only malformed selection fields belonging to this history route. */
export function invalidHistorySelectionKeys(
  role: HistoryRouteRole,
  search: Record<string, unknown>,
): string[] {
  const keys = [
    "student_id",
    ...(role === "school" ? ["org_id"] : role === "district" ? ["district_id"] : []),
  ];
  return keys.filter(
    (key) => search[key] !== undefined && !z.string().uuid().safeParse(search[key]).success,
  );
}
