import { expect, it, vi } from "vitest";
import { documentPermissionAction } from "../../src/lib/document-permissions.server";
import { DOCUMENT_PERMISSIONS_UNCONFIRMED as message } from "../../src/lib/document-permissions-contract";
const actor="11111111-1111-4111-8111-111111111111", docId="22222222-2222-4222-8222-222222222222", student="33333333-3333-4333-8333-333333333333", target="44444444-4444-4444-8444-444444444444", permissionId="55555555-5555-4555-8555-555555555555", other="66666666-6666-4666-8666-666666666666", revision="2026-11-15T13:00:00.000001+00:00";
const grantRow=()=>({id:permissionId,document_id:docId,student_id:student,user_id:target,role_type:null,permission_level:"view_summary",granted_by:actor,notes:null,created_at:revision,updated_at:revision});
function fixture(){
  const state={doc:{id:docId,student_id:student,updated_at:revision,archived_at:null,deleted_at:null} as any,readError:null as unknown,permissions:[grantRow()] as any[],row:grantRow() as any,writeReply:undefined as any,receiptPatch:{} as any,listError:null as unknown,auditError:null as unknown,lost:false,patch:{} as any};
  const predicates:any[]=[]; const events:string[]=[];
  const rpc=vi.fn(async(name:string,args:any)=>{events.push(name+":"+args._user_id);return {data:name!=="is_partner_only",error:null as unknown};});
  const lookup=vi.fn(async(email:string)=>{events.push("lookup:"+email);return target as unknown;});
  const insert=vi.fn((patch:any)=>{state.patch=patch;events.push("insert");return query("insert");});
  const remove=vi.fn(()=>{events.push("remove");return query("remove");});
  const audit=vi.fn(()=>query("audit"));
  function query(kind:string):any {
    const reply=()=>{
      if(kind==="doc")return {data:state.doc,error:state.readError};
      if(kind==="row")return {data:state.row,error:null};
      if(kind==="list")return {data:state.permissions,error:state.listError};
      if(kind==="audit")return {data:null,error:state.auditError};
      if(state.lost)throw Error("PRIVATE transport detail");
      return state.writeReply??{data:kind==="insert"?{...state.patch,created_at:revision,updated_at:revision,...state.receiptPatch}:state.row,error:null};
    };
    const q={eq:(key:string,value:unknown)=>{predicates.push([kind,key,value]);if(kind==="list"&&key==="id")kind="row";return q;},select:()=>q,order:()=>q,maybeSingle:async()=>reply(),then:(yes:any,no:any)=>Promise.resolve().then(reply).then(yes,no)};return q;
  }
  const from=vi.fn((table:string)=>table==="documents"?{select:()=>query("doc")}:table==="document_permissions"?{select:()=>query("list"),insert,delete:remove}:{insert:audit});
  const intent={document_id:docId,student_id:student,expected_viewer_id:actor,expected_document_updated_at:revision};
  const run=(kind:"list"|"grant"|"remove"="grant",patch:any={},who=actor)=>documentPermissionAction({rpc,from},who,{...intent,...(kind==="grant"?{user_email:"TEST@example.com",permission_level:"view_document",acknowledge_full_document:true}:kind==="remove"?{id:permissionId,expected_permission_updated_at:revision}:{}),...patch},kind,lookup);
  return {state,predicates,events,rpc,lookup,insert,remove,audit,from,run};
}
it("authorizes the current editor before a privileged account lookup and inserts one acknowledged full-file grant",async()=>{const f=fixture();const result=await f.run();expect(result.permission?.permission_level).toBe("view_document");expect(f.lookup).toHaveBeenCalledWith("test@example.com");expect(f.events.indexOf("lookup:test@example.com")).toBeGreaterThan(f.events.indexOf("can_edit_student:"+actor));expect(f.insert).toHaveBeenCalledOnce();expect(f.state.patch.role_type).toBeNull();expect(f.state.patch.notes).toBeNull();expect(f.audit).toHaveBeenCalledOnce();});
it("lists exact document/student grants without mutating or resolving accounts",async()=>{const f=fixture();expect((await f.run("list")).permissions).toEqual(f.state.permissions);expect(f.lookup).not.toHaveBeenCalled();expect(f.insert).not.toHaveBeenCalled();expect(f.remove).not.toHaveBeenCalled();});
it("confirms removal of the exact loaded grant and revision",async()=>{const f=fixture();expect((await f.run("remove")).permission).toEqual(f.state.row);expect(f.predicates.filter(p=>p[0]==="remove")).toEqual([["remove","id",permissionId],["remove","document_id",docId],["remove","student_id",student],["remove","updated_at",revision]]);expect(f.remove).toHaveBeenCalledOnce();expect(f.audit).toHaveBeenCalledOnce();});
it.each(["list","grant","remove"] as const)("refuses departed viewer before %s IO",async kind=>{const f=fixture();await expect(f.run(kind,{},other)).rejects.toThrow(message);expect(f.from).not.toHaveBeenCalled();expect(f.lookup).not.toHaveBeenCalled();});
it.each(["expected_viewer_id","student_id","document_id","expected_document_updated_at"])("rejects cached requests missing %s before IO",async key=>{const f=fixture();await expect(f.run("grant",{[key]:undefined})).rejects.toThrow(message);expect(f.from).not.toHaveBeenCalled();});
it.each(["view_summary","view_student_friendly_summary","edit_metadata","manage","none","download_document","request_summary","review_document"])("does not create the unsupported %s grant",async level=>{const f=fixture();await expect(f.run("grant",{permission_level:level})).rejects.toThrow(message);expect(f.from).not.toHaveBeenCalled();});
it.each([{acknowledge_full_document:false},{acknowledge_full_document:undefined},{role_type:"educator"},{notes:"private note"},{user_email:undefined}])("rejects ambiguous or unacknowledged grant input",async patch=>{const f=fixture();await expect(f.run("grant",patch)).rejects.toThrow(message);expect(f.from).not.toHaveBeenCalled();});
it.each(["id","student_id","updated_at","archived_at","deleted_at"])("refuses changed document %s before account lookup or mutation",async key=>{const f=fixture();f.state.doc[key]=key==="updated_at"||key.endsWith("_at")?"2026-11-15T14:00:00Z":other;await expect(f.run()).rejects.toThrow(message);expect(f.lookup).not.toHaveBeenCalled();expect(f.insert).not.toHaveBeenCalled();});
it.each(["can_access_student","can_view_document","can_edit_student","is_partner_only"])("does not perform a lookup without current %s authority",async denied=>{const f=fixture();f.rpc.mockImplementation(async name=>({data:name===denied?name==="is_partner_only":name!=="is_partner_only",error:null}));await expect(f.run()).rejects.toThrow(message);expect(f.lookup).not.toHaveBeenCalled();});
it.each([{data:"true",error:null},{data:true,error:{message:"PRIVATE RPC"}},{data:null,error:null}])("refuses unknown/malformed authority replies",async reply=>{const f=fixture();f.rpc.mockResolvedValue(reply as any);await expect(f.run()).rejects.toThrow(message);expect(f.lookup).not.toHaveBeenCalled();});
it("blocks partner-only recipients and does not expose lookup detail",async()=>{const f=fixture();f.rpc.mockImplementation(async(name,args)=>({data:name==="is_partner_only"?args._user_id===target:true,error:null}));await expect(f.run()).rejects.toThrow(message);expect(f.insert).not.toHaveBeenCalled();});
it("does not reveal account existence on a failed lookup",async()=>{const f=fixture();f.lookup.mockRejectedValue(Error("PRIVATE email not found"));await expect(f.run()).rejects.toThrow(message);expect(f.insert).not.toHaveBeenCalled();});
it.each([null,{}, {id:permissionId}])("rejects empty/malformed insertion receipts without audit or replay",async data=>{const f=fixture();f.state.writeReply={data,error:null};await expect(f.run()).rejects.toThrow(message);expect(f.insert).toHaveBeenCalledOnce();expect(f.audit).not.toHaveBeenCalled();});
it("does not replace an existing grant when the unique insert is rejected",async()=>{const f=fixture();f.state.writeReply={data:null,error:{code:"23505"}};await expect(f.run()).rejects.toThrow(message);expect(f.insert).toHaveBeenCalledOnce();expect(f.remove).not.toHaveBeenCalled();});
it.each(["document_id","student_id","updated_at"])("does not remove a stale or foreign grant %s",async key=>{const f=fixture();f.state.row[key]=key==="updated_at"?"2026-11-15T14:00:00Z":other;await expect(f.run("remove")).rejects.toThrow(message);expect(f.remove).not.toHaveBeenCalled();});
it.each([null,{}, {...grantRow(),user_id:other}])("does not claim success on zero-row or changed removal receipts",async data=>{const f=fixture();f.state.writeReply={data,error:null};await expect(f.run("remove")).rejects.toThrow(message);expect(f.remove).toHaveBeenCalledOnce();expect(f.audit).not.toHaveBeenCalled();});
it.each(["grant","remove"] as const)("does not retry an uncertain %s or ignore audit failure",async kind=>{const f=fixture();f.state.auditError={message:"PRIVATE audit"};await expect(f.run(kind)).rejects.toThrow(message);expect(kind==="grant"?f.insert:f.remove).toHaveBeenCalledOnce();expect(f.audit).toHaveBeenCalledOnce();});
it.each(["grant","remove"] as const)("does not retry a lost %s reply",async kind=>{const f=fixture();f.state.lost=true;await expect(f.run(kind)).rejects.toThrow(message);expect(kind==="grant"?f.insert:f.remove).toHaveBeenCalledOnce();expect(f.audit).not.toHaveBeenCalled();});
it.each([null,[{...grantRow(),document_id:other}],[grantRow(),grantRow()]])("fails closed on unavailable/foreign/duplicate lists instead of returning empty",async rows=>{const f=fixture();f.state.permissions=rows as any;await expect(f.run("list")).rejects.toThrow(message);});

it.each(["id","document_id","student_id","user_id","role_type","permission_level","granted_by","notes"])("rejects a full grant receipt with unexpected %s",async key=>{const f=fixture();f.state.receiptPatch[key]=key==="permission_level"?"manage":key==="notes"?"unexpected note":key==="role_type"?"educator":other;await expect(f.run()).rejects.toThrow(message);expect(f.insert).toHaveBeenCalledOnce();expect(f.audit).not.toHaveBeenCalled();});
it("refuses a permission list read error even if an empty data array is supplied",async()=>{const f=fixture();f.state.permissions=[];f.state.listError={message:"PRIVATE read"};await expect(f.run("list")).rejects.toThrow(message);});

it("does not create an outside-team grant that the document reader cannot use",async()=>{const f=fixture();f.rpc.mockImplementation(async(name,args)=>({data:name==="is_partner_only"?false:name==="can_access_student"&&args._user_id===target?false:true,error:null}));await expect(f.run()).rejects.toThrow(message);expect(f.lookup).toHaveBeenCalledOnce();expect(f.insert).not.toHaveBeenCalled();});
