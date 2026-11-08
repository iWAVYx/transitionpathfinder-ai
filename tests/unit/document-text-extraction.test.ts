import { expect, it, vi } from "vitest";
import { DOCUMENT_TEXT_START_MESSAGE } from "../../src/lib/document-text-admission.server";
import { DOCUMENT_TEXT_REVIEW_MESSAGE as message, replaceDocumentTextExtraction } from "../../src/lib/document-text-extraction.server";
const id = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const revision = "2026-11-05T12:00:00.000001+00:00";
function fixture() {
  const input = { expected_viewer_id: id(1), document_id: id(2), student_id: id(3), extraction_id: id(4), expected_updated_at: revision,
    text: "Fictional IEP text with recorded supports and transition interests." };
  const state = {
    review: { id: id(4), document_id: id(2), student_id: id(3), updated_at: revision, status: "in_review", sections: { strengths: "Keep my edits" }, created_by: id(9), created_at: revision, doc_type: "iep", source_label: null, missing_information: [], suggested_questions: [], review_notes: null, reviewed_at: null, reviewer_id: null, raw_extract: {} } as any,
    document: { id: id(2), student_id: id(3), updated_at: revision, scan_status: "clean", review_status: "accepted", archived_at: null, deleted_at: null } as any,
    permission: true, partner: false, saveError: null as unknown, afterSave: false, beforeUpdate: () => {},
  };
  const updates = vi.fn();
  const client = { rpc: vi.fn(async (name: string, args?: any) => {
    if(name !== "save_bound_document_text_review") return {data:name === "is_partner_only" ? state.partner : state.permission,error:null};
    state.beforeUpdate();
    updates(args);
    if(!state.review || state.review.id!==args._extraction_id || state.review.document_id!==args._document_id
      || state.review.student_id!==args._student_id || state.review.updated_at!==args._expected_review_revision
      || state.review.status!==args._expected_review_status || !state.document || state.document.updated_at!==args._expected_document_revision)
      return {data:null,error:{code:"42501"}};
    state.review={...state.review,raw_extract:args._raw_extract,sections:args._sections,status:"needs_review",updated_at:"2026-11-05T12:00:00.000002+00:00"};
    if(state.afterSave)throw Error("PRIVATE lost response");
    return {data:{schema:"bound-document-text-review-saved-v1",operation_id:args._operation_id,operation_state:"completed",extraction:structuredClone(state.review)},error:state.saveError};
  }),
    from: vi.fn((table: string) => {
      const query = { select: (_: string) => query, eq: (_key: string, _value: string) => query,
        maybeSingle: async () => ({ data: structuredClone(table === "documents" ? state.document : state.review), error: null }),
      };return query;
    }),
  };
  const metadata = { rpc: vi.fn(async (name: string, args: any): Promise<{data:any;error:any}> => {
    if(name === "hold_bound_document_text_extraction")return {data:null,error:null};
    return {data:{schema:"document-text-extraction-admitted-v1",save_protocol:"bound-document-text-review-save-v1",
      operation_id:args._operation_id,receipt_id:id(5),actor_id:args._actor_id,student_id:args._student_id,
      document_id:args._document_id,extraction_id:args._extraction_id,revision:7,reserved_units:1,
      source_text_sha256:args._source_text_sha256,source_revision:args._expected_review_revision,document_revision:args._expected_document_revision},error:null};
  }) };
  const getServiceClient=vi.fn(async()=>metadata);
  const generate = vi.fn(async (_text: string, _actor: string) => ({strengths:"Generated draft"}));
  const run = (value: unknown = input, actor = id(1)) => replaceDocumentTextExtraction(client,actor,value,generate,
    extract=>({raw_extract:extract,sections:extract,status:"needs_review"}),getServiceClient);
  return {input,state,client,metadata,getServiceClient,generate,updates,run};
}
it("replaces only the current review and preserves its original creator",async()=>{
 const f=fixture();const result=await f.run();expect((result.extraction as any).sections).toEqual({strengths:"Generated draft"});
 expect((result.extraction as any).created_by).toBe(id(9));expect(f.generate).toHaveBeenCalledExactlyOnceWith(f.input.text,id(1));
 expect(f.updates.mock.calls[0][0]).toMatchObject({_extraction_id:id(4),_document_id:id(2),_student_id:id(3),_expected_review_revision:revision,_expected_document_revision:revision,_expected_review_status:"in_review"});
});
for(const [name,alter] of [
 ["changed viewer",(f:any)=>{f.input.expected_viewer_id=id(9);} ],
 ["cross-student request",(f:any)=>{f.input.student_id=id(9);} ],
 ["cross-document review",(f:any)=>{f.state.review.document_id=id(9);} ],
 ["stale microsecond revision",(f:any)=>{f.input.expected_updated_at="2026-11-05T12:00:00.000000+00:00";} ],
 ["completed review",(f:any)=>{f.state.review.status="complete";} ],
 ["read-only access",(f:any)=>{f.state.permission=false;} ],
 ["partner-only account",(f:any)=>{f.state.partner=true;} ],
 ["missing review",(f:any)=>{f.state.review=null;} ],
 ["quarantined source",(f:any)=>{f.state.document.scan_status="quarantined";} ],
 ["rejected source",(f:any)=>{f.state.document.review_status="rejected";} ],
 ["retired source",(f:any)=>{f.state.document.deleted_at=revision;} ],
 ["archived source",(f:any)=>{f.state.document.archived_at=revision;} ],
] as const)it(`refuses ${name} before generation`,async()=>{const f=fixture();alter(f);await expect(f.run()).rejects.toThrow(message);expect(f.generate).not.toHaveBeenCalled();expect(f.updates).not.toHaveBeenCalled();});
for(const [name,alter] of [
 ["revoked access",(f:any)=>{f.state.permission=false;} ],
 ["changed document",(f:any)=>{f.state.document.updated_at="2026-11-05T12:01:00Z";} ],
 ["concurrent review edit",(f:any)=>{f.state.review.updated_at="2026-11-05T12:01:00Z";} ],
 ["completed review",(f:any)=>{f.state.review.status="complete";} ],
 ["missing document",(f:any)=>{f.state.document=null;} ],
] as const)it(`refuses ${name} observed after generation without saving`,async()=>{const f=fixture();f.generate.mockImplementation(async()=>{alter(f);return {strengths:"Unconfirmed draft"};});await expect(f.run()).rejects.toThrow(message);expect(f.updates).not.toHaveBeenCalled();});
it("does not overwrite an edit between preflight and atomic save",async()=>{const f=fixture();f.state.beforeUpdate=()=>{f.state.review.updated_at="2026-11-05T12:01:00Z";};await expect(f.run()).rejects.toThrow(message);expect(f.state.review.sections).toEqual({strengths:"Keep my edits"});expect(f.generate).toHaveBeenCalledTimes(1);});
it("never recreates a review deleted before atomic save",async()=>{const f=fixture();f.state.beforeUpdate=()=>{f.state.review=null;};await expect(f.run()).rejects.toThrow(message);expect(f.state.review).toBeNull();});
it("stops without retrying after a lost save response",async()=>{const f=fixture();f.state.afterSave=true;await expect(f.run()).rejects.toThrow(message);expect(f.generate).toHaveBeenCalledTimes(1);expect(f.updates).toHaveBeenCalledTimes(1);expect(f.state.review.status).toBe("needs_review");});
it("hides private provider errors and does not save",async()=>{const f=fixture();f.generate.mockRejectedValue(Error("PRIVATE IEP contents"));await expect(f.run()).rejects.toThrow(message);expect(f.updates).not.toHaveBeenCalled();});
it("denies unavailable authority rather than generating",async()=>{const f=fixture();f.client.rpc.mockRejectedValue(Error("PRIVATE database details"));await expect(f.run()).rejects.toThrow(message);expect(f.generate).not.toHaveBeenCalled();});
it("does not report success on a mixed save data/error response",async()=>{const f=fixture();f.state.saveError={message:"PRIVATE database issue"};await expect(f.run()).rejects.toThrow(message);expect(f.updates).toHaveBeenCalledTimes(1);expect(f.generate).toHaveBeenCalledTimes(1);});
it("refuses missing request identity before looking up data",async()=>{const f=fixture();const {expected_viewer_id,...oldRequest}=f.input;await expect(f.run(oldRequest)).rejects.toThrow(message);expect(f.client.from).not.toHaveBeenCalled();expect(f.generate).not.toHaveBeenCalled();});
for(const[field,value]of[
 ["schema","unknown"],["save_protocol","legacy"],["operation_id",id(90)],["receipt_id","bad"],
 ["actor_id",id(90)],["student_id",id(90)],["document_id",id(90)],["extraction_id",id(90)],
 ["reserved_units",0],["revision",0],["source_text_sha256","0".repeat(64)],
 ["source_revision","2026-11-05T12:00:00.000002+00:00"],["document_revision","2026-11-05T12:00:00.000002+00:00"],
]as const)it(`stops before AI on an unconfirmed ${field} admission`,async()=>{
 const f=fixture();const original=f.metadata.rpc.getMockImplementation()!;f.metadata.rpc.mockImplementation(async(name,args)=>{const reply=await original(name,args);reply.data[field]=value;return reply;});
 await expect(f.run()).rejects.toThrow(DOCUMENT_TEXT_START_MESSAGE);expect(f.generate).not.toHaveBeenCalled();expect(f.updates).not.toHaveBeenCalled();expect(f.metadata.rpc).toHaveBeenCalledTimes(1);
});
it("does not start AI or clear an unknown receipt after a lost admission reply",async()=>{const f=fixture();f.metadata.rpc.mockRejectedValue(Error("PRIVATE gateway details"));await expect(f.run()).rejects.toThrow(DOCUMENT_TEXT_START_MESSAGE);expect(f.generate).not.toHaveBeenCalled();expect(f.metadata.rpc).toHaveBeenCalledTimes(1);});
it("does not accept mixed admission data and error",async()=>{const f=fixture();const original=f.metadata.rpc.getMockImplementation()!;f.metadata.rpc.mockImplementation(async(name,args)=>({...await original(name,args),error:{code:"XX000"}}));await expect(f.run()).rejects.toThrow(DOCUMENT_TEXT_START_MESSAGE);expect(f.generate).not.toHaveBeenCalled();expect(f.metadata.rpc).toHaveBeenCalledTimes(1);});
it("stops before AI when counted admission is absent, with no generic fallback",async()=>{const f=fixture();f.metadata.rpc.mockResolvedValue({data:null,error:{code:"PGRST202"}});await expect(f.run()).rejects.toThrow(DOCUMENT_TEXT_START_MESSAGE);expect(f.generate).not.toHaveBeenCalled();expect(f.updates).not.toHaveBeenCalled();expect(f.metadata.rpc.mock.calls.map(c=>c[0])).toEqual(["begin_bound_document_text_extraction"]);});
it("does not obtain privileged metadata access before caller scope is confirmed",async()=>{const f=fixture();f.state.permission=false;await expect(f.run()).rejects.toThrow(message);expect(f.getServiceClient).not.toHaveBeenCalled();expect(f.generate).not.toHaveBeenCalled();});
it("stops and retains the claim if access changes while waiting for admission",async()=>{const f=fixture();const original=f.metadata.rpc.getMockImplementation()!;f.metadata.rpc.mockImplementation(async(name,args)=>{const r=await original(name,args);if(name.startsWith("begin"))f.state.permission=false;return r;});await expect(f.run()).rejects.toThrow(message);expect(f.generate).not.toHaveBeenCalled();expect(f.metadata.rpc.mock.calls.map(c=>c[0])).toEqual(["begin_bound_document_text_extraction","hold_bound_document_text_extraction"]);});
it("binds only a text digest to metadata and keeps its receipt private",async()=>{const f=fixture();const result=await f.run();const begin=f.metadata.rpc.mock.calls[0][1];expect(begin._source_text_sha256).toMatch(/^[a-f0-9]{64}$/);expect(JSON.stringify(begin)).not.toContain(f.input.text);expect(Object.keys(result)).toEqual(["extraction"]);expect(JSON.stringify(result)).not.toContain(id(5));expect(f.updates.mock.calls[0][0]).toMatchObject({_operation_id:begin._operation_id,_receipt_id:id(5),_source_text_sha256:begin._source_text_sha256});});
it("retains uncertain provider work even when the hold reply fails",async()=>{const f=fixture();const original=f.metadata.rpc.getMockImplementation()!;f.metadata.rpc.mockImplementation(async(name,args)=>{if(name.startsWith("hold"))throw Error("PRIVATE timeout");return original(name,args);});f.generate.mockRejectedValue(Error("PRIVATE provider failure"));await expect(f.run()).rejects.toThrow(message);expect(f.generate).toHaveBeenCalledTimes(1);expect(f.metadata.rpc.mock.calls.map(c=>c[0])).toEqual(["begin_bound_document_text_extraction","hold_bound_document_text_extraction"]);});
it("accepts equivalent offsets without dropping microseconds",async()=>{const f=fixture();const original=f.metadata.rpc.getMockImplementation()!;f.metadata.rpc.mockImplementation(async(name,args)=>{const r=await original(name,args);if(name.startsWith('begin')){r.data.source_revision="2026-11-05T07:00:00.000001-05:00";r.data.document_revision="2026-11-05T07:00:00.000001-05:00";}return r;});await f.run();expect(f.generate).toHaveBeenCalledTimes(1);});
for(const[field,value]of[["schema","legacy-save"],["operation_id",id(99)],["operation_state","needs_review"]]as const)it(`does not report success from an unconfirmed bound-save ${field}`,async()=>{const f=fixture();const original=f.client.rpc.getMockImplementation()!;f.client.rpc.mockImplementation(async(name,args)=>{const result=await original(name,args);if(name==='save_bound_document_text_review')(result.data as any)[field]=value;return result;});await expect(f.run()).rejects.toThrow(message);expect(f.generate).toHaveBeenCalledTimes(1);expect(f.metadata.rpc.mock.calls.map(c=>c[0])).toEqual(['begin_bound_document_text_extraction','hold_bound_document_text_extraction']);expect(f.client.rpc.mock.calls.filter(c=>c[0].startsWith('save')).map(c=>c[0])).toEqual(['save_bound_document_text_review']);});
it("never substitutes an unbound save if the counted save is unavailable",async()=>{const f=fixture();const original=f.client.rpc.getMockImplementation()!;f.client.rpc.mockImplementation(async(name,args)=>name==='save_bound_document_text_review'?{data:null,error:{code:'PGRST202'}}:original(name,args));await expect(f.run()).rejects.toThrow(message);expect(f.generate).toHaveBeenCalledTimes(1);expect(f.client.rpc.mock.calls.filter(c=>c[0].startsWith('save')).map(c=>c[0])).toEqual(['save_bound_document_text_review']);expect(f.metadata.rpc.mock.calls.at(-1)?.[0]).toBe('hold_bound_document_text_extraction');});

it("rejects internal metadata accidentally nested inside the public saved row",async()=>{const f=fixture();const original=f.client.rpc.getMockImplementation()!;f.client.rpc.mockImplementation(async(name,args)=>{const result=await original(name,args);if(name==='save_bound_document_text_review')(result.data as any).extraction.receipt_id=id(5);return result;});await expect(f.run()).rejects.toThrow(message);expect(f.generate).toHaveBeenCalledTimes(1);expect(f.metadata.rpc.mock.calls.at(-1)?.[0]).toBe('hold_bound_document_text_extraction');});
