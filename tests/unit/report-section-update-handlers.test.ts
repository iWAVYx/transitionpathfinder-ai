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
function database(content: unknown, owner = "owner", failure?: "snapshot" | "update" | "conflict") {
  const snapshots: any[] = [], updates: any[] = [], queries: any[] = [];
  const supabase = { from: vi.fn((table: string) => {
    let write: string | undefined;
    const read = table === "pathway_reports" ? { id, user_id: owner, student_id: studentId, intake_id: null, content }
      : table === "pathway_report_versions" ? { version_number: 2 }
      : table === "students" ? { id: studentId, first_name: "Fictional", interests: ["Art"], strengths: ["Observation"], needs: [] } : [];
    const result = () => ({ data: write === "update" ? failure === "conflict" ? null : { id } : write ? null : read, error: write === "snapshot" && failure === "snapshot" || write === "update" && failure === "update" ? { message: "Synthetic failure" } : null });
    const q: any = { select: vi.fn(() => q), eq: vi.fn(() => q), is: vi.fn(() => q), order: vi.fn(() => q), limit: vi.fn(() => q), maybeSingle: vi.fn(async () => result()),
      insert: vi.fn((value: unknown) => { write = "snapshot"; snapshots.push(value); return q; }),
      update: vi.fn((value: unknown) => { write = "update"; updates.push(value); return q; }),
      then: (resolve: any, reject: any) => Promise.resolve(result()).then(resolve, reject),
    }; queries.push({ table, q }); return q;
  }) };
  return { context: { userId: "owner", supabase }, snapshots, updates, queries };
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
  expect(db.snapshots[0].content).toEqual(current);
  expect(readSectionUpdates(db.updates[0].content)?.fields).toEqual({ summary: { operation: "saved", recorded_at: now }, confidence: { operation: "generated", recorded_at: oldDate } });
  expect(mocks.generate).not.toHaveBeenCalled();
});
it("restored older content is a save, not a new generation or approval", async () => {
  const old = recordGeneratedSections(undefined, { summary: "Earlier" }, oldDate);
  const current = recordGeneratedSections(old, { summary: "Later" }, "2026-10-10T12:00:00.000Z");
  const db = database(current);
  await (updateReportContent as any)({ context: db.context, data: { report_id: id, content: old } });
  expect(db.updates[0].content.summary).toBe("Earlier");
  expect(readSectionUpdates(db.updates[0].content)?.fields.summary).toEqual({ operation: "saved", recorded_at: now });
});
it("regeneration tracks its actual supplied fields and retains unknown original goal history", async () => {
  const current = { ...richerSharedFixture(), readiness_indicators: [{ domain: "Earlier domain", level: "ready" }] };
  const db = database(current);
  await (regeneratePathwayReport as any)({ context: db.context, data: { report_id: id } });
  expect(db.snapshots[0].content).toEqual(current);
  const next = db.updates[0].content, fields = readSectionUpdates(next)!.fields;
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
  expect(db.snapshots).toHaveLength(0); expect(db.updates).toHaveLength(0); expect(mocks.generate).not.toHaveBeenCalled();
});
it.each(["save", "regenerate"])("%s snapshot failure prevents content/status overwrite", async mode => {
  const db = database({ summary: "Original" }, "owner", "snapshot");
  const fn = mode === "save" ? updateReportContent : regeneratePathwayReport;
  await expect((fn as any)({ context: db.context, data: { report_id: id, content: { summary: "Changed" } } })).rejects.toThrow("snapshot");
  expect(db.updates).toHaveLength(0);
});
it("failed content write does not report tracking success", async () => {
  const db = database({ summary: "Original" }, "owner", "update");
  await expect((updateReportContent as any)({ context: db.context, data: { report_id: id, content: { summary: "Changed" } } })).rejects.toThrow("save the report");
});

it.each(["save", "regenerate"])("%s rejects an intervening write instead of reporting an overwritten report as saved", async mode => {
  const db = database({ summary: "Earlier read" }, "owner", "conflict");
  const fn = mode === "save" ? updateReportContent : regeneratePathwayReport;
  await expect((fn as any)({ context: db.context, data: { report_id: id, content: { summary: "Changed" } } })).rejects.toThrow("changed");
  const q = db.queries.filter(item => item.table === "pathway_reports").at(-1)!.q;
  expect(q.is).toHaveBeenCalledWith("content->section_updates->>write_id", null);
  expect(q.eq).toHaveBeenCalledWith("user_id", "owner");
});
it.each(["save", "regenerate"])("%s compares the previous server marker and writes a new marker", async mode => {
  const current = recordGeneratedSections(undefined, { summary: "Original" }, oldDate);
  const db = database(current), fn = mode === "save" ? updateReportContent : regeneratePathwayReport;
  await (fn as any)({ context: db.context, data: { report_id: id, content: { summary: "Changed", section_updates: { write_id: "forged" } } } });
  const q = db.queries.filter(item => item.table === "pathway_reports").at(-1)!.q;
  expect(q.eq).toHaveBeenCalledWith("content->section_updates->>write_id", previousReportWriteId(current));
  expect(q.is).not.toHaveBeenCalled();
  expect(previousReportWriteId(db.updates[0].content)).toBeTruthy();
  expect(previousReportWriteId(db.updates[0].content)).not.toBe(previousReportWriteId(current));
});

it.each([false, true])("actual Supabase SDK sends a bounded conditional save for tracked=%s without a full-content URL filter", async tracked => {
  const { createClient } = await import("@supabase/supabase-js");
  const base = { summary: "Long stored report ".repeat(12000) };
  const current = tracked ? recordGeneratedSections(undefined, base, oldDate) : base;
  let request: { url: URL; body: any } | undefined;
  const fetchFixture = vi.fn(async (input: any, init?: RequestInit) => {
    const url = new URL(String(input)), method = init?.method ?? "GET";
    expect(url.hostname).toBe("report-wire.fixture.test");
    const table = url.pathname.split("/").at(-1);
    if (method === "PATCH") {
      request = { url, body: JSON.parse(String(init!.body)) };
      return new Response(JSON.stringify({ id }), { status: 200, headers: { "content-type": "application/json" } });
    }
    const data = method === "POST" ? null : table === "pathway_reports" ? [{ id, user_id: "owner", content: current }] : [];
    return new Response(JSON.stringify(data), { status: 200, headers: { "content-type": "application/json" } });
  });
  const supabase = createClient("https://report-wire.fixture.test", "synthetic-key", { global: { fetch: fetchFixture }, auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } });
  await (updateReportContent as any)({ context: { supabase, userId: "owner" }, data: { report_id: id, content: { summary: "Saved change" } } });
  expect(request).toBeTruthy();
  expect(request!.url.href.length).toBeLessThan(1000);
  expect(request!.url.searchParams.get("content->section_updates->>write_id")).toBe(tracked ? `eq.${previousReportWriteId(current)}` : "is.null");
  expect(request!.url.searchParams.get("id")).toBe(`eq.${id}`);
  expect(request!.url.searchParams.get("user_id")).toBe("eq.owner");
  expect(request!.body.content.summary).toBe("Saved change");
  expect(previousReportWriteId(request!.body.content)).toBeTruthy();
  expect(mocks.generate).not.toHaveBeenCalled();
});
