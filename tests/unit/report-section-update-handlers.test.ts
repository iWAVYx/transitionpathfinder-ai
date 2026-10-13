import { afterEach, beforeEach, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ generate: vi.fn(), entitlement: vi.fn() }));
vi.mock("@tanstack/react-start", () => ({ createServerFn: () => {
  let parse = (value: unknown) => value;
  const b = { middleware: () => b, validator: (fn: typeof parse) => { parse = fn; return b; }, handler: (fn: any) => ({ data, context }: any) => fn({ data: parse(data), context }) }; return b;
} }));
vi.mock("@/integrations/supabase/auth-middleware", () => ({ requireSupabaseAuth: {} }));
vi.mock("@/lib/entitlement-guard", () => ({ requireFeatureEntitlement: mocks.entitlement }));
vi.mock("@/lib/ai-gateway.server", () => ({ createLovableAiGatewayProvider: () => () => "synthetic-model" }));
vi.mock("ai", () => ({ generateText: mocks.generate, Output: { object: () => ({}) } }));
vi.mock("@/lib/structured-output-system", () => ({ buildStructuredOutputSystem: async () => "synthetic-system" }));
import { updateReportContent, regeneratePathwayReport } from "../../src/lib/pathway.functions";
import { readSectionUpdates, recordGeneratedSections, previousReportWriteId } from "../../src/lib/report-section-updates";
import { richerSharedFixture } from "../fixtures/shared-report";
const id = "11111111-1111-4111-8111-111111111111", studentId = "22222222-2222-4222-8222-222222222222";
const oldDate = "2026-10-01T12:00:00.000Z", now = "2026-10-12T18:00:00.000Z";
function database(content: unknown, owner = "owner", failure?: "snapshot" | "update" | "conflict" | "missing" | "throw") {
  const requests: any[] = [], queries: any[] = [];
  const supabase = {
    rpc: vi.fn(async (_name: string, args: any) => {
      requests.push(args);
      if (failure === "throw") throw new Error("Synthetic transport detail must not escape");
      return { data: failure ? null : 3, error: failure ? { code: failure === "conflict" ? "40001" : failure === "missing" ? "PGRST202" : "23514", message: "Synthetic private database detail" } : null };
    }),
    from: vi.fn((table: string) => {
      const read = table === "pathway_reports" ? { id, user_id: owner, student_id: studentId, intake_id: null, content }
        : table === "students" ? { id: studentId, first_name: "Fictional", interests: ["Art"], strengths: ["Observation"], needs: [] } : [];
      const result = { data: read, error: null };
      const q: any = { select: vi.fn(() => q), eq: vi.fn(() => q), order: vi.fn(() => q), limit: vi.fn(() => q), maybeSingle: vi.fn(async () => result),
        insert: vi.fn(() => { throw new Error("Split snapshot insert forbidden"); }),
        update: vi.fn(() => { throw new Error("Split content update forbidden"); }),
        then: (resolve: any, reject: any) => Promise.resolve(result).then(resolve, reject),
      }; queries.push({ table, q }); return q;
    }),
  };
  return { context: { userId: "owner", supabase }, requests, queries };
}
beforeEach(() => {
  vi.clearAllMocks(); vi.useFakeTimers(); vi.setSystemTime(new Date(now)); vi.stubEnv("LOVABLE_API_KEY", "synthetic-only");
  mocks.entitlement.mockResolvedValue(undefined);
  mocks.generate.mockResolvedValue({ experimental_output: { schema_version: 2,
    plain_language_summary: "Fictional enjoys art and uses observation during a supported visit; discuss the next step and available support together.",
    professional_summary: "The fictional profile records art interests and observation strengths; obtain current observations before reviewing supports with the team.",
    spin: { strengths: ["Observation"] }, confidence: { overall: "low", rationale: "Current observations are missing." },
  } });
});
afterEach(() => { vi.useRealTimers(); vi.unstubAllEnvs(); });
it("snapshots prior tracking and stamps only changed saved sections, ignoring forged dates", async () => {
  const current = recordGeneratedSections(undefined, { summary: "Original", confidence: { overall: "low" } }, oldDate);
  const db = database(current);
  await (updateReportContent as any)({ context: db.context, data: { report_id: id, content: { ...current, summary: "Edited", section_updates: { version: 1, fields: { confidence: { operation: "generated", recorded_at: now } } } } } });
  expect(db.requests[0]._expected_content).toEqual(current);
  expect(readSectionUpdates(db.requests[0]._next_content)?.fields).toEqual({ summary: { operation: "saved", recorded_at: now }, confidence: { operation: "generated", recorded_at: oldDate } });
  expect(mocks.generate).not.toHaveBeenCalled();
});
it("restored older content is a save, not a new generation or approval", async () => {
  const old = recordGeneratedSections(undefined, { summary: "Earlier" }, oldDate);
  const current = recordGeneratedSections(old, { summary: "Later" }, "2026-10-10T12:00:00.000Z");
  const db = database(current);
  await (updateReportContent as any)({ context: db.context, data: { report_id: id, content: old } });
  expect(db.requests[0]._next_content.summary).toBe("Earlier");
  expect(readSectionUpdates(db.requests[0]._next_content)?.fields.summary).toEqual({ operation: "saved", recorded_at: now });
});
it("regeneration tracks its actual supplied fields and retains unknown original goal history", async () => {
  const current = { ...richerSharedFixture(), readiness_indicators: [{ domain: "Earlier domain", level: "ready" }] };
  const db = database(current);
  await (regeneratePathwayReport as any)({ context: db.context, data: { report_id: id } });
  expect(db.requests[0]._expected_content).toEqual(current);
  const next = db.requests[0]._next_content, fields = readSectionUpdates(next)!.fields;
  expect(next.postsecondary_goals).toEqual(current.postsecondary_goals);
  expect(next.employment_pathway_recs).toEqual(current.employment_pathway_recs);
  expect(fields.postsecondary_goals).toBeUndefined(); expect(fields.employment_pathway_recs).toBeUndefined();
  expect(fields.plain_language_summary).toEqual({ operation: "generated", recorded_at: now });
  expect(fields.confidence).toEqual({ operation: "generated", recorded_at: now });
  expect(next.readiness_indicators).toBeUndefined(); expect(fields.readiness_indicators).toBeUndefined();
  expect(JSON.stringify(mocks.generate.mock.calls)).not.toContain("section_updates");
});
it.each(["save", "regenerate"])("%s ownership denial occurs before provider or history writes", async mode => {
  const db = database({ summary: "Original" }, "other-owner");
  const fn = mode === "save" ? updateReportContent : regeneratePathwayReport;
  await expect((fn as any)({ context: db.context, data: { report_id: id, content: { summary: "Changed" } } })).rejects.toThrow("permission");
  expect(db.requests).toHaveLength(0); expect(db.context.supabase.rpc).not.toHaveBeenCalled(); expect(mocks.generate).not.toHaveBeenCalled();
});
it.each(["save", "regenerate"])("%s uses one atomic RPC and returns its actual version", async mode => {
  const current = recordGeneratedSections(undefined, { summary: "Original" }, oldDate);
  const db = database(current), fn = mode === "save" ? updateReportContent : regeneratePathwayReport;
  const result = await (fn as any)({ context: db.context, data: { report_id: id, content: { summary: "Changed", section_updates: { write_id: "forged" } } } });
  expect(result.version_number).toBe(3);
  expect(db.context.supabase.rpc).toHaveBeenCalledTimes(1);
  expect(db.context.supabase.rpc.mock.calls[0][0]).toBe("save_pathway_report_content_atomic");
  expect(db.requests[0]._report_id).toBe(id);
  expect(db.requests[0]._expected_content).toEqual(current);
  expect(previousReportWriteId(db.requests[0]._next_content)).toBeTruthy();
  expect(previousReportWriteId(db.requests[0]._next_content)).not.toBe(previousReportWriteId(current));
  expect(db.queries.some(q => q.table === "pathway_report_versions")).toBe(false);
  for (const { q } of db.queries) { expect(q.insert).not.toHaveBeenCalled(); expect(q.update).not.toHaveBeenCalled(); }
});
it.each(["save", "regenerate"])("%s maps conflict to reload without a second RPC or provider retry", async mode => {
  const db = database({ summary: "Earlier read" }, "owner", "conflict");
  const fn = mode === "save" ? updateReportContent : regeneratePathwayReport;
  await expect((fn as any)({ context: db.context, data: { report_id: id, content: { summary: "Changed" } } })).rejects.toThrow("Reload");
  expect(db.context.supabase.rpc).toHaveBeenCalledTimes(1);
  expect(db.requests[0]._expected_content).toEqual({ summary: "Earlier read" });
  expect(mocks.generate).toHaveBeenCalledTimes(mode === "save" ? 0 : 1);
});
it.each(["save", "regenerate"].flatMap(mode => ["snapshot", "update", "missing", "throw"].map(failure => ({ mode, failure }))))("$mode stops on $failure without a split-write fallback or private error details", async ({ mode, failure }) => {
  const db = database({ summary: "Original" }, "owner", failure as any);
  const fn = mode === "save" ? updateReportContent : regeneratePathwayReport;
  await expect((fn as any)({ context: db.context, data: { report_id: id, content: { summary: "Changed" } } })).rejects.toThrow(mode === "save" ? "Could not save the report." : "Could not save the regenerated report.");
  expect(db.context.supabase.rpc).toHaveBeenCalledTimes(1);
  expect(db.queries.some(q => q.table === "pathway_report_versions")).toBe(false);
  for (const { q } of db.queries) { expect(q.insert).not.toHaveBeenCalled(); expect(q.update).not.toHaveBeenCalled(); }
  expect(mocks.generate).toHaveBeenCalledTimes(mode === "save" ? 0 : 1);
});
it.each([null, 0, -1, 1.5, "3", {}, [], 2147483648])("save does not report success for invalid RPC version %j", async version => {
  const db = database({ summary: "Original" });
  db.context.supabase.rpc.mockResolvedValueOnce({ data: version as any, error: null });
  await expect((updateReportContent as any)({ context: db.context, data: { report_id: id, content: { summary: "Changed" } } })).rejects.toThrow("Could not save the report.");
  expect(db.context.supabase.rpc).toHaveBeenCalledTimes(1);
});
it("manual save retains the caller summary and regeneration retains its input-diff summary", async () => {
  const db = database({ summary: "Original" });
  await (updateReportContent as any)({ context: db.context, data: { report_id: id, content: { summary: "Changed" }, change_summary: "Restored an earlier version" } });
  expect(db.requests[0]._change_summary).toBe("Restored an earlier version");
  const regen = database(richerSharedFixture());
  const result = await (regeneratePathwayReport as any)({ context: regen.context, data: { report_id: id } });
  expect(regen.requests[0]._change_summary).toBe(result.change_summary);
  expect(regen.requests[0]._next_content.change_summary).toBe(result.change_summary);
});
it.each([false, true])("actual Supabase SDK sends tracked=%s as a POST body with full observed content and caller authorization", async tracked => {
  const { createClient } = await import("@supabase/supabase-js");
  const base = { summary: "Long stored report ".repeat(12000) };
  const current = tracked ? recordGeneratedSections(undefined, base, oldDate) : base;
  const requests: { url: URL; method: string; body: any; headers: Headers }[] = [];
  const fetchFixture = vi.fn(async (input: any, init?: RequestInit) => {
    const url = new URL(String(input)), method = init?.method ?? "GET";
    expect(url.hostname).toBe("report-wire.fixture.test");
    const body = init?.body ? JSON.parse(String(init.body)) : undefined;
    requests.push({ url, method, body, headers: new Headers(init?.headers) });
    if (method === "POST") {
      expect(url.pathname).toBe("/rest/v1/rpc/save_pathway_report_content_atomic");
      return new Response("7", { status: 200, headers: { "content-type": "application/json" } });
    }
    expect(method).toBe("GET"); expect(url.pathname).toBe("/rest/v1/pathway_reports");
    return new Response(JSON.stringify([{ id, user_id: "owner", content: current }]), { status: 200, headers: { "content-type": "application/json" } });
  });
  const supabase = createClient("https://report-wire.fixture.test", "synthetic-key", { global: { fetch: fetchFixture, headers: { Authorization: "Bearer synthetic-owner-token" } }, auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } });
  const result = await (updateReportContent as any)({ context: { supabase, userId: "owner" }, data: { report_id: id, content: { summary: "Saved change" } } });
  expect(result.version_number).toBe(7);
  expect(requests).toHaveLength(2);
  const request = requests[1];
  expect(request.method).toBe("POST"); expect(request.url.search).toBe("");
  expect(request.url.href.length).toBeLessThan(1000);
  expect(request.headers.get("authorization")).toBe("Bearer synthetic-owner-token");
  expect(request.body._expected_content).toEqual(current);
  expect(request.body._next_content.summary).toBe("Saved change");
  expect(previousReportWriteId(request.body._next_content)).toBeTruthy();
  expect(Object.keys(request.body).sort()).toEqual(["_change_summary", "_expected_content", "_next_content", "_report_id"]);
  expect(request.body._report_id).toBe(id); expect(request.body._change_summary).toBeNull();
  expect(mocks.generate).not.toHaveBeenCalled();
});

it.each(["40001", "PGRST202", "transport"])("actual SDK %s failure stops after one atomic POST without a fallback", async failure => {
  const { createClient } = await import("@supabase/supabase-js");
  const attempts: string[] = [];
  const fetchFixture = vi.fn(async (input: any, init?: RequestInit) => {
    const url = new URL(String(input)), method = init?.method ?? "GET";
    expect(url.hostname).toBe("report-wire.fixture.test");
    attempts.push(`${method} ${url.pathname}`);
    if (method === "GET") return new Response(JSON.stringify([{ id, user_id: "owner", content: { summary: "Original" } }]), { status: 200, headers: { "content-type": "application/json" } });
    expect(method).toBe("POST");
    expect(url.pathname).toBe("/rest/v1/rpc/save_pathway_report_content_atomic");
    if (failure === "transport") throw new Error("Synthetic private transport details");
    return new Response(JSON.stringify({ code: failure, message: "Synthetic private database details", details: "Private fixture", hint: null }), { status: failure === "40001" ? 409 : 404, headers: { "content-type": "application/json" } });
  });
  const supabase = createClient("https://report-wire.fixture.test", "synthetic-key", { global: { fetch: fetchFixture }, auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } });
  const attempt = (updateReportContent as any)({ context: { supabase, userId: "owner" }, data: { report_id: id, content: { summary: "Changed" } } });
  await expect(attempt).rejects.toThrow(failure === "40001" ? "Reload it before trying again." : "Could not save the report.");
  expect(attempts).toEqual(["GET /rest/v1/pathway_reports", "POST /rest/v1/rpc/save_pathway_report_content_atomic"]);
  expect(mocks.generate).not.toHaveBeenCalled();
});
