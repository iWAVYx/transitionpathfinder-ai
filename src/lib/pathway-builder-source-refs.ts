import type { PathwayReportV2, SourceRef } from "./pathway-v2";

const sections = [
  "postsecondary_education_recs",
  "employment_pathway_recs",
  "independent_living_recs",
  "community_participation_recs",
  "resource_matches",
  "partner_matches",
] as const;
const explicitBuilderOrigin = /^(?:intake|pathway builder)\b/i;
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Bind only generated references explicitly identified as builder input.
 * This validates origin binding, not the truth of model prose or labels. */
export function bindBuilderSourceRefs(
  report: PathwayReportV2,
  intakeId: string | null,
): PathwayReportV2 {
  const bind = (source: SourceRef): SourceRef => {
    if (source.kind !== "intake" && !explicitBuilderOrigin.test(source.label.trim())) return source;
    if (!intakeId || !uuid.test(intakeId))
      throw Error(
        "We couldn't confirm a Pathway Builder source for this report. Review the attached responses and try again.",
      );
    return { ...source, kind: "intake", id: intakeId };
  };
  const result = { ...report };
  for (const field of sections) {
    const rows = report[field];
    if (rows)
      (result as Record<string, unknown>)[field] = rows.map((row) => ({
        ...row,
        sources: row.sources.map(bind),
      }));
  }
  return result;
}
