import { ReportSchema } from "@/lib/pathway-generation-contract";

/** A regenerated v2 identity block is not a legacy planning snapshot. */
export function getLegacyReportSnapshot(report: unknown) {
  if (typeof report !== "object" || report === null) return undefined;
  const parsed = ReportSchema.shape.student_snapshot.safeParse(
    (report as Record<string, unknown>).student_snapshot,
  );
  return parsed.success ? parsed.data : undefined;
}
