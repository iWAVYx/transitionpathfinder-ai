import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "../../../src/integrations/supabase/types";
import { CREATOR_EMPTY_STUDENT_TABLES } from "./pathway-creator-cleanup";
import { EVIDENCE_SOURCE_LABEL } from "./evidence-live-policy";
export type EvidenceScope={ownerId:string;studentId:string;marker:string;role:"parent"|"educator"};
export type EvidenceRow=Database["public"]["Tables"]["report_evidence_links"]["Row"];
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const EVIDENCE_EMPTY_TABLES=["student_intakes","pathway_reports","bridgeforward_profiles","bridgeforward_readiness_snapshots","high_school_fit_reviews",...CREATOR_EMPTY_STUDENT_TABLES.filter(t=>t!=="report_evidence_links")];
export function validateEvidenceScope(f:EvidenceScope){
 if(!uuid.test(f.ownerId)||!uuid.test(f.studentId)||f.ownerId===f.studentId||!["parent","educator"].includes(f.role)||!new RegExp("^QA Evidence \\d+-\\d+ "+f.role+"$").test(f.marker))throw Error("Invalid exact evidence scope");
}
export function validateEvidenceRows(f:EvidenceScope,rows:EvidenceRow[]){
 validateEvidenceScope(f);
 if(!Array.isArray(rows)||rows.length>12||new Set(rows.map(x=>x.id)).size!==rows.length||rows.some(x=>!uuid.test(x.id)||x.student_id!==f.studentId||x.created_by!==f.ownerId||x.source_kind!=="note"||x.source_id!==null||x.source_label!==EVIDENCE_SOURCE_LABEL||typeof x.note!=="string"||!/^AI-extracted \((high|medium|low)\): /.test(x.note)||!x.snippet_hash||!/^[a-f0-9]{32}$/.test(x.snippet_hash)||!Number.isFinite(Date.parse(x.updated_at))))throw Error("Unexpected exact evidence rows; cleanup stopped");
}
export async function readExactEvidence(client:SupabaseClient<Database>,f:EvidenceScope){
 validateEvidenceScope(f);
 const q=await client.from("report_evidence_links").select("*",{count:"exact"}).eq("student_id",f.studentId).order("id").limit(13);
 if(q.error||!q.data||q.count!==q.data.length)throw Error("Complete evidence readback unavailable");
 validateEvidenceRows(f,q.data);return q.data;
}
export function evidenceAbsenceSql(f:EvidenceScope){
 validateEvidenceScope(f);const tables=["students","report_evidence_links",...EVIDENCE_EMPTY_TABLES];
 const counts=["'student_count',(SELECT count(*) FROM public.students WHERE id='"+f.studentId+"'::uuid)",...tables.filter(t=>t!=="students").map(t=>"'"+t+"_count',(SELECT count(*) FROM public."+t+" WHERE student_id='"+f.studentId+"'::uuid)")];
 return `BEGIN READ ONLY;
DO $guard$ BEGIN IF current_user<>'postgres' OR EXISTS(SELECT 1 FROM pg_class WHERE oid IN (${tables.map(t=>`'public.${t}'::regclass`).join(",")}) AND (relowner<>current_user::regrole OR relforcerowsecurity)) THEN RAISE EXCEPTION 'Independent table-owner reader required';END IF;END;$guard$;
SELECT jsonb_build_object('run_marker','${f.marker}','operator',current_user,'read_only',current_setting('transaction_read_only'),'observed_at',now(),${counts.join(",")}) AS evidence_cleanup;
COMMIT;
`;
}
export async function cleanupEvidence(client:SupabaseClient<Database>,f:EvidenceScope,expected:EvidenceRow[]){
 validateEvidenceRows(f,expected);
 const s=await client.from("students").select("id,owner_id,first_name,last_name,notes,is_demo,student_user_id").eq("id",f.studentId).maybeSingle();
 if(s.error||!s.data||s.data.owner_id!==f.ownerId||s.data.first_name!==f.marker||s.data.last_name!=="Synthetic"||s.data.notes!==f.marker||!s.data.is_demo||s.data.student_user_id!==null)throw Error("Unexpected evidence student; cleanup stopped");
 const current=await readExactEvidence(client,f);
 if(JSON.stringify(current)!==JSON.stringify(expected))throw Error("Evidence changed after readback; cleanup stopped");
 for(const table of EVIDENCE_EMPTY_TABLES){const q=await (client.from(table as "students") as any).select("*",{head:true,count:"exact"}).eq("student_id",f.studentId);if(q.error||q.count!==0)throw Error("Unexpected related rows; cleanup stopped");}
 for(const row of expected){
  const removed=await client.from("report_evidence_links").delete().eq("id",row.id).eq("student_id",f.studentId).eq("created_by",f.ownerId).eq("source_kind","note").is("source_id",null).eq("source_label",EVIDENCE_SOURCE_LABEL).eq("note",row.note!).eq("snippet_hash",row.snippet_hash!).eq("updated_at",row.updated_at).select("id");
  if(removed.error||removed.data?.length!==1||removed.data[0].id!==row.id)throw Error("Evidence removal unconfirmed; student retained");
 }
 if((await readExactEvidence(client,f)).length!==0)throw Error("Residual evidence; student retained");
 const removed=await client.from("students").delete().eq("id",f.studentId).eq("owner_id",f.ownerId).eq("first_name",f.marker).eq("last_name","Synthetic").eq("notes",f.marker).eq("is_demo",true).is("student_user_id",null).select("id");
 if(removed.error||removed.data?.length!==1||removed.data[0].id!==f.studentId)throw Error("Student removal unconfirmed");
 for(const [table,field] of [["students","id"],["report_evidence_links","student_id"],...EVIDENCE_EMPTY_TABLES.map(t=>[t,"student_id"])]){const q=await (client.from(table as "students") as any).select("*",{head:true,count:"exact"}).eq(field,f.studentId);if(q.error||q.count!==0)throw Error("Caller-visible absence unconfirmed");}
 return {...f,evidenceIds:expected.map(x=>x.id),callerVisibleCountsZero:true,independentPrivilegedAbsenceRequired:true};
}
