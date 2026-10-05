import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
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
import { createPathwayReport } from "../../src/lib/pathway.functions";
const studentId = "11111111-1111-4111-8111-111111111111";
const intakeId = "22222222-2222-4222-8222-222222222222";
const reportId = "33333333-3333-4333-8333-333333333333";
const report = { summary: "Synthetic validated generator result" };
function db(userId: string, fail?: "intake" | "report") {
  const queries = Object.fromEntries(["student_intakes", "pathway_reports"].map(table => {
    const failed = fail === (table === "student_intakes" ? "intake" : "report");
    const q = { insert: vi.fn(), select: vi.fn(), single: vi.fn().mockResolvedValue({ data: failed ? null : { id: table === "student_intakes" ? intakeId : reportId }, error: failed ? { message: "Synthetic save failure" } : null }) };
    q.insert.mockReturnValue(q); q.select.mockReturnValue(q); return [table, q];
  }));
  return { queries, context: { userId, supabase: { from: vi.fn((table: string) => queries[table]) } } };
}
const input = { student_id: studentId, submitter_role: "family", student_first_name: "Sample" };
beforeEach(() => {
  vi.clearAllMocks(); vi.stubEnv("LOVABLE_API_KEY", "synthetic-test-only");
  mocks.authorize.mockResolvedValue(undefined); mocks.entitlement.mockResolvedValue(undefined);
  mocks.generate.mockResolvedValue(report);
});
afterEach(() => vi.unstubAllEnvs());
describe("authorized Pathway creators and saved-output identity", () => {
  it.each([["family", "family-synthetic"], ["educator", "educator-synthetic"]])("persists an authorized %s intake and report under the actual caller", async (role, userId) => {
    const { context, queries } = db(userId);
    const result = await (createPathwayReport as any)({ data: { ...input, submitter_role: role }, context });
    expect(mocks.authorize).toHaveBeenCalledWith(expect.objectContaining({ userId, action: "edit", resourceType: "student", resourceId: studentId }), expect.any(String));
    expect(queries.student_intakes.insert).toHaveBeenCalledWith(expect.objectContaining({ user_id: userId, student_id: studentId, submitter_role: role }));
    expect(queries.pathway_reports.insert).toHaveBeenCalledWith(expect.objectContaining({ user_id: userId, student_id: studentId, intake_id: intakeId, content: report }));
    expect(result).toMatchObject({ reportId, intakeId, studentId });
    expect(mocks.generate).toHaveBeenCalledTimes(1);
  });
  it("rejects missing student access before writes or AI", async () => {
    mocks.authorize.mockRejectedValue(new Error("Synthetic access denied"));
    const { context, queries } = db("unrelated-synthetic");
    await expect((createPathwayReport as any)({ data: input, context })).rejects.toThrow("access denied");
    expect(queries.student_intakes.insert).not.toHaveBeenCalled(); expect(mocks.generate).not.toHaveBeenCalled();
  });
  it("rejects an intake save failure before AI", async () => {
    const { context } = db("educator-synthetic", "intake");
    await expect((createPathwayReport as any)({ data: { ...input, submitter_role: "educator" }, context })).rejects.toThrow("save your intake");
    expect(mocks.generate).not.toHaveBeenCalled();
  });
  it("does not claim success if the generated report could not be saved", async () => {
    const { context } = db("family-synthetic", "report");
    await expect((createPathwayReport as any)({ data: input, context })).rejects.toThrow("couldn't save");
    expect(mocks.generate).toHaveBeenCalledTimes(1);
  });
});
