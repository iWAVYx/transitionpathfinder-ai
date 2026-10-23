import {test,expect,type BrowserContext,type Page} from "@playwright/test";
import {createClient,type SupabaseClient} from "@supabase/supabase-js";
import {randomUUID} from "node:crypto";
import {writeFile} from "node:fs/promises";
import type {Database,Json} from "../../../src/integrations/supabase/types";
import {ReportSchema} from "../../../src/lib/pathway-generation-contract";
import {DEMO_REPORT} from "../../../src/lib/demo-data";
import {ROLES} from "../helpers/roles";
import {reportSharingAcceptanceTarget} from "../helpers/report-sharing-acceptance-policy";
import {cleanupReportHistoryFixture} from "../helpers/report-history-fixture-cleanup";

test.skip(process.env.RUN_REPORT_SHARING_STAGING_QA!=="true","Separate disposable-sharing authorization required");
test.use({trace:"off",screenshot:"off",video:"off"});
test.describe.configure({mode:"serial",retries:0});
function must(condition:unknown,message:string):asserts condition {if(!condition)throw new Error(message);}
const publicOrigins=["https://transitionforward-staging.caysi101.workers.dev","https://gentle-forward-reach.lovable.app"];
type Actor={role:string;id:string;client:SupabaseClient<Database>};
type Link={id:string;token:string;audience:string;revoked:boolean;expires_at:string|null;view_count:number;report_id:string;created_by:string};
type Fixture={reportId:string;intakeId:string;ownerId:string;marker:string;model:"synthetic-no-ai-sharing";intakeCreated:boolean;reportCreated:boolean;intakeAttempted:boolean;reportAttempted:boolean;links:Link[];role:"parent"|"educator";summary:string;studentId:string|null;studentName:string|null};
async function navigate(page:Page,path:string){try{await page.goto(path,{waitUntil:"domcontentloaded",timeout:45000});}catch{throw new Error("Synthetic sharing page did not load");}}
async function tokens(actor:Actor,fixture:Fixture):Promise<Link[]>{
 const result=await actor.client.from("share_tokens").select("id,token,audience,revoked,expires_at,view_count,report_id,created_by").eq("report_id",fixture.reportId).eq("created_by",actor.id);
 must(!result.error&&result.data,"Could not read exact fixture links");
 must(result.data.length<=4,"Fixture link cap exceeded");return result.data as Link[];
}

test("two fictional reports retain safe sharing and exact cleanup across existing roles",async({browser},info)=>{
 test.setTimeout(360000);
 const target=reportSharingAcceptanceTarget(process.env);
 const clients:Actor[]=[],fixtures:Fixture[]=[],contexts:BrowserContext[]=[];
 const evidence:Record<string,unknown>={runId:target.runId,aiCalls:0,maxIntakes:2,maxReports:2,maxTokens:8,checks:[],fixtures:[]};
 const check=(label:string)=>(evidence.checks as string[]).push(label);
 const expectedEmails:Record<string,string>={student:"e2e.student",parent:"e2e.parent",educator:"e2e.educator",school_admin:"e2e.schooladmin",district_admin:"e2e.districtadmin",partner:"e2e.partner",owner:"e2e.owner"};
 try{
  for(const origin of publicOrigins){
   const res=await fetch(origin+"/api/public/env-health",{cache:"no-store"});must(res.ok,"Staging host health failed before fixtures");const h=await res.json();
   must(h.runtime_source_fingerprint===process.env.EXPECTED_RUNTIME_SOURCE_FINGERPRINT&&h.runtime_source_file_count===1184&&h.supabase_project_ref==="qgrertkqbwanerqqemph"&&h.stripe_mode==="sandbox"&&h.isolation?.ok===true&&h.is_production_target===false,"Staging host source/isolation mismatch before fixtures");
   if(origin===target.origin)must(h.git_commit_sha===process.env.E2E_EXPECTED_BUILD_SHA,"Cloudflare release changed before fixtures");
  }
  for(const role of ROLES){
   const email=process.env[role.emailEnv]??"";must(email===`${expectedEmails[role.key]}@staging.transitionforwardct.test`,"Non-synthetic identity refused");
   const client=createClient<Database>(target.backend,target.publicKey,{auth:{persistSession:false,autoRefreshToken:false}});
   const auth=await client.auth.signInWithPassword({email,password:process.env[role.passwordEnv]??""});
   must(!auth.error&&auth.data.user?.email===email,"Existing synthetic role sign-in failed");clients.push({role:role.key,id:auth.data.user.id,client});
  }
  check("All seven existing synthetic role clients authenticated");
  for(const role of ["parent","educator"] as const){
   const owner=clients.find(a=>a.role===role)!;
   const own=await owner.client.from("students").select("id,first_name,last_name").eq("owner_id",owner.id).order("id").limit(1);
   must(!own.error,"Could not read caller-owned synthetic student metadata");
   if(role==="parent")must(own.data?.length===1,"Existing Family-owned student needed for Trust acceptance; no new student authorized");
   const student=own.data?.[0];
   const f:Fixture={role,ownerId:owner.id,reportId:randomUUID(),intakeId:randomUUID(),marker:`QA Sharing ${target.runId} ${role}`,model:"synthetic-no-ai-sharing",intakeCreated:false,reportCreated:false,intakeAttempted:false,reportAttempted:false,links:[],summary:`Synthetic ${role} sharing plan ${target.runId}`,studentId:student?.id??null,studentName:student?`${student.first_name} ${student.last_name??""}`.trim():null};fixtures.push(f);
   f.intakeAttempted=true;
   const intake=await owner.client.from("student_intakes").insert({id:f.intakeId,user_id:owner.id,student_first_name:f.marker,submitter_role:role==="parent"?"family":"educator",grade_band:"11-12",student_id:f.studentId});must(!intake.error,"Caller-RLS synthetic intake creation failed");f.intakeCreated=true;
   f.reportAttempted=true;
   const content={...ReportSchema.parse(structuredClone(DEMO_REPORT)),summary:f.summary,internal_share_probe:`private-sharing-probe-${target.runId}`};
   const report=await owner.client.from("pathway_reports").insert({id:f.reportId,intake_id:f.intakeId,user_id:owner.id,student_id:f.studentId,is_demo:true,model:f.model,content:content as unknown as Json});must(!report.error,"Caller-RLS synthetic report creation failed");f.reportCreated=true;
  }
  must(fixtures.length===2,"Exact two-fixture scope required");
  for(const f of fixtures){
   const owner=clients.find(a=>a.role===f.role)!,otherFixture=fixtures.find(a=>a!==f)!;
   const role=ROLES.find(r=>r.key===f.role)!;
   const context=await browser.newContext({baseURL:target.origin,storageState:role.storageState,recordVideo:undefined});contexts.push(context);const page=await context.newPage();
   await navigate(page,`/reports/${f.reportId}?audience=${f.role==="parent"?"family":"educator"}`);
   await expect(page.getByText(f.summary,{exact:true}).first()).toBeVisible({timeout:30000});
   for(const audience of ["family","educator"]){
    await page.getByRole("button",{name:audience==="family"?"Family link":"Educator link",exact:true}).click();
    await expect.poll(async()=>{f.links=await tokens(owner,f);return f.links.length;},{timeout:15000}).toBe(audience==="family"?1:2);
   }
   check(`${f.role}: both audience links created through the actual report UI`);
   const family=f.links.find(l=>l.audience==="family")!,educator=f.links.find(l=>l.audience==="educator")!;
   const snapshot=JSON.stringify(f.links);
   for(const [column,value] of [["report_id",otherFixture.reportId],["audience","student"],["token",randomUUID()],["expires_at","2099-01-01T00:00:00Z"],["created_by",otherFixture.ownerId],["view_count",999]] as const){
    const result=await owner.client.from("share_tokens").update({[column]:value}).eq("id",family.id).select("id");must(!!result.error,`${f.role}: protected token field was not denied`);
   }
   must(JSON.stringify(await tokens(owner,f))===snapshot,"Denied updates changed fixture link fields");
   for(const actor of clients.filter(a=>a.id!==owner.id)){
    const result=await actor.client.from("share_tokens").update({revoked:true}).eq("id",family.id).select("id");must(!!result.error||result.data?.length===0,"Non-issuer received a confirmed fixture mutation");
   }
   must((await tokens(owner,f)).find(l=>l.id===family.id)?.revoked===false,"Non-issuer revoked the fixture link");
   const missing=await owner.client.from("share_tokens").update({revoked:true}).eq("id",randomUUID()).select("id");must(!missing.error&&missing.data?.length===0,"Missing ID unexpectedly confirmed a mutation");
   const deletion=await owner.client.from("share_tokens").delete().eq("id",family.id);must(!!deletion.error,"Client token deletion was not denied");
   const anon=createClient<Database>(target.backend,target.publicKey,{auth:{persistSession:false,autoRefreshToken:false}});
   for(const fn of ["resolve_share_token","track_share_view"] as const){
    const denied=await anon.rpc(fn,{_token:family.token});must(!!denied.error,"Anonymous raw share RPC was not denied");
    const deniedOwner=await owner.client.rpc(fn,{_token:family.token});must(!!deniedOwner.error,"Authenticated raw share RPC was not denied");
   }
   check(`${f.role}: protected columns, all non-issuers, missing IDs, delete and raw RPC boundaries verified`);
   for(const link of [family,educator])for(const origin of publicOrigins){
    const publicContext=await browser.newContext({baseURL:origin,storageState:{cookies:[],origins:[]}});contexts.push(publicContext);const publicPage=await publicContext.newPage();const responses:Promise<string>[]=[];
    publicPage.on("response",r=>{if(r.request().method()==="POST"&&r.url().startsWith(origin))responses.push(r.text().catch(()=>""));});
    await navigate(publicPage,`/share/${link.token}`);
    await expect(publicPage.getByText(f.summary,{exact:true}).first()).toBeVisible({timeout:30000});
    const wire=await Promise.all(responses);must(wire.some(s=>s.includes(f.summary))&&!wire.some(s=>s.includes(`private-sharing-probe-${target.runId}`)),"Public response projection did not exclude private fixture fields");
    await publicContext.close();
   }
   check(`${f.role}: both fixed audiences render projected content on both staging hosts`);
   await page.locator("#share-panel li").filter({hasText:/educator\s*·/i}).getByRole("button",{name:"Revoke",exact:true}).click();
   await expect.poll(async()=>(await tokens(owner,f)).find(l=>l.id===educator.id)?.revoked,{timeout:15000}).toBe(true);
   check(`${f.role}: saved-report revoke confirms the exact educator link`);
   if(f.role==="parent"){
    const existing=await owner.client.from("share_tokens").select("id,view_count",{count:"exact"}).eq("created_by",owner.id).range(0,999);must(!existing.error&&existing.data&&existing.count===existing.data.length,"Cannot establish a complete creator-visible count set for safe Trust row selection");
    const usedCounts=new Set(existing.data.filter(t=>t.id!==family.id).map(t=>t.view_count));
    let current=(await tokens(owner,f)).find(t=>t.id===family.id)!;
    for(let attempt=0;usedCounts.has(current.view_count)&&attempt<4;attempt++){
     const extra=await browser.newContext({baseURL:target.origin,storageState:{cookies:[],origins:[]}});contexts.push(extra);const p=await extra.newPage();await navigate(p,`/share/${family.token}`);await expect(p.getByText(f.summary,{exact:true}).first()).toBeVisible();await extra.close();current=(await tokens(owner,f)).find(t=>t.id===family.id)!;
    }
    must(!usedCounts.has(current.view_count),"No unique safe Trust fixture row; refusing ambiguous revoke");
    await navigate(page,"/trust");
    const card=page.locator("section").filter({has:page.getByRole("heading",{name:f.studentName!,exact:true})});await expect(card).toHaveCount(1);
    const row=card.locator("li").filter({hasText:new RegExp(`family\\s*·\\s*${current.view_count} views?\\b`,"i")}).filter({has:page.getByRole("button",{name:"Revoke",exact:true})});await expect(row).toHaveCount(1);
    page.once("dialog",dialog=>dialog.message().startsWith("Revoke this share link?")?dialog.accept():dialog.dismiss());
    await row.getByRole("button",{name:"Revoke",exact:true}).click();
    await expect.poll(async()=>(await tokens(owner,f)).find(l=>l.id===family.id)?.revoked,{timeout:15000}).toBe(true);check("Family: Trust & Consent revokes only the uniquely identified fixture link");
   }else{
    await page.locator("#share-panel li").filter({hasText:/family\s*·/i}).getByRole("button",{name:"Revoke",exact:true}).click();
    await expect.poll(async()=>(await tokens(owner,f)).find(l=>l.id===family.id)?.revoked,{timeout:15000}).toBe(true);
   }
   const revive=await owner.client.from("share_tokens").update({revoked:false}).eq("id",family.id);must(!!revive.error,"Reactivation was not denied");
   for(const revoked of [false,true]){
    const result=await owner.client.from("share_tokens").insert({id:randomUUID(),token:randomUUID()+randomUUID(),report_id:f.reportId,created_by:owner.id,audience:"family",revoked,expires_at:revoked?null:"2000-01-01T00:00:00Z"});must(!result.error,"Exact inactive fixture link creation failed");
   }
   f.links=await tokens(owner,f);must(f.links.length===4,"Expected exact four fixture links per report");
   for(const origin of publicOrigins){
    const publicContext=await browser.newContext({baseURL:origin,storageState:{cookies:[],origins:[]}});contexts.push(publicContext);const p=await publicContext.newPage();
    for(const link of f.links){await navigate(p,`/share/${link.token}`);await expect(p.getByRole("heading",{name:"This Share Link Is No Longer Active.",exact:true})).toBeVisible({timeout:15000});}
    await publicContext.close();
   }
   check(`${f.role}: refreshed revoked/expired links are unavailable on both staging hosts`);
  }
 }finally{
  const cleanup:unknown[]=[];
  for(const f of fixtures){
   const owner=clients.find(a=>a.id===f.ownerId);const errors:string[]=[];
   if(owner){
    try{f.links=await tokens(owner,f);}catch{errors.push("Could not inventory exact fixture token IDs before cleanup");}
    errors.push(...await cleanupReportHistoryFixture(owner.client,f));
    try{const remaining=await owner.client.from("share_tokens").select("id",{count:"exact",head:true}).eq("report_id",f.reportId);if(remaining.error||remaining.count!==0)errors.push("Caller-RLS token cascade cleanup readback failed");}catch{errors.push("Caller-RLS token cleanup readback failed");}
   }else if(f.reportAttempted||f.intakeAttempted)errors.push("Fixture actor unavailable for cleanup");
   cleanup.push({role:f.role,reportId:f.reportId,intakeId:f.intakeId,tokenIds:f.links.map(l=>l.id),errors});
  }
  await Promise.allSettled(contexts.map(c=>c.close()));await Promise.allSettled(clients.map(c=>c.client.auth.signOut({scope:"local"})));
  evidence.fixtures=cleanup;evidence.cleanupScope="Exact owner-scoped fixture IDs and report FK cascade; caller-RLS absence only. Privileged exact-ID readback remains required.";
  const output=info.outputPath("report-sharing-acceptance.json");await writeFile(output,JSON.stringify(evidence,null,2));await info.attach("report-sharing-acceptance.json",{path:output,contentType:"application/json"});
  must(!(cleanup as Array<{errors:string[]}>).some(c=>c.errors.length),"Exact sharing fixture cleanup needs review");
 }
});
