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
vi.mock("../../src/lib/document-operation-admission.server", async importOriginal => ({ ...(await importOriginal<typeof import("../../src/lib/document-operation-admission.server")>()), runAdmittedDocumentOperation: api.admit }));
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

async function useRealRescanAdmission() {
  const actual = await vi.importActual<typeof import("../../src/lib/document-operation-admission.server")>("../../src/lib/document-operation-admission.server");
  api.admit.mockImplementation(actual.runAdmittedDocumentOperation);
  api.serviceRpc.mockImplementation(async (name: string, args: Record<string, unknown>) => ({ data: name === "begin_document_operation"
    ? { schema: "document-operation-admitted-v1", operation_id: args._operation_id, receipt_id: student, revision: 2 }
    : { schema: "document-operation-finished-v1", operation_id: args._operation_id, state: args._outcome }, error: null }));
}

// Rescan handler coverage now lives in document-rescan-bound-handler.test.ts.
// Persisted source/verdict/queue mutation checks run against the real SQL in
// tests/database/document-path-exclusivity.test.mjs, rather than mocked PATCHes.
