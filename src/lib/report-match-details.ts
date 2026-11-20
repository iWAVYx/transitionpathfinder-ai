/** Recorded report links may open only complete public web destinations. */
export function reportWebDestination(value: unknown): string | undefined {
  if (typeof value !== "string" || !value.trim() || /[\u0000-\u001f\u007f]/.test(value)) return undefined;
  try {
    const url = new URL(value.trim());
    if (!["http:", "https:"].includes(url.protocol) || url.username || url.password) return undefined;
    return url.href;
  } catch {
    return undefined;
  }
}
const FOLLOW_UP_LABELS: Record<string, string> = {
  student: "Student", family: "Family", case_manager: "Case Manager", educator: "Educator",
  school_team: "School Team", partner: "Partner Organization", outside_provider: "Outside Provider",
};
/** Explain the recorded role without assigning a person or inventing a fallback. */
export function reportFollowUpRole(value: unknown): string | undefined {
  return typeof value === "string" && Object.hasOwn(FOLLOW_UP_LABELS, value) ? FOLLOW_UP_LABELS[value] : undefined;
}
