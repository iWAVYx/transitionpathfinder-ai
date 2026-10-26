import { afterEach, beforeEach, expect, it, vi } from "vitest";
const api = vi.hoisted(() => ({ generate: vi.fn(), gateway: vi.fn(() => () => "synthetic-model") }));
vi.mock("@tanstack/react-start", () => ({ createServerFn: () => {
  let parse = (v: unknown) => v;
  const builder = { middleware: () => builder, validator: (fn: typeof parse) => { parse = fn; return builder; }, handler: (fn: any) => ({ data, context }: any) => fn({ data: parse(data), context }) };
  return builder;
} }));
vi.mock("@/integrations/supabase/auth-middleware", () => ({ requireSupabaseAuth: {} }));
vi.mock("@/lib/ai-gateway.server", () => ({ createLovableAiGatewayProvider: api.gateway }));
vi.mock("ai", async original => ({ ...await original<typeof import("ai")>(), generateText: api.generate }));
import { generateReadinessInsights } from "@/lib/readiness-insights.functions";
const id = "11111111-1111-4111-8111-111111111111";
const callout = (pillar: string, score: number | null = 99) => ({ pillar, score, status: "strength", what_we_see: "A reported planning interest is supplied.", why_it_matters: "Review next steps together." });
const output = (pillars = [callout("Employment"), callout("Daily Living")]) => ({ headline: "Review Together", readiness_summary: "Planning information is available for discussion.", pillar_callouts: pillars, friendly_next_steps: Array.from({ length: 2 }, () => ({ title: "Review the plan", who: "team", when: "this_week", steps: ["Confirm available information together."], why: "Agree on a practical next step." })), encouragement: "Your perspective matters." });
function context(overrides: Record<string, any> = {}, rejectTable?: string) {
  const defaults: Record<string, any> = { students: { first_name: "Sample", strengths_summary: "Reported interests" }, goals: [], readiness_scores: [], student_voice_responses: [], documents: [], document_extractions: null, student_intakes: null };
  const from = vi.fn((table: string) => {
    const result = table in overrides ? overrides[table] : { data: defaults[table], error: null };
    const q: any = { then: (resolve: any, reject: any) => (table === rejectTable ? Promise.reject(new Error("PRIVATE read detail")) : Promise.resolve(result)).then(resolve, reject) };
    for (const method of ["select", "eq", "neq", "limit", "order", "is", "maybeSingle"]) q[method] = vi.fn(() => q);
    return q;
  });
  return { userId: "viewer", supabase: { from } };
}
const run = (ctx = context()) => (generateReadinessInsights as any)({ data: { student_id: id, expected_viewer_id: "viewer" }, context: ctx });
beforeEach(() => { vi.clearAllMocks(); vi.stubEnv("LOVABLE_API_KEY", "synthetic-only"); api.generate.mockResolvedValue({ experimental_output: output() }); });
afterEach(() => vi.unstubAllEnvs());
it.each(["students", "goals", "readiness_scores", "student_voice_responses", "documents", "document_extractions", "student_intakes"])("stops before AI when %s read fails, even with partial data", async table => {
  await expect(run(context({ [table]: { data: [], error: { message: "PRIVATE source failure" } } }))).rejects.toThrow("couldn't load the planning information");
  expect(api.generate).not.toHaveBeenCalled(); expect(api.gateway).not.toHaveBeenCalled();
});
it("keeps thrown source failures generic and stops before AI", async () => {
  await expect(run(context({}, "documents"))).rejects.toThrow("couldn't load the planning information");
  expect(api.generate).not.toHaveBeenCalled();
});
it.each(["goals", "readiness_scores", "student_voice_responses", "documents"])("does not interpret an unreadable null %s collection as empty", async table => {
  await expect(run(context({ [table]: { data: null, error: null } }))).rejects.toThrow("couldn't load"); expect(api.generate).not.toHaveBeenCalled();
});
it("permits genuinely empty optional sources without inventing assessed scores", async () => {
  const result = await run();
  expect(result.pillar_callouts.map((p: any) => [p.score, p.status])).toEqual([[null, "not_assessed"], [null, "not_assessed"]]);
  expect(result.sources.map((s: any) => s.kind)).toEqual(["profile"]);
  expect(api.generate).toHaveBeenCalledTimes(1);
  const request = api.generate.mock.calls[0][0];
  expect(request.system).toContain("Do not infer assessed readiness");
  expect(request.prompt).toContain('use score null and status "not_assessed"');
  expect(request.prompt).not.toContain("otherwise infer from goals");
});
it("denies unavailable students before AI", async () => {
  await expect(run(context({ students: { data: null, error: null } }))).rejects.toThrow("don't have access"); expect(api.generate).not.toHaveBeenCalled();
});
it.each([[0, "needs_focus"], [39.5, "needs_focus"], [40, "growing"], [59.9, "growing"], [60, "steady"], [79.9, "steady"], [80, "strength"], [100, "strength"]])("uses exact recorded %s and deterministic status %s instead of model guesses", async (score, status) => {
  const result = await run(context({ readiness_scores: { data: [{ category: "Employment", score, level_label: "invented label" }], error: null } }));
  expect(result.pillar_callouts[0]).toMatchObject({ score, status });
  expect(result.pillar_callouts[1]).toMatchObject({ score: null, status: "not_assessed" });
  expect(result.sources.find((s: any) => s.kind === "readiness").label).toBe("1 recorded readiness score");
  expect(api.generate.mock.calls[0][0].prompt).not.toContain("invented label");
});
it.each([null, -1, 101, NaN, Infinity, "75"])("excludes invalid recorded score %s from both badges and score source coverage", async score => {
  const result = await run(context({ readiness_scores: { data: [{ category: "Employment", score }], error: null } }));
  expect(result.pillar_callouts[0]).toMatchObject({ score: null, status: "not_assessed" });
  expect(result.sources.some((s: any) => s.kind === "readiness")).toBe(false);
});
it("does not guess between duplicate categories and tolerates readable formatting", async () => {
  api.generate.mockResolvedValue({ experimental_output: output([callout("Daily Living"), callout("Employment")]) });
  const result = await run(context({ readiness_scores: { data: [{ category: "daily_living", score: 45.5 }, { category: "Employment", score: 20 }, { category: " employment ", score: 95 }], error: null } }));
  expect(result.pillar_callouts.map((p: any) => [p.score, p.status])).toEqual([[45.5, "growing"], [null, "not_assessed"]]);
});
it("labels actual Builder input and document summary origins without claiming formal IEP evidence", async () => {
  const result = await run(context({ student_intakes: { data: { family_priorities: "Safe travel" }, error: null }, document_extractions: { data: { doc_type: "other", sections: {} }, error: null } }));
  expect(result.sources).toContainEqual({ kind: "intake", label: "Pathway Builder responses" });
  expect(result.sources).toContainEqual({ kind: "iep_extraction", label: "Latest document summary" });
  expect(api.generate.mock.calls[0][0].prompt).toContain("metadata, not proof that their contents were reviewed");
});
