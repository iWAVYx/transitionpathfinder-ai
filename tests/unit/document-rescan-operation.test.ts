import {it,expect,vi} from 'vitest';
import {runBoundDocumentRescan} from '../../src/lib/document-rescan-operation.server';
const id='00000000-0000-4000-8000-000000000001',receipt='00000000-0000-4000-8000-000000000002',job='00000000-0000-4000-8000-000000000003';
const hash='a'.repeat(64),revision='2026-11-04T00:00:00.000001Z',pending='2026-11-04T00:00:00.000002Z';
function fixture(fault=''){
 const rpc=vi.fn(async(name:string,args:any)=>{
  let data:any;
  if(name==='begin_bound_document_rescan')data={schema:'document-rescan-source-claim-v1',operation_id:args._operation_id,receipt_id:receipt,revision:1,document_id:id,source_revision:revision,reserved_units:2};
  if(name==='mark_bound_document_rescan_pending')data={schema:'document-rescan-pending-v1',operation_id:args._operation_id,document_id:id,source_revision:revision,pending_revision:pending,content_sha256:hash};
  if(name==='persist_bound_document_rescan_result')data={schema:'document-rescan-outcome-v1',operation_id:args._operation_id,document_id:id,disposition:'clean_queued',outcome_revision:'2026-11-04T00:00:00.000003Z',summary_job_id:job};
  if(name==='finish_document_operation')data={schema:'document-operation-finished-v1',operation_id:args._operation_id,state:args._outcome};
  return {data,error:fault===name?{message:'private provider text'}:null};
 });
 const confirmPending=vi.fn(async()=>{}),prepareCopy=vi.fn(async()=>({contentHash:hash,confirmPending}));
 const scan=vi.fn(async()=>({ok:true,code:'clean',provider:'cloudmersive',scan_id:job,clean_result:true,threats:[],blocked_reasons:[],error_message:'private extra text'}));
 const run=()=>runBoundDocumentRescan({serviceClient:{rpc},actorId:id,documentId:id,revision,source:{student_id:id,storage_path:id+'/privacy-safe-document.txt',storage_object_id:job,storage_object_version:'1',content_hash:hash,size_bytes:24,mime_type:'text/plain',upload_attempt_id:receipt}},{prepareCopy,scan});
 return {run,rpc,scan,prepareCopy,confirmPending};
}
it('confirms microsecond revisions, checks access around scan and projects only allowed scanner fields',async()=>{
 const f=fixture();expect((await f.run()).summary_job_id).toBe(job);expect(f.confirmPending).toHaveBeenCalledTimes(2);
 expect(f.rpc.mock.calls.map(c=>c[0])).toEqual(['begin_bound_document_rescan','mark_bound_document_rescan_pending','persist_bound_document_rescan_result','finish_document_operation']);
 expect(f.rpc.mock.calls[2][1]._scan).not.toHaveProperty('error_message');
});
it('uncertain admission runs no copy, scanner or finish',async()=>{
 const f=fixture('begin_bound_document_rescan');await expect(f.run()).rejects.toMatchObject({phase:'admission'});expect(f.prepareCopy).not.toHaveBeenCalled();expect(f.scan).not.toHaveBeenCalled();expect(f.rpc).toHaveBeenCalledTimes(1);
});
it('uncertain pending never dispatches scanner and requests one hold',async()=>{
 const f=fixture('mark_bound_document_rescan_pending');await expect(f.run()).rejects.toMatchObject({phase:'work'});expect(f.scan).not.toHaveBeenCalled();expect(f.rpc.mock.calls.at(-1)?.[1]._outcome).toBe('needs_review');
});
it('lost completion never retries or rewrites a potentially committed result',async()=>{
 const f=fixture('finish_document_operation');await expect(f.run()).rejects.toMatchObject({phase:'completion'});expect(f.rpc.mock.calls.filter(c=>c[0]==='finish_document_operation')).toHaveLength(1);expect(f.scan).toHaveBeenCalledTimes(1);
});
it('uncertain result persistence stops with one hold and no second result write',async()=>{
 const f=fixture('persist_bound_document_rescan_result');await expect(f.run()).rejects.toMatchObject({phase:'work'});expect(f.rpc.mock.calls.filter(c=>c[0]==='persist_bound_document_rescan_result')).toHaveLength(1);expect(f.rpc.mock.calls.at(-1)?.[1]._outcome).toBe('needs_review');
});
