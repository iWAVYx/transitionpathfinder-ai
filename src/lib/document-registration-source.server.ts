import { z } from "zod";
import type { RegistrationSource } from "./document-upload-registration-operation.server";
import { documentUploadFingerprint, MAX_PRIVACY_SAFE_DOCUMENT_BYTES } from "./document-upload-fingerprint";

const message = "We couldn't confirm the uploaded copy or your access. Check the document's status before continuing.";
type Reply = { data: unknown; error: unknown };
type Client = {
  rpc(name: string, args: Record<string, unknown>): PromiseLike<Reply>;
  storage: { from(bucket: string): { info(path: string): PromiseLike<Reply>; download(path: string): PromiseLike<Reply> } };
};
const inputSchema = z.object({
  actor: z.string().uuid(), student: z.string().uuid(), size: z.number().int().positive().max(MAX_PRIVACY_SAFE_DOCUMENT_BYTES),
  source: z.object({ objectId: z.string().uuid(), objectVersion: z.string().min(1).max(1024), storagePath: z.string(), contentSha256: z.string().regex(/^[a-f0-9]{64}$/) }).strict(),
});
const infoSchema = z.object({
  id: z.string().uuid(), version: z.string(), name: z.string(), bucketId: z.literal("student-documents"),
  size: z.number().int().positive(), contentType: z.string(),
  archivedAt: z.null().optional(), isDeleteMarker: z.literal(false).optional(),
});
/** Called only inside the claimed continuation. Storage info is an additional
 * consistency check, not physical-byte or conditional-provider proof. Keep the
 * immutable downloaded Blob for hash/type/scan and recheck current authority
 * and object identity before applying its results. No privileged file client. */
export async function prepareDocumentRegistrationCopy(
  privateClient: unknown, actor: string, student: string, size: number | undefined, source: RegistrationSource,
) {
  try {
    const input = inputSchema.parse({ actor, student, size, source });
    const client = privateClient as Client;
    const bucket = client.storage.from("student-documents");
    const confirm = async () => {
      try {
        for (const [name, args, expected] of [
          ["can_edit_student", { _user_id: input.actor, _student_id: input.student }, true],
          ["is_partner_only", { _user_id: input.actor }, false],
        ] as const) {
          const reply = await client.rpc(name, args);
          if (reply.error !== null || reply.data !== expected) throw new Error();
        }
        const reply = await bucket.info(input.source.storagePath);
        const info = infoSchema.parse(reply.data);
        if (reply.error !== null || info.id !== input.source.objectId || info.version !== input.source.objectVersion ||
            info.name !== input.source.storagePath || info.size !== input.size ||
            !/^text\/plain(?:\s*;\s*charset\s*=\s*(?:utf-8|us-ascii))?$/i.test(info.contentType.trim())) throw new Error();
      } catch { throw new Error(message); }
    };
    await confirm();
    const reply = await bucket.download(input.source.storagePath);
    if (reply.error !== null || !(reply.data instanceof Blob) || reply.data.size !== input.size) throw new Error();
    const copy = reply.data;
    const contentHash = await documentUploadFingerprint(copy);
    if (contentHash !== input.source.contentSha256) throw new Error();
    await confirm();
    return { copy, contentHash, confirm };
  } catch { throw new Error(message); }
}
