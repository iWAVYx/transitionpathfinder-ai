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
const actor = "22222222-2222-4222-8222-222222222222", doc = "33333333-3333-4333-8333-333333333333", revision = "2026-11-16T12:00:00Z";
const reviewedRow = { document_id: doc, student_id: id, document_title: "Fictional Planning Document", doc_type: "current-iep", created_at: revision, document_updated_at: revision, extraction_updated_at: revision, summary_ready: true, sections: [] };
const callout = (pillar: string, score: number | null = 99) => ({ pillar, score, status: "strength", what_we_see: "A reported planning interest is supplied.", why_it_matters: "Review next steps together." });
const output = (pillars = [callout("Employment"), callout("Daily Living")]) => ({ headline: "Review Together", readiness_summary: "Planning information is available for discussion.", pillar_callouts: pillars, friendly_next_steps: Array.from({ length: 2 }, () => ({ title: "Review the plan", who: "team", when: "this_week", steps: ["Confirm available information together."], why: "Agree on a practical next step." })), encouragement: "Your perspective matters." });
function context(overrides: Record<string, any> = {}, rejectTable?: string) {
  const defaults: Record<string, any> = { students: { first_name: "Sample", strengths_summary: "Reported interests" }, goals: [], readiness_scores: [], student_voice_responses: [], documents: [], document_extractions: null, student_intakes: null };
  const from = vi.fn((table: string) => {
    const result = table in overrides ? overrides[table] : { data: defaults[table], error: null };
    const q: any = { range: vi.fn(async (from: number, to: number) => {
      if (table === rejectTable) throw Error("PRIVATE source detail");
      const rows = Array.isArray(result.data) ? result.data.map((row: any, n: number) => ({ id: `00000000-0000-4000-8000-${String(n + 1).padStart(12, "0")}`, student_id: id, ...row })) : result.data;
      return { ...result, data: Array.isArray(rows) ? rows.slice(from, to + 1) : rows, count: Array.isArray(rows) ? rows.length : null };
    }), then: (resolve: any, reject: any) => (table === rejectTable ? Promise.reject(new Error("PRIVATE read detail")) : Promise.resolve(result)).then(resolve, reject) };
    for (const method of ["select", "eq", "neq", "limit", "order", "is", "maybeSingle"]) q[method] = vi.fn(() => q);
    return q;
  });
  const rpc = vi.fn(async (name: string, args: any) => {
    if (name === "can_access_student") return { data: true, error: null };
    if (name === "is_partner_only") return { data: false, error: null };
    if (name === "read_reviewed_student_document_summaries") {
      if (overrides.projectionError) return { data: [], error: { message: "PRIVATE projection failure" } };
      if (!overrides.reviewed) return { data: [], error: null };
      return { data: [{ ...reviewedRow, sections: args._document_id ? [{ key: "strengths", value: "Reviewed planning strength" }] : [] }], error: null };
    }
    throw Error("Unexpected RPC");
  });
  return { userId: actor, supabase: { from, rpc } };
}
const run = (ctx = context()) => (generateReadinessInsights as any)({ data: { student_id: id, expected_viewer_id: actor }, context: ctx });
beforeEach(() => { vi.clearAllMocks(); vi.stubEnv("LOVABLE_API_KEY", "synthetic-only"); api.generate.mockResolvedValue({ experimental_output: output() }); });
afterEach(() => vi.unstubAllEnvs());
it.each(["students", "goals", "readiness_scores", "student_voice_responses", "student_intakes"])("stops before AI when %s read fails, even with partial data", async table => {
  await expect(run(context({ [table]: { data: [], error: { message: "PRIVATE source failure" } } }))).rejects.toThrow("couldn't load the planning information");
  expect(api.generate).not.toHaveBeenCalled(); expect(api.gateway).not.toHaveBeenCalled();
});
it("keeps thrown source failures generic and stops before AI", async () => {
  await expect(run(context({}, "goals"))).rejects.toThrow("couldn't load the planning information");
  expect(api.generate).not.toHaveBeenCalled();
});
it.each(["goals", "readiness_scores", "student_voice_responses"])("does not interpret an unreadable null %s collection as empty", async table => {
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
  const result = await run(context({ student_intakes: { data: { family_priorities: "Safe travel" }, error: null }, reviewed: true }));
  expect(result.sources).toContainEqual({ kind: "intake", label: "Pathway Builder responses" });
  expect(result.sources).toContainEqual({ kind: "iep_extraction", label: "Reviewed document sections" });
  expect(api.generate.mock.calls[0][0].prompt).toContain("metadata, not proof that their contents were reviewed");
});

it("fails before AI when the reviewed-only projection is unavailable", async () => {
  await expect(run(context({ projectionError: true }))).rejects.toThrow("couldn't load the planning information");
  expect(api.generate).not.toHaveBeenCalled(); expect(api.gateway).not.toHaveBeenCalled();
});
it("uses reviewed document fields without querying originals or raw extractions", async () => {
  const ctx = context({ reviewed: true, document_extractions: { data: { raw_extract: "PRIVATE RAW", sections: { needs: { state: "pending", value: "PRIVATE pending" } } }, error: null } });
  await run(ctx);
  expect(ctx.supabase.from.mock.calls.map(([table]) => table)).not.toContain("documents");
  expect(ctx.supabase.from.mock.calls.map(([table]) => table)).not.toContain("document_extractions");
  const prompt = api.generate.mock.calls[0][0].prompt;
  expect(prompt).toContain("Reviewed planning strength"); expect(prompt).not.toContain("PRIVATE");
  expect(prompt).toContain("recent samples, not complete histories");
});
it.each([false, null, "true"])("denies absent/unconfirmed student access %j before all source IO", async access => {
  const ctx = context(); ctx.supabase.rpc.mockResolvedValue({ data: access, error: null });
  await expect(run(ctx)).rejects.toThrow("couldn't confirm"); expect(ctx.supabase.from).not.toHaveBeenCalled();
  expect(api.generate).not.toHaveBeenCalled(); expect(api.gateway).not.toHaveBeenCalled();
});
it("denies Partner-only access before loading planning sources", async () => {
  const ctx = context(); ctx.supabase.rpc.mockImplementation(async name => ({ data: name === "can_access_student" || name === "is_partner_only", error: null }));
  await expect(run(ctx)).rejects.toThrow("couldn't confirm"); expect(ctx.supabase.from).not.toHaveBeenCalled(); expect(api.generate).not.toHaveBeenCalled();
});
it("rechecks lost student access before sending a provider request", async () => {
  const ctx = context(); let checks = 0; const original = ctx.supabase.rpc.getMockImplementation()!;
  ctx.supabase.rpc.mockImplementation(async (name,args) => name === "can_access_student" && ++checks > 1 ? { data: false, error: null } : original(name,args));
  await expect(run(ctx)).rejects.toThrow("couldn't confirm"); expect(api.generate).not.toHaveBeenCalled(); expect(api.gateway).not.toHaveBeenCalled();
});
it("withholds a model result when access is removed during generation", async () => {
  const ctx = context(); api.generate.mockImplementationOnce(async () => { ctx.supabase.rpc.mockImplementation(async name => ({ data: name === "can_access_student" ? false : null, error: null })); return { experimental_output: output() }; });
  await expect(run(ctx)).rejects.toThrow("couldn't generate readiness insights"); expect(api.generate).toHaveBeenCalledOnce();
});
it("does not send a model request if document metadata changes during collection", async () => {
  const ctx = context({ reviewed: true }); let lists = 0; const original = ctx.supabase.rpc.getMockImplementation()!;
  ctx.supabase.rpc.mockImplementation(async (name,args) => name === "read_reviewed_student_document_summaries" && !args._document_id && ++lists > 1 ? { data: [], error: null } : original(name,args));
  await expect(run(ctx)).rejects.toThrow("couldn't confirm"); expect(api.generate).not.toHaveBeenCalled();
});
it("withholds a result if the selected reviewed document is retired during generation", async () => {
  const ctx = context({ reviewed: true }); api.generate.mockImplementationOnce(async () => { const original=ctx.supabase.rpc.getMockImplementation()!;ctx.supabase.rpc.mockImplementation(async(name,args)=>name === "read_reviewed_student_document_summaries" ? {data:[],error:null} : original(name,args));return { experimental_output: output() }; });
  await expect(run(ctx)).rejects.toThrow("couldn't generate readiness insights"); expect(api.generate).toHaveBeenCalledOnce();
});
it("does not treat a score as unambiguous when its duplicate is beyond the first REST page", async () => {
  const scores=Array.from({length:1001},(_,n)=>({category:n===0||n===1000?'Employment':'Daily Living',score:75}));
  const result=await run(context({readiness_scores:{data:scores,error:null}}));
  expect(result.pillar_callouts.map((p:any)=>[p.score,p.status])).toEqual([[null,'not_assessed'],[null,'not_assessed']]);
  expect(result.sources.some((s:any)=>s.kind==='readiness')).toBe(false);
});
