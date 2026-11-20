import { expect,it } from "vitest";
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";
import type { Database } from "../../src/integrations/supabase/types";
import { evidenceLiveTarget,EVIDENCE_LIVE_BUDGET,EVIDENCE_SOURCE_LABEL,syntheticEvidenceText } from "../e2e/helpers/evidence-live-policy";
import { cleanupEvidence,evidenceAbsenceSql,validateEvidenceRows,type EvidenceScope,type EvidenceRow } from "../e2e/helpers/evidence-live-cleanup";
const id=(n:number)=>String(n).repeat(8)+"-1111-4111-8111-111111111111";
const f:EvidenceScope={ownerId:id(1),studentId:id(2),role:"parent",marker:"QA Evidence 12345-1 parent"};
const row:EvidenceRow={id:id(3),student_id:f.studentId,created_by:f.ownerId,source_kind:"note",source_id:null,source_label:EVIDENCE_SOURCE_LABEL,report_section:"documents",note:"AI-extracted (high): Fictional written directions.",snippet_hash:"a".repeat(32),created_at:"2026-10-26T12:00:00Z",updated_at:"2026-10-26T12:00:00Z"};
const env={RUN_EVIDENCE_LIVE_QA:"true",EVIDENCE_FIXTURE_CONFIRMATION:"disposable-evidence-live",EVIDENCE_QA_RUN_ID:"12345-1",PLAYWRIGHT_BASE_URL:"https://gentle-forward-reach.lovable.app",STAGING_SUPABASE_URL:"https://qgrertkqbwanerqqemph.supabase.co",STAGING_SUPABASE_PUBLISHABLE_KEY:"sb_publishable_synthetic",E2E_EXPECTED_BUILD_SHA:"a".repeat(40),EXPECTED_RUNTIME_SOURCE_FINGERPRINT:"b".repeat(64),EXPECTED_RUNTIME_SOURCE_FILE_COUNT:"1190"};
it("requires isolated caller-RLS targets and the explicit bounded budget",()=>{
 expect(evidenceLiveTarget(env)).toMatchObject({origin:"https://gentle-forward-reach.lovable.app",controlOrigin:"https://transitionforward-staging.caysi101.workers.dev",fileCount:1190});
 expect(EVIDENCE_LIVE_BUDGET).toEqual({students:2,evidenceLinksMax:24,extractionActions:2,modelInvocationsMax:2,sdkAttemptsMax:6,duplicateRpcChecks:2,screenshots:2,uploads:0,reports:0,testRetries:0});
});
it.each([{RUN_EVIDENCE_LIVE_QA:"false"},{EVIDENCE_FIXTURE_CONFIRMATION:""},{EVIDENCE_QA_RUN_ID:"manual"},{PLAYWRIGHT_BASE_URL:"https://transitionforwardct.com"},{PLAYWRIGHT_BASE_URL:"https://preview--gentle-forward-reach.lovable.app"},{STAGING_SUPABASE_URL:"https://lrqcntqyekucamifpffs.supabase.co"},{STAGING_SUPABASE_SERVICE_ROLE_KEY:"disallowed"},{STAGING_SUPABASE_PUBLISHABLE_KEY:"sk_test_wrong"},{E2E_EXPECTED_BUILD_SHA:"dev"},{EXPECTED_RUNTIME_SOURCE_FINGERPRINT:"wrong"},{EXPECTED_RUNTIME_SOURCE_FILE_COUNT:"0"},{EXPECTED_RUNTIME_SOURCE_FILE_COUNT:"1.5"}])("rejects unsafe test target %#",patch=>expect(()=>evidenceLiveTarget({...env,...patch})).toThrow());
it.each([{studentId:"unsafe'"},{ownerId:f.studentId},{marker:"QA Evidence old parent"},{role:"owner"}])("rejects unsafe cleanup scope %#",patch=>expect(()=>evidenceAbsenceSql({...f,...patch} as EvidenceScope)).toThrow());
it.each([{created_by:id(8)},{student_id:id(8)},{source_id:id(8)},{source_kind:"document"},{source_label:"Other source"},{snippet_hash:"wrong"},{note:null},{updated_at:"unknown"}])("rejects unexpected evidence before deletion %#",patch=>expect(()=>validateEvidenceRows(f,[{...row,...patch}])).toThrow());
it("rejects duplicate IDs and oversized cleanup batches",()=>{expect(()=>validateEvidenceRows(f,[row,row])).toThrow();expect(()=>validateEvidenceRows(f,Array(13).fill(row))).toThrow();});
it("prepares independent exact table-owner read-only counts including BridgeForward children",()=>{
 const sql=evidenceAbsenceSql(f);expect(sql).toContain("BEGIN READ ONLY");expect(sql).toContain("current_user<>'postgres'");expect(sql).toContain("relforcerowsecurity");expect(sql).toContain(f.studentId);expect(sql).toContain("bridgeforward_profiles_count");expect(sql).toContain("report_evidence_links_count");expect(sql).not.toMatch(/DELETE|ILIKE/);
});
function mock(o:{wrongOwner?:boolean;changedRow?:boolean;readError?:boolean;extraChild?:boolean;deleteFailure?:boolean;residual?:boolean;badCount?:boolean}={}){
 const calls:Array<{method:string;url:URL}>=[];let removed=false;
 const client=createClient<Database>("https://fixture.example","sb_publishable_synthetic",{auth:{persistSession:false},global:{fetch:async(input,init)=>{
  const url=new URL(String(input)),method=init?.method??"GET",table=url.pathname.split("/").at(-1)!;calls.push({method,url});
  if(method==="HEAD")return new Response(null,{headers:{"content-range":`*/${o.extraChild&&table==="documents"||o.residual&&removed?1:0}`}});
  if(o.readError&&method==="GET"||o.deleteFailure&&method==="DELETE")return new Response(JSON.stringify({message:"Synthetic failure",code:"42501"}),{status:403,headers:{"content-type":"application/json"}});
  if(method==="DELETE"){if(table==="report_evidence_links")removed=true;return new Response(JSON.stringify([{id:table==="students"?f.studentId:row.id}]),{headers:{"content-type":"application/json"}});}
  const data=table==="students"?{id:f.studentId,owner_id:o.wrongOwner?id(8):f.ownerId,first_name:f.marker,last_name:"Synthetic",notes:f.marker,is_demo:true,student_user_id:null}:removed?[]:[{...row,note:o.changedRow?"AI-extracted (high): Changed source.":row.note}];
  return new Response(JSON.stringify(data),{headers:{"content-type":"application/json","content-range":`0-0/${o.badCount?2:removed?0:1}`}});
 }}});return {client,calls};
}
it("deletes exact evidence before its exact marked student, never a prefix sweep",async()=>{
 const {client,calls}=mock();expect((await cleanupEvidence(client,f,[row])).independentPrivilegedAbsenceRequired).toBe(true);
 const deleted=calls.filter(c=>c.method==="DELETE");expect(deleted.map(c=>c.url.pathname.split("/").at(-1))).toEqual(["report_evidence_links","students"]);
 for(const key of ["id","student_id","created_by","source_label","snippet_hash","updated_at","note"])expect(deleted[0].url.searchParams.has(key)).toBe(true);
 expect(deleted[0].url.searchParams.get("id")).toBe(`eq.${row.id}`);expect(deleted[1].url.searchParams.get("notes")).toBe(`eq.${f.marker}`);
});
it.each([{wrongOwner:true},{changedRow:true},{readError:true},{extraChild:true},{badCount:true}])("stops before deleting unexpected context %#",async o=>{const {client,calls}=mock(o);await expect(cleanupEvidence(client,f,[row])).rejects.toThrow();expect(calls.some(c=>c.method==="DELETE")).toBe(false);});
it("retains parent after an unconfirmed evidence deletion",async()=>{const {client,calls}=mock({deleteFailure:true});await expect(cleanupEvidence(client,f,[row])).rejects.toThrow("student retained");expect(calls.filter(c=>c.method==="DELETE")).toHaveLength(1);});
it("refuses to certify cleanup with residual counts",async()=>{const {client}=mock({residual:true});await expect(cleanupEvidence(client,f,[row])).rejects.toThrow("absence unconfirmed");});
it("requires human-protected isolated non-cancelling workflow scope",()=>{
 const workflow=readFileSync(".github/workflows/staging-role-verification.yml","utf8");expect(workflow).toContain("workflow_dispatch:");expect(workflow).toContain("environment: staging");expect(workflow).toContain("inputs.scope == 'evidence-live-bounded' && 'staging-evidence-live-bounded'");
 expect(workflow.split("cancel-in-progress:")[1].split("\n")[0]).toContain("inputs.scope != 'evidence-live-bounded'");
 const steps=workflow.split(/\n      - name: /).slice(1);for(const name of ["Dashboard Regression","Role Access and Role-Leak Protection"])expect(steps.find(s=>s.startsWith(name))).toContain("inputs.scope != 'evidence-live-bounded'");
 const step=steps.find(s=>s.startsWith("Bounded Family and Educator evidence persistence"))!;expect(step).toContain("inputs.scope == 'evidence-live-bounded'");expect(step).toContain("--no-deps --retries=0 --workers=1");expect(step).toContain('E2E_READ_ONLY: "false"');
});
it("keeps the actual browser spec bounded, source-reviewable and safe on uncertainty",()=>{
 const spec=readFileSync("tests/e2e/release-readiness/evidence-live.signedin.spec.ts","utf8");expect(spec).toContain('mode:"serial",retries:0');expect(spec).toContain('trace:"off",video:"off",screenshot:"off"');
 expect(spec).toContain('source_kind:"note"');expect(spec).toContain('source_id:null');expect(spec).toContain('duplicate.data.length!==0');expect(spec).toContain('expect(await readExactEvidence(client,f)).toEqual(rows)');expect(spec).toContain('if(pending)');expect(spec).toContain('if(!captured){rows=await readExactEvidence(client,f);captured=true;}');expect(spec).toContain('reconciliation-required');
 expect(spec).not.toMatch(/error\.message|error\.stack|request\.postData|request\.headers|setInputFiles|\.upload\(/);expect(syntheticEvidenceText).toContain("not adopted");expect(syntheticEvidenceText).toContain("actual use has not been observed");
});
