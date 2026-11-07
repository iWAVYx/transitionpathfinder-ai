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


beforeEach(() => {
 api.scan.mockResolvedValue({ok:true,code:"clean",provider:"cloudmersive",scan_id:id,clean_result:true,threats:[],blocked_reasons:[]});
 api.serviceRpc.mockImplementation(async(name,args)=>{
  const common={operation_id:args._operation_id,document_id:id};
  if(name==='begin_bound_document_rescan')return {error:null,data:{...common,schema:'document-rescan-source-claim-v1',receipt_id:id,revision:1,reserved_units:2,source_revision:row.updated_at}};
  if(name==='mark_bound_document_rescan_pending')return {error:null,data:{...common,schema:'document-rescan-pending-v1',source_revision:row.updated_at,pending_revision:'2026-10-30T10:01:00Z',content_sha256:row.content_hash}};
  if(name==='persist_bound_document_rescan_result')return {error:null,data:{...common,schema:'document-rescan-outcome-v1',disposition:args._scan.ok?'clean_queued':'quarantined',outcome_revision:'2026-10-30T10:02:00Z',summary_job_id:args._scan.ok?id:null}};
  if(name==='finish_document_operation')return {error:null,data:{schema:'document-operation-finished-v1',operation_id:args._operation_id,state:args._outcome}};
  throw new Error('Unexpected service request');
 });
});
it('actual handler completes through bound RPCs without direct result or queue writes',async()=>{
 expect(await runRescan()).toEqual({ok:true,code:'clean'});expect(api.update).not.toHaveBeenCalled();expect(api.enqueue).not.toHaveBeenCalled();
 expect(api.serviceRpc.mock.calls.map(c=>c[0])).toEqual(['begin_bound_document_rescan','mark_bound_document_rescan_pending','persist_bound_document_rescan_result','finish_document_operation']);
 expect(api.audit).toHaveBeenCalledOnce();expect(api.pipeline).toHaveBeenCalledTimes(2);expect(api.remove).not.toHaveBeenCalled();
});
it('confirmed quarantine is audited without deletion',async()=>{
 api.scan.mockResolvedValue({ok:false,code:'infected',provider:'cloudmersive',scan_id:id,clean_result:false,threats:['Fictional threat'],blocked_reasons:[]});
 expect(await runRescan()).toMatchObject({ok:false,code:'infected'});expect(api.audit.mock.calls[0][0]).toMatchObject({action:'document.scan.quarantined',metadata:{removal_status:'not_attempted'}});expect(api.remove).not.toHaveBeenCalled();
});
it('telemetry failure preserves confirmed success and never repeats scanning',async()=>{
 api.pipeline.mockRejectedValue(new Error('PRIVATE telemetry failure'));expect(await runRescan()).toEqual({ok:true,code:'clean'});expect(api.scan).toHaveBeenCalledOnce();expect(api.serviceRpc).toHaveBeenCalledTimes(4);
});
it('uncertain admission prevents file IO scanning and success telemetry',async()=>{
 api.serviceRpc.mockResolvedValue({data:null,error:{message:'PRIVATE'}});await expect(runRescan()).rejects.toMatchObject({phase:'admission'});expect(api.source).not.toHaveBeenCalled();expect(api.scan).not.toHaveBeenCalled();expect(api.audit).not.toHaveBeenCalled();
});
it('blank threat cannot produce confirmed quarantine',async()=>{
 api.scan.mockResolvedValue({ok:false,code:'infected',provider:'cloudmersive',scan_id:id,clean_result:false,threats:['   '],blocked_reasons:[]});await expect(runRescan()).rejects.toMatchObject({phase:'work'});expect(api.serviceRpc.mock.calls.some(c=>c[0]==='persist_bound_document_rescan_result')).toBe(false);expect(api.audit).not.toHaveBeenCalled();
});

for(const [stage,fields] of [
 ['begin_bound_document_rescan',{operation_id:student,document_id:student,receipt_id:'invalid',revision:0,reserved_units:1,source_revision:'2020-01-01T00:00:00Z',schema:'foreign'}],
 ['mark_bound_document_rescan_pending',{operation_id:student,document_id:student,content_sha256:'f'.repeat(64),source_revision:'2020-01-01T00:00:00Z',pending_revision:row.updated_at,schema:'foreign'}],
 ['persist_bound_document_rescan_result',{operation_id:student,document_id:student,outcome_revision:row.updated_at,disposition:'quarantined',summary_job_id:null,schema:'foreign'}],
] as const)for(const [field,value] of Object.entries(fields))it(`refuses ${stage} mismatched ${field}`,async()=>{
 const normal=api.serviceRpc.getMockImplementation()!;api.serviceRpc.mockImplementation(async(name,args)=>{const r=await normal(name,args);return name===stage?{...r,data:{...r.data,[field]:value}}:r;});
 await expect(runRescan()).rejects.toMatchObject({phase:stage==='begin_bound_document_rescan'?'admission':'work'});
 expect(api.audit).not.toHaveBeenCalled();expect(api.update).not.toHaveBeenCalled();expect(api.enqueue).not.toHaveBeenCalled();
 if(stage!=='persist_bound_document_rescan_result')expect(api.scan).not.toHaveBeenCalled();
});
for(const stage of ['begin_bound_document_rescan','mark_bound_document_rescan_pending','persist_bound_document_rescan_result','finish_document_operation'])for(const fault of ['error','lost','missing'])it(`never retries ${stage} after ${fault}`,async()=>{
 const normal=api.serviceRpc.getMockImplementation()!;api.serviceRpc.mockImplementation(async(name,args)=>{if(name!==stage)return normal(name,args);if(fault==='lost')throw new Error('PRIVATE transport');return {data:null,error:fault==='error'?{message:'PRIVATE'}:null};});
 await expect(runRescan()).rejects.toMatchObject({phase:stage==='begin_bound_document_rescan'?'admission':stage==='finish_document_operation'?'completion':'work',message:expect.not.stringContaining('PRIVATE')});
 expect(api.serviceRpc.mock.calls.filter(c=>c[0]===stage)).toHaveLength(1);expect(api.audit).not.toHaveBeenCalled();
});
for(const code of ['failed','timeout','indeterminate'])it(`holds uncertain ${code} without terminal persistence`,async()=>{
 api.scan.mockResolvedValue({ok:false,code,provider:'cloudmersive',scan_id:null,clean_result:null,threats:[],blocked_reasons:[],error_message:'PRIVATE'});
 await expect(runRescan()).rejects.toMatchObject({phase:'work'});expect(api.serviceRpc.mock.calls.some(c=>c[0]==='persist_bound_document_rescan_result')).toBe(false);expect(api.serviceRpc.mock.calls.at(-1)?.[1]._outcome).toBe('needs_review');expect(api.remove).not.toHaveBeenCalled();
});
for(const stage of ['before','after'])it(`source drift ${stage} scanning stops persistence`,async()=>{
 if(stage==='before')api.confirmSource.mockRejectedValueOnce(new Error('PRIVATE changed source'));else api.confirmSource.mockResolvedValueOnce(undefined).mockRejectedValueOnce(new Error('PRIVATE changed source'));
 await expect(runRescan()).rejects.toMatchObject({phase:'work'});expect(api.scan).toHaveBeenCalledTimes(stage==='before'?0:1);expect(api.serviceRpc.mock.calls.some(c=>c[0]==='persist_bound_document_rescan_result')).toBe(false);
});
for(const status of ['infected','deleted','pending','clean'])it(`rejects unavailable ${status} before admission`,async()=>{
 api.read.mockResolvedValue({data:{...row,scan_status:status},error:null});await expect(runRescan()).rejects.toThrow();expect(api.serviceRpc).not.toHaveBeenCalled();expect(api.scan).not.toHaveBeenCalled();
});
for(const viewer of [undefined,'invalid',student])it(`rejects stale viewer ${viewer} before reads`,async()=>{
 await expect(runRescan({expected_viewer_id:viewer})).rejects.toThrow();expect(api.read).not.toHaveBeenCalled();expect(api.serviceRpc).not.toHaveBeenCalled();
});
it('preserves exact reviewed Blob and source fingerprint across the real handler',async()=>{
 const copy=new Blob(['fictional copy']);api.source.mockResolvedValue({copy,contentHash:row.content_hash,confirmPending:api.confirmSource});await runRescan();expect(api.scan.mock.calls[0][1]).toBe(copy);expect(api.serviceRpc.mock.calls[0][1]._source).toMatchObject({student_id:student,content_hash:row.content_hash,storage_object_id:row.storage_object_id,storage_object_version:row.storage_object_version});
});
it('denied caller stops before admission',async()=>{api.authorize.mockRejectedValue(new Error('Access denied'));await expect(runRescan()).rejects.toThrow('Access denied');expect(api.serviceRpc).not.toHaveBeenCalled();});
