import { expect, it } from "vitest";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "../../src/integrations/supabase/types";
import { cleanupReportHistoryFixture } from "../e2e/helpers/report-history-fixture-cleanup";
const fixture = {reportId:"11111111-1111-4111-8111-111111111111",intakeId:"22222222-2222-4222-8222-222222222222",ownerId:"33333333-3333-4333-8333-333333333333",reportCreated:true,intakeCreated:true,marker:"QA History synthetic parent"};
function mockClient(failReport=false) {
  const calls: Array<{method:string;url:URL}> = [];
  const client = createClient<Database>("https://fixture.example","sb_publishable_synthetic",{auth:{persistSession:false},global:{fetch:async (input,init)=>{
    const url = new URL(String(input)); const method=init?.method ?? "GET";calls.push({method,url});
    if (method === "DELETE") {
      if (failReport && url.pathname.endsWith("pathway_reports")) return new Response(JSON.stringify({message:"fixture deletion blocked",code:"42501"}),{status:403,headers:{"content-type":"application/json"}});
      const id=url.searchParams.get("id")!.replace("eq.","");return new Response(JSON.stringify([{id}]),{headers:{"content-type":"application/json"}});
    }
    return new Response(null,{headers:{"content-range":"*/0"}});
  }}});
  return {client,calls};
}
it("deletes report before intake with exact ID and owner filters, then reads only scoped counts",async()=>{
  const {client,calls}=mockClient();expect(await cleanupReportHistoryFixture(client,fixture)).toEqual([]);
  const deletes=calls.filter(c=>c.method === "DELETE");expect(deletes.map(c=>c.url.pathname.split("/").at(-1))).toEqual(["pathway_reports","student_intakes"]);
  expect(deletes.map(c=>c.url.searchParams.get("id"))).toEqual([`eq.${fixture.reportId}`,`eq.${fixture.intakeId}`]);
  for(const c of deletes)expect(c.url.searchParams.get("user_id")).toBe(`eq.${fixture.ownerId}`);
  expect(deletes[0].url.searchParams.get("model")).toBe("eq.synthetic-no-ai-history");
  expect(deletes[0].url.searchParams.get("intake_id")).toBe(`eq.${fixture.intakeId}`);
  expect(deletes[1].url.searchParams.get("student_first_name")).toBe(`eq.${fixture.marker}`);
  expect(calls.filter(c=>c.method === "HEAD")).toHaveLength(3);
});
it("partial intake-only setup never deletes a report it did not create",async()=>{
  const {client,calls}=mockClient();await cleanupReportHistoryFixture(client,{...fixture,reportCreated:false});
  expect(calls.filter(c=>c.method === "DELETE").map(c=>c.url.pathname)).toEqual(["/rest/v1/student_intakes"]);
});
it("attempts intake cleanup and count checks even after report deletion fails",async()=>{
  const {client,calls}=mockClient(true);expect(await cleanupReportHistoryFixture(client,fixture)).toEqual(["Exact disposable pathway_reports deletion failed"]);
  expect(calls.filter(c=>c.method === "DELETE")).toHaveLength(2);expect(calls.filter(c=>c.method === "HEAD")).toHaveLength(3);
});
it("rejects malformed cleanup IDs before making any request",async()=>{
  const {client,calls}=mockClient();await expect(cleanupReportHistoryFixture(client,{...fixture,reportId:""})).rejects.toThrow("Invalid exact fixture");expect(calls).toEqual([]);
});

it("cleans exact attempted IDs even when insert responses were not confirmed",async()=>{
  const {client,calls}=mockClient();expect(await cleanupReportHistoryFixture(client,{...fixture,reportCreated:false,intakeCreated:false,reportAttempted:true,intakeAttempted:true})).toEqual([]);
  expect(calls.filter(c=>c.method === "DELETE")).toHaveLength(2);
});
