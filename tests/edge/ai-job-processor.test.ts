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
type Scenario="success"|"missing-rpc"|"changed-bytes"|"revoked-after-ai"|"uncertain-commit"|"bad-model";
let scenario:Scenario="success",status="queued",at="",attempt=0,ai=0,reads=0,commits=0,stored:any=null,prompt="",unexpected:string[]=[];
function reset(next:Scenario){scenario=next;status="queued";at="";attempt=0;ai=0;reads=0;commits=0;stored=null;prompt="";unexpected=[];}
const json=(body:unknown,code=200)=>new Response(JSON.stringify(body),{status:code,headers:{"Content-Type":"application/json"}});
const output=()=>({key_findings:["Reported progress on 4 of 5 tasks."],strengths_identified:[],needs_identified:[],goals_identified:["Proposed weekly practice."],important_dates:[],missing_information:["No observation dates."],recommended_followups:["Confirm progress with the team."]});
function source(){return {schema:"verified-document-summary-source-v1",job_id:uuid(1),claim_at:at,claim_attempt:attempt,document_id:uuid(2),student_id:uuid(3),actor_id:uuid(4),object_id:uuid(5),object_version:"version-one",storage_path:path,content_sha256:hash,context:{studentFirstName:"Jamie",studentLastName:"Example",schoolName:null,dateOfBirth:null}};}
globalThis.fetch=async(input:RequestInfo|URL,init?:RequestInit)=>{
  const target=new URL(typeof input==="string"?input:input instanceof URL?input.href:input.url),method=init?.method??"GET";
  const body=init?.body?JSON.parse(String(init.body)):null;
  if(target.href==="https://ai.gateway.lovable.dev/v1/chat/completions"){
    ai++;prompt=JSON.stringify(body);return json({choices:[{message:{content:JSON.stringify(scenario==="bad-model"?{raw:"Unstructured"}:output())}}]});
  }
  if(target.origin!==url){unexpected.push(target.origin);throw Error("Unexpected network destination");}
  if(target.pathname==="/rest/v1/ai_jobs"){
    if(method==="GET")return json(status==="queued"?[{id:uuid(1),student_id:uuid(3),triggered_by_user_id:uuid(4),job_type:"document_summary",input_source:{document_id:uuid(2),title:"UNTRUSTED TITLE",document_text:"UNTRUSTED QUEUED TEXT",storage_path:"untrusted/path"},attempts:attempt}]:[]);
    if(method==="PATCH"&&body.status==="processing"){
      if(status!=="queued"||target.searchParams.get("job_type")!=="eq.document_summary")return json(null);
      status="processing";at=body.locked_at;attempt=body.attempts;return json({id:uuid(1),locked_at:at,attempts:attempt});
    }
    if(method==="PATCH"){
      if(target.searchParams.get("status")!=="eq.processing"||target.searchParams.get("locked_at")!==`eq.${at}`||target.searchParams.get("attempts")!==`eq.${attempt}`)throw Error("Missing completion-race filters");
      if(status==="processing"){status=body.status;at="";}
      return new Response(null,{status:204});
    }
  }
  if(target.pathname==="/rest/v1/rpc/read_verified_document_summary_source"){
    reads++;
    if(scenario==="missing-rpc")return json({code:"PGRST202",message:"PRIVATE missing RPC details"},404);
    if(scenario==="revoked-after-ai"&&ai>0)return json({code:"42501",message:"PRIVATE access details"},403);
    if(body._claim_at!==at||body._attempt!==attempt||body._job_id!==uuid(1))throw Error("Wrong source lease");
    return json(source());
  }
  if(target.pathname.startsWith("/storage/v1/object/info/student-documents/"))return json({id:uuid(5),version:"version-one",name:path,bucket_id:"student-documents",size:new Blob([text]).size,content_type:"text/plain"});
  if(target.pathname===`/storage/v1/object/student-documents/${path}`||target.pathname===`/storage/v1/object/authenticated/student-documents/${path}`)return new Response(scenario==="changed-bytes"?"x".repeat(new Blob([text]).size):text);
  if(target.pathname==="/rest/v1/rpc/complete_verified_document_summary"){
    commits++;if(body._claim_at!==at||body._attempt!==attempt)throw Error("Wrong completion lease");
    status="completed";stored=body._payload;
    if(scenario==="uncertain-commit")throw Error("PRIVATE transport lost after commit");
    return json({schema:"verified-document-summary-commit-v1",job_id:uuid(1),status:"completed",document_id:uuid(2),student_id:uuid(3),actor_id:uuid(4),content_sha256:hash});
  }
  if(["/rest/v1/document_pipeline_runs","/rest/v1/feed_events","/rest/v1/notifications"].includes(target.pathname))return new Response(null,{status:204});
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
for(const next of ["missing-rpc","changed-bytes"] as const)Deno.test(`actual handler stops ${next} before AI and does not requeue`,async()=>{
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
