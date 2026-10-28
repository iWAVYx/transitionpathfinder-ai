import { afterEach, beforeEach, expect, it, vi } from "vitest";
const api = vi.hoisted(() => ({ context: null as any, authorize: vi.fn(), rpc: vi.fn(), read: vi.fn(), from: vi.fn(), update: vi.fn(), write: vi.fn(), scan: vi.fn(), pipeline: vi.fn(), remove: vi.fn(), adminDelete: vi.fn(), audit: vi.fn(), enqueue: vi.fn(), fetch: vi.fn(), sign: vi.fn() }));
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
import { getDocumentSignedUrl, requestAdminDocAccess, hardDeleteDocument, rescanDocument } from "../../src/lib/documents.functions";
const student = "11111111-1111-4111-8111-111111111111";
const id = "22222222-2222-4222-8222-222222222222";
const path = `${student}/fictional-privacy-safe-document.txt`;
const row = { id, student_id: student, storage_path: path, title: "Fictional reviewed text", doc_type: "other", mime_type: "text/plain", size_bytes: 20, scan_status: "failed", scan_verdict: null, review_status: "rejected", archived_at: "2026-10-28", deleted_at: null };
const runRescan = () => (rescanDocument as any)({ data: { id } });
const runDelete = () => (hardDeleteDocument as any)({ data: { id, reason: "Fictional deletion request" } });
beforeEach(() => {
  vi.resetAllMocks(); vi.stubGlobal("fetch", api.fetch);
  api.fetch.mockRejectedValue(new Error("Unexpected network request"));
  api.rpc.mockResolvedValue({ data: false, error: null });
  api.read.mockResolvedValue({ data: row, error: null });
  const query: any = { select: () => query, eq: () => query, maybeSingle: api.read };
  api.context = { userId: "fictional-viewer", supabase: { storage: { from: () => ({ createSignedUrl: api.sign }) }, rpc: api.rpc, from: (table: string) => ["documents", "students", "student_collaborators", "user_roles"].includes(table) ? query : { insert: table === "ai_jobs" ? api.enqueue : api.audit } } };
  const writeQuery: any = { eq: () => writeQuery, select: () => writeQuery, single: api.write };
  api.update.mockReturnValue(writeQuery);
  api.from.mockReturnValue({ update: api.update, delete: api.adminDelete });
  api.write.mockImplementation(async () => ({ data: { ...row, ...api.update.mock.calls.at(-1)?.[0] }, error: null }));
  api.scan.mockResolvedValue({ ok: false, code: "infected", provider: "mock-scanner", clean_result: false, blocked_reasons: ["Fictional threat"], threats: [], scan_id: "fictional-scan" });
  api.audit.mockResolvedValue({ error: null });
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
it.each(["infected", "deleted", "failed-with-infected-verdict"])("previously blocked files cannot be rescanned or released (%s)", async state => {
  api.read.mockResolvedValue({ data: { ...row, scan_status: state === "failed-with-infected-verdict" ? "failed" : state, scan_verdict: state === "failed-with-infected-verdict" ? { code: "infected" } : null }, error: null });
  await expect(runRescan()).rejects.toThrow("blocked for your safety");
  expect(api.update).not.toHaveBeenCalled(); expect(api.scan).not.toHaveBeenCalled(); expect(api.remove).not.toHaveBeenCalled(); expect(api.enqueue).not.toHaveBeenCalled();
});
it.each(["error", "rejection", "missing", "wrong-id", "wrong-student", "wrong-path", "unchanged"])("rescan stops on an unconfirmed quarantine receipt (%s)", async mode => {
  const quarantined = { ...row, scan_status: "infected" };
  if (mode === "error") api.write.mockResolvedValue({ data: quarantined, error: { message: "PRIVATE storage detail" } });
  if (mode === "rejection") api.write.mockRejectedValue(new Error("PRIVATE storage detail"));
  if (mode === "missing") api.write.mockResolvedValue({ data: null, error: null });
  if (mode === "wrong-id") api.write.mockResolvedValue({ data: { ...quarantined, id: student }, error: null });
  if (mode === "wrong-student") api.write.mockResolvedValue({ data: { ...quarantined, student_id: id }, error: null });
  if (mode === "wrong-path") api.write.mockResolvedValue({ data: { ...quarantined, storage_path: "another-private-path" }, error: null });
  if (mode === "unchanged") api.write.mockResolvedValue({ data: row, error: null });
  await expect(runRescan()).rejects.toThrow("couldn't confirm the document's security review");
  expect(api.write).toHaveBeenCalledOnce(); expect(api.remove).not.toHaveBeenCalled(); expect(api.enqueue).not.toHaveBeenCalled(); expect(api.audit).not.toHaveBeenCalled();
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
