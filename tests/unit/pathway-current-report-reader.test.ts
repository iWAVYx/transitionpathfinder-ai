import { beforeEach, expect, it, vi } from "vitest";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "../../src/integrations/supabase/types";
import schema from "../fixtures/action-read-schema.json";
import { createCurrentReportClient } from "../../src/lib/pathway-current-report.server";

const guards = vi.hoisted(() => ({ generate: vi.fn(), adminRead: vi.fn() }));
vi.mock("@tanstack/react-start", () => ({ createServerFn: () => {
  let parse = (v: unknown) => v;
  const builder = { middleware: () => builder, validator: (fn: typeof parse) => {parse = fn; return builder;}, handler: (fn: any) => ({data,context}: any) => fn({data:parse(data),context}) };
  return builder;
} }));
vi.mock("@/integrations/supabase/auth-middleware", () => ({ requireSupabaseAuth: {} }));
vi.mock("@/integrations/supabase/client.server", () => ({supabaseAdmin:{from:guards.adminRead}}));
vi.mock("@/lib/pathway-shadow-generator.server", () => ({createShadowLovableRecommendationGenerator:guards.generate}));
import { previewPathwayReportDiffShadow } from "../../src/lib/pathway-diff-shadow.functions";
import { runPathwayShadowDiffAndRecordShadow } from "../../src/lib/pathway-shadow-run.functions";

const reportId = "11111111-1111-4111-8111-111111111111";
const provenance = {rules_version:"rules-fixture",prompt_version:"prompt-fixture",model_version:"model-fixture",engine_channel:"shadow" as const,knowledge_ref:["fixture-source"]};
const recommendation = {schema_version:1,id:"fixture-rec",pillar:"employment",age_band:"late_high_school",title:"Explore a supported visit",summary:"Discuss a supported visit based on the recorded student interest.",why:"The fictional student wants to explore a workplace with support.",next_action:"Ask the team about a supported visit.",owner_role:"family",timeframe:"30_day",confidence:"low",discuss_at_next_meeting:true,sources:[{kind:"student_voice",label:"Fictional preference"}],provenance};
const stored = () => ({rules_version:provenance.rules_version,prompt_version:provenance.prompt_version,model_version:provenance.model_version,engine_channel:"shadow",knowledge_snapshot:{knowledge_ref:["fixture-source"]},recommended_pathways:[recommendation]});
function fixture(row: unknown, status=200) {
  const requests: URL[] = [];
  const fetchFixture = vi.fn(async (input: any, init?: RequestInit) => {
    const url = new URL(String(input)); requests.push(url);
    expect(url.origin).toBe("https://current-report.fixture.test");
    expect(url.pathname).toBe("/rest/v1/pathway_reports");
    expect(init?.method ?? "GET").toBe("GET");
    expect(new Headers(init?.headers).get("authorization")).toBe("Bearer synthetic-viewer");
    expect(url.searchParams.get("id")).toBe(`eq.${reportId}`);
    const columns = url.searchParams.get("select")!.split(",");
    for (const column of columns) expect(schema.pathway_reports).toContain(column);
    expect(columns).not.toContain("recommendations");
    expect(columns).toContain("recommended_pathways");
    return new Response(JSON.stringify(status===200 ? (row===null ? [] : [row]) : {message:"Private query detail",code:"42501"}),{status,headers:{"content-type":"application/json"}});
  });
  const client = createClient<Database>("https://current-report.fixture.test","synthetic-key",{global:{fetch:fetchFixture,headers:{Authorization:"Bearer synthetic-viewer"}},auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}});
  return {reader:createCurrentReportClient(client),requests,fetchFixture};
}
beforeEach(()=>vi.clearAllMocks());
it("reads real columns through the supplied client and maps a complete compatible batch",async()=>{
  const f=fixture(stored()); const result=await f.reader.fetchReport(reportId);
  expect(result.error).toBeNull(); expect(result.data?.recommendations).toEqual([recommendation]);
  expect(result.data?.rules_version).toBe(provenance.rules_version); expect(f.requests).toHaveLength(1);
});
it("accepts an explicitly recorded empty batch",async()=>{
  const f=fixture({...stored(),recommended_pathways:[]});
  expect((await f.reader.fetchReport(reportId)).data?.recommendations).toEqual([]);
});
it.each([null,{},"Legacy prose",[{title:"Legacy title"}],[recommendation,{...recommendation}], [{...recommendation,schema_version:2}]])("does not invent an empty or compatible comparison from unsupported payload %#",async payload=>{
  const f=fixture({...stored(),recommended_pathways:payload});const result=await f.reader.fetchReport(reportId);
  expect(result.data).toBeNull(); expect(result.error?.message).toContain("cannot be compared yet");
});
it("rejects malformed provenance rather than producing a misleading diff",async()=>{
  const f=fixture({...stored(),engine_channel:"unknown"});expect((await f.reader.fetchReport(reportId)).error).not.toBeNull();
});
it("distinguishes a missing report from a failed read",async()=>{
  expect(await fixture(null).reader.fetchReport(reportId)).toEqual({data:null,error:null});
  const failed=await fixture(null,403).reader.fetchReport(reportId);expect(failed.data).toBeNull();expect(failed.error?.message).toBe("Could not read the saved report for comparison.");
});
const input={reportId,age_band:"late_high_school",pillars:[{pillar:"employment",signals:[]}]};
it.each([previewPathwayReportDiffShadow,runPathwayShadowDiffAndRecordShadow])("comparison wrapper stays inactive by default %#",async fn=>{
  const rpc=vi.fn(); const result=await (fn as any)({data:input,context:{userId:"fixture-viewer",supabase:{rpc}}});
  expect(result).toEqual({ok:true,status:"disabled",reason:"flag_off"});expect(rpc).not.toHaveBeenCalled();expect(guards.adminRead).not.toHaveBeenCalled();expect(guards.generate).not.toHaveBeenCalled();
});
it.each([previewPathwayReportDiffShadow,runPathwayShadowDiffAndRecordShadow])("comparison wrapper checks caller role before privileged reads or generation %#",async fn=>{
  const rpc=vi.fn().mockResolvedValue({data:false,error:null});const result=await (fn as any)({data:{...input,enabled:true},context:{userId:"fixture-viewer",supabase:{rpc}}});
  expect(result.error_code).toBe("forbidden");expect(rpc).toHaveBeenCalledWith("has_role",{_user_id:"fixture-viewer",_role:"admin"});expect(guards.adminRead).not.toHaveBeenCalled();expect(guards.generate).not.toHaveBeenCalled();
});
