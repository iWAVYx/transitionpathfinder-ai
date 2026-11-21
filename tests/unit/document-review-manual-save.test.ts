import { expect, it, vi } from "vitest";
import { saveManualReviewEdit, REVIEW_EDIT_MESSAGE, sectionEditRequest, metaEditRequest } from "../../src/lib/document-review-edit.server";
import { createReviewSaveQueue } from "../../src/lib/document-review-save-queue";
const id=(n:number)=>`00000000-0000-4000-8000-${String(n).padStart(12,"0")}`;
const rev=(n:number)=>`2026-11-12T12:00:00.00000${n}+00:00`;
function fixture(){
 const input={expected_viewer_id:id(1),extraction_id:id(2),student_id:id(3),document_id:id(4),expected_updated_at:rev(1),key:"strengths",value:"Edited strength"};
 const state={row:{id:id(2),student_id:id(3),document_id:id(4),updated_at:rev(1),status:"in_review",sections:{strengths:{state:"accepted",value:"First strength",original_value:"Recorded strength",notes:"Keep this note"},interests:{state:"accepted",value:"Music",original_value:"Music",notes:""}},review_notes:"First note",suggested_questions:["Keep question"],missing_information:[]} as any,edit:true,partner:false,view:true,beforeWrite:()=>{},lost:false};
 const writes=vi.fn();
 const client={rpc:vi.fn(async(name:string)=>({data:name==='is_partner_only'?state.partner:name==='can_edit_student'?state.edit:state.view,error:null})),from:vi.fn(()=>{
  let patch:any, filters:Record<string,string>={};
  const q={select:()=>q,eq:(k:string,v:string)=>{filters[k]=v;return q;},update:(p:any)=>{patch=p;return q;},maybeSingle:async()=>{
   if(!patch)return {data:structuredClone(state.row),error:null};
   state.beforeWrite();writes(patch,filters);
   if(!state.row||Object.entries(filters).some(([k,v])=>state.row[k]!==v))return {data:null,error:null};
   state.row={...state.row,...patch,updated_at:rev(Number(state.row.updated_at[25])+1)};
   if(state.lost)throw Error('PRIVATE response');
   return {data:{id:state.row.id,updated_at:state.row.updated_at},error:null};
  }};return q;
 })};
 const run=(data:any=input,actor=id(1),kind:'section'|'meta'='section')=>saveManualReviewEdit(client,actor,data,kind);
 return {input,state,client,writes,run};
}
it('clears a field intentionally while preserving its recorded original and untouched fields',async()=>{const f=fixture();await f.run({...f.input,value:''});expect(f.state.row.sections.strengths).toEqual({state:'accepted',value:'',original_value:'Recorded strength',notes:'Keep this note'});expect(f.state.row.sections.interests.value).toBe('Music');expect(f.writes.mock.calls[0][1]).toEqual({id:id(2),document_id:id(4),student_id:id(3),updated_at:rev(1),status:'in_review'});});
it('patches only the chosen metadata field, including an empty list',async()=>{const f=fixture();const{key,value,...base}=f.input;await f.run({...base,missing_information:[]},id(1),'meta');expect(f.writes.mock.calls[0][0]).toEqual({missing_information:[]});expect(f.state.row.suggested_questions).toEqual(['Keep question']);});
for(const[name,alter]of [
 ['changed viewer',(f:any)=>f.input.expected_viewer_id=id(9)],['stale microsecond',(f:any)=>f.state.row.updated_at=rev(2)],['other student',(f:any)=>f.state.row.student_id=id(9)],['other document',(f:any)=>f.state.row.document_id=id(9)],['completed review',(f:any)=>f.state.row.status='complete'],['missing review',(f:any)=>f.state.row=null],['read only',(f:any)=>f.state.edit=false],['partner only',(f:any)=>f.state.partner=true],['inaccessible source',(f:any)=>f.state.view=false],
]as const)it(`refuses ${name} without attempting a write`,async()=>{const f=fixture();alter(f);await expect(f.run()).rejects.toThrow(REVIEW_EDIT_MESSAGE);expect(f.writes).not.toHaveBeenCalled();});
for(const[name,alter]of [['newer edit',(f:any)=>{f.state.row.updated_at=rev(2);f.state.row.sections.interests.value='Newer music';}],['deleted review',(f:any)=>f.state.row=null],['completed review',(f:any)=>f.state.row.status='complete']]as const)it(`refuses ${name} between read and atomic update without retry`,async()=>{const f=fixture();f.state.beforeWrite=()=>alter(f);await expect(f.run()).rejects.toThrow(REVIEW_EDIT_MESSAGE);expect(f.writes).toHaveBeenCalledOnce();if(f.state.row)expect(f.state.row.sections.strengths.value).toBe('First strength');});
it('does not replay a save after a lost successful reply or expose private text',async()=>{const f=fixture();f.state.lost=true;await expect(f.run()).rejects.toThrow(REVIEW_EDIT_MESSAGE);expect(f.state.row.sections.strengths.value).toBe('Edited strength');expect(f.writes).toHaveBeenCalledOnce();});
it('rejects missing revision, empty patches, completion markers and original-source fields',()=>{const f=fixture();const{expected_updated_at,key,value,...rest}=f.input;expect(sectionEditRequest.safeParse({...rest,key,value}).success).toBe(false);expect(sectionEditRequest.safeParse({...f.input,original_value:'forged'}).success).toBe(false);expect(metaEditRequest.safeParse({...rest,expected_updated_at,reviewer_id:id(9)}).success).toBe(false);expect(metaEditRequest.safeParse({...rest,expected_updated_at}).success).toBe(false);});
it('serializes rapid section and note edits using each confirmed revision',async()=>{const f=fixture(),queue=createReviewSaveQueue(rev(1));const saves=[queue.enqueue(r=>f.run({...f.input,expected_updated_at:r})),queue.enqueue(r=>f.run({...f.input,expected_updated_at:r,value:undefined,notes:'New note'}))];expect(queue.pending).toBe(2);await Promise.all(saves);expect(f.state.row.sections.strengths).toEqual({state:'accepted',value:'Edited strength',original_value:'Recorded strength',notes:'New note'});expect(f.writes.mock.calls.map(c=>c[1].updated_at)).toEqual([rev(1),rev(2)]);expect(queue.pending).toBe(0);});
it('blocks queued work after a failed/uncertain save without rebasing or retrying',async()=>{const queue=createReviewSaveQueue(rev(1)),first=vi.fn().mockRejectedValue(Error('Lost reply')),second=vi.fn();const outcomes=await Promise.allSettled([queue.enqueue(first),queue.enqueue(second)]);expect(outcomes.map(x=>x.status)).toEqual(['rejected','rejected']);expect(first).toHaveBeenCalledOnce();expect(second).not.toHaveBeenCalled();expect(queue.failed).toBe(true);expect(queue.pending).toBe(0);});
it('invalidates pending work on viewer/document departure',async()=>{const queue=createReviewSaveQueue(rev(1)),save=vi.fn();const work=queue.enqueue(save);queue.cancel();await expect(work).rejects.toThrow('Reload');expect(save).not.toHaveBeenCalled();});
it('never dispatches the next queued save after departure during an active request',async()=>{const queue=createReviewSaveQueue(rev(1));let finish!:(r:{updated_at:string})=>void;const active=queue.enqueue(()=>new Promise(resolve=>{finish=resolve;}));const next=vi.fn();const pending=queue.enqueue(next);const results=Promise.allSettled([active,pending]);await Promise.resolve();queue.cancel();finish({updated_at:rev(2)});expect((await results).every(r=>r.status==='rejected')).toBe(true);expect(next).not.toHaveBeenCalled();});
