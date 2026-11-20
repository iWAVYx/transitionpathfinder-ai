import { z } from "zod";

export const archiveDocumentRequest = z.object({
  id: z.string().uuid(),
  student_id: z.string().uuid(),
  expected_viewer_id: z.string().uuid(),
  expected_updated_at: z.string().datetime({ offset: true }),
  reason: z.string().trim().max(500).optional(),
  restore: z.boolean().optional(),
}).strict();
export const DOCUMENT_ARCHIVE_UNCONFIRMED = "We couldn't confirm this change. Refresh the document list to see its current status before trying again.";
const rowSchema = z.object({ id: z.string().uuid(), student_id: z.string().uuid(), updated_at: z.string().datetime({ offset: true }), archived_at: z.string().datetime({ offset: true }).nullable(), archived_by: z.string().uuid().nullable(), archive_reason: z.string().nullable() });
const columns = "id,student_id,updated_at,archived_at,archived_by,archive_reason";
type Result = { data: unknown; error: unknown };
type Query = { eq(key: string, value: string): Query; is(key: string, value: null): Query; select(columns: string): Query; maybeSingle(): PromiseLike<Result> };
type Client = { from(table: string): { select(columns: string): Query; update(patch: Record<string, unknown>): Query; insert(row: Record<string, unknown>): PromiseLike<{ error: unknown }> } };

/** Caller-scoped RLS only. A returned row confirms the conditional metadata
 * update, not transaction-held authorization or any Storage/provider outcome.
 * Unknown replies are never retried here. */
export async function archiveDocumentMetadata(privateClient: unknown, actorId: string, input: unknown, authorize: (studentId: string) => Promise<void>) {
  try {
    const data = archiveDocumentRequest.parse(input);
    if (data.expected_viewer_id !== actorId) throw new Error();
    const client = privateClient as Client;
    const read = await client.from("documents").select(columns).eq("id", data.id).maybeSingle();
    const row = rowSchema.parse(read.data);
    if (read.error || row.id !== data.id || row.student_id !== data.student_id || row.updated_at !== data.expected_updated_at || (data.restore ? row.archived_at === null : row.archived_at !== null)) throw new Error();
    await authorize(row.student_id);
    const patch = data.restore
      ? { archived_at: null, archived_by: null, archive_reason: null }
      : { archived_at: new Date().toISOString(), archived_by: actorId, archive_reason: data.reason ?? null };
    let update = client.from("documents").update(patch).eq("id", row.id).eq("student_id", row.student_id).eq("updated_at", row.updated_at);
    update = row.archived_at === null ? update.is("archived_at", null) : update.eq("archived_at", row.archived_at);
    const saved = await update.select(columns).maybeSingle();
    const receipt = rowSchema.parse(saved.data);
    if (saved.error || receipt.id !== row.id || receipt.student_id !== row.student_id || receipt.archived_by !== patch.archived_by || receipt.archive_reason !== patch.archive_reason || (patch.archived_at === null ? receipt.archived_at !== null : receipt.archived_at === null || Date.parse(receipt.archived_at) !== Date.parse(patch.archived_at))) throw new Error();
    const audit = await client.from("document_access_log").insert({ document_id: row.id, student_id: row.student_id, actor_id: actorId, action: data.restore ? "restore" : "archive", reason: data.reason ?? null });
    if (audit.error) throw new Error();
    return { ok: true as const };
  } catch { throw new Error(DOCUMENT_ARCHIVE_UNCONFIRMED); }
}
