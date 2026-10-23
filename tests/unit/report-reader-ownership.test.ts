import { afterEach, beforeEach, expect, it, vi } from "vitest";
const calls=vi.hoisted(()=>({generate:vi.fn(),entitlement:vi.fn()}));
vi.mock("@tanstack/react-start",()=>({createServerFn:()=>{
 let parse=(value:unknown)=>value;
 const chain:any={middleware:()=>chain,validator:(fn:typeof parse)=>{parse=fn;return chain;},handler:(fn:any)=>async(args:any)=>fn({...args,data:parse(args.data)})};return chain;
}}));
vi.mock("@/integrations/supabase/auth-middleware",()=>({requireSupabaseAuth:{}}));
vi.mock("@/lib/entitlement-guard",()=>({requireFeatureEntitlement:calls.entitlement}));
vi.mock("ai",()=>({generateText:calls.generate,Output:{object:()=>({})}}));
import {getReport,getLatestReportForStudent,updateReportContent,regeneratePathwayReport} from "@/lib/pathway.functions";
const id="11111111-1111-4111-8111-111111111111",caller="22222222-2222-4222-8222-222222222222",other="33333333-3333-4333-8333-333333333333";
const roles=["student","family","educator","school_admin","district_admin","partner","admin"];
function fixture(owner:unknown=caller){
 const row={id,user_id:owner,content:{summary:"Fictional report"},student_id:"44444444-4444-4444-8444-444444444444",intake_id:null,review_date:null,created_at:"2026-10-23T12:00:00Z",student_intakes:{student_first_name:"Fictional",grade_band:"11-12"}};
 const q:any={select:vi.fn(()=>q),eq:vi.fn(()=>q),order:vi.fn(()=>q),limit:vi.fn(()=>q),maybeSingle:vi.fn(async()=>({data:row,error:null}))};const supabase={from:vi.fn(()=>q),rpc:vi.fn()};return{row,q,supabase};
}
beforeEach(()=>{vi.stubEnv("LOVABLE_API_KEY","synthetic-only");calls.entitlement.mockResolvedValue(undefined);});
afterEach(()=>{vi.clearAllMocks();vi.unstubAllEnvs();});
for(const role of roles){
 it(`${role}: authenticated report ownership enables the hint without a role-based shortcut`,async()=>{
  const f=fixture();const response=await (getReport as any)({data:{id},context:{userId:caller,supabase:f.supabase,roles:[role]}});
  expect(response.is_report_owner).toBe(true);expect(response.report).toEqual(f.row.content);expect(response).not.toHaveProperty("user_id");expect(f.supabase.rpc).not.toHaveBeenCalled();expect(calls.generate).not.toHaveBeenCalled();
 });
 it(`${role}: permitted non-owning reader cannot forge content actions or invoke a mutation`,async()=>{
  const f=fixture(other),context={userId:caller,supabase:f.supabase,roles:[role]};
  const response=await (getReport as any)({data:{id,is_report_owner:true},context});expect(response.is_report_owner).toBe(false);expect(response.report).toEqual(f.row.content);
  await expect((updateReportContent as any)({data:{report_id:id,content:{summary:"Changed"},is_report_owner:true},context})).rejects.toThrow("You don't have permission to edit this report.");
  await expect((regeneratePathwayReport as any)({data:{report_id:id,is_report_owner:true},context})).rejects.toThrow("You don't have permission to regenerate this report.");
  expect(f.supabase.rpc).not.toHaveBeenCalled();expect(calls.generate).not.toHaveBeenCalled();
 });
}
it.each([undefined,null,""])("missing/invalid recorded ownership %s never enables content actions",async owner=>{
 const f=fixture(null);f.row.user_id=owner;const result=await (getReport as any)({data:{id},context:{userId:caller,supabase:f.supabase}});expect(result.is_report_owner).toBe(false);
});

for(const role of roles) for(const owned of [false,true]) {
 it(`${role}: latest student report derives ownership from the authenticated caller (owned=${owned})`,async()=>{
  const f=fixture(owned?caller:other);
  const response=await (getLatestReportForStudent as any)({data:{student_id:f.row.student_id,is_report_owner:true},context:{userId:caller,supabase:f.supabase,roles:[role]}});
  expect(response.loadFailed).toBe(false);expect(response.report.is_report_owner).toBe(owned);
  expect(response.report).not.toHaveProperty("user_id");expect(response.report.id).toBe(id);
  expect(f.q.eq).toHaveBeenCalledWith("student_id",f.row.student_id);
  expect(f.q.limit).toHaveBeenCalledWith(1);expect(f.supabase.rpc).not.toHaveBeenCalled();expect(calls.generate).not.toHaveBeenCalled();
 });
}
it.each([undefined,null,""])("latest report with invalid recorded ownership %s remains read-only",async owner=>{
 const f=fixture(null);f.row.user_id=owner;
 const response=await (getLatestReportForStudent as any)({data:{student_id:f.row.student_id},context:{userId:caller,supabase:f.supabase}});
 expect(response.report.is_report_owner).toBe(false);
});
it("latest report distinguishes a query failure from an empty caller-visible result",async()=>{
 const f=fixture();const errorLog=vi.spyOn(console,"error").mockImplementation(()=>{});
 try {
  f.q.maybeSingle.mockResolvedValueOnce({data:null,error:{message:"Private query detail"}});
  const failed=await (getLatestReportForStudent as any)({data:{student_id:f.row.student_id},context:{userId:caller,supabase:f.supabase}});
  expect(failed).toEqual({report:null,loadFailed:true});expect(JSON.stringify(failed)).not.toContain("Private query detail");
  f.q.maybeSingle.mockResolvedValueOnce({data:null,error:null});
  expect(await (getLatestReportForStudent as any)({data:{student_id:f.row.student_id},context:{userId:caller,supabase:f.supabase}})).toEqual({report:null,loadFailed:false});
 } finally {errorLog.mockRestore();}
});
