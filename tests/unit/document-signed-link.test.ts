import { it, expect, vi } from "vitest";
import { createCurrentDocumentLink, DOCUMENT_LINK_MESSAGE, parseDocumentLinkRequest } from "../../src/lib/document-signed-link.server";
const actor="00000000-0000-4000-8000-000000000001",id="00000000-0000-4000-8000-000000000002",student="00000000-0000-4000-8000-000000000003",other="00000000-0000-4000-8000-000000000004",stamp="2026-11-15T12:00:00.123456+00:00";
const input={id,student_id:student,expected_viewer_id:actor,expected_updated_at:stamp};
const path=`${student}/fictional reviewed text.txt`;
const signedUrl=`https://fictional.invalid/storage/v1/object/sign/student-documents/${encodeURI(path)}?token=fictional-private-token`;
function fixture(){
 const row={id,student_id:student,updated_at:stamp,storage_path:path,scan_status:"clean",scan_verdict:{code:"clean"},archived_at:null,deleted_at:null};
 const state={row,final:undefined as unknown,readError:null as unknown,signReply:{data:{signedUrl},error:null} as any};
 let reads=0;
 const read=vi.fn(async()=>({data:++reads===1?state.row:state.final===undefined?state.row:state.final,error:state.readError}));
 const query:any={eq:()=>query,maybeSingle:read};
 const rpc=vi.fn(async(name:string,_args:unknown)=>({data:name!=="is_partner_only",error:null}));
 const audit=vi.fn(async(_table:string,_value:unknown)=>({error:null as unknown}));
 const from=vi.fn((table:string)=>{
  if(table==="documents")return {select:()=>query};
  if(table==="audit_log"||table==="document_access_log")return {insert:(value:unknown)=>audit(table,value)};
  throw Error("Unexpected private service table");
 });
 const sign=vi.fn(async(_path:string,_seconds:number)=>state.signReply);
 const bucket=vi.fn((_bucket:string)=>({createSignedUrl:sign}));
 const authorize=vi.fn(async(_document:string)=>{});
 const run=(value:unknown=input,who=actor)=>createCurrentDocumentLink({supabaseUrl:"https://fictional.invalid",from,rpc,storage:{from:bucket}},who,value,authorize);
 return {state,read,rpc,audit,from,sign,bucket,authorize,run};
}
it("mints only the exact clean caller-scoped source and rechecks it before returning",async()=>{
 const f=fixture();expect(await f.run()).toEqual({url:signedUrl});expect(f.sign).toHaveBeenCalledExactlyOnceWith(path,300);expect(f.bucket).toHaveBeenCalledExactlyOnceWith("student-documents");expect(f.read).toHaveBeenCalledTimes(2);expect(f.authorize).toHaveBeenCalledTimes(2);
 const trail=JSON.stringify(f.audit.mock.calls);for(const secret of [path,"fictional-private-token",signedUrl])expect(trail).not.toContain(secret);expect(f.audit).toHaveBeenCalledTimes(2);
});
it.each(["id","student_id","expected_viewer_id","expected_updated_at"])("rejects cached/missing %s before IO",async key=>{const f=fixture(),value:any={...input};delete value[key];expect(()=>parseDocumentLinkRequest(value)).toThrow(DOCUMENT_LINK_MESSAGE);await expect(f.run(value)).rejects.toThrow(DOCUMENT_LINK_MESSAGE);expect(f.from).not.toHaveBeenCalled();expect(f.rpc).not.toHaveBeenCalled();expect(f.sign).not.toHaveBeenCalled();});
it("rejects a changed viewer before private reads or denial logging",async()=>{const f=fixture();await expect(f.run(input,other)).rejects.toThrow(DOCUMENT_LINK_MESSAGE);expect(f.from).not.toHaveBeenCalled();expect(f.sign).not.toHaveBeenCalled();});
it.each(["id","student_id","updated_at","storage_path","deleted_at"])("refuses mismatched/deleted source %s before minting",async key=>{const f=fixture();f.state.row={...f.state.row,[key]:key==="updated_at"?"2026-11-15T12:01:00Z":other};await expect(f.run()).rejects.toThrow(DOCUMENT_LINK_MESSAGE);expect(f.sign).not.toHaveBeenCalled();});
it.each(["can_access_student","can_view_document","is_partner_only"])("does not mint without confirmed %s",async denied=>{const f=fixture();f.rpc.mockImplementation(async name=>({data:name===denied?name==="is_partner_only":name!=="is_partner_only",error:null}));await expect(f.run()).rejects.toThrow(DOCUMENT_LINK_MESSAGE);expect(f.sign).not.toHaveBeenCalled();expect(f.audit.mock.calls[0][1]).toMatchObject({action:"document.signed_url.denied",metadata:{reason:"unconfirmed_access_or_file_state"}});});
it("does not substitute an Owner/admin role or a private grant for explicit student access",async()=>{const f=fixture();f.rpc.mockImplementation(async name=>({data:name==="can_access_student"?false:name!=="is_partner_only",error:null}));await expect(f.run()).rejects.toThrow(DOCUMENT_LINK_MESSAGE);expect(f.from.mock.calls.flat()).not.toContain("admin_doc_access_grants");expect(f.sign).not.toHaveBeenCalled();});
it("retains the central authorization check before Storage",async()=>{const f=fixture();f.authorize.mockRejectedValue(Error("denied"));await expect(f.run()).rejects.toThrow(DOCUMENT_LINK_MESSAGE);expect(f.sign).not.toHaveBeenCalled();});
it("requires editing authority for an archived file",async()=>{const f=fixture();f.state.row={...f.state.row,archived_at:stamp} as any;f.rpc.mockImplementation(async name=>({data:name!=="is_partner_only"&&name!=="can_edit_student",error:null}));await expect(f.run()).rejects.toThrow(DOCUMENT_LINK_MESSAGE);expect(f.sign).not.toHaveBeenCalled();});
it.each(["wrong-origin","wrong-bucket","wrong-path","missing-token","http","userinfo","fragment","malformed"])("refuses an untrusted signed-link receipt (%s)",async kind=>{
 const f=fixture();const url=new URL(signedUrl);if(kind==="wrong-origin")url.hostname="other.invalid";if(kind==="wrong-bucket")url.pathname=url.pathname.replace("student-documents","site-media");if(kind==="wrong-path")url.pathname+="-other";if(kind==="missing-token")url.search="";if(kind==="http")url.protocol="http:";if(kind==="userinfo")url.username="untrusted";if(kind==="fragment")url.hash="fragment";f.state.signReply={data:kind==="malformed"?{}:{signedUrl:url.href},error:null};await expect(f.run()).rejects.toThrow(DOCUMENT_LINK_MESSAGE);expect(f.sign).toHaveBeenCalledOnce();expect(f.audit).not.toHaveBeenCalled();
});
it.each(["updated_at","storage_path","archived_at","deleted_at","scan_status","scan_verdict"])("does not return a link after source %s changes during minting",async key=>{
 const f=fixture();f.state.final={...f.state.row,[key]:key==="updated_at"?"2026-11-15T12:01:00Z":key==="scan_verdict"?{code:"infected"}:"changed"};await expect(f.run()).rejects.toThrow(DOCUMENT_LINK_MESSAGE);expect(f.sign).toHaveBeenCalledOnce();
});
it("withholds the link if student access disappears after minting",async()=>{const f=fixture();let count=0;f.rpc.mockImplementation(async name=>({data:name==="can_access_student"?++count===1:name!=="is_partner_only",error:null}));await expect(f.run()).rejects.toThrow(DOCUMENT_LINK_MESSAGE);expect(f.sign).toHaveBeenCalledOnce();});
it.each(["audit_log","document_access_log"])("does not return or remint after an uncertain %s write",async table=>{const f=fixture();f.audit.mockImplementation(async name=>({error:name===table?{message:"PRIVATE audit details"}:null}));await expect(f.run()).rejects.toThrow(DOCUMENT_LINK_MESSAGE);expect(f.sign).toHaveBeenCalledOnce();});
it("does not retry a lost signed-link response or expose private errors",async()=>{const f=fixture();f.sign.mockRejectedValue(Error("PRIVATE token or provider error"));await expect(f.run()).rejects.toThrow(DOCUMENT_LINK_MESSAGE);expect(f.sign).toHaveBeenCalledOnce();expect(f.audit).not.toHaveBeenCalled();});
it("does not use a private existence probe after a caller read error",async()=>{const f=fixture();f.state.readError={message:"PRIVATE relation"};await expect(f.run()).rejects.toThrow(DOCUMENT_LINK_MESSAGE);expect(f.sign).not.toHaveBeenCalled();expect(f.from.mock.calls.map(([table])=>table)).toEqual(["documents","audit_log"]);});

it.each(["permission","signed-link","audit"])("does not accept a missing error/completion field as confirmed %s IO",async phase=>{const f=fixture();if(phase==="permission")f.rpc.mockResolvedValue({data:true} as any);if(phase==="signed-link")f.state.signReply={data:{signedUrl}};if(phase==="audit")f.audit.mockResolvedValue({} as any);await expect(f.run()).rejects.toThrow(DOCUMENT_LINK_MESSAGE);if(phase==="permission")expect(f.sign).not.toHaveBeenCalled();else expect(f.sign).toHaveBeenCalledOnce();});
