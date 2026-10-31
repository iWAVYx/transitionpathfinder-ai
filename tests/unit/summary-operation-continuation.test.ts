import { beforeEach, expect, it, vi } from "vitest";
import { claimAdmittedSummaryOperation, confirmSummaryOperationClaim, runClaimedSummaryOperation } from "../../supabase/functions/ai-job-processor/document-operation-admission";
const id=(n:number)=>`00000000-0000-4000-8000-${String(n).padStart(12,"0")}`;
const job={id:id(1),student_id:id(3),triggered_by_user_id:id(4),attempts:0};
const receipt={schema:"document-summary-operation-claim-v1" as const,job_id:id(1),claim_at:"2026-10-30T12:00:00Z",claim_attempt:1,actor_id:id(4),student_id:id(3),document_id:id(2),object_id:id(5),object_version:"v1",storage_path:`${id(3)}/nonce-privacy-safe-document.txt`,content_sha256:"a".repeat(64),operation_id:id(7),receipt_id:id(8),revision:2};
const expected={jobId:id(1),actorId:id(4),studentId:id(3),attempt:1};
let rpc:ReturnType<typeof vi.fn>;
beforeEach(()=>{rpc=vi.fn(async(name:string,args:Record<string,unknown>)=>({data:name==="claim_admitted_document_summary"?{...receipt}:{schema:"document-operation-finished-v1",operation_id:args._operation_id,state:args._outcome},error:null}));});
it("claims once and continues without creating another admission or disclosing a capability to work",async()=>{
 const admitted=await claimAdmittedSummaryOperation({rpc},job);expect(Object.isFrozen(admitted)).toBe(true);
 const work=vi.fn(async()=>({saved:true}));expect(await runClaimedSummaryOperation({rpc},admitted,work)).toEqual({saved:true});
 expect(rpc).toHaveBeenNthCalledWith(1,"claim_admitted_document_summary",{_job_id:id(1),_expected_attempt:0});
 expect(rpc).toHaveBeenNthCalledWith(2,"finish_document_operation",{_operation_id:id(7),_actor_id:id(4),_receipt_id:id(8),_outcome:"completed"});expect(work).toHaveBeenCalledExactlyOnceWith();expect(rpc).toHaveBeenCalledTimes(2);
});
it.each([null,{},...['job_id','actor_id','student_id'].map(k=>({...receipt,[k]:id(9)})),...['document_id','object_id','operation_id','receipt_id'].map(k=>({...receipt,[k]:'invalid'})),...['', 'invalid','2026-10-30T12:00:00'].map(claim_at=>({...receipt,claim_at})),...[0,-1,1.5,Number.MAX_SAFE_INTEGER+1,'2'].map(revision=>({...receipt,revision})),{...receipt,claim_attempt:2},{...receipt,schema:'old'},{...receipt,extra:'PRIVATE'},{...receipt,content_sha256:'legacy'},{...receipt,object_version:' '},{...receipt,storage_path:`${id(9)}/privacy-safe-document.txt`}])("rejects partial, malformed or foreign claimed receipt %# without a finish",async data=>{
 rpc.mockResolvedValueOnce({data,error:null});await expect(claimAdmittedSummaryOperation({rpc},job)).rejects.toMatchObject({phase:'admission',reconciliationRequired:true});expect(rpc).toHaveBeenCalledTimes(1);
});
it.each(['lost','error','missing-error'])('does not retry an uncertain %s claim',async mode=>{
 if(mode==='lost')rpc.mockRejectedValueOnce(Error('PRIVATE'));else rpc.mockResolvedValueOnce({data:receipt,error:mode==='error'?{message:'PRIVATE'}:undefined});
 const error=await claimAdmittedSummaryOperation({rpc},job).catch(e=>e);expect(error.phase).toBe('admission');expect(String(error)).not.toContain('PRIVATE');expect(error.cause).toBeUndefined();expect(rpc).toHaveBeenCalledTimes(1);
});
it.each([{...job,student_id:null},{...job,attempts:-1},{...job,attempts:2147483647},{...job,id:'invalid'},{...job,triggered_by_user_id:'invalid'}])('refuses invalid listed context before a claim %#',async value=>{
 await expect(claimAdmittedSummaryOperation({rpc},value)).rejects.toMatchObject({phase:'admission'});expect(rpc).not.toHaveBeenCalled();
});
it('does not let mutation of a transport object replace validated finish identity',()=>{
 const data={...receipt};const parsed=confirmSummaryOperationClaim(data,expected);data.receipt_id=id(9);expect(parsed.receipt_id).toBe(id(8));expect(Object.isFrozen(parsed)).toBe(true);
});
it.each(['confirmed','lost','error'])('retains work failure with one %s uncertainty finish',async mode=>{
 const work=vi.fn(async()=>{throw Error('PRIVATE source/provider');});if(mode==='lost')rpc.mockRejectedValueOnce(Error('PRIVATE'));if(mode==='error')rpc.mockResolvedValueOnce({data:null,error:{message:'PRIVATE'}});
 const error=await runClaimedSummaryOperation({rpc},receipt,work).catch(e=>e);expect(error.phase).toBe('work');expect(String(error)).not.toContain('PRIVATE');expect(rpc).toHaveBeenCalledExactlyOnceWith('finish_document_operation',{_operation_id:id(7),_actor_id:id(4),_receipt_id:id(8),_outcome:'needs_review'});
});
it.each(['lost','error','wrong-id','wrong-state','extra','missing'])('never repeats potentially committed %s finish',async mode=>{
 if(mode==='lost')rpc.mockRejectedValueOnce(Error('PRIVATE'));else rpc.mockResolvedValueOnce({data:mode==='missing'?null:{schema:'document-operation-finished-v1',operation_id:mode==='wrong-id'?id(9):id(7),state:mode==='wrong-state'?'needs_review':'completed',...(mode==='extra'?{extra:'PRIVATE'}:{})},error:mode==='error'?{message:'PRIVATE'}:null});
 const work=vi.fn(async()=>({saved:true}));const error=await runClaimedSummaryOperation({rpc},receipt,work).catch(e=>e);expect(error.phase).toBe('completion');expect(String(error)).not.toContain('PRIVATE');expect(rpc).toHaveBeenCalledTimes(1);expect(rpc.mock.calls[0][1]._outcome).toBe('completed');expect(work).toHaveBeenCalledExactlyOnceWith();
});
