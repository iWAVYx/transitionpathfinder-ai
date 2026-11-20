import { it, expect, vi } from "vitest";
import { loadOrInitializeDocumentReview, parseDocumentReviewLoadRequest, DOCUMENT_REVIEW_LOAD_MESSAGE } from "../../src/lib/document-review-initialization.server";
import { EXTRACTION_SECTION_KEYS } from "../../src/lib/document-review-edit.server";
const actor="00000000-0000-4000-8000-000000000001", document="00000000-0000-4000-8000-000000000002", student="00000000-0000-4000-8000-000000000003", review="00000000-0000-4000-8000-000000000004", other="00000000-0000-4000-8000-000000000005";
const input={expected_viewer_id:actor,document_id:document};
const sections=()=>Object.fromEntries(EXTRACTION_SECTION_KEYS.map(key=>[key,{state:"pending",value:"",original_value:"",notes:""}]));
const row=()=>({id:review,document_id:document,student_id:student,status:"pending",sections:sections(),updated_at:"2026-11-15T12:00:00.123456+00:00",created_by:actor,raw_extract:{},missing_information:[],suggested_questions:[],review_notes:null,reviewer_id:null,reviewed_at:null});
function fixture(existing: unknown=null){
 const state={doc:{data:{id:document,student_id:student},error:null} as any,existing:{data:existing,error:null} as any,saved:{data:row(),error:null} as any,throwInsert:false};
 const reads=vi.fn();const inserts=vi.fn();
 const rpc=vi.fn(async(name:string,_args:unknown)=>({data:name!=="is_partner_only",error:null}));
 function query(table:string,writing=false):any {const q={eq:vi.fn(()=>q),select:()=>q,maybeSingle:async()=>{reads(table);return table==="documents"?state.doc:state.existing;},single:async()=>{if(state.throwInsert)throw Error("PRIVATE lost response");return state.saved;}};return q;}
 const from=vi.fn((table:string)=>({select:()=>query(table),insert:(value:unknown)=>{inserts(value);return query(table,true);}}));
 const run=(data:unknown=input,user=actor)=>loadOrInitializeDocumentReview({rpc,from},user,data);
 return {state,rpc,reads,inserts,from,run};
}
it.each([undefined,{}, {document_id:document}, {...input,expected_viewer_id:other}])("rejects missing/stale viewer intent before any database access",async value=>{
 const f=fixture();await expect(f.run(value===undefined?{}:value)).rejects.toThrow(DOCUMENT_REVIEW_LOAD_MESSAGE);expect(f.from).not.toHaveBeenCalled();expect(f.rpc).not.toHaveBeenCalled();
});
it("keeps invalid request diagnostics user-friendly",()=>{expect(()=>parseDocumentReviewLoadRequest({document_id:"PRIVATE invalid identifier"})).toThrow(DOCUMENT_REVIEW_LOAD_MESSAGE);});
it("returns the current existing review without writing or requiring editing access",async()=>{
 const existing={...row(),status:"in_review",sections:{strengths:{state:"edited",value:"Recorded choice",original_value:"Original choice",notes:"Recorded note"}}};const f=fixture(existing);
 expect((await f.run()).extraction).toMatchObject(existing);expect(f.inserts).not.toHaveBeenCalled();expect(f.rpc.mock.calls.some(([name])=>name==="can_edit_student")).toBe(false);
 expect(f.reads.mock.calls.map(([table])=>table)).toEqual(["documents","document_extractions"]);
});
it("initializes exactly one empty twelve-section review with the authenticated creator",async()=>{
 const f=fixture();const result=await f.run();expect(result.extraction.id).toBe(review);expect(f.inserts).toHaveBeenCalledExactlyOnceWith({document_id:document,student_id:student,status:"pending",sections:sections(),created_by:actor});
 expect(f.rpc.mock.calls.map(([name])=>name)).toEqual(["can_access_student","can_view_document","can_edit_student","is_partner_only","can_access_student","can_view_document"]);
});
it.each(["can_access_student","can_view_document","can_edit_student","is_partner_only"])("fails closed on denied %s without initialization",async denied=>{
 const f=fixture();f.rpc.mockImplementation(async name=>({data:name===denied ? name==="is_partner_only" : name!=="is_partner_only",error:null}));
 await expect(f.run()).rejects.toThrow(DOCUMENT_REVIEW_LOAD_MESSAGE);expect(f.inserts).not.toHaveBeenCalled();
});
it("does not treat an existing-review read error as permission to insert",async()=>{const f=fixture();f.state.existing.error={message:"PRIVATE unavailable"};await expect(f.run()).rejects.toThrow(DOCUMENT_REVIEW_LOAD_MESSAGE);expect(f.inserts).not.toHaveBeenCalled();});
it.each([null,{id:other,student_id:student},{id:document,student_id:null}])("refuses missing/mismatched document identity",async data=>{const f=fixture();f.state.doc.data=data;await expect(f.run()).rejects.toThrow(DOCUMENT_REVIEW_LOAD_MESSAGE);expect(f.inserts).not.toHaveBeenCalled();});
it.each(["document_id","student_id"])("refuses an existing review attached to another %s",async key=>{const f=fixture({...row(),[key]:other});await expect(f.run()).rejects.toThrow(DOCUMENT_REVIEW_LOAD_MESSAGE);expect(f.inserts).not.toHaveBeenCalled();});
it.each([null,{}, {...row(),created_by:other},{...row(),status:"complete"},{...row(),sections:{}},{...row(),sections:{...sections(),strengths:{state:"pending",value:"Unexpected generated content",original_value:"",notes:""}}}])("requires a valid matching empty initialization receipt",async data=>{const f=fixture();f.state.saved.data=data;await expect(f.run()).rejects.toThrow(DOCUMENT_REVIEW_LOAD_MESSAGE);expect(f.inserts).toHaveBeenCalledOnce();});
it.each(["lost","conflict"])("does not retry or upsert after an uncertain/concurrent %s",async outcome=>{const f=fixture();if(outcome==="lost")f.state.throwInsert=true;else f.state.saved.error={code:"23505"};await expect(f.run()).rejects.toThrow(DOCUMENT_REVIEW_LOAD_MESSAGE);expect(f.inserts).toHaveBeenCalledOnce();expect(f.reads.mock.calls.filter(([table])=>table==="document_extractions")).toHaveLength(1);});
it("refuses to return existing private text if read authority disappears during the load",async()=>{const f=fixture(row());let calls=0;f.rpc.mockImplementation(async name=>({data:++calls<3,error:null}));await expect(f.run()).rejects.toThrow(DOCUMENT_REVIEW_LOAD_MESSAGE);expect(f.inserts).not.toHaveBeenCalled();});
it("does not claim a new review opened when post-insert read access cannot be confirmed",async()=>{const f=fixture();let calls=0;f.rpc.mockImplementation(async name=>({data:++calls>4?false:name!=="is_partner_only",error:null}));await expect(f.run()).rejects.toThrow(DOCUMENT_REVIEW_LOAD_MESSAGE);expect(f.inserts).toHaveBeenCalledOnce();});

it.each(["raw_extract","missing_information","suggested_questions","review_notes","reviewer_id","reviewed_at"])("refuses unexpected saved %s in an initialization receipt",async key=>{const f=fixture();f.state.saved.data={...row(),[key]:key==="raw_extract"?{strengths:"unexpected content"}:key.endsWith("information")||key==="suggested_questions"?["unexpected content"]:"unexpected content"};await expect(f.run()).rejects.toThrow(DOCUMENT_REVIEW_LOAD_MESSAGE);expect(f.inserts).toHaveBeenCalledOnce();});
