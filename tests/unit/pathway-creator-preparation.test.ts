import { expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "../../src/integrations/supabase/types";
import {
  cleanupCreator,
  creatorAbsenceSql,
  CREATOR_EMPTY_STUDENT_TABLES,
  type CreatorScope,
} from "../e2e/helpers/pathway-creator-cleanup";
import {
  pathwayCreatorTarget,
  PATHWAY_CREATOR_BUDGET,
} from "../e2e/helpers/pathway-creator-policy";
const id = (n: number) => String(n).repeat(8) + "-1111-4111-8111-111111111111";
const f: CreatorScope = {
  ownerId: id(1),
  studentId: id(2),
  intakeId: id(3),
  reportId: id(4),
  marker: "QA Pathway Creator 12345-1 parent",
  role: "parent",
};
function setup(
  o: {
    duplicate?: boolean;
    wrongOwner?: boolean;
    wrongContext?: boolean;
    studentUser?: boolean;
    readError?: string;
    extraChild?: string;
    deleteError?: string;
    residual?: string;
    empty?: boolean;
    extraVersions?: boolean;
  } = {},
) {
  const calls: Array<{ url: URL; method: string }> = [];
  const client = createClient<Database>("https://fixture.example", "sb_publishable_synthetic", {
    auth: { persistSession: false },
    global: {
      fetch: async (input, init) => {
        const url = new URL(String(input)),
          method = init?.method ?? "GET",
          table = url.pathname.split("/").at(-1)!;
        calls.push({ url, method });
        if (method === "HEAD")
          return new Response(null, {
            headers: {
              "content-range": `*/${o.extraChild === table || (o.residual === table && calls.some((x) => x.method === "DELETE")) ? 1 : 0}`,
            },
          });
        if (
          (o.readError === table && method === "GET") ||
          (o.deleteError === table && method === "DELETE")
        )
          return new Response(JSON.stringify({ message: "Synthetic error", code: "42501" }), {
            status: 403,
            headers: { "content-type": "application/json" },
          });
        let rows: any[] = o.empty
          ? []
          : table === "students"
            ? [
                {
                  id: f.studentId,
                  owner_id: o.wrongOwner ? id(7) : f.ownerId,
                  first_name: f.marker,
                  last_name: "Synthetic",
                  notes: f.marker,
                  is_demo: true,
                  student_user_id: o.studentUser ? id(8) : null,
                },
              ]
            : table === "student_intakes"
              ? [
                  {
                    id: f.intakeId,
                    user_id: f.ownerId,
                    student_id: f.studentId,
                    student_first_name: f.marker,
                    submitter_role: "family",
                  },
                ]
              : table === "pathway_reports"
                ? [
                    {
                      id: f.reportId,
                      user_id: f.ownerId,
                      student_id: f.studentId,
                      intake_id: o.wrongContext ? id(8) : f.intakeId,
                      model: "google/gemini-2.5-pro",
                    },
                  ]
                : [{ id: id(5), created_by: f.ownerId, report_id: f.reportId }];
        if (
          (o.duplicate && table === "student_intakes") ||
          (o.extraVersions && table === "pathway_report_versions")
        )
          rows = [...rows, ...rows];
        if (method === "DELETE") rows = [{ id: url.searchParams.get("id")!.slice(3) }];
        return new Response(JSON.stringify(rows), {
          headers: { "content-type": "application/json" },
        });
      },
    },
  });
  return { client, calls };
}
it("records every resolved ID before exact owner/context deletions, then checks provisional absence", async () => {
  const { client, calls } = setup();
  const record = vi.fn(async () => {
    expect(calls.some((x) => x.method === "DELETE")).toBe(false);
  });
  const result = await cleanupCreator(client, f, record);
  expect(result).toMatchObject({
    callerVisibleCountsZero: true,
    independentPrivilegedAbsenceRequired: true,
    versionIds: [id(5)],
  });
  expect(record).toHaveBeenCalledExactlyOnceWith({ ...f, versionIds: [id(5)] });
  const deletes = calls.filter((x) => x.method === "DELETE");
  expect(deletes.map((x) => x.url.pathname.split("/").at(-1))).toEqual([
    "pathway_reports",
    "student_intakes",
    "students",
  ]);
  expect(deletes[0].url.searchParams.get("id")).toBe("eq." + f.reportId);
  expect(deletes[0].url.searchParams.get("student_id")).toBe("eq." + f.studentId);
  expect(deletes[0].url.searchParams.get("intake_id")).toBe("eq." + f.intakeId);
  expect(deletes[0].url.searchParams.get("user_id")).toBe("eq." + f.ownerId);
  expect(deletes[2].url.searchParams.get("id")).toBe("eq." + f.studentId);
  expect(deletes[2].url.searchParams.get("owner_id")).toBe("eq." + f.ownerId);
  expect(deletes[2].url.searchParams.get("notes")).toBe("eq." + f.marker);
  expect(deletes[2].url.searchParams.get("student_user_id")).toBe("is.null");
  expect(deletes.every((x) => !x.url.search.includes("like."))).toBe(true);
});
it.each([
  { duplicate: true },
  { wrongOwner: true },
  { wrongContext: true },
  { studentUser: true },
  { readError: "students" },
  { readError: "student_intakes" },
  { readError: "pathway_reports" },
  { readError: "pathway_report_versions" },
  { extraVersions: true },
  ...["student_guardians", "goals", "evidence_items", "share_tokens", "evidence_edges"].map(
    (extraChild) => ({ extraChild }),
  ),
])(
  "refuses ambiguous, linked-to-account or unexpected fixture context before any deletion %#",
  async (o) => {
    const { client, calls } = setup(o);
    const record = vi.fn();
    await expect(cleanupCreator(client, f, record)).rejects.toThrow();
    expect(record).not.toHaveBeenCalled();
    expect(calls.some((x) => x.method === "DELETE")).toBe(false);
  },
);
it("receipt failure stops before every deletion", async () => {
  const { client, calls } = setup();
  await expect(
    cleanupCreator(client, f, async () => {
      throw Error("receipt unavailable");
    }),
  ).rejects.toThrow("receipt unavailable");
  expect(calls.some((x) => x.method === "DELETE")).toBe(false);
});
it("does not cascade the student after a child-delete failure", async () => {
  const { client, calls } = setup({ deleteError: "pathway_reports" });
  await expect(cleanupCreator(client, f, async () => {})).rejects.toThrow("Exact deletion failed");
  expect(calls.some((x) => x.method === "DELETE" && x.url.pathname.endsWith("/students"))).toBe(
    false,
  );
  expect(
    calls.some((x) => x.method === "DELETE" && x.url.pathname.endsWith("/student_intakes")),
  ).toBe(false);
});
it("rejects a remaining exact report after deletion", async () => {
  const { client } = setup({ residual: "pathway_reports" });
  await expect(cleanupCreator(client, f, async () => {})).rejects.toThrow("absence failed");
});
it("supports preallocated student scope before setup without deleting nonexistent records", async () => {
  const { client, calls } = setup({ empty: true });
  await cleanupCreator(client, { ...f, intakeId: "", reportId: "" }, async () => {});
  expect(calls.some((x) => x.method === "DELETE")).toBe(false);
});
it.each([
  { studentId: "unsafe'" },
  { marker: "QA Pathway Creator old parent" },
  { ownerId: f.studentId },
  { role: "student" as any },
  { intakeId: f.reportId },
])(
  "refuses malformed or overlapping identity before read, write or SQL generation %#",
  async (change) => {
    const { client, calls } = setup();
    await expect(cleanupCreator(client, { ...f, ...change }, async () => {})).rejects.toThrow(
      "Invalid",
    );
    expect(calls).toHaveLength(0);
    expect(() => creatorAbsenceSql({ ...f, ...change })).toThrow("Invalid");
  },
);
it("independent cleanup query requires privileged table ownership and remains read-only for every exact table", () => {
  const sql = creatorAbsenceSql(f);
  expect(sql).toContain("BEGIN READ ONLY;");
  expect(sql).toContain("current_user<>'postgres'");
  expect(sql).toContain("relforcerowsecurity");
  expect(sql).toContain(f.studentId);
  expect(sql).toContain(f.reportId);
  expect(sql).toContain(f.intakeId);
  for (const table of CREATOR_EMPTY_STUDENT_TABLES) expect(sql).toContain("public." + table);
  expect(sql).not.toMatch(/\b(DELETE|INSERT|UPDATE|ALTER|DROP|TRUNCATE)\b/i);
});
const env = {
  RUN_PATHWAY_CREATOR_QA: "true",
  PATHWAY_CREATOR_CONFIRMATION: "disposable-pathway-creator",
  PATHWAY_CREATOR_RUN_ID: "12345-1",
  PLAYWRIGHT_BASE_URL: "https://gentle-forward-reach.lovable.app",
  STAGING_SUPABASE_URL: "https://qgrertkqbwanerqqemph.supabase.co",
  STAGING_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_synthetic",
  E2E_EXPECTED_BUILD_SHA: "a".repeat(40),
  EXPECTED_RUNTIME_SOURCE_FINGERPRINT: "b".repeat(64),
  EXPECTED_RUNTIME_SOURCE_FILE_COUNT: "1185",
};
it("accepts only explicitly confirmed caller-RLS isolated targets", () => {
  expect(pathwayCreatorTarget(env)).toMatchObject({
    origin: "https://gentle-forward-reach.lovable.app",
    controlOrigin: "https://transitionforward-staging.caysi101.workers.dev",
    fileCount: 1185,
  });
});
it.each([
  { RUN_PATHWAY_CREATOR_QA: "false" },
  { PATHWAY_CREATOR_CONFIRMATION: "" },
  { PATHWAY_CREATOR_RUN_ID: "" },
  { PLAYWRIGHT_BASE_URL: "https://example.com" },
  { STAGING_SUPABASE_URL: "https://example.com" },
  { STAGING_SUPABASE_PUBLISHABLE_KEY: "sb_secret_synthetic" },
  { STAGING_SUPABASE_SERVICE_ROLE_KEY: "not-allowed" },
  { E2E_EXPECTED_BUILD_SHA: "dev" },
  { EXPECTED_RUNTIME_SOURCE_FINGERPRINT: "" },
  { EXPECTED_RUNTIME_SOURCE_FILE_COUNT: "0" },
])("rejects unsafe/unconfirmed policy before networking %#", (change) => {
  expect(() => pathwayCreatorTarget({ ...env, ...change })).toThrow();
});
it("budgets the current initial and regeneration model call sites, including the weak-summary request", () => {
  const initial = readFileSync("src/lib/pathway-generation.server.ts", "utf8"),
    regen = readFileSync("src/lib/pathway.functions.ts", "utf8");
  expect(initial.match(/await generateText\(/g)).toHaveLength(1);
  expect(regen.match(/await generateText\(/g)).toHaveLength(2);
  expect(regen).toContain("STRICT RETRY:");
  expect(PATHWAY_CREATOR_BUDGET.modelInvocationsMax).toBe(2 * (1 + 2));
  expect(PATHWAY_CREATOR_BUDGET.sdkAttemptsMax).toBe(18);
});
it("keeps the new AI scope manual, human-protected, serial, explicitly confirmed and separate from ordinary audits", () => {
  const w = readFileSync(".github/workflows/staging-role-verification.yml", "utf8");
  expect(w).toContain("workflow_dispatch:");
  expect(w).toContain("environment: staging");
  expect(w).toContain("default: all-roles");
  expect(w).toContain("disposable-pathway-creator");
  expect(w).not.toContain("SERVICE_ROLE_KEY");
  const step = w
    .split("      - name: Bounded Family and Educator Pathway creator acceptance")[1]
    .split("      - name: Remove credential-bearing")[0];
  expect(step).toContain("inputs.scope == 'pathway-creator-live-bounded'");
  expect(step).toContain("steps.require-role-states.outcome == 'success'");
  expect(step).toContain("--retries=0 --workers=1");
  expect(step).not.toMatch(/LOVABLE_API_KEY|deploy|migrate/);
  const legacy = readFileSync(".github/workflows/pathway-live-staging-qa.yml", "utf8");
  expect(legacy).toContain("github.ref == 'refs/heads/main'");
  const spec = readFileSync(
    "tests/e2e/release-readiness/pathway-creator-live.signedin.spec.ts",
    "utf8",
  );
  expect(spec).toContain('mode: "serial", retries: 0');
  expect(spec).toContain('trace: "off", video: "off", screenshot: "off"');
  expect(spec).toContain("if (operationPending)");
  expect(spec).not.toContain("storageState:");
  expect(spec).not.toContain("SERVICE_ROLE");
  expect(spec).not.toContain(".like(");
  expect(spec.match(/name: "Refresh Pathway Report", exact: true \}\)\.click/g)).toHaveLength(1);
  expect(spec.match(/getByTestId\("pathway-generate"\)\.click/g)).toHaveLength(1);
});
