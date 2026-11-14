import { test,expect,type Request } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import { randomUUID } from "node:crypto";
import { writeFile } from "node:fs/promises";
import type { Database } from "../../../src/integrations/supabase/types";
import { evidenceLiveTarget,syntheticEvidenceText,EVIDENCE_SOURCE_LABEL } from "../helpers/evidence-live-policy";
import { cleanupEvidence,readExactEvidence,evidenceAbsenceSql,type EvidenceScope,type EvidenceRow } from "../helpers/evidence-live-cleanup";
import { creatorStudentInput } from "../helpers/pathway-creator-fixture";
import { creatorTransportDiagnostics,creatorFailureKind } from "../helpers/pathway-creator-diagnostics";
import { ROLES } from "../helpers/roles";
test.describe.configure({mode:"serial",retries:0});
test.use({trace:"off",video:"off",screenshot:"off"});
test.skip(process.env.RUN_EVIDENCE_LIVE_QA!=="true","Explicit bounded evidence acceptance not enabled");
for(const role of ROLES.filter(r=>r.key==="parent"||r.key==="educator")){
 test(`${role.key} saves private source-linked evidence without overwriting duplicates`,async({browser},info)=>{
  test.setTimeout(480000);const target=evidenceLiveTarget(process.env);
  for(const origin of [target.controlOrigin,target.origin]){
   const response=await fetch(origin+"/api/public/env-health",{cache:"no-store",signal:AbortSignal.timeout(15000)});expect(response.ok).toBe(true);const h=await response.json();
   expect(h.app_env).toBe("staging");expect(h.vite_app_env).toBe("staging");expect(h.supabase_project_ref).toBe("qgrertkqbwanerqqemph");expect(h.is_production_project).toBe(false);expect(h.is_production_target).toBe(false);
   expect(h.runtime_source_fingerprint).toBe(process.env.EXPECTED_RUNTIME_SOURCE_FINGERPRINT);expect(h.runtime_source_file_count).toBe(target.fileCount);expect(h.runtime_source_fingerprint_schema).toBe("transitionforward-runtime-source-v1");expect(h.runtime_source_fingerprint_algorithm).toBe("sha256");
   expect(h.stripe_public_mode).toBe("sandbox");expect(h.stripe_server_mode).toBe("sandbox");expect(h.isolation?.ok).toBe(true);
   if(origin===target.controlOrigin)expect(h.git_commit_sha).toBe(process.env.E2E_EXPECTED_BUILD_SHA);else expect(h.ai_gateway_configured).toBe(true);
  }
  const email=`e2e.${role.key}@staging.transitionforwardct.test`;if(process.env[role.emailEnv]!==email)throw Error("Only existing synthetic accounts allowed");
  const client=createClient<Database>(target.backend,target.publicKey,{auth:{persistSession:false,autoRefreshToken:false}});
  const signed=await client.auth.signInWithPassword({email,password:process.env[role.passwordEnv]??""});if(signed.error||signed.data.user?.email!==email)throw Error("Existing account sign-in unconfirmed");
  const f:EvidenceScope={ownerId:signed.data.user.id,studentId:randomUUID(),marker:`QA Evidence ${target.runId} ${role.key}`,role:role.key as "parent"|"educator"};
  let rows:EvidenceRow[]=[],pending=false,created=false,captured=false,primary:unknown,phase="setup",observing=false;const transport=creatorTransportDiagnostics();
  const record=async()=>{await writeFile(info.outputPath("evidence-scope.json"),JSON.stringify({...f,evidenceIds:rows.map(x=>x.id)},null,2));await writeFile(info.outputPath("evidence-cleanup.sql"),evidenceAbsenceSql(f));};await record();
  const context=await browser.newContext({baseURL:target.origin});
  try{
   phase="student-create";pending=true;
   const saved=await client.from("students").insert({...creatorStudentInput(f),grade_band:"6-8"}).select("id").single();if(saved.error||saved.data?.id!==f.studentId)throw Error("Student creation unconfirmed");created=true;pending=false;
   const page=await context.newPage(),observed=new Set<Request>();
   page.on("request",request=>{if(observing&&request.method()==="POST"&&new URL(request.url()).origin===target.origin&&observed.size<16){observed.add(request);transport.started();}});
   page.on("response",response=>{if(observed.has(response.request()))transport.response(response.status());});page.on("requestfinished",request=>{if(observed.delete(request))transport.finished();});page.on("requestfailed",request=>{if(observed.delete(request))transport.failed();});
   phase="browser-signin";await page.goto("/login");await page.getByTestId("login-email").fill(email);await page.getByTestId("login-password").fill(process.env[role.passwordEnv]??"");await page.getByTestId("login-submit").click();await page.waitForURL(u=>!u.pathname.startsWith("/login"),{timeout:30000});
   phase="source-form";await page.goto("/bridgeforward/intake");await expect(page.getByRole("heading",{name:"BridgeForward Profile",exact:true})).toBeVisible({timeout:30000});
   const selector=page.locator("#student");if(await selector.isVisible()){await selector.click();await page.getByRole("option",{name:f.marker+" Synthetic",exact:true}).click();}
   // Await the selected profile read before entering any source text. Do not save the profile.
   await expect(page.getByText("Loading…",{exact:true})).toHaveCount(0,{timeout:30000});
   await page.getByLabel("Current supports & accommodations",{exact:true}).fill(syntheticEvidenceText);
   const action=page.getByRole("button",{name:"Extract evidence from these answers",exact:true});await expect(action).toBeEnabled();
   phase="extraction";pending=true;observing=true;await action.click();let outcome="waiting";
   await expect.poll(async()=>{if(await page.locator('[data-sonner-toast][data-type="error"]').count())return outcome="failed";return outcome=await page.getByText(/^Linked \d+ new evidence items? to the Pathway Report\.$/).isVisible()?"complete":"waiting";},{timeout:240000,intervals:[250,500,1000]}).not.toBe("waiting");
   if(outcome!=="complete")throw Error("Evidence extraction failed; no repeat permitted");pending=false;observing=false;
   phase="saved-readback";rows=await readExactEvidence(client,f);captured=true;expect(rows.length).toBeGreaterThan(0);await record();
   await writeFile(info.outputPath("evidence-source-review.json"),JSON.stringify({role:role.key,items:rows.map(x=>({section:x.report_section,note:x.note})),manualMeaningReviewRequired:true},null,2));
   phase="duplicate-check";
   const rpc=client.rpc.bind(client) as any;pending=true;
   const duplicate=await rpc("save_extracted_report_evidence",{_student_id:f.studentId,_source_kind:"note",_source_id:null,_source_label:EVIDENCE_SOURCE_LABEL,_items:rows.map(x=>({report_section:x.report_section,note:x.note,snippet_hash:x.snippet_hash}))});
   if(duplicate.error||!Array.isArray(duplicate.data)||duplicate.data.length!==0)throw Error("Duplicate-only receipt unconfirmed");pending=false;expect(await readExactEvidence(client,f)).toEqual(rows);
   phase="private-access";
   for(const other of ROLES.filter(r=>r.key!==role.key)){
    const reader=createClient<Database>(target.backend,target.publicKey,{auth:{persistSession:false,autoRefreshToken:false}});
    try{const otherEmail=`e2e.${other.key==="school_admin"?"schooladmin":other.key==="district_admin"?"districtadmin":other.key}@staging.transitionforwardct.test`;if(process.env[other.emailEnv]!==otherEmail)throw Error("Only existing role accounts allowed");
     const auth=await reader.auth.signInWithPassword({email:otherEmail,password:process.env[other.passwordEnv]??""});if(auth.error||!auth.data.user)throw Error("Access-check sign-in unconfirmed");
     const privateReads=await Promise.all([reader.from("students").select("id").eq("id",f.studentId),reader.from("report_evidence_links").select("id").eq("student_id",f.studentId)]);if(privateReads.some(q=>q.error||q.data?.length!==0))throw Error("Private access denial unconfirmed");
     const denied=await (reader.rpc.bind(reader) as any)("save_extracted_report_evidence",{_student_id:f.studentId,_source_kind:"note",_source_id:null,_source_label:EVIDENCE_SOURCE_LABEL,_items:[]});if(denied.error?.code!=="42501")throw Error("Evidence save denial unconfirmed");
    }finally{await reader.auth.signOut();}
   }
   phase="screenshot";await page.locator("#current_supports").scrollIntoViewIfNeeded();await page.screenshot({path:info.outputPath(`${role.key}-evidence.png`)});
   phase="complete";await writeFile(info.outputPath("evidence-result.json"),JSON.stringify({role:role.key,completed:true,extractionActions:1,inserted:rows.length,duplicateInserted:0,savedRowsUnchanged:true,otherRoleChecks:6,manualMeaningReviewRequired:true},null,2));
  }catch(error){primary=error;await writeFile(info.outputPath("evidence-primary-failure.json"),JSON.stringify({phase,failureKind:creatorFailureKind(error),uncertainCompletion:pending},null,2)).catch(()=>{});}
  finally{
   await writeFile(info.outputPath("evidence-transport-result.json"),JSON.stringify({phase,uncertainCompletion:pending,...transport.snapshot(primary)},null,2)).catch(()=>{primary??=Error("Diagnostic receipt unavailable");});
   try{await context.close();}catch{primary??=Error("Browser close unconfirmed");}
   try{if(pending){await writeFile(info.outputPath("evidence-reconciliation-required.json"),JSON.stringify({...f,uncertainCompletion:true},null,2));throw Error("Uncertain completion; exact trusted reconciliation required before deletion");}
    if(created){if(!captured){rows=await readExactEvidence(client,f);captured=true;}await record();const cleaned=await cleanupEvidence(client,f,rows);await writeFile(info.outputPath("evidence-cleanup-result.json"),JSON.stringify(cleaned,null,2));}
   }catch(error){primary=primary?new AggregateError([primary,error],"Evidence test failed; exact cleanup verification required"):error;}finally{await client.auth.signOut();}
  }
  if(primary)throw primary;
 });
}
