import { randomUUID } from "node:crypto";
import { z } from "zod";
import { documentPermissionRow, documentPermissionGrant, documentPermissionRemoval, parseDocumentPermissionRequest, DOCUMENT_PERMISSIONS_UNCONFIRMED } from "./document-permissions-contract";

type Reply = { data: unknown; error: unknown };
type Query = PromiseLike<Reply> & {
  eq(key: string, value: string): Query;
  select(columns: string): Query;
  order(key: string, options: { ascending: boolean }): Query;
  maybeSingle(): PromiseLike<Reply>;
};
type Client = {
  rpc(name: string, args: Record<string, string>): PromiseLike<Reply>;
  from(table: string): {
    select(columns: string): Query;
    insert(row: Record<string, unknown>): Query;
    delete(): Query;
  };
};
const columns = "id,document_id,student_id,user_id,role_type,permission_level,granted_by,notes,created_at,updated_at";
const documentRow = z.object({ id: z.string().uuid(), student_id: z.string().uuid(), updated_at: z.string().datetime({ offset: true }), archived_at: z.null(), deleted_at: z.null() });

/** Caller-RLS operations. Profile lookup is deferred until current editor proof.
 * Separate preflight/write/audit calls do not prove transaction-held removal or
 * role serialization. Unknown writes require reconciliation, never replay. */
export async function documentPermissionAction(
  privateClient: unknown, actorId: string, input: unknown, kind: "list" | "grant" | "remove",
  resolveAccount?: (email: string) => Promise<unknown>,
) {
  try {
    const data = parseDocumentPermissionRequest(input, kind);
    if (data.expected_viewer_id !== actorId) throw new Error();
    const client = privateClient as Client;
    async function capability(name: string, args: Record<string, string>) {
      const reply = await client.rpc(name, args);
      if (reply.error !== null || typeof reply.data !== "boolean") throw new Error();
      return reply.data;
    }
    const doc = await client.from("documents").select("id,student_id,updated_at,archived_at,deleted_at").eq("id", data.document_id).maybeSingle();
    const source = documentRow.parse(doc.data);
    if (doc.error !== null || source.id !== data.document_id || source.student_id !== data.student_id || source.updated_at !== data.expected_document_updated_at) throw new Error();
    if (!await capability("can_access_student", { _user_id: actorId, _student_id: source.student_id }) ||
        !await capability("can_view_document", { _user_id: actorId, _document_id: source.id }) ||
        !await capability("can_edit_student", { _user_id: actorId, _student_id: source.student_id }) ||
        await capability("is_partner_only", { _user_id: actorId })) throw new Error();
    if (kind === "list") {
      const reply = await client.from("document_permissions").select(columns).eq("document_id", source.id).eq("student_id", source.student_id).order("created_at", { ascending: true });
      const rows = z.array(documentPermissionRow).parse(reply.data);
      if (reply.error !== null || new Set(rows.map(row => row.id)).size !== rows.length || rows.some(row => row.document_id !== source.id || row.student_id !== source.student_id)) throw new Error();
      return { permissions: rows };
    }
    let receipt;
    if (kind === "grant") {
      const grant = documentPermissionGrant.parse(input);
      if (!resolveAccount) throw new Error();
      const targetId = z.string().uuid().parse(await resolveAccount(grant.user_email));
      if (await capability("is_partner_only", { _user_id: targetId }) ||
          !await capability("can_access_student", { _user_id: targetId, _student_id: source.student_id })) throw new Error();
      const id = randomUUID();
      // INSERT only: an existing/competing grant is not silently replaced. The
      // canonical partial unique indexes reject duplicates without ON CONFLICT.
      const saved = await client.from("document_permissions").insert({ id, document_id: source.id, student_id: source.student_id, user_id: targetId, role_type: null, permission_level: "view_document", granted_by: actorId, notes: null }).select(columns).maybeSingle();
      receipt = documentPermissionRow.parse(saved.data);
      if (saved.error !== null || receipt.id !== id || receipt.document_id !== source.id || receipt.student_id !== source.student_id || receipt.user_id !== targetId || receipt.role_type !== null || receipt.permission_level !== "view_document" || receipt.granted_by !== actorId || receipt.notes !== null) throw new Error();
    } else if (kind === "remove") {
      const removal = documentPermissionRemoval.parse(input);
      const current = await client.from("document_permissions").select(columns).eq("id", removal.id).eq("document_id", source.id).eq("student_id", source.student_id).eq("updated_at", removal.expected_permission_updated_at).maybeSingle();
      const row = documentPermissionRow.parse(current.data);
      if (current.error !== null || row.id !== removal.id || row.document_id !== source.id || row.student_id !== source.student_id || row.updated_at !== removal.expected_permission_updated_at) throw new Error();
      const removed = await client.from("document_permissions").delete().eq("id", row.id).eq("document_id", source.id).eq("student_id", source.student_id).eq("updated_at", row.updated_at).select(columns).maybeSingle();
      receipt = documentPermissionRow.parse(removed.data);
      if (removed.error !== null || JSON.stringify(receipt) !== JSON.stringify(row)) throw new Error();
    } else throw new Error();
    const audit = await client.from("audit_log").insert({ actor_id: actorId, action: kind === "grant" ? "document.permission.grant" : "document.permission.revoke", entity_type: "document", entity_id: source.id, student_id: source.student_id, metadata: { permission_id: receipt.id, permission_level: receipt.permission_level, target_user_id: receipt.user_id, target_role: receipt.role_type } });
    if (audit.error !== null) throw new Error();
    return { permission: receipt };
  } catch { throw new Error(DOCUMENT_PERMISSIONS_UNCONFIRMED); }
}
