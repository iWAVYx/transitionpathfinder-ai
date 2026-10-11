import { z } from "zod";
import { ReportSchema, type PathwayReport } from "@/lib/pathway-generation-contract";
import { PathwayReportV2, StudentSnapshot } from "@/lib/pathway-v2";

// These values identify, authorize, classify or date the report; they are not prose.
const PRESERVED_FIELDS = new Set([
  "type", "level", "readiness_level", "confidence_level", "overall", "status",
  "owner_role", "for_audience", "kind", "timeframe", "section", "blocks_section",
  "schema_version", "id", "url", "href", "inputs_used", "source_doc_ids",
  "display_name", "student_first_name", "school", "district", "case_manager", "organization",
  "grade", "grade_level", "grade_band", "graduation_timeline", "plan_type",
  "generated_at", "last_updated", "readiness_at", "plan_date_start", "plan_date_end", "suggested_deadline",
  "__proto__", "constructor", "prototype",
]);
const MAX_TEXT_SLOTS = 1500;
const MAX_PAYLOAD_BYTES = 120_000;

export const ReportTranslationOutputSchema = z.object({
  translations: z.array(z.object({
    id: z.number().int().nonnegative(),
    text: z.string().trim().min(1).max(MAX_PAYLOAD_BYTES),
  }).strict()).max(MAX_TEXT_SLOTS),
}).strict();

function documentFields(report: unknown) {
  const legacy = ReportSchema.omit({ student_snapshot: true }).parse(report);
  const raw = report as Record<string, unknown>;
  if (raw.schema_version !== undefined && raw.schema_version !== 1 && raw.schema_version !== 2) {
    throw new Error("This report version cannot be translated yet.");
  }
  const legacySnapshot = ReportSchema.shape.student_snapshot.safeParse(raw.student_snapshot);
  const snapshot = legacySnapshot.success ? legacySnapshot.data : StudentSnapshot.parse(raw.student_snapshot);
  return raw.schema_version === 2
    ? { ...legacy, ...PathwayReportV2.omit({ student_snapshot: true }).parse(raw), student_snapshot: snapshot }
    : { ...legacy, student_snapshot: ReportSchema.shape.student_snapshot.parse(raw.student_snapshot) };
}

/** Send only validated document text; retain paths and all structural fields locally. */
export function prepareReportTranslation(report: unknown) {
  let fields: ReturnType<typeof documentFields>;
  try {
    fields = documentFields(report);
  } catch {
    throw new Error("This report is not ready for translation. Please refresh it and try again.");
  }
  const paths: Array<Array<string | number>> = [];
  const texts: Array<{ id: number; text: string }> = [];
  function visit(value: unknown, path: Array<string | number>, field = "") {
    if (PRESERVED_FIELDS.has(field) || /(?:_ids?|_keys)$/.test(field)) return;
    if (typeof value === "string") {
      if (!value.trim() || /^https?:\/\//i.test(value) || /^\d{4}-\d{2}-\d{2}(?:$|T)/.test(value)) return;
      paths.push(path);
      texts.push({ id: paths.length - 1, text: value });
    } else if (Array.isArray(value)) {
      value.forEach((item, index) => visit(item, [...path, index], field));
    } else if (typeof value === "object" && value !== null) {
      Object.entries(value).forEach(([key, item]) => visit(item, [...path, key], key));
    }
  }
  visit(fields, []);
  if (texts.length > MAX_TEXT_SLOTS || new TextEncoder().encode(JSON.stringify(texts)).length > MAX_PAYLOAD_BYTES) {
    throw new Error("This report is too long to translate in one request. Please contact support.");
  }
  const source = structuredClone(report) as PathwayReport;
  return {
    texts,
    apply(output: unknown): PathwayReport {
      if (new TextEncoder().encode(JSON.stringify(output)).length > MAX_PAYLOAD_BYTES * 2) {
        throw new Error("The translation is too long to validate. Please try again.");
      }
      const parsed = ReportTranslationOutputSchema.parse(output);
      const byId = new Map(parsed.translations.map(item => [item.id, item.text]));
      if (parsed.translations.length !== paths.length || byId.size !== paths.length
          || [...byId.keys()].some(id => id >= paths.length)) {
        throw new Error("The translation is incomplete. Please try again.");
      }
      const next = structuredClone(source);
      paths.forEach((path, id) => {
        let target: any = next;
        for (const key of path.slice(0, -1)) target = target[key];
        target[path[path.length - 1]] = byId.get(id)!;
      });
      return next;
    },
  };
}
