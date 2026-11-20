// Real entrypoint, fully intercepted IO. Run without --allow-net; neither a
// provider nor a hosted database/storage request is permitted by Deno.
const url="https://fictional-staging.invalid",key="fictional-service-token";
Deno.env.set("SUPABASE_URL",url);Deno.env.set("SUPABASE_SERVICE_ROLE_KEY",key);Deno.env.set("LOVABLE_API_KEY","fictional-gateway-token");
let handler:(req:Request)=>Promise<Response>;
Object.defineProperty(Deno,"serve",{configurable:true,value:(fn:typeof handler)=>{handler=fn;return {};}});
const uuid=(n:number)=>`00000000-0000-4000-8000-${String(n).padStart(12,"0")}`;
const text="Jamie Example reports progress on 4 of 5 tasks. Email jamie@example.test. Proposed weekly practice.";
const digest=await crypto.subtle.digest("SHA-256",new TextEncoder().encode(text));
const hash=Array.from(new Uint8Array(digest),v=>v.toString(16).padStart(2,"0")).join("");
const path=`${uuid(3)}/nonce-privacy-safe-document.txt`;
type Scenario="success"|"missing-rpc"|"changed-bytes"|"revoked-after-ai"|"uncertain-commit"|"bad-model"|"retired-object"|"missing-mime"|"paused"|"missing-handoff"|"lost-atomic-claim"|"malformed-atomic-claim"|"lost-finish"|"malformed-finish"|"lost-claim"|"foreign-claim"|"foreign-actor-claim"|"foreign-student-claim"|"extra-claim-field"|"changed-source-after-claim";
let scenario:Scenario="success",status="queued",at="",attempt=0,ai=0,reads=0,commits=0,stored:any=null,prompt="",unexpected:string[]=[];
let claims=0,begins=0,finishes=0,files=0,operation="",operationState="none";
function reset(next:Scenario){claims=0;begins=0;finishes=0;files=0;operation="";operationState="none";scenario=next;status="queued";at="";attempt=0;ai=0;reads=0;commits=0;stored=null;prompt="";unexpected=[];}
const json=(body:unknown,code=200)=>new Response(JSON.stringify(body),{status:code,headers:{"Content-Type":"application/json"}});
const output=()=>({key_findings:["Reported progress on 4 of 5 tasks."],strengths_identified:[],needs_identified:[],goals_identified:["Proposed weekly practice."],important_dates:[],missing_information:["No observation dates."],recommended_followups:["Confirm progress with the team."]});
function source(){return {schema:"verified-document-summary-source-v1",job_id:uuid(1),claim_at:at,claim_attempt:attempt,document_id:uuid(2),student_id:uuid(3),actor_id:uuid(4),object_id:uuid(5),object_version:"version-one",storage_path:path,content_sha256:hash,context:{studentFirstName:"Jamie",studentLastName:"Example",schoolName:null,dateOfBirth:null}};}
globalThis.fetch=async(input:RequestInfo|URL,init?:RequestInit)=>{
  const target=new URL(typeof input==="string"?input:input instanceof URL?input.href:input.url),method=init?.method??"GET";
  const body=init?.body?JSON.parse(String(init.body)):null;
  if(target.href==="https://ai.gateway.lovable.dev/v1/chat/completions"){
    if(operationState!=="active")throw Error("Provider work outside admitted operation");
    ai++;prompt=JSON.stringify(body);return json({choices:[{message:{content:JSON.stringify(scenario==="bad-model"?{raw:"Unstructured"}:output())}}]});
  }
  if(target.origin!==url){unexpected.push(target.origin);throw Error("Unexpected network destination");}
  if(target.pathname==="/rest/v1/ai_jobs"){
    if(method==="GET")return json(status==="queued"?[{id:uuid(1),student_id:uuid(3),triggered_by_user_id:uuid(4),job_type:"document_summary",input_source:{document_id:uuid(2),title:"UNTRUSTED TITLE",document_text:"UNTRUSTED QUEUED TEXT",storage_path:"untrusted/path"},attempts:attempt}]:[]);
    if(method==="PATCH"&&body.status==="processing"){unexpected.push("legacy summary claim");throw Error("Legacy PATCH claim is forbidden");}
    if(method==="PATCH"){
      if(target.searchParams.get("status")!=="eq.processing"||target.searchParams.get("locked_at")!==`eq.${at}`||target.searchParams.get("attempts")!==`eq.${attempt}`)throw Error("Missing completion-race filters");
      if(status==="processing"){status=body.status;at="";}
      return new Response(null,{status:204});
    }
  }
  if(target.pathname==="/rest/v1/rpc/claim_admitted_document_summary"){
    claims++;if(body._job_id!==uuid(1)||body._expected_attempt!==attempt||status!=="queued")throw Error("Wrong atomic claim identity");
    if(scenario==="paused"||scenario==="missing-handoff")return json({code:scenario==="paused"?"55000":"PGRST202",message:"PRIVATE handoff detail"},400);
    // Model the committed SQL transaction: job claim and admission both exist
    // even when the response is lost or invalid. No provider work occurs here.
    status="processing";at="2026-10-30T12:00:00.000Z";attempt++;begins++;operation=uuid(7);operationState="active";
    if(scenario==="lost-atomic-claim"||scenario==="lost-claim")throw Error("PRIVATE lost atomic handoff reply");
    return json({schema:"document-summary-operation-claim-v1",job_id:scenario==="foreign-claim"?uuid(9):uuid(1),claim_at:at,claim_attempt:attempt,actor_id:scenario==="foreign-actor-claim"?uuid(9):uuid(4),student_id:scenario==="foreign-student-claim"?uuid(9):uuid(3),document_id:uuid(2),object_id:uuid(5),object_version:"version-one",storage_path:path,content_sha256:hash,...(scenario==="extra-claim-field"?{context:"PRIVATE"}:{}),operation_id:operation,receipt_id:scenario==="malformed-atomic-claim"?"invalid":uuid(8),revision:2});
  }
  if(target.pathname==="/rest/v1/rpc/begin_document_operation"){unexpected.push("second admission");throw Error("A claimed summary cannot begin another operation");}
  if(target.pathname==="/rest/v1/rpc/finish_document_operation"){
    finishes++;if(body._actor_id!==uuid(4)||body._operation_id!==operation||body._receipt_id!==uuid(8))throw Error("Wrong summary completion identity");
    operationState=body._outcome;
    if(scenario==="lost-finish")throw Error("PRIVATE lost finish reply");
    return json(scenario==="malformed-finish"?{}:{schema:"document-operation-finished-v1",operation_id:operation,state:body._outcome});
  }
  if(target.pathname==="/rest/v1/rpc/read_verified_document_summary_source"){
    reads++;if(operationState!=="active")throw Error("Source metadata read outside admitted work");
    if(scenario==="missing-rpc")return json({code:"PGRST202",message:"PRIVATE missing RPC details"},404);
    if(scenario==="revoked-after-ai"&&ai>0)return json({code:"42501",message:"PRIVATE access details"},403);
    if(body._claim_at!==at||body._attempt!==attempt||body._job_id!==uuid(1))throw Error("Wrong source lease");
    return json(scenario==="changed-source-after-claim"?{...source(),document_id:uuid(9)}:source());
  }
  if(target.pathname.startsWith("/storage/v1/object/info/student-documents/")){files++;return json({id:uuid(5),version:"version-one",name:path,bucket_id:"student-documents",size:new Blob([text]).size,content_type:scenario==="missing-mime"?undefined:"text/plain; charset=utf-8",archived_at:scenario==="retired-object"?"2026-10-27T12:00:00Z":null,is_delete_marker:false,is_versioned:true});}
  if(target.pathname===`/storage/v1/object/student-documents/${path}`||target.pathname===`/storage/v1/object/authenticated/student-documents/${path}`){files++;return new Response(scenario==="changed-bytes"?"x".repeat(new Blob([text]).size):text);}
  if(target.pathname==="/rest/v1/rpc/complete_verified_document_summary"){
    commits++;if(body._claim_at!==at||body._attempt!==attempt)throw Error("Wrong completion lease");
    status="completed";stored=body._payload;
    if(scenario==="uncertain-commit")throw Error("PRIVATE transport lost after commit");
    return json({schema:"verified-document-summary-commit-v1",job_id:uuid(1),status:"completed",document_id:uuid(2),student_id:uuid(3),actor_id:uuid(4),content_sha256:hash});
  }
  if(["/rest/v1/document_pipeline_runs","/rest/v1/feed_events","/rest/v1/notifications"].includes(target.pathname)){if(JSON.stringify(body).includes(uuid(7))||JSON.stringify(body).includes(uuid(8))||JSON.stringify(body).includes("receipt_id")||JSON.stringify(body).includes("summary_operation"))throw Error("Private capability in bookkeeping");return new Response(null,{status:204});}
  unexpected.push(`${method} ${target.pathname}`);throw Error("Unexpected request");
};
await import("../../supabase/functions/ai-job-processor/index.ts");
const invoke=()=>handler(new Request("https://worker.invalid",{method:"POST",headers:{Authorization:`Bearer ${key}`}}));
function assert(value:unknown,message:string){if(!value)throw Error(message);}
Deno.test("actual handler submits verified redacted text and commits once",async()=>{
  reset("success");const response=await invoke();const result=await response.json();assert(result.processed[0]?.ok===true,"Expected success");assert(status==="completed"&&ai===1&&commits===1,"Expected one generation/commit");
  assert(prompt.includes("4 of 5 tasks"),"Missing actual file text");for(const privateText of ["Jamie Example","jamie@example.test","UNTRUSTED TITLE","UNTRUSTED QUEUED TEXT","untrusted/path",path,uuid(2)])assert(!prompt.includes(privateText),"Untrusted/private metadata reached provider");
  assert(stored?._source?.content_sha256===hash,"Missing source lineage");assert(unexpected.length===0,"Unexpected IO");
});
for(const next of ["missing-rpc","changed-bytes","retired-object","missing-mime"] as const)Deno.test(`actual handler stops ${next} before AI and does not requeue`,async()=>{
  reset(next);const result=await (await invoke()).json();assert(result.processed[0]?.ok===false,"Expected failure");assert(ai===0&&commits===0&&status==="needs_review","Expected no AI and manual review");
  const again=await(await invoke()).json();assert(again.count===0&&ai===0,"Must not auto-repeat");assert(!JSON.stringify(result).includes("PRIVATE"),"Private diagnostics leaked");assert(unexpected.length===0,"Unexpected IO");
});
Deno.test("actual handler refuses completion after noticed access loss",async()=>{
  reset("revoked-after-ai");await invoke();assert(ai===1&&commits===0&&status==="needs_review","Must stop without committing or retrying AI");assert(unexpected.length===0,"Unexpected IO");
});
Deno.test("actual handler preserves uncertain-but-completed state and does not repeat AI",async()=>{
  reset("uncertain-commit");const result=await(await invoke()).json();assert(result.processed[0]?.ok===false,"Completion must be uncertain");assert(status==="completed"&&ai===1&&commits===1,"Must preserve completed server state");
  await invoke();assert(ai===1&&commits===1,"Must not auto-repeat");assert(!JSON.stringify(result).includes("PRIVATE"),"Private diagnostics leaked");assert(unexpected.length===0,"Unexpected IO");
});
Deno.test("actual handler rejects unstructured model output",async()=>{
  reset("bad-model");await invoke();assert(ai===1&&commits===0&&status==="needs_review","Must not store unstructured output");assert(unexpected.length===0,"Unexpected IO");
});
Deno.test("actual handler requires service authorization before reading jobs",async()=>{
  reset("success");const response=await handler(new Request("https://worker.invalid",{method:"POST"}));assert(response.status===401&&reads===0&&ai===0,"Authorization must fail before processing");
});

Deno.test("actual handler completes the summary admission only after the verified commit",async()=>{
  reset("success");await invoke();assert(begins===1&&finishes===1&&operationState==="completed"&&status==="completed","Expected one settled operation");assert(unexpected.length===0,"Unexpected IO");
});
for(const next of ["paused","missing-handoff"] as const)Deno.test(`actual handler keeps ${next} queued before any file/provider work`,async()=>{
  reset(next);const result=await(await invoke()).json();assert(result.count===0,"No confirmed claim may dispatch");
  assert(claims===1&&begins===0&&finishes===0&&files===0&&ai===0&&commits===0&&status==="queued","Refused atomic claim must not mutate or dispatch");
  await invoke();assert(begins===0&&files===0&&ai===0,"Readiness checks cannot start work while refused");assert(!JSON.stringify(result).includes("PRIVATE")&&unexpected.length===0,"Unexpected/private IO");
});
for(const next of ["lost-atomic-claim","malformed-atomic-claim"] as const)Deno.test(`actual handler retains ${next} without file/provider work`,async()=>{
  reset(next);const result=await(await invoke()).json();assert(result.count===0,"Unconfirmed claim cannot dispatch");
  assert(claims===1&&begins===1&&finishes===0&&files===0&&ai===0&&commits===0&&status==="processing"&&operationState==="active","Committed admission must remain retained");
  await invoke();assert(claims===1&&begins===1&&ai===0,"Never reclaim a potentially committed handoff");assert(!JSON.stringify(result).includes("PRIVATE")&&unexpected.length===0,"Unexpected/private IO");
});
for(const next of ["lost-finish","malformed-finish"] as const)Deno.test(`actual handler preserves committed work after ${next}`,async()=>{
  reset(next);const result=await(await invoke()).json();assert(result.processed[0]?.ok===false,"Must not claim settled success");
  assert(begins===1&&finishes===1&&commits===1&&ai===1&&status==="completed","Never overwrite the verified server commit");
  await invoke();assert(commits===1&&ai===1&&finishes===1,"Never repeat provider, commit or finish");assert(unexpected.length===0,"Unexpected IO");
});
for(const next of ["lost-claim","foreign-claim"] as const)Deno.test(`actual handler retains ${next} without processing or replay`,async()=>{
  reset(next);await invoke();assert(status==="processing"&&begins===1&&claims===1&&files===0&&ai===0,"Unconfirmed claim must not dispatch");
  await invoke();assert(attempt===1&&begins===1&&claims===1&&ai===0,"No automatic claim replay");assert(unexpected.length===0,"Unexpected IO");
});
Deno.test("actual handler holds operation uncertainty when generation cannot commit",async()=>{
  reset("bad-model");await invoke();assert(status==="needs_review"&&operationState==="needs_review"&&begins===1&&finishes===1&&ai===1,"Both job and admitted work require review");assert(unexpected.length===0,"Unexpected IO");
});


for(const next of ["foreign-actor-claim","foreign-student-claim","extra-claim-field"] as const)Deno.test(`actual handler rejects ${next} before all source/file IO`,async()=>{
 reset(next);const result=await(await invoke()).json();assert(result.count===0&&reads===0&&files===0&&ai===0&&finishes===0,"Invalid atomic capability cannot dispatch or finish");assert(status==="processing"&&operationState==="active"&&claims===1&&begins===1,"Retain committed uncertain claim");await invoke();assert(claims===1&&ai===0,"No reattachment or provider replay");assert(!JSON.stringify(result).includes("PRIVATE")&&unexpected.length===0,"No private output or legacy IO");
});
Deno.test("actual handler holds source mismatch after claim without reading files",async()=>{
 reset("changed-source-after-claim");const result=await(await invoke()).json();assert(result.processed[0]?.ok===false&&reads===1&&files===0&&ai===0&&commits===0,"Source must match atomic binding before file IO");assert(begins===1&&finishes===1&&operationState==="needs_review"&&status==="needs_review","Retain both work and job for review");assert(unexpected.length===0,"Unexpected IO");
});
