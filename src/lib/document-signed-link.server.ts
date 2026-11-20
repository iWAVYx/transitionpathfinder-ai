import { z } from "zod";
import { assertDocumentFileReady } from "./document-file-readiness";

export const DOCUMENT_LINK_MESSAGE = "We couldn't open this file. Refresh the document list to check your sign-in, access and the file's current status before trying again.";
export const ADMIN_DOCUMENT_OVERRIDE_RETIRED = "Private files require explicit access to the student. Ask the student's team to review your access.";
const inputSchema = z.object({ id: z.string().uuid(), student_id: z.string().uuid(), expected_viewer_id: z.string().uuid(), expected_updated_at: z.string().datetime({ offset: true }) }).strict();
export function parseDocumentLinkRequest(input: unknown) {
  try { return inputSchema.parse(input); } catch { throw new Error(DOCUMENT_LINK_MESSAGE); }
}
const rowSchema = z.object({ id: z.string().uuid(), student_id: z.string().uuid(), updated_at: z.string().datetime({ offset: true }), storage_path: z.string().min(1).max(2048), scan_status: z.string().nullable(), scan_verdict: z.unknown(), archived_at: z.string().nullable(), deleted_at: z.null() });
const columns = "id,student_id,updated_at,storage_path,scan_status,scan_verdict,archived_at,deleted_at";
type Reply = { data: unknown; error: unknown };
type Query = { eq(key: string, value: string): Query; maybeSingle(): PromiseLike<Reply> };
type Client = { supabaseUrl: string; rpc(name: string, args: Record<string, string>): PromiseLike<Reply>; from(table: string): { select(columns: string): Query; insert(value: Record<string, unknown>): PromiseLike<{ error: unknown }> }; storage: { from(bucket: string): { createSignedUrl(path: string, seconds: number): PromiseLike<Reply> } } };

/** Caller-scoped RLS and loaded intent only; no private existence probe or
 * admin grant. A signed capability may outlive access removal until expiry.
 * Rechecks are not transaction-held permission or immutable-byte proof. */
export async function createCurrentDocumentLink(privateClient: unknown, actorId: string, input: unknown, authorize: (documentId: string) => Promise<void>) {
  try {
    const data = parseDocumentLinkRequest(input);
    if (data.expected_viewer_id !== actorId) throw new Error();
    const client = privateClient as Client;
    async function permit(name: string, args: Record<string, string>, expected = true) {
      const result = await client.rpc(name, args);
      if (result.error !== null || result.data !== expected) throw new Error();
    }
    async function current() {
      const result = await client.from("documents").select(columns).eq("id", data.id).maybeSingle();
      const row = rowSchema.parse(result.data);
      if (result.error !== null || row.id !== data.id || row.student_id !== data.student_id || row.updated_at !== data.expected_updated_at || !row.storage_path.startsWith(`${data.student_id}/`) || row.storage_path.split("/").some(part => !part || part === "." || part === "..")) throw new Error();
      await permit("can_access_student", { _user_id: actorId, _student_id: row.student_id });
      await permit("can_view_document", { _user_id: actorId, _document_id: row.id });
      await permit("is_partner_only", { _user_id: actorId }, false);
      if (row.archived_at !== null) await permit("can_edit_student", { _user_id: actorId, _student_id: row.student_id });
      await authorize(row.id);
      assertDocumentFileReady(row);
      return row;
    }
    let source: z.infer<typeof rowSchema>;
    try { source = await current(); } catch {
      // Caller-scoped, unconfirmed attempt only; never elevate to determine
      // whether a private document exists or call this a proven revocation.
      try { await client.from("audit_log").insert({ actor_id: actorId, action: "document.signed_url.denied", entity_type: "document", entity_id: data.id, metadata: { reason: "unconfirmed_access_or_file_state" } }); } catch { /* refusal still stands */ }
      throw new Error();
    }
    const signed = await client.storage.from("student-documents").createSignedUrl(source.storage_path, 300);
    const receipt = z.object({ signedUrl: z.string().url() }).parse(signed.data);
    const url = new URL(receipt.signedUrl), backend = new URL(client.supabaseUrl);
    if (signed.error !== null || backend.protocol !== "https:" || url.origin !== backend.origin || url.protocol !== "https:" || url.username || url.password || url.hash || !url.searchParams.get("token") || decodeURIComponent(url.pathname) !== `/storage/v1/object/sign/student-documents/${source.storage_path}`) throw new Error();
    // Record only scoped identifiers and expiry, never the URL, token, title,
    // file path, student text or profile email. No retry after uncertain IO.
    const audit = await client.from("audit_log").insert({ actor_id: actorId, action: "document.signed_url.mint", entity_type: "document", entity_id: source.id, student_id: source.student_id, metadata: { ttl_seconds: 300 } });
    if (audit.error !== null) throw new Error();
    const access = await client.from("document_access_log").insert({ document_id: source.id, student_id: source.student_id, actor_id: actorId, action: "download", metadata: { ttl_seconds: 300 } });
    if (access.error !== null) throw new Error();
    const final = await current();
    if (final.storage_path !== source.storage_path || final.archived_at !== source.archived_at || JSON.stringify(final.scan_verdict) !== JSON.stringify(source.scan_verdict)) throw new Error();
    return { url: url.href };
  } catch { throw new Error(DOCUMENT_LINK_MESSAGE); }
}
