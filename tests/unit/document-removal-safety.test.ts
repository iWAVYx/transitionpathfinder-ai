import { afterEach, beforeEach, expect, it, vi } from "vitest";
const api = vi.hoisted(() => ({ context: null as any, preflight: vi.fn(), admit: vi.fn(), serviceRpc: vi.fn(), source: vi.fn(), confirmSource: vi.fn(), gate: vi.fn(), authorize: vi.fn(), rpc: vi.fn(), read: vi.fn(), from: vi.fn(), update: vi.fn(), write: vi.fn(), match: vi.fn(), notDeleted: vi.fn(), scan: vi.fn(), pipeline: vi.fn(), remove: vi.fn(), adminDelete: vi.fn(), audit: vi.fn(), enqueue: vi.fn(), fetch: vi.fn(), sign: vi.fn() }));
vi.mock("@tanstack/react-start", () => ({ createServerFn: () => {
  let validate = (input: unknown) => input;
  const builder = { middleware: () => builder, validator: (fn: typeof validate) => { validate = fn; return builder; },
    handler: (fn: (input: any) => unknown) => async ({ data }: any) => fn({ data: validate(data), context: api.context }) };
  return builder;
} }));
vi.mock("@/integrations/supabase/auth-middleware", () => ({ requireSupabaseAuth: {} }));
vi.mock("../../src/lib/authz", () => ({ assertAuthorized: api.authorize }));
vi.mock("../../src/lib/document-pipeline.server", () => ({ recordPipelineRun: api.pipeline, newCorrelationId: () => "fictional-removal-correlation" }));
vi.mock("../../src/lib/document-av-scan.server", () => ({ scanUploadedDocument: api.scan, MALWARE_SCAN_PROVIDER: "cloudmersive" }));
vi.mock("@/integrations/supabase/client.server", () => ({ supabaseAdmin: { rpc: api.serviceRpc, storage: { from: () => ({ remove: api.remove }) }, from: api.from } }));
vi.mock("../../src/lib/protected-file-uploads", () => ({ assertProtectedFileUploadsEnabled: api.gate }));
vi.mock("../../src/lib/document-rescan-source.server", () => ({ authorizeDocumentRescanSource: api.preflight }));
vi.mock("../../src/lib/document-operation-admission.server", () => ({ runAdmittedDocumentOperation: api.admit }));
import { getDocumentSignedUrl, requestAdminDocAccess, hardDeleteDocument, rescanDocument } from "../../src/lib/documents.functions";
const student = "11111111-1111-4111-8111-111111111111";
const id = "22222222-2222-4222-8222-222222222222";
const path = `${student}/fictional-privacy-safe-document.txt`;
const row = { id, student_id: student, storage_path: path, title: "Fictional reviewed text", doc_type: "other", mime_type: "text/plain", size_bytes: 20,
  storage_object_id: "44444444-4444-4444-8444-444444444444", storage_object_version: "fictional-v1",
  content_hash: "a".repeat(64), uploaded_by: "33333333-3333-4333-8333-333333333333",
  upload_attempt_id: "55555555-5555-4555-8555-555555555555", upload_review_context_sha256: "c".repeat(64), scan_status: "failed", scan_verdict: null, review_status: "rejected", archived_at: "2026-10-28", deleted_at: null, updated_at: "2026-10-30T10:00:00.000Z" };
const runRescan = (patch: object = {}) => (rescanDocument as any)({ data: { id, expected_viewer_id: "33333333-3333-4333-8333-333333333333", ...patch } });
const runDelete = () => (hardDeleteDocument as any)({ data: { id, reason: "Fictional deletion request" } });
beforeEach(() => {
  vi.resetAllMocks(); api.preflight.mockResolvedValue({ prepareCopy: api.source }); api.admit.mockImplementation((_input, work) => work()); api.source.mockResolvedValue({ copy: new Blob(["Fictional reviewed text"]), contentHash: "a".repeat(64), confirmPending: api.confirmSource }); vi.stubGlobal("fetch", api.fetch);
  api.fetch.mockRejectedValue(new Error("Unexpected network request"));
  api.rpc.mockResolvedValue({ data: false, error: null });
  api.read.mockResolvedValue({ data: row, error: null });
  const query: any = { select: () => query, eq: () => query, maybeSingle: api.read };
  api.context = { userId: "33333333-3333-4333-8333-333333333333", supabase: { storage: { from: () => ({ createSignedUrl: api.sign }) }, rpc: api.rpc, from: (table: string) => ["documents", "students", "student_collaborators", "user_roles"].includes(table) ? query : { insert: table === "ai_jobs" ? api.enqueue : api.audit } } };
  const writeQuery: any = { eq: api.match, is: api.notDeleted, select: () => writeQuery, single: api.write };
  api.match.mockReturnValue(writeQuery); api.notDeleted.mockReturnValue(writeQuery);
  api.update.mockReturnValue(writeQuery);
  api.from.mockReturnValue({ update: api.update, delete: api.adminDelete });
  api.write.mockImplementation(async () => ({ data: { ...row, ...api.update.mock.calls.at(-1)?.[0], updated_at: api.update.mock.calls.at(-1)?.[0].scan_status === "pending" ? "2026-10-30T10:01:00.000Z" : "2026-10-30T10:02:00.000Z" }, error: null }));
  api.scan.mockResolvedValue({ ok: false, code: "infected", provider: "cloudmersive", clean_result: false, blocked_reasons: [], threats: ["Fictional threat"], scan_id: "fictional-scan" });
  api.audit.mockResolvedValue({ error: null });
  api.enqueue.mockReturnValue({ select: () => ({ single: async () => ({ data: {
    id, student_id: student, triggered_by_user_id: api.context.userId,
    job_type: "document_summary", status: "queued", input_source: { document_id: id, storage_path: path, title: row.title, doc_type: row.doc_type },
  }, error: null }) }) });
});
afterEach(() => { expect(api.fetch).not.toHaveBeenCalled(); vi.unstubAllGlobals(); });

it.each(["student", "family", "educator", "school", "district", "partner", "owner"])("permanent removal performs no privileged read or destructive IO for %s", async role => {
  // Role membership alone is not a new deletion grant; even a confirmed platform
  // admin gets the paused-operation outcome, without accessing the private row.
  api.rpc.mockResolvedValue({ data: role === "owner", error: null });
  await expect(runDelete()).rejects.toThrow(role === "owner" ? "Permanent removal is temporarily unavailable" : "Only platform admins");
  expect(api.read).not.toHaveBeenCalled(); expect(api.from).not.toHaveBeenCalled();
  expect(api.remove).not.toHaveBeenCalled(); expect(api.adminDelete).not.toHaveBeenCalled();
  expect(api.audit).not.toHaveBeenCalled(); expect(api.scan).not.toHaveBeenCalled();
});
it.each(["error", "rejection", "truthy"])("uncertain admin permission cannot authorize removal (%s)", async mode => {
  if (mode === "error") api.rpc.mockResolvedValue({ data: true, error: { message: "PRIVATE role detail" } });
  if (mode === "rejection") api.rpc.mockRejectedValue(new Error("PRIVATE role detail"));
  if (mode === "truthy") api.rpc.mockResolvedValue({ data: "true", error: null });
  await expect(runDelete()).rejects.toThrow("Only platform admins");
  expect(api.from).not.toHaveBeenCalled(); expect(api.remove).not.toHaveBeenCalled(); expect(api.audit).not.toHaveBeenCalled();
});
it("infection on rescan confirms quarantine without claiming or attempting removal", async () => {
  expect(await runRescan()).toMatchObject({ ok: false, code: "infected" });
  expect(api.scan).toHaveBeenCalledOnce(); expect(api.remove).not.toHaveBeenCalled(); expect(api.adminDelete).not.toHaveBeenCalled(); expect(api.enqueue).not.toHaveBeenCalled();
  const patch = api.update.mock.calls.at(-1)![0];
  expect(patch).toMatchObject({ scan_status: "infected", review_status: "rejected" });
  expect(patch).not.toHaveProperty("deleted_at"); expect(patch).not.toHaveProperty("deleted_by");
  const entries = api.audit.mock.calls.flatMap(([entry]) => Array.isArray(entry) ? entry : [entry]);
  expect(entries).toEqual(expect.arrayContaining([expect.objectContaining({ action: "document.scan.quarantined", metadata: expect.objectContaining({ removal_status: "not_attempted" }) })]));
  expect(entries.some(entry => entry.action === "document.scan.deleted" || entry.metadata?.storage_path_removed === true)).toBe(false);
});
it.each(["infected", "deleted", "failed-with-infected-verdict", "clean-with-infected-verdict"])("previously blocked files cannot be rescanned or released (%s)", async state => {
  api.read.mockResolvedValue({ data: { ...row, scan_status: state.endsWith("-with-infected-verdict") ? state.split("-")[0] : state, scan_verdict: state.endsWith("-with-infected-verdict") ? { code: "infected" } : null }, error: null });
  await expect(runRescan()).rejects.toThrow("blocked for your safety");
  expect(api.update).not.toHaveBeenCalled(); expect(api.scan).not.toHaveBeenCalled(); expect(api.remove).not.toHaveBeenCalled(); expect(api.enqueue).not.toHaveBeenCalled();
});
it.each(["error", "rejection", "missing", "wrong-id", "wrong-student", "wrong-path", "unchanged"])("rescan stops on an unconfirmed quarantine receipt (%s)", async mode => {
  const normalWrite = api.write.getMockImplementation()!;
  api.write.mockImplementation(async () => {
    if (api.update.mock.calls.at(-1)?.[0].scan_status === "pending") return normalWrite();
    if (mode === "rejection") throw new Error("PRIVATE storage detail");
    const quarantined = (await normalWrite()).data;
    const data = mode === "missing" ? null : mode === "wrong-id" ? { ...quarantined, id: student }
      : mode === "wrong-student" ? { ...quarantined, student_id: id }
      : mode === "wrong-path" ? { ...quarantined, storage_path: "another-private-path" }
      : mode === "unchanged" ? row : quarantined;
    return { data, error: mode === "error" ? { message: "PRIVATE storage detail" } : null };
  });
  await expect(runRescan()).rejects.toThrow("couldn't confirm the document's security review");
  expect(api.write).toHaveBeenCalledTimes(2); expect(api.remove).not.toHaveBeenCalled(); expect(api.enqueue).not.toHaveBeenCalled(); expect(api.audit).not.toHaveBeenCalled();
});
it("denied student access stops before scan, quarantine writes or storage operations", async () => {
  api.authorize.mockRejectedValue(new Error("Access denied"));
  await expect(runRescan()).rejects.toThrow("Access denied");
  expect(api.scan).not.toHaveBeenCalled(); expect(api.update).not.toHaveBeenCalled(); expect(api.remove).not.toHaveBeenCalled();
});

it.each(["infected", "deleted", "pending", "failed", null, "unknown"])("cannot mint an application file link while scan status is %s", async status => {
  api.read.mockResolvedValue({ data: { ...row, scan_status: status }, error: null });
  await expect((getDocumentSignedUrl as any)({ data: { id } })).rejects.toThrow("security review is incomplete or blocked");
  expect(api.sign).not.toHaveBeenCalled(); expect(api.remove).not.toHaveBeenCalled();
});
it("an infected verdict cannot mint a link even if a stale scan status says clean", async () => {
  api.read.mockResolvedValue({ data: { ...row, scan_status: "clean", scan_verdict: { code: "infected" } }, error: null });
  await expect((getDocumentSignedUrl as any)({ data: { id } })).rejects.toThrow("security review is incomplete or blocked");
  expect(api.sign).not.toHaveBeenCalled();
});

it("clean authorized files still receive a normal short-lived application link", async () => {
  api.read.mockResolvedValue({ data: { ...row, scan_status: "clean" }, error: null });
  api.sign.mockResolvedValue({ data: { signedUrl: "https://fictional.invalid/file" }, error: null });
  expect(await (getDocumentSignedUrl as any)({ data: { id } })).toEqual({ url: "https://fictional.invalid/file" });
  expect(api.authorize).toHaveBeenCalled(); expect(api.sign).toHaveBeenCalledExactlyOnceWith(path, 300);
});
it("a metadata override cannot mint an infected-file link", async () => {
  api.rpc.mockResolvedValue({ data: true, error: null });
  api.read.mockResolvedValue({ data: { ...row, scan_status: "infected", scan_verdict: { code: "infected" } }, error: null });
  await expect((requestAdminDocAccess as any)({ data: { document_id: id, reason: "Fictional support request" } })).rejects.toThrow("security review is incomplete or blocked");
  expect(api.sign).not.toHaveBeenCalled(); expect(api.remove).not.toHaveBeenCalled();
});

const cleanScan = { ok: true, code: "clean", provider: "cloudmersive", clean_result: true, blocked_reasons: [], threats: [], scan_id: "fictional-clean" };
it.each(["pending", "unknown", "missing-revision", "soft-deleted"])("does not start a rescan for an unavailable source (%s)", async mode => {
  api.read.mockResolvedValue({ data: { ...row,
    scan_status: ["pending", "unknown"].includes(mode) ? mode : "failed",
    updated_at: mode === "missing-revision" ? null : row.updated_at,
    deleted_at: mode === "soft-deleted" ? "2026-10-30" : null,
  }, error: null });
  await expect(runRescan()).rejects.toThrow();
  expect(api.update).not.toHaveBeenCalled(); expect(api.scan).not.toHaveBeenCalled();
});
it.each(["error", "lost", "missing", "foreign", "unchanged", "deleted", "revision"])("does not submit bytes after an unconfirmed pending transition (%s)", async mode => {
  if (mode === "lost") api.write.mockRejectedValue(new Error("PRIVATE lost write"));
  else api.write.mockResolvedValue({ data: mode === "missing" ? null : { ...row,
    id: mode === "foreign" ? student : id,
    scan_status: mode === "unchanged" ? "failed" : "pending",
    deleted_at: mode === "deleted" ? "2026-10-30" : null,
    updated_at: mode === "revision" ? null : row.updated_at,
  }, error: mode === "error" ? { message: "PRIVATE database detail" } : null });
  await expect(runRescan()).rejects.toThrow("couldn't confirm the document's security review");
  expect(api.write).toHaveBeenCalledOnce(); expect(api.scan).not.toHaveBeenCalled();
  expect(api.pipeline).not.toHaveBeenCalled(); expect(api.enqueue).not.toHaveBeenCalled();
});
it.each(["error", "lost", "missing", "foreign", "student", "path", "blocked", "review"])("does not queue a summary after an unconfirmed clean transition (%s)", async mode => {
  api.scan.mockResolvedValue(cleanScan);
  const normalWrite = api.write.getMockImplementation()!;
  api.write.mockImplementation(async () => {
    if (api.update.mock.calls.at(-1)?.[0].scan_status === "pending") return normalWrite();
    if (mode === "lost") throw new Error("PRIVATE lost write");
    return { data: mode === "missing" ? null : { ...(await normalWrite()).data,
      ...(mode === "foreign" ? { id: student } : mode === "student" ? { student_id: id } : mode === "path" ? { storage_path: "another-private-path" }
        : mode === "blocked" ? { deleted_at: "2026-10-30" } : mode === "review" ? { review_status: "rejected" } : {}),
    }, error: mode === "error" ? { message: "PRIVATE database detail" } : null };
  });
  await expect(runRescan()).rejects.toThrow("couldn't confirm the document's security review");
  expect(api.scan).toHaveBeenCalledOnce(); expect(api.write).toHaveBeenCalledTimes(2);
  expect(api.enqueue).not.toHaveBeenCalled(); expect(api.audit).not.toHaveBeenCalled();
});
it.each(["error", "lost", "missing", "id", "student", "actor", "kind", "status", "document", "path", "title", "type"])("does not report success or repeat an uncertain summary insert (%s)", async mode => {
  api.scan.mockResolvedValue(cleanScan);
  api.enqueue.mockReturnValue({ select: () => ({ single: async () => {
    if (mode === "lost") throw new Error("PRIVATE queue detail");
    return { data: mode === "missing" ? null : {
      id: mode === "id" ? "invalid" : id,
      student_id: mode === "student" ? id : student,
      triggered_by_user_id: mode === "actor" ? "other-account" : api.context.userId,
      job_type: mode === "kind" ? "another-job" : "document_summary",
      status: mode === "status" ? "failed" : "queued",
      input_source: { document_id: mode === "document" ? student : id, storage_path: mode === "path" ? "another-private-path" : path, title: mode === "title" ? "other" : row.title, doc_type: mode === "type" ? "other-type" : row.doc_type },
    }, error: mode === "error" ? { message: "PRIVATE queue detail" } : null };
  } }) });
  await expect(runRescan()).rejects.toThrow("couldn't confirm that the summary was queued");
  expect(api.scan).toHaveBeenCalledOnce(); expect(api.enqueue).toHaveBeenCalledOnce();
  expect(JSON.stringify(api.pipeline.mock.calls)).not.toContain("PRIVATE");
});
it("confirms each revision before clean success and matches the exact summary job", async () => {
  api.scan.mockResolvedValue(cleanScan);
  expect(await runRescan()).toEqual({ ok: true, code: "clean" });
  expect(api.match.mock.calls).toEqual(expect.arrayContaining([
    ["id", id], ["student_id", student], ["storage_path", path], ["scan_status", "failed"], ["scan_status", "pending"], ["updated_at", row.updated_at],
  ]));
  expect(api.notDeleted).toHaveBeenCalledWith("deleted_at", null);
  expect(api.scan).toHaveBeenCalledOnce(); expect(api.enqueue).toHaveBeenCalledOnce();
});

it("only one simultaneous request can claim the failed revision", async () => {
  let stored = { ...row };
  const writes: Record<string, unknown>[] = [];
  api.from.mockImplementation(() => ({ update: (patch: Record<string, unknown>) => {
    const filters: [string, unknown][] = [];
    const query: any = {
      eq: (key: string, value: unknown) => { filters.push([key, value]); return query; },
      is: (key: string, value: unknown) => { filters.push([key, value]); return query; },
      select: () => query,
      single: async () => {
        if (!filters.every(([key, value]) => (stored as any)[key] === value)) return { data: null, error: null };
        writes.push(patch);
        stored = { ...stored, ...patch, updated_at: `2026-10-30T10:0${writes.length}:00.000Z` };
        return { data: { ...stored }, error: null };
      },
    };
    return query;
  } }));
  api.scan.mockResolvedValue(cleanScan);
  const results = await Promise.allSettled([runRescan(), runRescan()]);
  expect(results.filter(result => result.status === "fulfilled")).toHaveLength(1);
  expect(results.filter(result => result.status === "rejected")).toHaveLength(1);
  expect(api.scan).toHaveBeenCalledOnce(); expect(api.enqueue).toHaveBeenCalledOnce();
  expect(writes.map(patch => patch.scan_status)).toEqual(["pending", "clean"]);
});
it("does not release, delete or queue after a thrown scanner request", async () => {
  api.scan.mockRejectedValue(new Error("Fictional scanner failure"));
  await expect(runRescan()).rejects.toThrow();
  expect(api.write).toHaveBeenCalledOnce(); expect(api.update.mock.calls[0][0]).toEqual({ scan_status: "pending" });
  expect(api.enqueue).not.toHaveBeenCalled(); expect(api.remove).not.toHaveBeenCalled();
});

it.each([undefined, "invalid", "11111111-1111-4111-8111-111111111111"])("stale or missing viewer cannot start a rescan (%s)", async viewer => {
  await expect(runRescan({ expected_viewer_id: viewer })).rejects.toThrow();
  expect(api.read).not.toHaveBeenCalled(); expect(api.source).not.toHaveBeenCalled(); expect(api.update).not.toHaveBeenCalled();
});
it("does not load the privileged writer if caller source checks fail", async () => {
  api.source.mockRejectedValue(new Error("Unconfirmed source"));
  await expect(runRescan()).rejects.toThrow("Unconfirmed source");
  expect(api.from).not.toHaveBeenCalled(); expect(api.scan).not.toHaveBeenCalled();
});
it.each(["before", "after"])("source drift %s scanning cannot publish a clean result", async stage => {
  api.scan.mockResolvedValue(cleanScan);
  if (stage === "before") api.confirmSource.mockRejectedValueOnce(new Error("Source changed"));
  else api.confirmSource.mockResolvedValueOnce(undefined).mockRejectedValueOnce(new Error("Source changed"));
  await expect(runRescan()).rejects.toThrow("Source changed");
  expect(api.write).toHaveBeenCalledOnce(); expect(api.scan).toHaveBeenCalledTimes(stage === "before" ? 0 : 1); expect(api.enqueue).not.toHaveBeenCalled();
});
it("passes only the same reviewed Blob to the scanner and preserves its hash", async () => {
  api.scan.mockResolvedValue(cleanScan); const copy = new Blob(["Fictional same copy"]);
  api.read.mockResolvedValue({ data: { ...row, content_hash: "b".repeat(64) }, error: null });
  const normalWrite = api.write.getMockImplementation()!;
  api.write.mockImplementation(async () => { const result = await normalWrite(); return { ...result, data: { ...result.data, content_hash: "b".repeat(64) } }; });
  api.source.mockResolvedValue({ copy, contentHash: "b".repeat(64), confirmPending: api.confirmSource });
  await runRescan();
  expect(api.scan.mock.calls[0][1]).toBe(copy);
  expect(api.update.mock.calls.at(-1)?.[0].scan_verdict).toMatchObject({ content_sha256: "b".repeat(64), source: "registration_reviewed_copy", rescan_reviewed_copy: true });
});

async function useRealRescanAdmission() {
  const actual = await vi.importActual<typeof import("../../src/lib/document-operation-admission.server")>("../../src/lib/document-operation-admission.server");
  api.admit.mockImplementation(actual.runAdmittedDocumentOperation);
  api.serviceRpc.mockImplementation(async (name: string, args: Record<string, unknown>) => ({ data: name === "begin_document_operation"
    ? { schema: "document-operation-admitted-v1", operation_id: args._operation_id, receipt_id: student, revision: 2 }
    : { schema: "document-operation-finished-v1", operation_id: args._operation_id, state: args._outcome }, error: null }));
}
it("admits before file-copy preparation and counts a confirmed clean/queued outcome once", async () => {
  await useRealRescanAdmission(); api.scan.mockResolvedValue(cleanScan);
  await expect(runRescan()).resolves.toEqual({ ok: true, code: "clean" });
  expect(api.admit.mock.calls[0][0]).toMatchObject({ actorId: api.context.userId, kind: "rescan" });
  expect(api.preflight.mock.invocationCallOrder[0]).toBeLessThan(api.serviceRpc.mock.invocationCallOrder[0]);
  expect(api.serviceRpc.mock.invocationCallOrder[0]).toBeLessThan(api.source.mock.invocationCallOrder[0]);
  expect(api.source.mock.invocationCallOrder[0]).toBeLessThan(api.write.mock.invocationCallOrder[0]);
  expect(api.enqueue.mock.invocationCallOrder[0]).toBeLessThan(api.serviceRpc.mock.invocationCallOrder[1]);
  expect(api.serviceRpc.mock.calls.map(([name, args]) => [name, args._outcome])).toEqual([["begin_document_operation", undefined], ["finish_document_operation", "completed"]]);
});
it.each(["paused", "missing-rpc", "lost", "malformed", "foreign"])("does no file work after unconfirmed rescan admission (%s)", async mode => {
  await useRealRescanAdmission();
  if (mode === "lost") api.serviceRpc.mockRejectedValue(new Error("PRIVATE control detail"));
  else api.serviceRpc.mockImplementation(async (_name, args) => ({ data: ["malformed", "foreign"].includes(mode)
    ? { schema: "document-operation-admitted-v1", operation_id: mode === "foreign" ? student : args._operation_id, receipt_id: mode === "malformed" ? "invalid" : student, revision: 2 } : null,
    error: ["paused", "missing-rpc"].includes(mode) ? { code: "55000", message: "PRIVATE control detail" } : null }));
  await expect(runRescan()).rejects.toMatchObject({ phase: "admission", reconciliationRequired: true, message: expect.not.stringContaining("PRIVATE") });
  expect(api.serviceRpc).toHaveBeenCalledOnce(); expect(api.source).not.toHaveBeenCalled(); expect(api.write).not.toHaveBeenCalled(); expect(api.scan).not.toHaveBeenCalled(); expect(api.enqueue).not.toHaveBeenCalled();
});
it("does not admit an unauthorized caller or unavailable source", async () => {
  await useRealRescanAdmission(); api.preflight.mockRejectedValue(new Error("Source unavailable"));
  await expect(runRescan()).rejects.toThrow("Source unavailable"); expect(api.serviceRpc).not.toHaveBeenCalled(); expect(api.source).not.toHaveBeenCalled();
});
it.each(["failed", "timeout", "indeterminate"])("retains %s provider uncertainty with the document still pending", async code => {
  await useRealRescanAdmission(); api.scan.mockResolvedValue({ ok: false, code, provider: "cloudmersive", clean_result: null, blocked_reasons: [], threats: [], scan_id: null, error_message: "PRIVATE provider detail" });
  await expect(runRescan()).rejects.toMatchObject({ phase: "work", reconciliationRequired: true, message: expect.not.stringContaining("PRIVATE") });
  expect(api.write).toHaveBeenCalledOnce(); expect(api.update.mock.calls[0][0]).toEqual({ scan_status: "pending" });
  expect(api.enqueue).not.toHaveBeenCalled(); expect(api.remove).not.toHaveBeenCalled(); expect(api.scan).toHaveBeenCalledOnce();
  expect(api.serviceRpc.mock.calls[1][1]._outcome).toBe("needs_review");
});
it("settles confirmed infection only after a confirmed quarantine and never deletes bytes", async () => {
  await useRealRescanAdmission(); await expect(runRescan()).resolves.toMatchObject({ ok: false, code: "infected" });
  expect(api.write).toHaveBeenCalledTimes(2); expect(api.enqueue).not.toHaveBeenCalled(); expect(api.remove).not.toHaveBeenCalled();
  expect(api.write.mock.invocationCallOrder[1]).toBeLessThan(api.serviceRpc.mock.invocationCallOrder[1]); expect(api.serviceRpc.mock.calls[1][1]._outcome).toBe("completed");
});
it.each(["copy", "pending-write", "scanner", "source-recheck", "queue"])("holds admitted rescan work after %s uncertainty", async stage => {
  await useRealRescanAdmission(); api.scan.mockResolvedValue(cleanScan);
  if (stage === "copy") api.source.mockRejectedValue(new Error("PRIVATE copy"));
  if (stage === "pending-write") api.write.mockRejectedValue(new Error("PRIVATE write"));
  if (stage === "scanner") api.scan.mockRejectedValue(new Error("PRIVATE scanner"));
  if (stage === "source-recheck") api.confirmSource.mockResolvedValueOnce(undefined).mockRejectedValueOnce(new Error("PRIVATE source"));
  if (stage === "queue") api.enqueue.mockImplementation(() => { throw new Error("PRIVATE queue"); });
  await expect(runRescan()).rejects.toMatchObject({ phase: "work", message: expect.not.stringContaining("PRIVATE") });
  expect(api.serviceRpc.mock.calls[1][1]._outcome).toBe("needs_review"); expect(api.serviceRpc).toHaveBeenCalledTimes(2); expect(api.scan.mock.calls.length).toBeLessThanOrEqual(1); expect(api.remove).not.toHaveBeenCalled();
});
it.each(["lost", "error", "malformed"])("does not report success or requeue after uncertain rescan finish (%s)", async mode => {
  await useRealRescanAdmission(); api.scan.mockResolvedValue(cleanScan); const normal = api.serviceRpc.getMockImplementation()!;
  api.serviceRpc.mockImplementation(async (name, args) => {
    if (name === "begin_document_operation") return normal(name, args);
    if (mode === "lost") throw new Error("PRIVATE finish detail");
    return { data: mode === "malformed" ? {} : { schema: "document-operation-finished-v1", operation_id: args._operation_id, state: "completed" }, error: mode === "error" ? { message: "PRIVATE finish detail" } : null };
  });
  await expect(runRescan()).rejects.toMatchObject({ phase: "completion", reconciliationRequired: true });
  expect(api.serviceRpc).toHaveBeenCalledTimes(2); expect(api.enqueue).toHaveBeenCalledOnce(); expect(api.scan).toHaveBeenCalledOnce();
});


it.each([
  ["clean code with infection", { ...cleanScan, code: "infected" }],
  ["clean with false result", { ...cleanScan, clean_result: false }],
  ["clean with threat", { ...cleanScan, threats: ["Fictional threat"] }],
  ["clean with policy block", { ...cleanScan, blocked_reasons: ["ContainsScript"] }],
  ["clean with wrong provider", { ...cleanScan, provider: "unreviewed" }],
  ["clean with missing scan ID", { ...cleanScan, scan_id: null }],
  ["clean with blank scan ID", { ...cleanScan, scan_id: " " }],
  ["infection without threats", { ...cleanScan, ok: false, code: "infected", clean_result: false }],
  ["infection with blank threat", { ...cleanScan, ok: false, code: "infected", clean_result: false, threats: [" "] }],
  ["infection with true result", { ...cleanScan, ok: false, code: "infected", threats: ["Fictional threat"] }],
  ["infection with foreign provider", { ...cleanScan, ok: false, code: "infected", clean_result: false, threats: ["Fictional threat"], provider: "unreviewed" }],
  ["missing reply", null],
])("holds malformed or contradictory %s before any terminal write", async (_label, result) => {
  await useRealRescanAdmission(); api.scan.mockResolvedValue(result);
  await expect(runRescan()).rejects.toMatchObject({ phase: "work", reconciliationRequired: true });
  expect(api.write).toHaveBeenCalledOnce(); expect(api.enqueue).not.toHaveBeenCalled(); expect(api.audit).not.toHaveBeenCalled();
  expect(api.serviceRpc.mock.calls[1][1]._outcome).toBe("needs_review");
});

for (const status of ["clean", "infected"]) {
  it.each([
    ["object ID", { storage_object_id: student }], ["object version", { storage_object_version: "other-v2" }],
    ["hash", { content_hash: "f".repeat(64) }], ["size", { size_bytes: 21 }], ["MIME", { mime_type: "application/pdf" }],
    ["uploader", { uploaded_by: student }], ["attempt", { upload_attempt_id: student }],
    ["review fingerprint", { upload_review_context_sha256: "f".repeat(64) }], ["title", { title: "Other document" }],
    ["document type", { doc_type: "other-type" }], ["scan ID", { scan_data_id: "other-scan" }],
    ["scan time", { scanned_at: "2026-10-30T10:00:00Z" }], ["unchanged revision", { updated_at: "2026-10-30T10:01:00+00:00" }],
    ["old revision", { updated_at: row.updated_at }], ["malformed revision", { updated_at: "invalid" }],
    ["missing verdict", { scan_verdict: null }],
  ])(`does not complete ${status} after a mismatched %s receipt`, async (_label, patch) => {
    await useRealRescanAdmission(); if (status === "clean") api.scan.mockResolvedValue(cleanScan);
    const normal = api.write.getMockImplementation()!;
    api.write.mockImplementation(async () => { const reply = await normal(); return api.update.mock.calls.at(-1)?.[0].scan_status === "pending" ? reply : { ...reply, data: { ...reply.data, ...patch } }; });
    await expect(runRescan()).rejects.toMatchObject({ phase: "work", reconciliationRequired: true });
    expect(api.write).toHaveBeenCalledTimes(2); expect(api.enqueue).not.toHaveBeenCalled(); expect(api.audit).not.toHaveBeenCalled();
    expect(api.serviceRpc.mock.calls[1][1]._outcome).toBe("needs_review"); expect(api.scan).toHaveBeenCalledOnce();
  });
  it.each([
    ["wrong provider", { provider: "unreviewed" }], ["wrong hash", { content_sha256: "f".repeat(64) }],
    ["missing source", { source: undefined }], ["missing rescan mark", { rescan_reviewed_copy: undefined }],
    ["wrong code", { code: "failed" }], ["missing clean result", { clean_result: null }],
    ["different threats", { threats: ["Altered threat"] }], ["different blocks", { blocked_reasons: ["Altered block"] }],
  ])(`does not complete ${status} with %s in the persisted verdict`, async (_label, patch) => {
    if (status === "clean") api.scan.mockResolvedValue(cleanScan); const normal = api.write.getMockImplementation()!;
    api.write.mockImplementation(async () => { const reply = await normal(); return api.update.mock.calls.at(-1)?.[0].scan_status === "pending" ? reply : { ...reply, data: { ...reply.data, scan_verdict: { ...reply.data.scan_verdict, ...patch } } }; });
    await expect(runRescan()).rejects.toThrow("couldn't confirm"); expect(api.enqueue).not.toHaveBeenCalled(); expect(api.audit).not.toHaveBeenCalled();
  });
  it(`accepts equivalent timestamp offsets and microsecond revision movement for ${status}`, async () => {
    if (status === "clean") api.scan.mockResolvedValue(cleanScan); const normal = api.write.getMockImplementation()!;
    api.write.mockImplementation(async () => { const reply = await normal(); const pending = api.update.mock.calls.at(-1)?.[0].scan_status === "pending";
      return { ...reply, data: { ...reply.data, updated_at: pending ? "2026-10-30T10:00:00.000001Z" : "2026-10-30T11:00:00.000002+01:00",
        ...(!pending ? { scanned_at: reply.data.scanned_at.replace("Z", "+00:00"), ...(status === "infected" ? { archived_at: reply.data.archived_at.replace("Z", "+00:00") } : {}) } : {}) } };
    });
    await expect(runRescan()).resolves.toMatchObject({ ok: status === "clean", code: status });
    const patch = api.update.mock.calls.at(-1)![0]; expect(patch.scan_verdict).toMatchObject({ content_sha256: row.content_hash, source: "registration_reviewed_copy", rescan_reviewed_copy: true });
    expect(api.match.mock.calls).toEqual(expect.arrayContaining([["content_hash", row.content_hash], ["storage_object_id", row.storage_object_id], ["storage_object_version", row.storage_object_version]]));
  });
}
it.each(["same", "old", "invalid", "overprecision"])("does not dispatch after a %s pending revision", async mode => {
  const normal = api.write.getMockImplementation()!;
  api.write.mockImplementation(async () => { const reply = await normal(); return { ...reply, data: { ...reply.data,
    updated_at: mode === "same" ? "2026-10-30T10:00:00+00:00" : mode === "old" ? "2026-10-29T10:00:00Z" : mode === "overprecision" ? "2026-10-30T10:01:00.0000001Z" : "invalid" } }; });
  await expect(runRescan()).rejects.toThrow("couldn't confirm"); expect(api.scan).not.toHaveBeenCalled(); expect(api.enqueue).not.toHaveBeenCalled();
});
it.each(["archive", "rejected", "actor"])("does not complete a loosely blocked row missing confirmed quarantine %s", async mode => {
  const normal = api.write.getMockImplementation()!;
  api.write.mockImplementation(async () => { const reply = await normal(); return api.update.mock.calls.at(-1)?.[0].scan_status === "pending" ? reply : { ...reply, data: { ...reply.data, ...(mode === "archive" ? { archived_at: null } : mode === "rejected" ? { review_status: "pending_review" } : { archived_by: student }) } }; });
  await expect(runRescan()).rejects.toThrow("couldn't confirm"); expect(api.audit).not.toHaveBeenCalled(); expect(api.enqueue).not.toHaveBeenCalled();
});


it.each([
  ["missing object", { storage_object_id: undefined }], ["missing version", { storage_object_version: undefined }],
  ["missing attempt", { upload_attempt_id: undefined }], ["missing review", { upload_review_context_sha256: null }],
  ["missing MIME", { mime_type: null }], ["missing size", { size_bytes: null }],
])("does not admit or read file bytes without %s provenance", async (_label, patch) => {
  api.read.mockResolvedValue({ data: { ...row, ...patch }, error: null });
  await expect(runRescan()).rejects.toThrow("couldn't confirm this document's saved copy");
  expect(api.admit).not.toHaveBeenCalled(); expect(api.source).not.toHaveBeenCalled(); expect(api.write).not.toHaveBeenCalled(); expect(api.scan).not.toHaveBeenCalled();
});
