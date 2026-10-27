import { beforeEach, expect, it, vi } from "vitest";
const api = vi.hoisted(() => ({ context: null as any, gate: vi.fn(), pipeline: vi.fn(), sniff: vi.fn(), scan: vi.fn(), clean: vi.fn(), enqueue: vi.fn(), remove: vi.fn() }));
vi.mock("@tanstack/react-start", () => ({ createServerFn: () => {
  let validate = (input: unknown) => input;
  const builder = { middleware: () => builder, validator: (fn: typeof validate) => { validate = fn; return builder; },
    handler: (fn: (input: any) => unknown) => async ({ data }: any) => fn({ data: validate(data), context: api.context }) };
  return builder;
} }));
vi.mock("@/integrations/supabase/auth-middleware", () => ({ requireSupabaseAuth: {} }));
vi.mock("../../src/lib/protected-file-uploads", () => ({ assertProtectedFileUploadsEnabled: api.gate }));
vi.mock("../../src/lib/document-pipeline.server", () => ({ recordPipelineRun: api.pipeline, newCorrelationId: () => "fictional-correlation" }));
vi.mock("../../src/lib/document-sniff.server", () => ({ sniffUploadedDocument: api.sniff, MAX_UPLOAD_BYTES: 25_000_000 }));
vi.mock("../../src/lib/document-av-scan.server", () => ({ scanUploadedDocument: api.scan, MALWARE_SCAN_PROVIDER: "mock-scanner" }));
vi.mock("@/integrations/supabase/client.server", () => ({ supabaseAdmin: { storage: { from: () => ({ remove: api.remove }) }, from: () => ({ update: () => ({ eq: () => ({ select: () => ({ single: api.clean }) }) }) }) } }));
import { registerDocument } from "../../src/lib/documents.functions";
const student = "11111111-1111-4111-8111-111111111111";
const id = "22222222-2222-4222-8222-222222222222";
const path = `${student}/123-privacy-safe-document.txt`;
const pending = { id, student_id: student, storage_path: path, title: "Fictional reviewed text", scan_status: "pending", review_status: "pending_review", archived_at: null, deleted_at: null };
const clean = { ...pending, scan_status: "clean" };
const register = () => (registerDocument as any)({ data: { student_id: student, title: pending.title, storage_path: path, mime_type: "text/plain", consent_acknowledged: true } });
beforeEach(() => {
  vi.resetAllMocks(); api.remove.mockResolvedValue({ error: null }); api.clean.mockResolvedValue({ data: clean, error: null });
  api.sniff.mockResolvedValue({ ok: true, detected_kind: "text" });
  api.scan.mockResolvedValue({ ok: true, code: "clean", provider: "mock-scanner", clean_result: true, blocked_reasons: [], threats: [], scan_id: "fictional-scan" });
  const roleQuery: any = { select: () => roleQuery, eq: () => Promise.resolve({ data: [{ role: "parent" }], error: null }) };
  const orgQuery: any = { select: () => orgQuery, eq: () => orgQuery, limit: () => orgQuery, maybeSingle: async () => ({ data: null, error: null }) };
  const documentQuery = { insert: () => ({ select: () => ({ single: async () => ({ data: pending, error: null }) }) }) };
  api.enqueue.mockResolvedValue({ error: null });
  api.context = { userId: "current-viewer", supabase: { rpc: async () => ({ data: true, error: null }), from: (table: string) => {
    if (table === "user_roles") return roleQuery;
    if (table === "organization_memberships") return orgQuery;
    if (table === "documents") return documentQuery;
    return { insert: table === "ai_jobs" ? api.enqueue : async () => ({ error: null }) };
  } } };
});
it("returns the persisted clean receipt, not the pre-scan row, and then enqueues once", async () => {
  expect(await register()).toEqual(clean);
  expect(api.clean).toHaveBeenCalledOnce(); expect(api.enqueue).toHaveBeenCalledOnce();
  expect(api.clean.mock.invocationCallOrder[0]).toBeLessThan(api.enqueue.mock.invocationCallOrder[0]);
});
it.each([
  null, { ...clean, id: "33333333-3333-4333-8333-333333333333" },
  { ...clean, student_id: "33333333-3333-4333-8333-333333333333" },
  { ...clean, storage_path: path + "-different" }, { ...clean, scan_status: "pending" },
  { ...clean, scan_status: "failed" }, { ...clean, review_status: "rejected" },
  { ...clean, archived_at: "2026-10-27" }, { ...clean, deleted_at: "2026-10-27" },
  { id, student_id: student, storage_path: path, scan_status: "clean" },
])("does not queue processing for an unconfirmed persisted clean state (%j)", async data => {
  api.clean.mockResolvedValue({ data, error: null });
  await expect(register()).rejects.toThrow("couldn't confirm the document's security review");
  expect(api.enqueue).not.toHaveBeenCalled();
  expect(api.pipeline.mock.calls.some(([call]) => call.stage === "av_scan" && call.status === "succeeded")).toBe(false);
});
it.each(["response", "rejection"])("keeps private persistence errors out of the client and stops before queueing (%s)", async mode => {
  if (mode === "response") api.clean.mockResolvedValue({ data: clean, error: { message: "PRIVATE database details" } });
  else api.clean.mockRejectedValue(new Error("PRIVATE database details"));
  const log = vi.spyOn(console, "error").mockImplementation(() => {});
  await expect(register()).rejects.toThrow("couldn't confirm the document's security review");
  expect(api.enqueue).not.toHaveBeenCalled(); expect(api.clean).toHaveBeenCalledOnce(); expect(log).not.toHaveBeenCalled(); log.mockRestore();
});

function rejectScan(stage: string) {
  if (stage === "sniff") api.sniff.mockResolvedValue({ ok: false, detected_kind: "unknown", error_code: "mime_mismatch", error_message: "Fictional mismatch" });
  else api.scan.mockResolvedValue({ ok: false, code: stage === "infected" ? "infected" : "timeout", provider: "mock-scanner", clean_result: false, blocked_reasons: [], threats: [], error_message: "Fictional blocked scan" });
}
it.each(["sniff", "timeout", "infected"])("returns a persisted blocked receipt without summary processing after %s", async stage => {
  rejectScan(stage);
  const blocked = { ...pending, review_status: "rejected", archived_at: "2026-10-27", scan_status: stage === "sniff" ? "pending" : stage === "infected" ? "deleted" : "failed" };
  api.clean.mockResolvedValue({ data: blocked, error: null });
  expect(await register()).toEqual(blocked); expect(api.enqueue).not.toHaveBeenCalled();
  expect(api.scan).toHaveBeenCalledTimes(stage === "sniff" ? 0 : 1);
  expect(api.remove).toHaveBeenCalledTimes(stage === "infected" ? 1 : 0);
});
it.each(["sniff", "timeout"])("does not fabricate a persisted quarantine result when its update fails (%s)", async stage => {
  rejectScan(stage); api.clean.mockResolvedValue({ data: pending, error: { message: "PRIVATE persistence error" } });
  await expect(register()).rejects.toThrow("couldn't confirm the document's security review");
  expect(api.enqueue).not.toHaveBeenCalled(); expect(api.clean).toHaveBeenCalledOnce();
});
it.each(["sniff", "timeout"])("rejects an unchanged row returned by a quarantine update (%s)", async stage => {
  rejectScan(stage); api.clean.mockResolvedValue({ data: pending, error: null });
  await expect(register()).rejects.toThrow("couldn't confirm the document's security review"); expect(api.enqueue).not.toHaveBeenCalled();
});
