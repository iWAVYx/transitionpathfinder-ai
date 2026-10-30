import { afterEach, beforeEach, expect, it, vi } from "vitest";
const api = vi.hoisted(() => ({ context: null as any, source: vi.fn(), confirmSource: vi.fn(), gate: vi.fn(), authorize: vi.fn(), rpc: vi.fn(), read: vi.fn(), from: vi.fn(), update: vi.fn(), write: vi.fn(), match: vi.fn(), notDeleted: vi.fn(), scan: vi.fn(), pipeline: vi.fn(), remove: vi.fn(), adminDelete: vi.fn(), audit: vi.fn(), enqueue: vi.fn(), fetch: vi.fn(), sign: vi.fn() }));
vi.mock("@tanstack/react-start", () => ({ createServerFn: () => {
  let validate = (input: unknown) => input;
  const builder = { middleware: () => builder, validator: (fn: typeof validate) => { validate = fn; return builder; },
    handler: (fn: (input: any) => unknown) => async ({ data }: any) => fn({ data: validate(data), context: api.context }) };
  return builder;
} }));
vi.mock("@/integrations/supabase/auth-middleware", () => ({ requireSupabaseAuth: {} }));
vi.mock("../../src/lib/authz", () => ({ assertAuthorized: api.authorize }));
vi.mock("../../src/lib/document-pipeline.server", () => ({ recordPipelineRun: api.pipeline, newCorrelationId: () => "fictional-removal-correlation" }));
vi.mock("../../src/lib/document-av-scan.server", () => ({ scanUploadedDocument: api.scan, MALWARE_SCAN_PROVIDER: "mock-scanner" }));
vi.mock("@/integrations/supabase/client.server", () => ({ supabaseAdmin: { storage: { from: () => ({ remove: api.remove }) }, from: api.from } }));
vi.mock("../../src/lib/protected-file-uploads", () => ({ assertProtectedFileUploadsEnabled: api.gate }));
vi.mock("../../src/lib/document-rescan-source.server", () => ({ prepareDocumentRescanCopy: api.source }));
import { getDocumentSignedUrl, requestAdminDocAccess, hardDeleteDocument, rescanDocument } from "../../src/lib/documents.functions";
const student = "11111111-1111-4111-8111-111111111111";
const id = "22222222-2222-4222-8222-222222222222";
const path = `${student}/fictional-privacy-safe-document.txt`;
const row = { id, student_id: student, storage_path: path, title: "Fictional reviewed text", doc_type: "other", mime_type: "text/plain", size_bytes: 20, scan_status: "failed", scan_verdict: null, review_status: "rejected", archived_at: "2026-10-28", deleted_at: null, updated_at: "2026-10-30T10:00:00.000Z" };
const runRescan = (patch: object = {}) => (rescanDocument as any)({ data: { id, expected_viewer_id: "33333333-3333-4333-8333-333333333333", ...patch } });
const runDelete = () => (hardDeleteDocument as any)({ data: { id, reason: "Fictional deletion request" } });
beforeEach(() => {
  vi.resetAllMocks(); api.source.mockResolvedValue({ copy: new Blob(["Fictional reviewed text"]), contentHash: "a".repeat(64), confirmPending: api.confirmSource }); vi.stubGlobal("fetch", api.fetch);
  api.fetch.mockRejectedValue(new Error("Unexpected network request"));
  api.rpc.mockResolvedValue({ data: false, error: null });
  api.read.mockResolvedValue({ data: row, error: null });
  const query: any = { select: () => query, eq: () => query, maybeSingle: api.read };
  api.context = { userId: "33333333-3333-4333-8333-333333333333", supabase: { storage: { from: () => ({ createSignedUrl: api.sign }) }, rpc: api.rpc, from: (table: string) => ["documents", "students", "student_collaborators", "user_roles"].includes(table) ? query : { insert: table === "ai_jobs" ? api.enqueue : api.audit } } };
  const writeQuery: any = { eq: api.match, is: api.notDeleted, select: () => writeQuery, single: api.write };
  api.match.mockReturnValue(writeQuery); api.notDeleted.mockReturnValue(writeQuery);
  api.update.mockReturnValue(writeQuery);
  api.from.mockReturnValue({ update: api.update, delete: api.adminDelete });
  api.write.mockImplementation(async () => ({ data: { ...row, ...api.update.mock.calls.at(-1)?.[0] }, error: null }));
  api.scan.mockResolvedValue({ ok: false, code: "infected", provider: "mock-scanner", clean_result: false, blocked_reasons: ["Fictional threat"], threats: [], scan_id: "fictional-scan" });
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
  const quarantined = { ...row, scan_status: "infected" };
  const normalWrite = api.write.getMockImplementation()!;
  api.write.mockImplementation(async () => {
    if (api.update.mock.calls.at(-1)?.[0].scan_status === "pending") return normalWrite();
    if (mode === "rejection") throw new Error("PRIVATE storage detail");
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

const cleanScan = { ok: true, code: "clean", provider: "mock-scanner", clean_result: true, blocked_reasons: [], threats: [], scan_id: "fictional-clean" };
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
    return { data: mode === "missing" ? null : { ...row, scan_status: "clean", review_status: "pending_review", archived_at: null,
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
  api.source.mockResolvedValue({ copy, contentHash: "b".repeat(64), confirmPending: api.confirmSource });
  await runRescan();
  expect(api.scan.mock.calls[0][1]).toBe(copy);
  expect(api.update.mock.calls.at(-1)?.[0].scan_verdict).toMatchObject({ content_sha256: "b".repeat(64), source: "registration_reviewed_copy", rescan_reviewed_copy: true });
});
