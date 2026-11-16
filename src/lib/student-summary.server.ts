import { z } from "zod";
import {studentSummaryListRequest,studentSummaryReadRequest,reviewedSummaryRow,STUDENT_SUMMARY_MESSAGE,STUDENT_SUMMARY_SECTIONS,type StudentFriendlySummary,type StudentSummaryDocument} from "./student-summary-contract";
type Client={rpc(name:string,args:Record<string,string|null>):PromiseLike<{data:unknown;error:unknown}>};
/** One caller-scoped projection RPC. No original/raw-row SELECT, service
 * fallback, write, provider invocation or private error logging. */
export async function readStudentSummary(privateClient:unknown,actorId:string,input:unknown,kind:"list"|"read"){
 try{
  const data=kind==="list"?studentSummaryListRequest.parse(input):studentSummaryReadRequest.parse(input);
  if(data.expected_viewer_id!==actorId)throw new Error();
  const read=kind==="read"?studentSummaryReadRequest.parse(input):null;
  const reply=await(privateClient as Client).rpc("read_reviewed_student_document_summaries",{_student_id:data.student_id,_expected_viewer_id:actorId,_document_id:read?.document_id??null,_expected_document_updated_at:read?.expected_document_updated_at??null,_expected_extraction_updated_at:read?.expected_extraction_updated_at??null});
  const rows=z.array(reviewedSummaryRow).max(50).parse(reply.data);
  if(reply.error!==null||new Set(rows.map(row=>row.document_id)).size!==rows.length||rows.some(row=>row.student_id!==data.student_id||new Set(row.sections.map(section=>section.key)).size!==row.sections.length))throw new Error();
  if(!read){
   if(rows.some(row=>row.sections.length!==0||(row.summary_ready&&row.extraction_updated_at===null)))throw new Error();
   const documents:StudentSummaryDocument[]=rows.map(row=>({id:row.document_id,title:row.document_title,doc_type:row.doc_type,created_at:row.created_at,document_updated_at:row.document_updated_at,extraction_updated_at:row.extraction_updated_at,summary_ready:row.summary_ready}));
   return{documents};
  }
  if(rows.length!==1)throw new Error();const row=rows[0];
  if(row.document_id!==read.document_id||row.document_updated_at!==read.expected_document_updated_at||row.extraction_updated_at!==read.expected_extraction_updated_at||row.summary_ready!==(row.sections.length>0))throw new Error();
  const summary:StudentFriendlySummary={document_id:row.document_id,document_title:row.document_title,doc_type:row.doc_type,status:row.summary_ready?"ready":"pending",ready:row.summary_ready,sections:STUDENT_SUMMARY_SECTIONS.flatMap(({key,label})=>{const section=row.sections.find(section=>section.key===key);return section?[{key,label,value:section.value,accepted:true as const}]:[];})};
  return{summary};
 }catch{throw new Error(STUDENT_SUMMARY_MESSAGE);}
}
