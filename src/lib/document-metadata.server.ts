import { documentMetadataRead, documentClassificationEdit, documentReviewedEdit, documentMetadataRow, DOCUMENT_METADATA_MESSAGE } from "./document-metadata-contract";
type Reply = { data: unknown; error: unknown };
type Query = { eq(column: string, value: string): Query; is(column: string,value:null): Query; select(columns:string):Query; maybeSingle():PromiseLike<Reply> };
type Client = { rpc(name:string,args:Record<string,string>):PromiseLike<Reply>;from(table:string):{select(columns:string):Query;update(patch:Record<string,unknown>):Query;insert(row:Record<string,unknown>):PromiseLike<{error:unknown}>} };
const columns="id,student_id,title,doc_type,updated_at,reviewed_at,reviewed_by,used_in_report_at,archived_at,deleted_at";
/** Current caller RLS plus conditional metadata UPDATE; no service client,
 * upsert, generated-source mutation, retry or transaction-held permission claim. */
export async function documentMetadataAction(privateClient:unknown,actorId:string,input:unknown,kind:"read"|"classify"|"review") {
 try {
  const data=(kind==="read"?documentMetadataRead:kind==="classify"?documentClassificationEdit:documentReviewedEdit).parse(input);
  if(data.expected_viewer_id!==actorId)throw new Error();
  const client=privateClient as Client,id="document_id" in data?data.document_id:data.id;
  const result=await client.from("documents").select(columns).eq("id",id).maybeSingle();const before=documentMetadataRow.parse(result.data);
  if(result.error!==null||before.id!==id||("student_id" in data&&(before.student_id!==data.student_id||before.updated_at!==data.expected_updated_at)))throw new Error();
  async function capability(name:string,args:Record<string,string>){const reply=await client.rpc(name,args);if(reply.error!==null||typeof reply.data!=="boolean")throw new Error();return reply.data;}
  if(!await capability("can_access_student",{_user_id:actorId,_student_id:before.student_id})||!await capability("can_view_document",{_user_id:actorId,_document_id:before.id})||await capability("is_partner_only",{_user_id:actorId}))throw new Error();
  const canEdit=await capability("can_edit_student",{_user_id:actorId,_student_id:before.student_id});
  if(kind==="read")return {...before,can_edit:canEdit&&before.archived_at===null};
  if(!canEdit||before.archived_at!==null)throw new Error();
  const patch="doc_type" in data?{doc_type:data.doc_type}:"reviewed" in data?(data.reviewed?{reviewed_at:new Date().toISOString(),reviewed_by:actorId}:{reviewed_at:null,reviewed_by:null}):null;
  if(!patch)throw new Error();
  const saved=await client.from("documents").update(patch).eq("id",before.id).eq("student_id",before.student_id).eq("updated_at",before.updated_at).is("archived_at",null).is("deleted_at",null).select(columns).maybeSingle();
  const row=documentMetadataRow.parse(saved.data);
  if(saved.error!==null||row.id!==before.id||row.student_id!==before.student_id||row.updated_at===before.updated_at||row.title!==before.title||row.used_in_report_at!==before.used_in_report_at||row.archived_at!==null)throw new Error();
  if("doc_type" in patch){if(row.doc_type!==patch.doc_type||row.reviewed_at!==before.reviewed_at||row.reviewed_by!==before.reviewed_by)throw new Error();}
  else if(row.doc_type!==before.doc_type||row.reviewed_by!==patch.reviewed_by||(patch.reviewed_at===null?row.reviewed_at!==null:row.reviewed_at===null||Date.parse(row.reviewed_at)!==Date.parse(patch.reviewed_at)))throw new Error();
  const audit=await client.from("audit_log").insert({actor_id:actorId,action:kind==="classify"?"document.classify":row.reviewed_at?"document.reviewed":"document.unreviewed",entity_type:"document",entity_id:row.id,student_id:row.student_id,...(kind==="classify"?{metadata:{doc_type:row.doc_type}}:{})});
  if(audit.error!==null)throw new Error();
  return {...row,can_edit:true};
 } catch {throw new Error(DOCUMENT_METADATA_MESSAGE);}
}
