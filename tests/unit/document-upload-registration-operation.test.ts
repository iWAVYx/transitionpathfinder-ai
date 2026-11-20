import { describe, expect, it, vi } from "vitest";
import { runClaimedDocumentRegistration } from "../../src/lib/document-upload-registration-operation.server";
const id = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const context = { actorId:id(1), studentId:id(2), attemptId:id(3), contentSha256:"a".repeat(64), reviewContextSha256:"b".repeat(64) };
const claim = {
 schema:"document-upload-registration-operation-v1", actor_id:context.actorId, student_id:context.studentId,
 attempt_id:context.attemptId, storage_path:`${id(2)}/${id(3)}-privacy-safe-document.txt`,
 content_sha256:context.contentSha256, review_context_sha256:context.reviewContextSha256,
 operation_id:id(4), receipt_id:id(5), revision:2, object_id:id(6), object_version:"v1", claimed_at:"2026-10-30T12:00:00+00:00",
};
function fixture() {
 const rpc=vi.fn(async(name:string,args:Record<string,unknown>):Promise<{data:unknown;error:unknown}> => ({
  data:name==="claim_document_upload_registration_operation" ? {...claim} : {schema:"document-operation-finished-v1", operation_id:args._operation_id, state:args._outcome},error:null,
 }));
 const work=vi.fn(async(_source:unknown)=>({saved:true}));
 const run=()=>runClaimedDocumentRegistration({...context,serviceClient:{rpc}},work);
 return {rpc,work,run};
}
describe("prepared one-use registration continuation",()=>{
 it("continues the bound reservation without beginning a new operation or exposing capability tokens",async()=>{
  const f=fixture();expect(await f.run()).toEqual({saved:true});
  expect(f.rpc).toHaveBeenNthCalledWith(1,"claim_document_upload_registration_operation",{_attempt_id:id(3),_actor_id:id(1),_review_context_sha256:"b".repeat(64)});
  expect(f.work).toHaveBeenCalledExactlyOnceWith({objectId:id(6),objectVersion:"v1",storagePath:claim.storage_path,contentSha256:context.contentSha256});
  expect(Object.isFrozen(f.work.mock.calls[0][0])).toBe(true);
  expect(f.rpc).toHaveBeenNthCalledWith(2,"finish_document_operation",{_operation_id:id(4),_actor_id:id(1),_receipt_id:id(5),_outcome:"completed"});
  expect(f.rpc).toHaveBeenCalledTimes(2);
 });
 it.each([
  null,{}, {...claim,schema:"wrong"}, {...claim,actor_id:id(8)}, {...claim,student_id:id(8)}, {...claim,attempt_id:id(8)},
  {...claim,storage_path:"other/path"}, {...claim,content_sha256:"c".repeat(64)}, {...claim,review_context_sha256:"c".repeat(64)},
  {...claim,receipt_id:"PRIVATE"}, {...claim,operation_id:"PRIVATE"}, {...claim,object_id:"invalid"},
  ...[0,-1,1.5,Number.MAX_SAFE_INTEGER+1,"2"].map(revision=>({...claim,revision})),
  ...[""," "," v1", "x".repeat(1025)].map(object_version=>({...claim,object_version})),
  {...claim,claimed_at:"invalid"}, {...claim,extra:"PRIVATE"},
 ])("does no work or finish after an invalid or foreign claim %#",async data=>{
  const f=fixture();f.rpc.mockResolvedValueOnce({data,error:null});await expect(f.run()).rejects.toMatchObject({phase:"admission",reconciliationRequired:true});
  expect(f.work).not.toHaveBeenCalled();expect(f.rpc).toHaveBeenCalledTimes(1);
 });
 it.each(["lost","error","undefined-error"])("never repeats an uncertain %s claim",async failure=>{
  const f=fixture();if(failure==="lost")f.rpc.mockRejectedValueOnce(Error("PRIVATE"));
  else f.rpc.mockResolvedValueOnce({data:claim,error:failure==="error"?{message:"PRIVATE"}:undefined});
  const error=await f.run().catch(e=>e);expect(error.phase).toBe("admission");expect(String(error)).not.toContain("PRIVATE");expect(error.cause).toBeUndefined();
  expect(f.rpc).toHaveBeenCalledTimes(1);expect(f.work).not.toHaveBeenCalled();
 });
 it.each([null,undefined,{...context,actorId:"invalid"},{...context,contentSha256:"A".repeat(64)},{...context,receipt_id:id(9)}])("rejects invalid server context before claiming %#",async raw=>{
  const f=fixture();const input=raw==null?raw:{...raw,serviceClient:{rpc:f.rpc}};
  await expect(runClaimedDocumentRegistration(input as never,f.work)).rejects.toMatchObject({phase:"admission"});expect(f.rpc).not.toHaveBeenCalled();expect(f.work).not.toHaveBeenCalled();
 });
 it("does not finish while work remains pending",async()=>{
  const f=fixture();let resolve!:(value:{saved:boolean})=>void;f.work.mockImplementationOnce(()=>new Promise(r=>{resolve=r;}));
  const pending=f.run();await vi.waitFor(()=>expect(f.work).toHaveBeenCalledTimes(1));expect(f.rpc).toHaveBeenCalledTimes(1);resolve({saved:true});await pending;expect(f.rpc).toHaveBeenCalledTimes(2);
 });
 it.each(["confirmed","lost","error"])("marks work failure once with %s hold response",async mode=>{
  const f=fixture();f.work.mockRejectedValueOnce(Error("PRIVATE document"));
  if(mode==="lost")f.rpc.mockResolvedValueOnce({data:claim,error:null}).mockRejectedValueOnce(Error("PRIVATE"));
  if(mode==="error")f.rpc.mockResolvedValueOnce({data:claim,error:null}).mockResolvedValueOnce({data:null,error:{message:"PRIVATE"}});
  const error=await f.run().catch(e=>e);expect(error.phase).toBe("work");expect(String(error)).not.toContain("PRIVATE");expect(f.rpc).toHaveBeenCalledTimes(2);expect(f.rpc.mock.calls[1][1]._outcome).toBe("needs_review");
 });
 it.each(["lost","error","wrong-id","wrong-state","extra","missing"])("never retries potentially committed %s completion",async mode=>{
  const f=fixture();f.rpc.mockResolvedValueOnce({data:claim,error:null});
  if(mode==="lost")f.rpc.mockRejectedValueOnce(Error("PRIVATE"));
  else f.rpc.mockResolvedValueOnce({data:mode==="missing"?null:{schema:"document-operation-finished-v1",operation_id:mode==="wrong-id"?id(9):id(4),state:mode==="wrong-state"?"needs_review":"completed",...(mode==="extra"?{extra:"PRIVATE"}:{})},error:mode==="error"?{message:"PRIVATE"}:null});
  const error=await f.run().catch(e=>e);expect(error.phase).toBe("completion");expect(String(error)).not.toContain("PRIVATE");expect(f.work).toHaveBeenCalledTimes(1);expect(f.rpc).toHaveBeenCalledTimes(2);expect(f.rpc.mock.calls[1][1]._outcome).toBe("completed");
 });
});
