import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { beforeEach, expect, it, vi } from "vitest";
import { processVerifiedDocumentSummary, MAX_SUMMARY_BYTES, MAX_SUMMARY_TEXT, SUMMARY_REVIEW_MESSAGE, type SummaryIO } from "../../supabase/functions/ai-job-processor/verified-document-summary";
const id=(n:number)=>`00000000-0000-4000-8000-${String(n).padStart(12,"0")}`;
const claim={id:id(1),at:"2026-10-27T12:00:00.000Z",attempt:1};
const text="Jamie Example attends Fictional School. Email jamie@example.test. Student ID: DEMO123. Reported reading progress: 4 of 5 tasks. Proposed goal: practice weekly.";
const hash=(text:string|Uint8Array)=>createHash("sha256").update(text).digest("hex");
let receipt:any,metadata:any,output:any,io:SummaryIO;
const safe=()=>({data:structuredClone(receipt),error:null});
beforeEach(()=>{
  receipt={schema:"verified-document-summary-source-v1",job_id:claim.id,claim_at:claim.at,claim_attempt:1,document_id:id(2),student_id:id(3),actor_id:id(4),object_id:id(5),object_version:"version-one",storage_path:`${id(3)}/nonce-privacy-safe-document.txt`,content_sha256:hash(text),context:{studentFirstName:"Jamie",studentLastName:"Example",schoolName:"Fictional School",dateOfBirth:null}};
  metadata={id:id(5),version:"version-one",name:receipt.storage_path,bucket_id:"student-documents",size:new Blob([text]).size,content_type:"text/plain"};
  output={key_findings:["Reported reading progress: 4 of 5 tasks."],strengths_identified:[],needs_identified:[],goals_identified:["Proposed weekly practice."],important_dates:[],missing_information:["No observation dates were supplied."],recommended_followups:["Confirm the reported observations with the team."]};
  io={readSource:vi.fn(async()=>safe()),info:vi.fn(async()=>({data:structuredClone(metadata),error:null})),download:vi.fn(async()=>({data:new Blob([text]),error:null})),generate:vi.fn(async()=>structuredClone(output)),commit:vi.fn(async(source)=>({data:{schema:"verified-document-summary-commit-v1",job_id:claim.id,status:"completed",document_id:source.document_id,student_id:source.student_id,actor_id:source.actor_id,content_sha256:source.content_sha256},error:null}))};
});
it("uses verified file text, redacts known identifiers and commits source lineage once",async()=>{
  await expect(processVerifiedDocumentSummary(claim,io)).resolves.toMatchObject({document_id:id(2),actor_id:id(4)});
  expect(io.readSource).toHaveBeenCalledTimes(3);expect(io.info).toHaveBeenCalledTimes(3);expect(io.download).toHaveBeenCalledExactlyOnceWith(receipt.storage_path);expect(io.generate).toHaveBeenCalledOnce();expect(io.commit).toHaveBeenCalledOnce();
  const sent=vi.mocked(io.generate).mock.calls[0][0];expect(sent).toContain("4 of 5 tasks");expect(sent).not.toContain("Jamie Example");expect(sent).not.toContain("Fictional School");expect(sent).not.toContain("jamie@example.test");expect(sent).not.toContain("DEMO123");expect(sent).not.toContain(receipt.storage_path);
  expect(vi.mocked(io.commit).mock.calls[0][1]).toMatchObject({_source:{document_id:id(2),object_version:"version-one",content_sha256:hash(text)}});
});
it("the worker redactor is byte-for-byte synchronized with the application privacy rules",()=>{
  expect(readFileSync("supabase/functions/ai-job-processor/sensitive-text-redaction.ts","utf8")).toBe(readFileSync("src/lib/sensitive-text-redaction.ts","utf8"));
});
it.each([null,{}, {data:null,error:null},{data:undefined,error:null},{data:{},error:{message:"PRIVATE source"}}])("stops before storage/AI for a missing or uncertain source receipt %j",async(value)=>{
  vi.mocked(io.readSource).mockResolvedValue(value as any);await expect(processVerifiedDocumentSummary(claim,io)).rejects.toThrow(SUMMARY_REVIEW_MESSAGE);expect(io.info).not.toHaveBeenCalled();expect(io.generate).not.toHaveBeenCalled();
});
it.each([{job_id:id(9)},{claim_attempt:2},{claim_at:"invalid"},{schema:"old"},{document_id:"invalid"},{student_id:"invalid"},{object_id:"invalid"},{object_version:""},{content_sha256:"legacy-hash"},{context:{}},{storage_path:`${id(9)}/nonce-privacy-safe-document.txt`}])("rejects malformed/mismatched source identity %j",async(patch)=>{
  Object.assign(receipt,patch);await expect(processVerifiedDocumentSummary(claim,io)).rejects.toThrow(SUMMARY_REVIEW_MESSAGE);expect(io.info).not.toHaveBeenCalled();expect(io.generate).not.toHaveBeenCalled();
});
it.each([{version:"changed"},{id:id(9)},{name:"foreign.txt"},{bucket_id:"other"},{size:0},{size:MAX_SUMMARY_BYTES+1},{content_type:"application/pdf"},{content_type:undefined},{content_type:null},{content_type:"text/plain;charset=iso-8859-1"},{content_type:"text/plain;charset=utf-8;extra=1"},{archived_at:"2026-10-27T12:00:00Z"},{archived_at:false},{is_delete_marker:true},{is_delete_marker:null}])("rejects mismatched or unsafe storage metadata before download %j",async(patch)=>{
  Object.assign(metadata,patch);await expect(processVerifiedDocumentSummary(claim,io)).rejects.toThrow(SUMMARY_REVIEW_MESSAGE);expect(io.download).not.toHaveBeenCalled();expect(io.generate).not.toHaveBeenCalled();
});
it.each(["text/plain", "text/plain; charset=utf-8", "TEXT/PLAIN;CHARSET=UTF-8", "text/plain;charset=us-ascii"])("accepts explicit supported text MIME %s with current raw lifecycle metadata",async(content_type)=>{
  Object.assign(metadata,{content_type,archived_at:null,is_delete_marker:false,is_versioned:true});
  await expect(processVerifiedDocumentSummary(claim,io)).resolves.toMatchObject({document_id:id(2)});
  expect(io.generate).toHaveBeenCalledOnce();expect(io.commit).toHaveBeenCalledOnce();
});
it("rechecks retirement metadata after generation before committing",async()=>{
  vi.mocked(io.info).mockResolvedValueOnce({data:structuredClone(metadata),error:null}).mockResolvedValueOnce({data:structuredClone(metadata),error:null}).mockResolvedValue({data:{...metadata,is_delete_marker:true},error:null});
  await expect(processVerifiedDocumentSummary(claim,io)).rejects.toThrow(SUMMARY_REVIEW_MESSAGE);expect(io.generate).toHaveBeenCalledOnce();expect(io.commit).not.toHaveBeenCalled();
});
it("rejects changed bytes even when object metadata is unchanged",async()=>{
  vi.mocked(io.download).mockResolvedValue({data:new Blob(["x".repeat(metadata.size)]),error:null});await expect(processVerifiedDocumentSummary(claim,io)).rejects.toThrow(SUMMARY_REVIEW_MESSAGE);expect(io.generate).not.toHaveBeenCalled();expect(io.commit).not.toHaveBeenCalled();
});
it.each(["before-ai","after-ai"])("stops on a noticed metadata change %s",async(stage)=>{
  vi.mocked(io.info).mockResolvedValueOnce({data:structuredClone(metadata),error:null});
  if(stage==="after-ai")vi.mocked(io.info).mockResolvedValueOnce({data:structuredClone(metadata),error:null});
  vi.mocked(io.info).mockResolvedValue({data:{...metadata,version:"changed"},error:null});
  await expect(processVerifiedDocumentSummary(claim,io)).rejects.toThrow(SUMMARY_REVIEW_MESSAGE);expect(io.generate).toHaveBeenCalledTimes(stage==="after-ai"?1:0);expect(io.commit).not.toHaveBeenCalled();
});
it.each(["before-ai","after-ai"])("rechecks source/access and refuses changed receipts %s",async(stage)=>{
  vi.mocked(io.readSource).mockResolvedValueOnce(safe());if(stage==="after-ai")vi.mocked(io.readSource).mockResolvedValueOnce(safe());
  vi.mocked(io.readSource).mockResolvedValue({data:{...receipt,actor_id:id(9)},error:null});await expect(processVerifiedDocumentSummary(claim,io)).rejects.toThrow(SUMMARY_REVIEW_MESSAGE);expect(io.generate).toHaveBeenCalledTimes(stage==="after-ai"?1:0);expect(io.commit).not.toHaveBeenCalled();
});
it.each([new Uint8Array([0xff]),new Uint8Array([0]),new TextEncoder().encode(" "),new TextEncoder().encode("x".repeat(MAX_SUMMARY_TEXT+1))])("rejects invalid/binary/empty/oversize text without silent truncation",async(bytes)=>{
  receipt.content_sha256=hash(bytes);metadata.size=bytes.byteLength;vi.mocked(io.download).mockResolvedValue({data:new Blob([bytes]),error:null});await expect(processVerifiedDocumentSummary(claim,io)).rejects.toThrow(SUMMARY_REVIEW_MESSAGE);expect(io.generate).not.toHaveBeenCalled();
});
it.each([null,{raw:"Unstructured"},{...{},key_findings:[]},{key_findings:"Not an array"}])("rejects unstructured/incomplete model output %j",async(value)=>{
  vi.mocked(io.generate).mockResolvedValue(value);await expect(processVerifiedDocumentSummary(claim,io)).rejects.toThrow(SUMMARY_REVIEW_MESSAGE);expect(io.generate).toHaveBeenCalledOnce();expect(io.commit).not.toHaveBeenCalled();
});
it("redacts identifiers echoed or introduced in the result",async()=>{
  output.key_findings=["Jamie Example contact jamie@example.test"];await processVerifiedDocumentSummary(claim,io);const saved=JSON.stringify(vi.mocked(io.commit).mock.calls[0][1]);expect(saved).not.toContain("Jamie Example");expect(saved).not.toContain("jamie@example.test");
});
it("does not repeat the provider on an error or expose private diagnostics",async()=>{
  vi.mocked(io.generate).mockRejectedValue(new Error("PRIVATE provider/student body"));await expect(processVerifiedDocumentSummary(claim,io)).rejects.toThrow(SUMMARY_REVIEW_MESSAGE);expect(io.generate).toHaveBeenCalledOnce();expect(io.commit).not.toHaveBeenCalled();
});
it("does not retry an uncertain commit, even if the server completed it",async()=>{
  let completed=false;vi.mocked(io.commit).mockImplementation(async()=>{completed=true;return {data:null,error:{message:"PRIVATE transport"}};});await expect(processVerifiedDocumentSummary(claim,io)).rejects.toThrow(SUMMARY_REVIEW_MESSAGE);expect(completed).toBe(true);expect(io.commit).toHaveBeenCalledOnce();expect(io.generate).toHaveBeenCalledOnce();
});
it("requires the exact completion receipt",async()=>{
  vi.mocked(io.commit).mockResolvedValue({data:{status:"completed"},error:null});await expect(processVerifiedDocumentSummary(claim,io)).rejects.toThrow(SUMMARY_REVIEW_MESSAGE);expect(io.commit).toHaveBeenCalledOnce();
});
