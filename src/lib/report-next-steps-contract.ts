import { validatedReportDocument } from "./report-translation-contract";

const OMIT_METADATA = new Set([
  "inputs_used", "section_updates", "source_doc_ids", "id", "display_name",
  "student_first_name", "school", "district", "case_manager", "organization",
  "__proto__", "constructor", "prototype",
]);

/** Validate supported report content and omit unrelated identity/reference metadata; never truncate planning text. */
export function prepareReportNextSteps(report: unknown): string {
  let fields: ReturnType<typeof validatedReportDocument>;
  try { fields = validatedReportDocument(report); }
  catch { throw new Error("This report is not ready for next-step suggestions. Please refresh it and try again."); }
  function planning(value: unknown): unknown {
    if (Array.isArray(value)) return value.map(planning);
    if (value && typeof value === "object") return Object.fromEntries(
      Object.entries(value).filter(([key]) => !OMIT_METADATA.has(key) && !/(?:_ids?|_keys)$/.test(key))
        .map(([key, item]) => [key, planning(item)]),
    );
    return value;
  }
  const json = JSON.stringify(planning(fields));
  if (new TextEncoder().encode(json).length > 120_000)
    throw new Error("This report is too long for next-step suggestions in one request. Please contact support.");
  return json;
}
