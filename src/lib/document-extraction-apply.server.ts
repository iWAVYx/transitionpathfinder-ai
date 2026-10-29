import { z } from "zod";
import { evidenceWritesEnabled } from "./evidence-writers.functions";

const message = "We couldn't confirm that this review was saved. Reload it and check your access before applying changes again.";
export const extractionApplyRequest = z.object({
  extraction_id: z.string().uuid(),
  student_id: z.string().uuid(),
  document_id: z.string().uuid(),
  expected_updated_at: z.string().datetime({ offset: true }),
  expected_sections: z.record(z.string(), z.unknown()).refine(value => JSON.stringify(value).length <= 100000),
});
const receipt = z.object({
  schema: z.literal("applied-document-extraction-v1"),
  extraction_id: z.string().uuid(), student_id: z.string().uuid(), document_id: z.string().uuid(),
  status: z.literal("complete"), updated_at: z.string().datetime({ offset: true }),
  evidence_saved: z.boolean(), evidence_id: z.string().uuid().nullable(),
}).strict();
export async function applyReviewedExtraction(client: unknown, input: unknown) {
  const data = extractionApplyRequest.parse(input);
  const enabled = evidenceWritesEnabled();
  try {
    const result = await (client as { rpc: (name: string, args: Record<string, unknown>) => Promise<{data: unknown; error: unknown}> })
      .rpc("apply_reviewed_document_extraction", {
        _extraction_id: data.extraction_id, _student_id: data.student_id, _document_id: data.document_id,
        _expected_updated_at: data.expected_updated_at, _expected_sections: data.expected_sections,
        _emit_evidence: enabled,
      });
    const parsed = receipt.safeParse(result.data);
    if (result.error || !parsed.success) throw new Error(message);
    const value = parsed.data;
    if (value.extraction_id !== data.extraction_id || value.student_id !== data.student_id || value.document_id !== data.document_id
      || value.evidence_saved !== enabled || (enabled ? value.evidence_id === null : value.evidence_id !== null)) throw new Error(message);
    return { ok: true as const, updated_at: value.updated_at };
  } catch { throw new Error(message); }
}
