/**
 * Admin coverage continuity: read-side for the student roster an
 * organization sponsors.
 *
 * Write path already exists (`setStudentCoverageState` in
 * `licensing.functions.ts`), which requires a written reason and records an
 * immutable audit row. This module only reads students back; row-level
 * security limits results to administrators of the organization.
 */
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export interface CoverageStudentRow {
  id: string;
  first_name: string;
  last_name: string | null;
  school: string | null;
  grade_band: string | null;
  coverage_state: string;
  coverage_state_changed_at: string | null;
  export_window_ends_at: string | null;
}

export interface CoverageOverview {
  students: CoverageStudentRow[];
  byState: { state: string; count: number }[];
  transferTargets: { id: string; name: string }[];
}

export const COVERAGE_STATE_LABEL: Record<string, string> = {
  active: "Active",
  graduated: "Graduated",
  transferred: "Transferred",
  archived: "Archived",
};

export function labelForCoverageState(state: string): string {
  return (
    COVERAGE_STATE_LABEL[state] ??
    state
      .split("_")
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(" ")
  );
}

/** Days left in a time-boxed export window, or null when none is open. */
export function exportWindowDaysLeft(
  endsAt: string | null,
  now: Date = new Date(),
): number | null {
  if (!endsAt) return null;
  const ms = new Date(endsAt).getTime() - now.getTime();
  return Math.max(0, Math.ceil(ms / 86_400_000));
}

/** Students sponsored by one organization, plus their coverage state. */
export const getOrgCoverage = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .validator((data: { organizationId: string }) => {
    if (!UUID_RE.test(data.organizationId))
      throw new Error("Invalid organization");
    return data;
  })
  .handler(async ({ data, context }): Promise<CoverageOverview> => {
    const { supabase } = context;

    const [{ data: students }, { data: orgs }] = await Promise.all([
      supabase
        .from("students")
        .select(
          "id, first_name, last_name, school, grade_band, coverage_state, coverage_state_changed_at, export_window_ends_at",
        )
        .eq("organization_id", data.organizationId)
        .order("last_name", { ascending: true })
        .limit(500),
      supabase
        .from("organizations")
        .select("id, name")
        .neq("id", data.organizationId)
        .order("name", { ascending: true })
        .limit(200),
    ]);

    const rows = (students ?? []) as unknown as CoverageStudentRow[];
    const counts = new Map<string, number>();
    for (const row of rows) {
      counts.set(row.coverage_state, (counts.get(row.coverage_state) ?? 0) + 1);
    }

    return {
      students: rows,
      byState: [...counts.entries()].map(([state, count]) => ({ state, count })),
      transferTargets: (orgs ?? []) as { id: string; name: string }[],
    };
  });
