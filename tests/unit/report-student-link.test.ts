import { beforeEach, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ generate: vi.fn(), authorize: vi.fn(), entitlement: vi.fn() }));
vi.mock("@tanstack/react-start", () => ({ createServerFn: () => {
  let parse = (data: unknown) => data;
  const builder = {
    middleware: () => builder,
    validator: (fn: typeof parse) => { parse = fn; return builder; },
    handler: (fn: any) => ({ data, context }: any) => fn({ data: parse(data), context }),
  };
  return builder;
} }));
vi.mock("@/integrations/supabase/auth-middleware", () => ({ requireSupabaseAuth: {} }));
vi.mock("@/lib/authz", () => ({ assertAuthorized: mocks.authorize }));
vi.mock("@/lib/entitlement-guard", () => ({ requireFeatureEntitlement: mocks.entitlement }));
vi.mock("@/lib/pathway-generation.server", () => ({ generateIntakeReport: mocks.generate, INTAKE_REPORT_MODEL: "synthetic-model" }));
vi.mock("@/lib/evidence-writers.functions", () => ({ linkReportProvenance: vi.fn().mockResolvedValue(undefined) }));
import { linkReportToStudent } from "../../src/lib/pathway.functions";
const reportId = "11111111-1111-4111-8111-111111111111";
const oldStudent = "22222222-2222-4222-8222-222222222222";
const nextStudent = "33333333-3333-4333-8333-333333333333";
const userId = "44444444-4444-4444-8444-444444444444";
const input = { report_id: reportId, student_id: nextStudent, expected_student_id: oldStudent };
function setup(result: unknown = { data: { id: reportId, student_id: nextStudent }, error: null }) {
 const q = { update: vi.fn(), eq: vi.fn(), is: vi.fn(), select: vi.fn(), maybeSingle: vi.fn().mockResolvedValue(result) };
 for (const key of ["update", "eq", "is", "select"] as const) q[key].mockReturnValue(q);
 const context = { userId, supabase: { from: vi.fn().mockReturnValue(q) } };
 return { q, context };
}
beforeEach(() => { vi.clearAllMocks(); mocks.authorize.mockResolvedValue(undefined); });
it.each([oldStudent, null])("compares observed student %s in the same owner-scoped update", async expected => {
 const {q,context}=setup();
 await expect((linkReportToStudent as any)({data:{...input,expected_student_id:expected},context})).resolves.toEqual({ok:true});
 expect(q.update).toHaveBeenCalledExactlyOnceWith({student_id:nextStudent});
 expect(q.eq).toHaveBeenCalledWith("id",reportId); expect(q.eq).toHaveBeenCalledWith("user_id",userId);
 if(expected===null)expect(q.is).toHaveBeenCalledExactlyOnceWith("student_id",null);
 else {expect(q.eq).toHaveBeenCalledWith("student_id",oldStudent);expect(q.is).not.toHaveBeenCalled();}
 expect(q.select).toHaveBeenCalledExactlyOnceWith("id, student_id");expect(q.maybeSingle).toHaveBeenCalledTimes(1);
 expect(mocks.authorize).toHaveBeenCalledWith(expect.objectContaining({userId,action:"edit",resourceType:"student",resourceId:nextStudent}),expect.any(String));
});
it.each([
 {data:null,error:null},
 {data:null,error:{message:"Private database detail"}},
 {data:{id:nextStudent,student_id:nextStudent},error:null},
 {data:{id:reportId,student_id:oldStudent},error:null},
])("does not report success or emit provenance for a denied/stale/invalid result %#", async result=>{
 const {q,context}=setup(result);
 await expect((linkReportToStudent as any)({data:input,context})).rejects.toThrow("Reload the report");
 const {linkReportProvenance}=await import("@/lib/evidence-writers.functions");expect(linkReportProvenance).not.toHaveBeenCalled();
 expect(q.maybeSingle).toHaveBeenCalledTimes(1);
});
it("requires the browser association before authorization or writes",async()=>{
 const {context}=setup();const {expected_student_id,...legacy}=input;
 expect(() => (linkReportToStudent as any)({data:legacy,context})).toThrow("Reload this report before changing its student.");
 expect(context.supabase.from).not.toHaveBeenCalled();expect(mocks.authorize).not.toHaveBeenCalled();
});
it("rejects unauthorized target access before any report update",async()=>{
 const {context}=setup();mocks.authorize.mockRejectedValue(new Error("No editing access"));
 await expect((linkReportToStudent as any)({data:input,context})).rejects.toThrow("No editing access");
 expect(context.supabase.from).not.toHaveBeenCalled();
});
it("unlinking still requires the actual owner and observed old student",async()=>{
 const {q,context}=setup({data:{id:reportId,student_id:null},error:null});
 await expect((linkReportToStudent as any)({data:{...input,student_id:null},context})).resolves.toEqual({ok:true});
 expect(q.eq).toHaveBeenCalledWith("user_id",userId);expect(q.eq).toHaveBeenCalledWith("student_id",oldStudent);
 expect(q.update).toHaveBeenCalledExactlyOnceWith({student_id:null});
 expect(mocks.authorize).not.toHaveBeenCalled();
});
