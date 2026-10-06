import { ReportSchema, type PathwayReport } from "@/lib/pathway-generation-contract";
import { StudentSnapshot } from "@/lib/pathway-v2";

export type SharedReportAudience = "family" | "educator";

/**
 * The current shared reader renders legacy document fields only. Zod's object
 * schemas strip unrecognized keys at every structured level, so hidden v2
 * manifests, internal record identifiers and future fields are not serialized.
 * Richer shared-version support must add an explicit, audience-scoped contract.
 */
export function projectSharedReport(content: unknown): PathwayReport | null {
  const legacy = ReportSchema.omit({ student_snapshot: true }).safeParse(content);
  if (!legacy.success || typeof content !== "object" || content === null) return null;
  const raw = content as Record<string, unknown>;
  const snapshot = ReportSchema.shape.student_snapshot.safeParse(raw.student_snapshot);
  if (snapshot.success) return { ...legacy.data, student_snapshot: snapshot.data };
  // Regeneration replaces the legacy snapshot with a v2 identity block. It is
  // not compatible with the current legacy shared snapshot reader; do not cast
  // it into that reader or send its undisplayed contents to the client.
  if (raw.schema_version === 2 && StudentSnapshot.safeParse(raw.student_snapshot).success) {
    return legacy.data;
  }
  return null;
}
