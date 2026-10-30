import { z } from "zod";
import { runAdmittedDocumentOperation } from "./document-operation-admission.server";
import { evidenceWritesEnabled } from "./evidence-writers.functions";

const message = "We couldn't confirm that this review was saved. Reload it and check your access before applying changes again.";
export const extractionApplyRequest = z.object({
  expected_viewer_id: z.string().uuid(),
  extraction_id: z.string().uuid(),
  student_id: z.string().uuid(),
  document_id: z.string().uuid(),
  expected_updated_at: z.string().datetime({ offset: true }),
  expected_sections: z.record(z.string(), z.unknown()).refine(value => JSON.stringify(value).length <= 100000),
});
export function parseExtractionApplyRequest(input: unknown) {
  const parsed = extractionApplyRequest.safeParse(input);
  if (!parsed.success) throw new Error("Reload the document review before applying changes.");
  return parsed.data;
}
const receipt = z.object({
  schema: z.literal("applied-document-extraction-v1"),
  extraction_id: z.string().uuid(), student_id: z.string().uuid(), document_id: z.string().uuid(),
  status: z.literal("complete"), updated_at: z.string().datetime({ offset: true }),
  evidence_saved: z.boolean(), evidence_id: z.string().uuid().nullable(),
}).strict();
type ApplyOutcome = { state: "applied"; value: { ok: true; updated_at: string } } | { state: "refused" };
async function requestReviewedExtraction(client: unknown, input: unknown): Promise<ApplyOutcome> {
  const data = parseExtractionApplyRequest(input);
  const enabled = evidenceWritesEnabled();
  try {
    const result = await (client as { rpc: (name: string, args: Record<string, unknown>) => Promise<{data: unknown; error: unknown}> })
      .rpc("apply_reviewed_document_extraction", {
        _extraction_id: data.extraction_id, _student_id: data.student_id, _document_id: data.document_id,
        _expected_updated_at: data.expected_updated_at, _expected_sections: data.expected_sections,
        _emit_evidence: enabled,
      });
    // This fixed RPC performs database writes only, all in one transaction.
    // A received SQL refusal with no result confirms rollback. Lost replies,
    // gateway errors, mixed data/error and malformed receipts stay uncertain.
    if (result.data === null && result.error && typeof result.error === "object"
      && "code" in result.error && typeof result.error.code === "string" && ["42501", "55000"].includes(result.error.code)) {
      return { state: "refused" };
    }
    const parsed = receipt.safeParse(result.data);
    if (result.error || !parsed.success) throw new Error(message);
    const value = parsed.data;
    if (value.extraction_id !== data.extraction_id || value.student_id !== data.student_id || value.document_id !== data.document_id
      || value.evidence_saved !== enabled || (enabled ? value.evidence_id === null : value.evidence_id !== null)) throw new Error(message);
    return { state: "applied", value: { ok: true as const, updated_at: value.updated_at } };
  } catch { throw new Error(message); }
}


export async function applyReviewedExtraction(client: unknown, input: unknown) {
  const outcome = await requestReviewedExtraction(client, input);
  if (outcome.state === "refused") throw new Error(message);
  return outcome.value;
}

type PrivateClient = {
  rpc(name: string, args: Record<string, unknown>): PromiseLike<{ data: unknown; error: unknown }>;
  from(table: string): { select(columns: string): { eq(column: string, value: string): { maybeSingle(): PromiseLike<{ data: unknown; error: unknown }> } } };
};
const reviewedSource = z.object({ id: z.string().uuid(), student_id: z.string().uuid(), document_id: z.string().uuid(), status: z.enum(["pending", "needs_review", "in_review"]) }).strict();
const availableDocument = z.object({ id: z.string().uuid(), student_id: z.string().uuid(), scan_status: z.literal("clean"), review_status: z.string().refine(value => value !== "rejected"), archived_at: z.null(), deleted_at: z.null() }).strict();
async function admissionServiceClient(): Promise<unknown> {
  // Lazy and metadata-only: never use this capability for private report writes.
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

/** Caller-RLS scope checks precede admission; the atomic RPC rechecks them.
 * A received database-only refusal is settled work, not a successful save.
 * Other errors are never classified by private failure text. */
export async function applyReviewedExtractionWithAdmission(
  privateClient: unknown, actorId: string, input: unknown,
  getServiceClient: () => Promise<unknown> = admissionServiceClient,
) {
  const data = parseExtractionApplyRequest(input);
  const actor = z.string().uuid().safeParse(actorId);
  if (!actor.success) throw new Error(message);
  if (data.expected_viewer_id !== actor.data) throw new Error("Your sign-in changed. Reload the review before applying changes.");
  const client = privateClient as PrivateClient;
  try {
    const edit = await client.rpc("can_edit_student", { _user_id: actor.data, _student_id: data.student_id });
    if (edit.error || edit.data !== true) throw new Error();
    const partner = await client.rpc("is_partner_only", { _user_id: actor.data });
    if (partner.error || partner.data !== false) throw new Error();
    const view = await client.rpc("can_view_document", { _user_id: actor.data, _document_id: data.document_id });
    if (view.error || view.data !== true) throw new Error();
    const extraction = await client.from("document_extractions").select("id,student_id,document_id,status").eq("id", data.extraction_id).maybeSingle();
    const source = reviewedSource.safeParse(extraction.data);
    if (extraction.error || !source.success || source.data.id !== data.extraction_id || source.data.student_id !== data.student_id || source.data.document_id !== data.document_id) throw new Error();
    const document = await client.from("documents").select("id,student_id,scan_status,review_status,archived_at,deleted_at").eq("id", data.document_id).maybeSingle();
    const available = availableDocument.safeParse(document.data);
    if (document.error || !available.success || available.data.id !== data.document_id || available.data.student_id !== data.student_id) throw new Error();
  } catch { throw new Error(message); }
  let serviceClient: unknown;
  try { serviceClient = await getServiceClient(); } catch { throw new Error(message); }
  const outcome = await runAdmittedDocumentOperation({ serviceClient, actorId: actor.data, kind: "apply" }, () => requestReviewedExtraction(client, data));
  if (outcome.state === "refused") throw new Error(message);
  return outcome.value;
}
