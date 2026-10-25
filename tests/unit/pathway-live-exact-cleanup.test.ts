import { expect, it, vi } from "vitest";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "../../src/integrations/supabase/types";
import { cleanupLivePathwayExact, type LivePathwayScope } from "../e2e/helpers/pathway-live-exact-cleanup";
const ids = Array.from({length:6},(_,i)=>`${i+1}`.repeat(8)+"-1111-4111-8111-111111111111");
const scope: LivePathwayScope = {ownerId:ids[0],studentId:ids[1],educatorId:ids[2],intakeId:ids[3],reportId:ids[4],collaboratorId:ids[5],marker:"QA Pathway 12345-1",collaboratorEmail:"pathway.qa.12345-1@staging.transitionforwardct.test"};
function setup(options: {duplicate?:string;readError?:string;deleteError?:string;residual?:string;wrongReportContext?:boolean;empty?:boolean}={}) {
 const calls: Array<{method:string;url:URL}> = [];
 const client=createClient<Database>("https://fixture.example","sb_publishable_synthetic",{auth:{persistSession:false},global:{fetch:async(input,init)=>{
  const url=new URL(String(input)),method=init?.method??"GET",table=url.pathname.split("/").at(-1)!;calls.push({method,url});
  if(method==="HEAD")return new Response(null,{headers:{"content-range":`*/${options.residual===table?1:0}`}});
  if(options.readError===table&&method==="GET"||options.deleteError===table&&method==="DELETE")return new Response(JSON.stringify({message:"Synthetic private error",code:"42501"}),{status:403,headers:{"content-type":"application/json"}});
  let rows: any[]=options.empty?[]:table==="student_intakes"?[{id:ids[3]}]:table==="pathway_reports"?[{id:ids[4],user_id:options.wrongReportContext?ids[2]:ids[0],student_id:ids[1]}]:[{id:ids[5]}];
  if(method==="DELETE")rows=[{id:url.searchParams.get("id")!.replace("eq.","")}];
  else if(options.duplicate===table)rows=[...rows,...rows];
  return new Response(JSON.stringify(rows),{headers:{"content-type":"application/json"}});
 }}});return {client,calls};
}
it("resolves at most one record in each exact scope before deletions and saves the receipt first",async()=>{
 const {client,calls}=setup();const receipt=vi.fn(async()=>{expect(calls.every(x=>x.method!=="DELETE")).toBe(true);});
 expect(await cleanupLivePathwayExact(client,scope,receipt)).toEqual({intakeIds:[ids[3]],reportIds:[ids[4]],collaboratorIds:[ids[5]],countsZero:true});
 expect(receipt).toHaveBeenCalledExactlyOnceWith({intakeIds:[ids[3]],reportIds:[ids[4]],collaboratorIds:[ids[5]]});
 const reads=calls.filter(x=>x.method==="GET");expect(reads).toHaveLength(3);for(const q of reads)expect(q.url.searchParams.get("limit")).toBe("2");
 expect(reads[0].url.searchParams.get("student_first_name")).toBe(`eq.${scope.marker}`);
 expect(reads[2].url.searchParams.get("invited_email")).toBe(`eq.${scope.collaboratorEmail}`);
 const deletes=calls.filter(x=>x.method==="DELETE");expect(deletes.map(x=>x.url.searchParams.get("id"))).toEqual(ids.slice(4,5).concat(ids.slice(3,4),ids.slice(5,6)).map(id=>`eq.${id}`));
 for(const q of calls)expect(q.url.toString()).not.toMatch(/like\.|ilike\.|QA%20Pathway.*%25/);
 expect(calls.filter(x=>x.method==="HEAD")).toHaveLength(5);
});
it.each(["student_intakes","pathway_reports","student_collaborators"])("ambiguous %s prevents every deletion",async table=>{
 const {client,calls}=setup({duplicate:table});await expect(cleanupLivePathwayExact(client,scope,async()=>{})).rejects.toThrow("Ambiguous");expect(calls.some(x=>x.method==="DELETE")).toBe(false);
});
it.each(["student_intakes","pathway_reports","student_collaborators"])("failed %s discovery prevents every deletion",async table=>{
 const {client,calls}=setup({readError:table});await expect(cleanupLivePathwayExact(client,scope,async()=>{})).rejects.toThrow("Ambiguous");expect(calls.some(x=>x.method==="DELETE")).toBe(false);
});
it("an intake with a differently owned report stops before cascade deletion",async()=>{
 const {client,calls}=setup({wrongReportContext:true});await expect(cleanupLivePathwayExact(client,scope,async()=>{})).rejects.toThrow("unexpected report context");expect(calls.some(x=>x.method==="DELETE")).toBe(false);
});
it("cannot delete before the exact receipt is saved",async()=>{
 const {client,calls}=setup();await expect(cleanupLivePathwayExact(client,scope,async()=>{throw Error("Receipt failed");})).rejects.toThrow("Receipt failed");expect(calls.some(x=>x.method==="DELETE")).toBe(false);
});
it.each(["pathway_reports","student_intakes","student_collaborators"])("a failed %s deletion is reported even while exact cleanup continues",async table=>{
 const {client,calls}=setup({deleteError:table});await expect(cleanupLivePathwayExact(client,scope,async()=>{})).rejects.toThrow("deletion failed");expect(calls.filter(x=>x.method==="DELETE")).toHaveLength(3);
});
it.each(["pathway_reports","pathway_report_versions","share_tokens","student_intakes","student_collaborators"])("remaining %s cannot be reported as clean",async table=>{
 const {client}=setup({residual:table});await expect(cleanupLivePathwayExact(client,scope,async()=>{})).rejects.toThrow("absence failed");
});
it("invalid run scope fails before any database request",async()=>{
 const {client,calls}=setup();await expect(cleanupLivePathwayExact(client,{...scope,marker:"QA Pathway old-prefix"},async()=>{})).rejects.toThrow("Invalid");expect(calls).toHaveLength(0);
});
it("no discovered records means zero deletions",async()=>{
 const {client,calls}=setup({empty:true});await expect(cleanupLivePathwayExact(client,{...scope,intakeId:"",reportId:"",collaboratorId:""},async()=>{})).resolves.toMatchObject({countsZero:true});expect(calls.some(x=>x.method==="DELETE")).toBe(false);
});
