import { createHash } from "node:crypto";
import { beforeEach, expect, it, vi } from "vitest";
const api = vi.hoisted(() => ({ context: null as any, gate: vi.fn(), pipeline: vi.fn(), sniff: vi.fn(), scan: vi.fn(), clean: vi.fn(), enqueue: vi.fn(), remove: vi.fn(), download: vi.fn(), insert: vi.fn(), cleanWrite: vi.fn(), pathAvailable: vi.fn(), audit: vi.fn() }));
vi.mock("@tanstack/react-start", () => ({ createServerFn: () => {
  let validate = (input: unknown) => input;
  const builder = { middleware: () => builder, validator: (fn: typeof validate) => { validate = fn; return builder; },
    handler: (fn: (input: any) => unknown) => async ({ data }: any) => fn({ data: validate(data), context: api.context }) };
  return builder;
} }));
vi.mock("@/integrations/supabase/auth-middleware", () => ({ requireSupabaseAuth: {} }));
vi.mock("../../src/lib/protected-file-uploads", () => ({ assertProtectedFileUploadsEnabled: api.gate }));
vi.mock("../../src/lib/document-upload-duplicate.server", () => ({ assertDocumentUploadPathAvailable: api.pathAvailable }));
vi.mock("../../src/lib/document-pipeline.server", () => ({ recordPipelineRun: api.pipeline, newCorrelationId: () => "fictional-correlation" }));
vi.mock("../../src/lib/document-sniff.server", () => ({ sniffUploadedDocument: api.sniff, MAX_UPLOAD_BYTES: 25_000_000 }));
vi.mock("../../src/lib/document-av-scan.server", () => ({ scanUploadedDocument: api.scan, MALWARE_SCAN_PROVIDER: "mock-scanner" }));
vi.mock("@/integrations/supabase/client.server", () => ({ supabaseAdmin: { storage: { from: () => ({ remove: api.remove }) }, from: () => ({ update: api.cleanWrite }) } }));
import { documentUploadReviewHash } from "../../src/lib/document-upload-intent";
import { registerDocument } from "../../src/lib/documents.functions";
const student = "11111111-1111-4111-8111-111111111111";
const id = "22222222-2222-4222-8222-222222222222";
const attempt="44444444-4444-4444-8444-444444444444";
const path = `${student}/${attempt}-privacy-safe-document.txt`;
const pending = { id, student_id: student, storage_path: path, title: "Fictional reviewed text", scan_status: "pending", review_status: "pending_review", archived_at: null, deleted_at: null };
const clean = { ...pending, scan_status: "clean" };
const register = async (patch: object = {}) => {
  const data={student_id:student,title:pending.title,storage_path:path,mime_type:"text/plain",consent_acknowledged:true,content_hash:createHash("sha256").update("Fictional reviewed source").digest("hex"),...patch};
  return (registerDocument as any)({data:{...data,upload_attempt_id:attempt,upload_review_context_sha256:await documentUploadReviewHash("current-viewer",data)}});
};
beforeEach(() => {
  vi.resetAllMocks(); api.cleanWrite.mockReturnValue({ eq: () => ({ select: () => ({ single: api.clean }) }) }); api.pathAvailable.mockResolvedValue(undefined); api.download.mockResolvedValue({ data: new Blob(["Fictional reviewed source"]), error: null }); api.remove.mockResolvedValue({ error: null }); api.clean.mockResolvedValue({ data: clean, error: null });
  api.sniff.mockResolvedValue({ ok: true, detected_kind: "text" });
  api.scan.mockResolvedValue({ ok: true, code: "clean", provider: "mock-scanner", clean_result: true, blocked_reasons: [], threats: [], scan_id: "fictional-scan" });
  const roleQuery: any = { select: () => roleQuery, eq: () => Promise.resolve({ data: [{ role: "parent" }], error: null }) };
  const orgQuery: any = { select: () => orgQuery, eq: () => orgQuery, limit: () => orgQuery, maybeSingle: async () => ({ data: null, error: null }) };
  api.insert.mockReturnValue({ select: () => ({ single: async () => ({ data: pending, error: null }) }) });
  const documentQuery = { insert: api.insert };
  api.enqueue.mockResolvedValue({ error: null }); api.audit.mockResolvedValue({ error: null });
  api.context = { userId: "current-viewer", supabase: { storage: { from: () => ({ download: api.download }) }, rpc: async (name:string,args:any) => name==="reserve_document_upload" ? ({data:{schema:"document-upload-reservation-v1",attempt_id:args._attempt_id,student_id:args._student_id,actor_id:"current-viewer",storage_path:path,state:"reserved"},error:null}) : ({ data: true, error: null }), from: (table: string) => {
    if (table === "user_roles") return roleQuery;
    if (table === "organization_memberships") return orgQuery;
    if (table === "documents") return documentQuery;
    return { insert: table === "ai_jobs" ? api.enqueue : table === "audit_log" ? api.audit : async () => ({ error: null }) };
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
  const blocked = { ...pending, review_status: "rejected", archived_at: "2026-10-27", scan_status: stage === "sniff" ? "pending" : stage === "infected" ? "infected" : "failed" };
  api.clean.mockResolvedValue({ data: blocked, error: null });
  expect(await register()).toEqual(blocked); expect(api.enqueue).not.toHaveBeenCalled();
  expect(api.scan).toHaveBeenCalledTimes(stage === "sniff" ? 0 : 1);
  expect(api.remove).not.toHaveBeenCalled();
  if (stage === "infected") {
    expect(api.cleanWrite).toHaveBeenCalledWith(expect.objectContaining({ scan_status: "infected", review_status: "rejected" }));
    expect(api.cleanWrite.mock.calls[0][0]).not.toHaveProperty("deleted_at");
    const entries = api.audit.mock.calls.flatMap(([entry]) => Array.isArray(entry) ? entry : [entry]);
    expect(entries).toEqual(expect.arrayContaining([expect.objectContaining({ action: "document.scan.quarantined", metadata: expect.objectContaining({ removal_status: "not_attempted" }) })]));
    expect(entries.some(entry => entry.action === "document.scan.deleted" || entry.metadata?.storage_path_removed === true)).toBe(false);
  }
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

it("derives the saved fingerprint from actual stored bytes even without a client hash", async () => {
  await register(); expect(api.insert.mock.calls[0][0].content_hash).toBe(createHash("sha256").update("Fictional reviewed source").digest("hex"));
  expect(api.download).toHaveBeenCalledExactlyOnceWith(path);
  expect(api.pipeline.mock.calls.find(([call]) => call.stage === "hash")?.[0]).toMatchObject({ status: "succeeded", payload: { source: "stored_bytes" } });
});
it("rejects a forged client hash before registration, scanning or summary processing", async () => {
  await expect(register({ content_hash: "f".repeat(64) })).rejects.toThrow("couldn't confirm the uploaded copy");
  expect(api.insert).not.toHaveBeenCalled(); expect(api.sniff).not.toHaveBeenCalled(); expect(api.scan).not.toHaveBeenCalled(); expect(api.enqueue).not.toHaveBeenCalled();
});
it("accepts a matching fingerprint and keeps it derived from stored bytes", async () => {
  const hash = createHash("sha256").update("Fictional reviewed source").digest("hex"); await register({ content_hash: hash.toUpperCase() });
  expect(api.insert.mock.calls[0][0].content_hash).toBe(hash);
});
it.each(["error", "missing", "rejection"])("stops without retry on an uncertain stored file (%s)", async mode => {
  if (mode === "error") api.download.mockResolvedValue({ data: null, error: { message: "PRIVATE filename" } });
  if (mode === "missing") api.download.mockResolvedValue({ data: null, error: null });
  if (mode === "rejection") api.download.mockRejectedValue(new Error("PRIVATE object path"));
  const log = vi.spyOn(console, "error").mockImplementation(() => {});
  await expect(register()).rejects.toThrow("couldn't confirm the uploaded copy");
  expect(api.download).toHaveBeenCalledOnce(); expect(api.insert).not.toHaveBeenCalled(); expect(api.enqueue).not.toHaveBeenCalled(); expect(log).not.toHaveBeenCalled(); log.mockRestore();
});

it("stops before reading, inserting or scanning when a path is already bound or unconfirmed", async () => {
  api.pathAvailable.mockRejectedValue(new Error("This upload location is already in use or could not be confirmed."));
  await expect(register()).rejects.toThrow("upload location is already in use");
  expect(api.download).not.toHaveBeenCalled(); expect(api.insert).not.toHaveBeenCalled(); expect(api.scan).not.toHaveBeenCalled(); expect(api.remove).not.toHaveBeenCalled(); expect(api.enqueue).not.toHaveBeenCalled();
});

it("stops before scanning or removal when another registration wins a unique-path race", async () => {
  api.insert.mockReturnValue({ select: () => ({ single: async () => ({ data: null, error: { code: "23505", message: "PRIVATE conflicting document path" } }) }) });
  const log = vi.spyOn(console, "error").mockImplementation(() => {});
  await expect(register()).rejects.toThrow("Could not save document record");
  expect(api.insert).toHaveBeenCalledOnce(); expect(api.sniff).not.toHaveBeenCalled(); expect(api.scan).not.toHaveBeenCalled(); expect(api.remove).not.toHaveBeenCalled(); expect(api.enqueue).not.toHaveBeenCalled();
  expect(log).toHaveBeenCalledExactlyOnceWith("Document registration could not be confirmed."); log.mockRestore();
});

it("passes the exact downloaded copy through hash, sniff and scan without a second storage read", async () => {
  const copy = new Blob(["Fictional reviewed source"]);
  api.download.mockResolvedValue({ data: copy, error: null });
  await register();
  expect(api.download).toHaveBeenCalledOnce();
  expect(api.sniff.mock.calls[0][1]).toBe(copy);
  expect(api.scan.mock.calls[0][1]).toBe(copy);
  expect(api.cleanWrite).toHaveBeenCalledWith(expect.objectContaining({ scan_verdict: expect.objectContaining({ content_sha256: createHash("sha256").update(await copy.text()).digest("hex"), source: "registration_reviewed_copy" }) }));
  expect(api.insert.mock.calls[0][0].content_hash).toBe(createHash("sha256").update(await copy.text()).digest("hex"));
});
it("ignores a caller's proposed copy and still uses authenticated storage bytes", async () => {
  const copy = new Blob(["Fictional reviewed source"]);
  api.download.mockResolvedValue({ data: copy, error: null });
  await register({ reviewedCopy: new Blob(["Caller replacement"]) });
  expect(api.sniff.mock.calls[0][1]).toBe(copy); expect(api.scan.mock.calls[0][1]).toBe(copy);
});

it("fails closed on missing reservation RPC before storage or scanning, without an old insert fallback",async()=>{
  const previous=api.context.supabase.rpc;api.context.supabase.rpc=async(name:string,args:any)=>name==="reserve_document_upload"?{data:null,error:{message:"PRIVATE missing function"}}:previous(name,args);
  await expect(register()).rejects.toThrow("couldn't confirm this upload attempt");expect(api.download).not.toHaveBeenCalled();expect(api.insert).not.toHaveBeenCalled();expect(api.scan).not.toHaveBeenCalled();expect(api.enqueue).not.toHaveBeenCalled();
});
it("persists the exact reservation identifiers alongside the verified stored-byte hash",async()=>{
  await register();const row=api.insert.mock.calls[0][0];expect(row.upload_attempt_id).toBe(attempt);expect(row.upload_review_context_sha256).toMatch(/^[a-f0-9]{64}$/);expect(row.content_hash).toBe(createHash("sha256").update("Fictional reviewed source").digest("hex"));
});

it.each(["deleted", "failed", "clean"])("an infected scan cannot claim a different persisted security state (%s)", async status => {
  rejectScan("infected");
  api.clean.mockResolvedValue({ data: { ...pending, scan_status: status, review_status: "rejected", archived_at: "2026-10-28" }, error: null });
  await expect(register()).rejects.toThrow("couldn't confirm the document's security review");
  expect(api.remove).not.toHaveBeenCalled(); expect(api.enqueue).not.toHaveBeenCalled(); expect(api.audit).not.toHaveBeenCalled();
});
