import { beforeEach, expect, it, vi } from "vitest";
import { recoverInterruptedDocumentUploadIntent } from "../../src/lib/document-upload-reservation.server";
const id=(n:number)=>`00000000-0000-4000-8000-${String(n).padStart(12,"0")}`;
const actor=id(1),student=id(2),attempt=id(3),document=id(4),path=`${student}/${attempt}-privacy-safe-document.txt`;
const saved={id:attempt,actor_id:actor,student_id:student,storage_path:path,review_context_sha256:"a".repeat(64),state:"registered",registered_document_id:document,held_at:null,hold_reason:null};
const receipt={schema:"document-upload-registration-v1",attempt_id:attempt,actor_id:actor,student_id:student,storage_path:path,document_id:document,scan_status:"clean",review_status:"pending_review",archived_at:null,deleted_at:null};
const read=vi.fn(),rpc=vi.fn(),select=vi.fn();const client={rpc,from:vi.fn(()=>({select}))};
const run=()=>recoverInterruptedDocumentUploadIntent(client,actor,{student_id:student,attempt_id:attempt});
beforeEach(()=>{vi.resetAllMocks();select.mockReturnValue({eq:()=>({maybeSingle:read})});read.mockResolvedValue({data:saved,error:null});rpc.mockResolvedValue({data:receipt,error:null});});
it("reads only caller-RLS attempt metadata then the completed-only RPC, returning no review hash or capabilities",async()=>{
 const result=await run();expect(result).toEqual({...receipt,id:document});expect(result).not.toHaveProperty("review_context_sha256");
 expect(client.from).toHaveBeenCalledExactlyOnceWith("document_upload_attempts");expect(select.mock.calls[0][0]).not.toBe("*");
 expect(rpc).toHaveBeenCalledExactlyOnceWith("read_document_upload_registration",{_attempt_id:attempt,_review_context_sha256:"a".repeat(64)});
});
it.each([null,{},...["actor_id","student_id","id","storage_path","review_context_sha256","registered_document_id"].map(k=>({...saved,[k]:"foreign"})),{...saved,state:"reserved"},{...saved,state:"review_required"},{...saved,held_at:"2026-10-30"},{...saved,hold_reason:"needs_review"}])("refuses missing/foreign/unresolved attempt metadata %#",async data=>{
 read.mockResolvedValue({data,error:null});await expect(run()).rejects.toThrow("couldn't confirm this upload attempt");expect(rpc).not.toHaveBeenCalled();
});
it.each(["lost-read","error-read","lost-rpc","error-rpc","pending-rpc","foreign-rpc","missing-rpc"])("never treats %s as a completed result",async mode=>{
 if(mode==="lost-read")read.mockRejectedValue(Error("PRIVATE"));
 if(mode==="error-read")read.mockResolvedValue({data:saved,error:{message:"PRIVATE"}});
 if(mode==="lost-rpc")rpc.mockRejectedValue(Error("PRIVATE"));
 if(mode==="error-rpc")rpc.mockResolvedValue({data:receipt,error:{message:"PRIVATE"}});
 if(mode==="pending-rpc")rpc.mockResolvedValue({data:{...receipt,scan_status:"pending"},error:null});
 if(mode==="foreign-rpc")rpc.mockResolvedValue({data:{...receipt,document_id:id(9)},error:null});
 if(mode==="missing-rpc")rpc.mockResolvedValue({data:null,error:null});
 const error=await run().catch(e=>e);expect(String(error)).not.toContain("PRIVATE");expect(read).toHaveBeenCalledTimes(1);expect(rpc.mock.calls.length).toBeLessThanOrEqual(1);
});
it("does not accept a caller-supplied document pointer or review hash in place of stored metadata",async()=>{
 await recoverInterruptedDocumentUploadIntent(client,actor,{student_id:student,attempt_id:attempt,registered_document_id:id(9),review_context_sha256:"b".repeat(64)});
 expect(rpc.mock.calls[0][1]._review_context_sha256).toBe(saved.review_context_sha256);
});
