import { expect, it } from "vitest";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "../../src/integrations/supabase/types";
import { cleanupReadiness, readinessAbsenceSql, validateReadinessScope, type ReadinessScope } from "../e2e/helpers/readiness-live-cleanup";
import { readinessLiveTarget, READINESS_LIVE_BUDGET } from "../e2e/helpers/readiness-live-policy";
const id = (n: number) => String(n).repeat(8) + "-1111-4111-8111-111111111111";
const f: ReadinessScope = { ownerId: id(1), studentId: id(2), scoreId: id(3), marker: "QA Readiness 12345-1 educator", role: "educator" };
const env = { RUN_READINESS_LIVE_QA: "true", READINESS_FIXTURE_CONFIRMATION: "disposable-readiness-live", READINESS_QA_RUN_ID: "12345-1", PLAYWRIGHT_BASE_URL: "https://gentle-forward-reach.lovable.app", STAGING_SUPABASE_URL: "https://qgrertkqbwanerqqemph.supabase.co", STAGING_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_synthetic", E2E_EXPECTED_BUILD_SHA: "a".repeat(40), EXPECTED_RUNTIME_SOURCE_FINGERPRINT: "b".repeat(64), EXPECTED_RUNTIME_SOURCE_FILE_COUNT: "1189" };
it("allows only the explicitly confirmed isolated readiness target and fixed budget", () => {
  expect(readinessLiveTarget(env).origin).toBe("https://gentle-forward-reach.lovable.app");
  expect(READINESS_LIVE_BUDGET).toMatchObject({ students: 2, readinessRows: 1, generationActions: 2, modelInvocationsMax: 2, sdkAttemptsMax: 6, testRetries: 0 });
});
it.each([{ RUN_READINESS_LIVE_QA: "false" }, { READINESS_FIXTURE_CONFIRMATION: "other" }, { READINESS_QA_RUN_ID: "old" }, { PLAYWRIGHT_BASE_URL: "https://transitionforwardct.com" }, { STAGING_SUPABASE_URL: "https://lrqcntqyekucamifpffs.supabase.co" }, { STAGING_SUPABASE_SERVICE_ROLE_KEY: "synthetic-disallowed" }, { STAGING_SUPABASE_PUBLISHABLE_KEY: "sk_test_disallowed" }, { E2E_EXPECTED_BUILD_SHA: "dev" }, { EXPECTED_RUNTIME_SOURCE_FINGERPRINT: "unknown" }, { EXPECTED_RUNTIME_SOURCE_FILE_COUNT: "0" }])("fails closed on unsafe test configuration %#", change => expect(() => readinessLiveTarget({ ...env, ...change })).toThrow());
it.each([{ studentId: "unsafe'" }, { ownerId: f.studentId }, { scoreId: f.studentId }, { marker: "QA Readiness old educator" }, { role: "parent", marker: "QA Readiness 12345-1 parent" }])("rejects unsafe cleanup scope before producing SQL %#", change => expect(() => readinessAbsenceSql({ ...f, ...change } as ReadinessScope)).toThrow());
it("generates owner-guarded independent read-only SQL for exact identifiers", () => {
  const sql = readinessAbsenceSql(f);
  expect(sql).toContain("BEGIN READ ONLY"); expect(sql).toContain("current_user<>'postgres'"); expect(sql).toContain("relforcerowsecurity"); expect(sql).toContain(f.studentId); expect(sql).toContain(f.scoreId);
  expect(sql).not.toMatch(/DELETE|ILIKE/); expect(sql).toContain("pathway_reports_count");
});
function setup(o: { wrongOwner?: boolean; wrongScore?: boolean; duplicate?: boolean; readError?: boolean; extraChild?: boolean; deleteFailure?: boolean; residual?: boolean } = {}, fixture: ReadinessScope = f) {
  const calls: Array<{ method: string; url: URL }> = [];
  const client = createClient<Database>("https://fixture.example", "sb_publishable_synthetic", { auth: { persistSession: false }, global: { fetch: async (input, init) => {
    const url = new URL(String(input)), method = init?.method ?? "GET", table = url.pathname.split("/").at(-1)!; calls.push({ method, url });
    if (method === "HEAD") return new Response(null, { headers: { "content-range": `*/${(o.extraChild && table === "documents") || (o.residual && calls.some(c => c.method === "DELETE")) ? 1 : 0}` } });
    if ((o.readError && method === "GET") || (o.deleteFailure && method === "DELETE")) return new Response(JSON.stringify({ message: "Synthetic failure", code: "42501" }), { status: 403, headers: { "content-type": "application/json" } });
    const student = { id: fixture.studentId, owner_id: o.wrongOwner ? id(8) : fixture.ownerId, first_name: fixture.marker, last_name: "Synthetic", notes: fixture.marker, is_demo: true, student_user_id: null };
    const score = { id: fixture.scoreId, student_id: fixture.studentId, category: "employment", score: o.wrongScore ? 90 : 75, evidence: fixture.marker, updated_by_user_id: fixture.ownerId, is_demo: true };
    const rows = table === "students" ? student : !fixture.scoreId ? [] : o.duplicate ? [score, score] : [score];
    return new Response(JSON.stringify(method === "DELETE" ? [{ id: table === "students" ? fixture.studentId : fixture.scoreId }] : rows), { headers: { "content-type": "application/json" } });
  } } });
  return { client, calls };
}
it("deletes only the exact synthetic score then the owned synthetic student", async () => {
  const { client, calls } = setup(); const result = await cleanupReadiness(client, f);
  expect(result.callerVisibleCountsZero).toBe(true); expect(result.independentPrivilegedAbsenceRequired).toBe(true);
  const deleted = calls.filter(c => c.method === "DELETE"); expect(deleted.map(c => c.url.pathname.split("/").at(-1))).toEqual(["readiness_scores", "students"]);
  expect(deleted[0].url.searchParams.get("id")).toBe(`eq.${f.scoreId}`); expect(deleted[0].url.searchParams.get("evidence")).toBe(`eq.${f.marker}`); expect(deleted[1].url.searchParams.get("owner_id")).toBe(`eq.${f.ownerId}`);
});
it.each([{ wrongOwner: true }, { wrongScore: true }, { duplicate: true }, { readError: true }, { extraChild: true }])("stops before all deletes for unexpected data %#", async o => {
  const { client, calls } = setup(o); await expect(cleanupReadiness(client, f)).rejects.toThrow(); expect(calls.some(c => c.method === "DELETE")).toBe(false);
});
it("retains the student after an unconfirmed score removal", async () => {
  const { client, calls } = setup({ deleteFailure: true }); await expect(cleanupReadiness(client, f)).rejects.toThrow("parent retained"); expect(calls.filter(c => c.method === "DELETE")).toHaveLength(1);
});
it("does not claim cleanup if exact residual counts remain", async () => {
  const { client } = setup({ residual: true }); await expect(cleanupReadiness(client, f)).rejects.toThrow("absence unconfirmed");
});

it("cleans the no-score Family fixture without touching readiness rows", async () => {
  const parent: ReadinessScope = { ...f, role: "parent", marker: "QA Readiness 12345-1 parent", scoreId: "" };
  const { client, calls } = setup({}, parent);
  await cleanupReadiness(client, parent);
  expect(calls.filter(c => c.method === "DELETE").map(c => c.url.pathname.split("/").at(-1))).toEqual(["students"]);
});

it("keeps the live fixture score compatible with the canonical integer column", async () => {
  const { readFileSync } = await import("node:fs");
  const migration = readFileSync("supabase/migrations/20260528231645_00134e64-b642-4fba-b713-8f13ac348250.sql", "utf8");
  expect(migration).toMatch(/CREATE TABLE IF NOT EXISTS public\.readiness_scores[\s\S]*?score integer CHECK/);
  const spec = readFileSync("tests/e2e/release-readiness/readiness-live-staging.signedin.spec.ts", "utf8");
  const fixtureScore = Number(spec.match(/category: "employment", score: ([0-9.]+)/)?.[1]);
  expect(Number.isInteger(fixtureScore)).toBe(true);
  expect(fixtureScore).toBeGreaterThanOrEqual(0); expect(fixtureScore).toBeLessThanOrEqual(100);
});
