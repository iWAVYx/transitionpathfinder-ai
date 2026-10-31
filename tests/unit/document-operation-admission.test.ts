import { afterEach, describe, expect, it, vi } from "vitest";
import { DocumentOperationAdmissionError, runAdmittedDocumentOperation } from "../../src/lib/document-operation-admission.server";
const id = (n:number) => `00000000-0000-4000-8000-${String(n).padStart(12,"0")}`;
const actorId=id(1), operationId=id(2), receiptId=id(3);
function fixture() {
  vi.spyOn(crypto,"randomUUID").mockReturnValue(operationId);
  const events:string[]=[];
  const rpc=vi.fn(async(name:string,args:Record<string,unknown>)=>{
    events.push(name);
    return {data:name==='begin_document_operation'
      ? {schema:'document-operation-admitted-v1',operation_id:args._operation_id,receipt_id:receiptId,revision:2}
      : {schema:'document-operation-finished-v1',operation_id:args._operation_id,state:args._outcome},error:null};
  });
  const work=vi.fn(async()=>{events.push('work');return {ok:true,source:'unchanged'};});
  const run=()=>runAdmittedDocumentOperation({serviceClient:{rpc},actorId,kind:'register'},work);
  return {rpc,events,work,run};
}
afterEach(()=>vi.restoreAllMocks());
describe('dormant service admission adapter',()=>{
 it.each(['register','rescan','apply','summary'] as const)('keeps %s work between one validated admission and completion',async kind=>{
  const f=fixture();const result=await runAdmittedDocumentOperation({serviceClient:{rpc:f.rpc},actorId,kind},f.work);
  expect(result).toEqual({ok:true,source:'unchanged'});expect(f.events).toEqual(['begin_document_operation','work','finish_document_operation']);
  expect(f.rpc).toHaveBeenNthCalledWith(1,'begin_document_operation',{_operation_id:operationId,_actor_id:actorId,_operation_kind:kind});
  expect(f.rpc).toHaveBeenNthCalledWith(2,'finish_document_operation',{_operation_id:operationId,_actor_id:actorId,_receipt_id:receiptId,_outcome:'completed'});
  expect(f.work).toHaveBeenCalledExactlyOnceWith();
 });
 it.each([
  null, {}, {schema:'wrong',operation_id:operationId,receipt_id:receiptId,revision:2},
  {schema:'document-operation-admitted-v1',operation_id:id(9),receipt_id:receiptId,revision:2},
  {schema:'document-operation-admitted-v1',operation_id:operationId,receipt_id:'private-invalid-value',revision:2},
  ...[0,-1,1.5,Number.MAX_SAFE_INTEGER+1,'2'].map(revision=>({schema:'document-operation-admitted-v1',operation_id:operationId,receipt_id:receiptId,revision})),
  {schema:'document-operation-admitted-v1',operation_id:operationId,receipt_id:receiptId,revision:2,unexpected:'private'},
 ])('does not execute or finish work after invalid admission %#',async data=>{
  const f=fixture();f.rpc.mockResolvedValueOnce({data,error:null} as never);
  await expect(f.run()).rejects.toMatchObject({phase:'admission',reconciliationRequired:true});expect(f.work).not.toHaveBeenCalled();expect(f.rpc).toHaveBeenCalledTimes(1);
 });
 it.each(['rpc-error','lost-response','missing-function','duplicate-operation'])('stops on %s admission without retry or callbacks',async failure=>{
  const f=fixture();if(failure==='lost-response')f.rpc.mockRejectedValueOnce(new Error('PRIVATE source/vendor payload'));else f.rpc.mockResolvedValueOnce({data:null,error:{message:'PRIVATE backend details',code:failure}} as never);
  const error=await f.run().catch(e=>e);expect(error).toBeInstanceOf(DocumentOperationAdmissionError);expect(error.phase).toBe('admission');expect(String(error)).not.toContain('PRIVATE');expect(error.cause).toBeUndefined();expect(f.work).not.toHaveBeenCalled();expect(f.rpc).toHaveBeenCalledTimes(1);
 });
 it('refuses an error-bearing admission even when the receipt looks valid',async()=>{const f=fixture();f.rpc.mockResolvedValueOnce({data:{schema:'document-operation-admitted-v1',operation_id:operationId,receipt_id:receiptId,revision:2},error:{message:'PRIVATE'}} as never);await expect(f.run()).rejects.toMatchObject({phase:'admission'});expect(f.work).not.toHaveBeenCalled();expect(f.rpc).toHaveBeenCalledTimes(1);});
 it('records uncertainty once after failed work and never exposes private failure text',async()=>{
  const f=fixture();f.work.mockRejectedValueOnce(new Error('PRIVATE document contents'));await expect(f.run()).rejects.toMatchObject({phase:'work',message:expect.not.stringContaining('PRIVATE')});expect(f.rpc).toHaveBeenCalledTimes(2);expect(f.rpc.mock.calls[1][1]._outcome).toBe('needs_review');expect(f.work).toHaveBeenCalledTimes(1);
 });
 it.each(['lost-response','error','wrong-state','foreign-operation','extra-field'])('retains a safe work error when uncertainty marking has %s',async failure=>{
  const f=fixture();f.work.mockRejectedValueOnce(new Error('PRIVATE primary'));
  const first=f.rpc.getMockImplementation()!;f.rpc.mockImplementation(async(name,args)=>{
   if(name==='begin_document_operation')return first(name,args);
   if(failure==='lost-response')throw Error('PRIVATE lost');
   return {data:{schema:'document-operation-finished-v1',operation_id:failure==='foreign-operation'?id(8):operationId,state:failure==='wrong-state'?'completed':'needs_review',...(failure==='extra-field'?{extra:'PRIVATE'}:{})},error:failure==='error'?{message:'PRIVATE'}:null};
  });
  const error=await f.run().catch(e=>e);expect(error.phase).toBe('work');expect(String(error)).not.toContain('PRIVATE');expect(f.rpc).toHaveBeenCalledTimes(2);expect(f.work).toHaveBeenCalledTimes(1);
 });
 it.each(['lost-response','error','wrong-state','foreign-operation','missing','extra-field'])('does not repeat or clear a potentially committed completion after %s',async failure=>{
  const f=fixture();const first=f.rpc.getMockImplementation()!;f.rpc.mockImplementation(async(name,args)=>{
   if(name==='begin_document_operation')return first(name,args);
   if(failure==='lost-response')throw Error('PRIVATE completion lost');
   return {data:failure==='missing'?null:{schema:'document-operation-finished-v1',operation_id:failure==='foreign-operation'?id(8):operationId,state:failure==='wrong-state'?'needs_review':'completed',...(failure==='extra-field'?{extra:'PRIVATE'}:{})},error:failure==='error'?{message:'PRIVATE'}:null};
  });
  const error=await f.run().catch(e=>e);expect(error.phase).toBe('completion');expect(error.reconciliationRequired).toBe(true);expect(String(error)).not.toContain('PRIVATE');expect(f.rpc).toHaveBeenCalledTimes(2);expect(f.rpc.mock.calls[1][1]._outcome).toBe('completed');expect(f.work).toHaveBeenCalledTimes(1);
 });
 it.each([{actorId:'invalid',kind:'register'},{actorId,kind:'delete'}])('rejects invalid server context before an RPC',async input=>{const f=fixture();await expect(runAdmittedDocumentOperation({serviceClient:{rpc:f.rpc},...input} as never,f.work)).rejects.toMatchObject({phase:'admission'});expect(f.rpc).not.toHaveBeenCalled();expect(f.work).not.toHaveBeenCalled();});
 it.each([null,undefined])('refuses missing server context %# without exposing validation details',async input=>{const f=fixture();await expect(runAdmittedDocumentOperation(input as never,f.work)).rejects.toMatchObject({phase:'admission'});expect(f.rpc).not.toHaveBeenCalled();expect(f.work).not.toHaveBeenCalled();});
 it('does not run work with an unavailable service client',async()=>{const f=fixture();await expect(runAdmittedDocumentOperation({serviceClient:null,actorId,kind:'apply'},f.work)).rejects.toMatchObject({phase:'admission'});expect(f.work).not.toHaveBeenCalled();});
 it('does not admit work if a valid server operation ID cannot be generated',async()=>{const f=fixture();vi.mocked(crypto.randomUUID).mockReturnValueOnce('invalid' as never);await expect(f.run()).rejects.toMatchObject({phase:'admission'});expect(f.rpc).not.toHaveBeenCalled();expect(f.work).not.toHaveBeenCalled();});
 it('keeps unfinished work active without sending an early completion',async()=>{
  const f=fixture();let resolve!:()=>void;f.work.mockImplementationOnce(()=>new Promise(r=>{resolve=()=>r({ok:true,source:'unchanged'});}));const pending=f.run();await vi.waitFor(()=>expect(f.work).toHaveBeenCalledTimes(1));expect(f.rpc).toHaveBeenCalledTimes(1);resolve();await pending;expect(f.rpc).toHaveBeenCalledTimes(2);
 });
 it('does not provide the service client or receipt to work callbacks',async()=>{const f=fixture();await f.run();expect(f.work.mock.calls[0]).toEqual([]);expect(f.rpc.mock.calls[1][1]._receipt_id).toBe(receiptId);});
});
