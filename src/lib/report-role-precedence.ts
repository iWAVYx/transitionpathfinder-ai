/**
 * Pathway Report role/audience precedence (Workstream 1).
 *
 * Rules, highest to lowest:
 *   1. Explicit selection — the viewer clicked a role/audience tab in this
 *      session, or the URL/search param carries a valid audience.
 *   2. Authorized origin — the viewer arrived from a role-scoped surface
 *      (e.g. Educator dashboard → Educator; Family Workspace → Family;
 *      share-token audience baked into the link).
 *   3. Student View fallback — when neither of the above applies, default
 *      to the Student View. Never silently default to Family or Educator.
 *
 * This helper centralizes rule 3 so every report entry point applies the
 * same precedence when no explicit or origin-derived audience is present.
 */
export type ReportAudience = "student" | "family" | "educator";

export function resolveReportAudience(
  candidates: Array<ReportAudience | null | undefined>,
): ReportAudience {
  for (const c of candidates) {
    if (c === "student" || c === "family" || c === "educator") return c;
  }
  return "student";
}
