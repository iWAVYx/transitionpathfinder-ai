import { z } from "zod";

export const DOCUMENT_TEXT_START_MESSAGE = "We couldn't confirm that document processing can start. Check its status before trying again.";
const revision = z.string().datetime({ offset: true }).refine(value => (value.match(/\.(\d+)/)?.[1]?.length ?? 0) <= 6);
function instant(value: string) {
  const parsed = revision.parse(value);
  return BigInt(Math.floor(Date.parse(parsed) / 1000)) * 1_000_000n
    + BigInt((parsed.match(/\.(\d+)/)?.[1] ?? "").padEnd(6, "0"));
}
export async function documentTextServiceClient(): Promise<unknown> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}
type MetadataClient = { rpc(name: string, args: Record<string, unknown>): PromiseLike<{ data: unknown; error: unknown }> };
type Source = { actorId: string; studentId: string; documentId: string; extractionId: string;
  reviewRevision: string; documentRevision: string; reviewStatus: string; text: string };

/** This is a server-only protocol consumer, not database capacity enforcement.
 * The three source-bound RPCs and shared accounting must be reviewed/installed
 * together before activation. Never fall back to generic admission or raw saves.
 * Each request gets a new identity; an uncertain begin is never reattached. */
export async function admitDocumentTextExtraction(getClient: () => Promise<unknown>, source: Source) {
  try {
    const operationId = z.string().uuid().parse(crypto.randomUUID());
    const textDigest = Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(source.text))))
      .map(value => value.toString(16).padStart(2, "0")).join("");
    const client = await getClient() as MetadataClient;
    const result = await client.rpc("begin_bound_document_text_extraction", {
      _operation_id: operationId, _actor_id: source.actorId, _student_id: source.studentId,
      _document_id: source.documentId, _extraction_id: source.extractionId,
      _expected_review_revision: source.reviewRevision, _expected_document_revision: source.documentRevision,
      _expected_review_status: source.reviewStatus, _source_text_sha256: textDigest,
    });
    const claim = z.object({
      schema: z.literal("document-text-extraction-admitted-v1"),
      save_protocol: z.literal("bound-document-text-review-save-v1"),
      operation_id: z.literal(operationId), receipt_id: z.string().uuid(),
      actor_id: z.literal(source.actorId), student_id: z.literal(source.studentId),
      document_id: z.literal(source.documentId), extraction_id: z.literal(source.extractionId),
      revision: z.number().int().positive().max(Number.MAX_SAFE_INTEGER), reserved_units: z.literal(1),
      source_text_sha256: z.literal(textDigest), source_revision: revision, document_revision: revision,
    }).strict().parse(result.data);
    if (result.error || instant(claim.source_revision) !== instant(source.reviewRevision)
      || instant(claim.document_revision) !== instant(source.documentRevision)) throw new Error();
    let holdAttempted = false;
    return {
      operationId,
      saveArguments: { _operation_id: operationId, _receipt_id: claim.receipt_id, _source_text_sha256: textDigest },
      hold: async () => {
        if (holdAttempted) return;
        holdAttempted = true;
        try {
          // A completed save may have lost its reply. This metadata-only RPC
          // must preserve completed work. No release/expiry or reply-based retry.
          await client.rpc("hold_bound_document_text_extraction", {
            _operation_id: operationId, _actor_id: source.actorId, _receipt_id: claim.receipt_id,
          });
        } catch { /* Active or uncertain work stays counted for trusted review. */ }
      },
    };
  } catch {
    // Begin may already have committed; no provider call, cleanup or retry.
    throw new Error(DOCUMENT_TEXT_START_MESSAGE);
  }
}
