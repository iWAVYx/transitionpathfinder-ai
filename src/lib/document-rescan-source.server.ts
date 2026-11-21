import { z } from "zod";
import { documentUploadFingerprint, MAX_PRIVACY_SAFE_DOCUMENT_BYTES } from "./document-upload-fingerprint";
import { assertPrivacySafeDerivedUpload } from "./sensitive-text-redaction";

export const RESCAN_SOURCE_MESSAGE = "We couldn't confirm this document's saved copy or your access. Refresh the page and check its status before continuing.";
const sourceSchema = z.object({
  id: z.string().uuid(), student_id: z.string().uuid(), storage_path: z.string().min(1),
  storage_object_id: z.string().uuid(), storage_object_version: z.string().trim().min(1).max(1024),
  content_hash: z.string().regex(/^[a-f0-9]{64}$/), mime_type: z.literal("text/plain"),
  size_bytes: z.number().int().positive().max(MAX_PRIVACY_SAFE_DOCUMENT_BYTES),
  title: z.string(), doc_type: z.string(), updated_at: z.string().datetime({ offset: true }),
  scan_status: z.enum(["failed", "pending"]), deleted_at: z.null(),
});
type Source = z.infer<typeof sourceSchema>;
type Receipt = { data: unknown; error: unknown };
type Client = {
  rpc(name: string, args: Record<string, unknown>): PromiseLike<Receipt>;
  from(table: string): { select(columns: string): { eq(column: string, value: string): { maybeSingle(): PromiseLike<Receipt> } } };
  storage: { from(bucket: string): { info(path: string): PromiseLike<Receipt>; download(path: string): PromiseLike<Receipt> } };
};
const infoSchema = z.object({
  id: z.string().uuid(), version: z.string(), name: z.string(), bucketId: z.literal("student-documents"),
  size: z.number().int().positive(), contentType: z.string(),
  archivedAt: z.null().optional(), isDeleteMarker: z.literal(false).optional(),
});
async function authority(client: Client, actor: string, source: Source) {
  for (const [name, args, expected] of [
    ["can_edit_student", { _user_id: actor, _student_id: source.student_id }, true],
    ["is_partner_only", { _user_id: actor }, false],
    ["can_view_document", { _user_id: actor, _document_id: source.id }, true],
  ] as const) {
    const reply = await client.rpc(name, args);
    if (reply.error || reply.data !== expected) throw new Error();
  }
}
/** Uses storage-js camel-cased Info, under the caller's Storage authorization.
 * Missing version/lifecycle support fails closed; metadata is not physical-byte
 * or conditional-write proof. The immutable downloaded Blob supplies the scan. */
export async function authorizeDocumentRescanSource(privateClient: unknown, actorId: string, value: unknown) {
  try {
    const actor = z.string().uuid().parse(actorId);
    const source = sourceSchema.parse(value);
    if (source.scan_status !== "failed") throw new Error();
    assertPrivacySafeDerivedUpload(source.storage_path, source.mime_type);
    const client = privateClient as Client;
    const bucket = client.storage.from("student-documents");
    const confirmObject = async () => {
      const reply = await bucket.info(source.storage_path);
      const info = infoSchema.parse(reply.data);
      if (reply.error || info.id !== source.storage_object_id || info.version !== source.storage_object_version ||
          info.name !== source.storage_path || info.size !== source.size_bytes ||
          !/^text\/plain(?:\s*;\s*charset\s*=\s*(?:utf-8|us-ascii))?$/i.test(info.contentType.trim())) throw new Error();
    };
    const confirm = async (revision: string, status: "failed" | "pending") => {
      await authority(client, actor, source);
      const reply = await client.from("documents").select("*").eq("id", source.id).maybeSingle();
      const current = sourceSchema.parse(reply.data);
      if (reply.error || Object.keys(sourceSchema.shape).some(key => {
        const field = key as keyof Source;
        return current[field] !== (field === "updated_at" ? revision : field === "scan_status" ? status : source[field]);
      })) throw new Error();
      await confirmObject();
    };
    // Only current caller authority and source metadata are checked here.
    // File IO belongs to the admitted callback, after a confirmed begin reply.
    await authority(client, actor, source);
    // Spend this in-process continuation before the first await. Reusing it
    // after success, a lost reply or a failed check must never download again.
    // Durable source/capacity admission remains a separate database prerequisite.
    let preparationUsed = false;
    return { prepareCopy: async () => {
      if (preparationUsed) throw new Error(RESCAN_SOURCE_MESSAGE);
      preparationUsed = true;
      try {
        await authority(client, actor, source);
        await confirmObject();
        const downloaded = await bucket.download(source.storage_path);
        if (downloaded.error || !(downloaded.data instanceof Blob) || downloaded.data.size !== source.size_bytes) throw new Error();
        const copy = downloaded.data;
        const contentHash = await documentUploadFingerprint(copy);
        if (contentHash !== source.content_hash) throw new Error();
        await confirm(source.updated_at, "failed");
        let pendingRevision: string | undefined;
        let stopped = false;
        let confirming = false;
        return { copy, contentHash, confirmPending: async (revision: string) => {
          // The same pending source is checked before and after scanning. Never
          // adopt a newer revision or resume a continuation after uncertainty.
          if (stopped || confirming || !sourceSchema.shape.updated_at.safeParse(revision).success ||
              (pendingRevision !== undefined && revision !== pendingRevision)) {
            stopped = true;
            throw new Error(RESCAN_SOURCE_MESSAGE);
          }
          pendingRevision = revision;
          confirming = true;
          try {
            await confirm(pendingRevision, "pending");
            if (stopped) throw new Error();
          } catch {
            stopped = true;
            throw new Error(RESCAN_SOURCE_MESSAGE);
          } finally { confirming = false; }
        } };
      } catch { throw new Error(RESCAN_SOURCE_MESSAGE); }
    } };
  } catch { throw new Error(RESCAN_SOURCE_MESSAGE); }
}

/** Internal convenience wrapper for local source verification; the rescan
 * endpoint uses authorizeDocumentRescanSource and admits before prepareCopy. */
export async function prepareDocumentRescanCopy(privateClient: unknown, actorId: string, value: unknown) {
  return (await authorizeDocumentRescanSource(privateClient, actorId, value)).prepareCopy();
}
