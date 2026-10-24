import { expect, it } from "vitest";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "../../src/integrations/supabase/types";
import { linkedReportAccessTarget } from "../e2e/helpers/linked-report-access-policy";
import {
  cleanupLinkedAccessFixture,
  linkedAccessCleanupVerificationSql,
  type LinkedAccessFixture,
} from "../e2e/helpers/linked-report-access-cleanup";
const env = {
  RUN_LINKED_REPORT_ACCESS_STAGING_QA: "true",
  LINKED_REPORT_ACCESS_CONFIRMATION: "disposable-linked-report-access",
  LINKED_REPORT_ACCESS_RUN_ID: "12345-1",
  PLAYWRIGHT_BASE_URL: "https://transitionforward-staging.caysi101.workers.dev/",
  STAGING_SUPABASE_URL: "https://qgrertkqbwanerqqemph.supabase.co/",
  STAGING_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_synthetic",
  E2E_EXPECTED_BUILD_SHA: "a".repeat(40),
  EXPECTED_RUNTIME_SOURCE_FINGERPRINT: "b".repeat(64),
};
const id = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const fixture: LinkedAccessFixture = {
  studentId: id(1),
  intakeId: id(2),
  reportId: id(3),
  relationshipIds: [id(4), id(5)],
  actorIds: [id(6), id(7), id(8)],
  marker: "QA Linked Access 12345-1",
  studentAttempted: true,
  intakeAttempted: true,
  reportAttempted: true,
  relationshipsAttempted: true,
};
function clients(fail = false) {
  const calls: Array<{ method: string; url: URL }> = [];
  return {
    calls,
    actors: fixture.actorIds.map((id) => ({
      id,
      client: createClient<Database>("https://fixture.example", "sb_publishable_synthetic", {
        auth: { persistSession: false },
        global: {
          fetch: async (input, init) => {
            const url = new URL(String(input));
            const method = init?.method ?? "GET";
            calls.push({ method, url });
            if (fail && url.pathname.endsWith("student_relationships") && method === "DELETE")
              return new Response(JSON.stringify({ message: "blocked" }), {
                status: 403,
                headers: { "content-type": "application/json" },
              });
            return new Response(null, { status: 204, headers: { "content-range": "*/0" } });
          },
        },
      }),
    })),
  };
}
it("requires the dedicated authorization, exact isolated hosts and exact runtime identity", () => {
  expect(linkedReportAccessTarget(env).runId).toBe("12345-1");
  for (const overrides of [
    { RUN_LINKED_REPORT_ACCESS_STAGING_QA: "false" },
    { LINKED_REPORT_ACCESS_CONFIRMATION: "disposable-report-history" },
    { LINKED_REPORT_ACCESS_RUN_ID: "" },
    { PLAYWRIGHT_BASE_URL: "https://transitionforwardct.com/" },
    { STAGING_SUPABASE_URL: "https://other.supabase.co/" },
    { STAGING_SUPABASE_SERVICE_ROLE_KEY: "forbidden" },
    { E2E_EXPECTED_BUILD_SHA: "dev" },
  ])
    expect(() => linkedReportAccessTarget({ ...env, ...overrides })).toThrow();
});
it("cleans only five exact fixture IDs and possible fictional owners, then performs five scoped readbacks", async () => {
  const { actors, calls } = clients();
  expect(await cleanupLinkedAccessFixture(actors, fixture)).toEqual([]);
  const deletes = calls.filter((c) => c.method === "DELETE");
  expect(deletes.map((c) => c.url.pathname.split("/").at(-1))).toEqual([
    "student_relationships",
    "pathway_reports",
    "student_intakes",
    "students",
    "students",
    "students",
  ]);
  expect(deletes[0].url.searchParams.get("id")).toBe(`in.(${fixture.relationshipIds.join(",")})`);
  expect(deletes[0].url.searchParams.get("student_id")).toBe(`eq.${fixture.studentId}`);
  expect(deletes[1].url.searchParams.get("id")).toBe(`eq.${fixture.reportId}`);
  expect(deletes[1].url.searchParams.get("model")).toBe("eq.synthetic-no-ai-history");
  expect(deletes[1].url.searchParams.get("intake_id")).toBe(`eq.${fixture.intakeId}`);
  expect(deletes[2].url.searchParams.get("student_first_name")).toBe(`eq.${fixture.marker}`);
  for (const [i, c] of deletes.slice(3).entries()) {
    expect(c.url.searchParams.get("id")).toBe(`eq.${fixture.studentId}`);
    expect(c.url.searchParams.get("owner_id")).toBe(`eq.${fixture.actorIds[i]}`);
    expect(c.url.searchParams.get("is_demo")).toBe("eq.true");
    expect(c.url.searchParams.get("first_name")).toBe(`eq.${fixture.marker}`);
  }
  expect(calls.filter((c) => c.method === "HEAD")).toHaveLength(5);
});
it("rejects malformed or duplicate scopes before any request", async () => {
  for (const overrides of [
    { reportId: "" },
    { marker: "QA" },
    { relationshipIds: [id(4)] },
    { actorIds: [id(6), id(6), id(8)] },
  ]) {
    const { actors, calls } = clients();
    await expect(cleanupLinkedAccessFixture(actors, { ...fixture, ...overrides })).rejects.toThrow(
      "Invalid bounded",
    );
    expect(calls).toEqual([]);
  }
});
it("partial student-only setup never deletes unattempted planning rows", async () => {
  const { actors, calls } = clients();
  expect(
    await cleanupLinkedAccessFixture(actors, {
      ...fixture,
      intakeAttempted: false,
      reportAttempted: false,
      relationshipsAttempted: false,
    }),
  ).toEqual([]);
  expect(
    calls.filter((c) => c.method === "DELETE").every((c) => c.url.pathname.endsWith("students")),
  ).toBe(true);
});
it("continues exact cleanup after a deletion failure and retains the failure", async () => {
  const { actors, calls } = clients(true);
  expect(await cleanupLinkedAccessFixture(actors, fixture)).toEqual([
    "Exact relationship cleanup failed",
  ]);
  expect(calls.filter((c) => c.method === "DELETE")).toHaveLength(6);
  expect(calls.filter((c) => c.method === "HEAD")).toHaveLength(5);
});

it("prepares an independent read-only exact-ID cleanup check and refuses unsafe SQL scope", () => {
  const sql = linkedAccessCleanupVerificationSql(fixture);
  expect(sql).toContain("BEGIN READ ONLY");
  expect(sql).toContain("current_user<>'postgres'");
  expect(sql).toContain("relforcerowsecurity");
  for (const id of [
    fixture.studentId,
    fixture.reportId,
    fixture.intakeId,
    ...fixture.relationshipIds,
  ])
    expect(sql).toContain(id);
  expect(sql).not.toMatch(/\b(?:DELETE|UPDATE|INSERT|TRUNCATE)\s+(?:FROM|INTO|public)/i);
  expect(() =>
    linkedAccessCleanupVerificationSql({ ...fixture, studentId: "' OR true --" }),
  ).toThrow("Invalid bounded");
});
