import { z } from "zod";
import { DocumentOperationAdmissionError } from "./document-operation-admission.server";
const uuid = z.string().uuid();
const hash = z.string().regex(/^[a-f0-9]{64}$/);
const timestamp = z.string().datetime({ offset: true }).refine(v => (v.match(/\.(\d+)/)?.[1]?.length ?? 0) <= 6);
function micros(v: string) { const s = timestamp.parse(v); return BigInt(Math.floor(Date.parse(s) / 1000)) * 1000000n + BigInt((s.match(/\.(\d+)/)?.[1] ?? "").padEnd(6, "0")); }
const sourceSchema = z.object({ student_id: uuid, storage_path: z.string().min(1), storage_object_id: uuid,
  storage_object_version: z.string().min(1), content_hash: hash, size_bytes: z.number().int().positive(),
  mime_type: z.literal("text/plain"), upload_attempt_id: uuid }).strict();
type Client = { rpc(name: string, args: Record<string, unknown>): PromiseLike<{data: unknown; error: unknown}> };
const claimSchema = z.object({schema:z.literal("document-rescan-source-claim-v1"),operation_id:uuid,receipt_id:uuid,
  revision:z.number().int().positive().max(Number.MAX_SAFE_INTEGER),document_id:uuid,source_revision:timestamp,reserved_units:z.literal(2)}).strict();
const pendingSchema=z.object({schema:z.literal("document-rescan-pending-v1"),operation_id:uuid,document_id:uuid,
  source_revision:timestamp,pending_revision:timestamp,content_sha256:hash}).strict();
const resultSchema=z.object({schema:z.literal("document-rescan-outcome-v1"),operation_id:uuid,document_id:uuid,
  disposition:z.enum(["clean_queued","quarantined"]),outcome_revision:timestamp,summary_job_id:uuid.nullable()}).strict();
const scanSchema=z.discriminatedUnion("ok",[
 z.object({ok:z.literal(true),code:z.literal("clean"),provider:z.literal("cloudmersive"),scan_id:uuid,clean_result:z.literal(true),threats:z.array(z.string()).length(0),blocked_reasons:z.array(z.string()).length(0)}),
 z.object({ok:z.literal(false),code:z.literal("infected"),provider:z.literal("cloudmersive"),scan_id:uuid,clean_result:z.literal(false),threats:z.array(z.string().trim().min(1).max(200)).min(1),blocked_reasons:z.array(z.string())})]);
/** Prepared adapter: caller establishes current viewer/source authority first.
 * Callback retains caller-authorized Storage access; it never receives the
 * service client or capability. Unknown completion is never retried. */
export async function runBoundDocumentRescan(input:{serviceClient:unknown;actorId:string;documentId:string;revision:string;source:unknown}, work:{
 prepareCopy:()=>Promise<{contentHash:string;confirmPending:(revision:string)=>Promise<void>}>;
 scan:()=>Promise<unknown>;
}) {
 const client=input.serviceClient as Client;let actor:string,document:string,operation:string,source:z.infer<typeof sourceSchema>,claim:z.infer<typeof claimSchema>;
 const rpc=async(name:string,args:Record<string,unknown>)=>{const r=await client.rpc(name,args);if(r.error!==null)throw new Error();return r.data;};
 try {
  actor=uuid.parse(input.actorId);document=uuid.parse(input.documentId);source=sourceSchema.parse(input.source);timestamp.parse(input.revision);operation=crypto.randomUUID();
  claim=claimSchema.parse(await rpc("begin_bound_document_rescan",{_operation_id:operation,_actor_id:actor,_document_id:document,_expected_revision:input.revision,_source:source}));
  if(claim.operation_id!==operation||claim.document_id!==document||micros(claim.source_revision)!==micros(input.revision))throw new Error();
 } catch {throw new DocumentOperationAdmissionError("admission");}
 const finish=async(state:"completed"|"needs_review")=>{
  const r=z.object({schema:z.literal("document-operation-finished-v1"),operation_id:z.literal(operation),state:z.literal(state)}).strict();
  r.parse(await rpc("finish_document_operation",{_operation_id:operation,_actor_id:actor,_receipt_id:claim.receipt_id,_outcome:state}));
 };
 let result:z.infer<typeof resultSchema>;
 try {
  const copy=await work.prepareCopy();if(copy.contentHash!==source.content_hash)throw new Error();
  const pending=pendingSchema.parse(await rpc("mark_bound_document_rescan_pending",{_operation_id:operation,_actor_id:actor,_receipt_id:claim.receipt_id,_observed_content_sha256:copy.contentHash}));
  if(pending.operation_id!==operation||pending.document_id!==document||pending.content_sha256!==source.content_hash||micros(pending.source_revision)!==micros(claim.source_revision)||micros(pending.pending_revision)<=micros(claim.source_revision))throw new Error();
  await copy.confirmPending(pending.pending_revision);
  const scan=scanSchema.parse(await work.scan());
  await copy.confirmPending(pending.pending_revision);
  result=resultSchema.parse(await rpc("persist_bound_document_rescan_result",{_operation_id:operation,_actor_id:actor,_receipt_id:claim.receipt_id,_scan:scan}));
  if(result.operation_id!==operation||result.document_id!==document||micros(result.outcome_revision)<=micros(pending.pending_revision)||
    result.disposition!==(scan.ok?"clean_queued":"quarantined")||(scan.ok?!result.summary_job_id:result.summary_job_id!==null))throw new Error();
 } catch {try{await finish("needs_review");}catch{/* Retain uncertain work for reconciliation. */}throw new DocumentOperationAdmissionError("work");}
 try{await finish("completed");}catch{throw new DocumentOperationAdmissionError("completion");}
 return Object.freeze(result);
}
