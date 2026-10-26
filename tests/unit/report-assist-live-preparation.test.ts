import { expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import ts from "typescript";
import { creatorStudentInput } from "../e2e/helpers/pathway-creator-fixture";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "../../src/integrations/supabase/types";
import {
  cleanupReportAssist,
  reportAssistAbsenceSql,
  CREATOR_EMPTY_STUDENT_TABLES,
  type CreatorScope,
} from "../e2e/helpers/pathway-creator-cleanup";
import { reportAssistLiveTarget, REPORT_ASSIST_BUDGET } from "../e2e/helpers/report-assist-live-policy";
const id = (n: number) => String(n).repeat(8) + "-1111-4111-8111-111111111111";
const f: CreatorScope = {
  ownerId: id(1),
  studentId: id(2),
  intakeId: id(3),
  reportId: id(4),
  marker: "QA Report Assist 12345-1 parent",
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
    wrongModel?: boolean;
    nonDemo?: boolean;
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
                      model: o.wrongModel ? "google/gemini-2.5-pro" : "synthetic-report-assist-fixture",
                      is_demo: !o.nonDemo,
                    },
                  ]
                : o.extraVersions ? [{ id: id(5), created_by: f.ownerId, report_id: f.reportId }] : [];
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
  const result = await cleanupReportAssist(client, f, record);
  expect(result).toMatchObject({
    callerVisibleCountsZero: true,
    independentPrivilegedAbsenceRequired: true,
    versionIds: [],
  });
  expect(record).toHaveBeenCalledExactlyOnceWith({ ...f, versionIds: [] });
  const deletes = calls.filter((x) => x.method === "DELETE");
  expect(deletes.map((x) => x.url.pathname.split("/").at(-1))).toEqual([
    "pathway_reports",
    "student_intakes",
    "students",
  ]);
  expect(deletes[0].url.searchParams.get("model")).toBe("eq.synthetic-report-assist-fixture");
  expect(deletes[0].url.searchParams.get("is_demo")).toBe("eq.true");
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
  { wrongModel: true },
  { nonDemo: true },
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
    await expect(cleanupReportAssist(client, f, record)).rejects.toThrow();
    expect(record).not.toHaveBeenCalled();
    expect(calls.some((x) => x.method === "DELETE")).toBe(false);
  },
);
it("receipt failure stops before every deletion", async () => {
  const { client, calls } = setup();
  await expect(
    cleanupReportAssist(client, f, async () => {
      throw Error("receipt unavailable");
    }),
  ).rejects.toThrow("receipt unavailable");
  expect(calls.some((x) => x.method === "DELETE")).toBe(false);
});
it("does not cascade the student after a child-delete failure", async () => {
  const { client, calls } = setup({ deleteError: "pathway_reports" });
  await expect(cleanupReportAssist(client, f, async () => {})).rejects.toThrow("Exact deletion failed");
  expect(calls.some((x) => x.method === "DELETE" && x.url.pathname.endsWith("/students"))).toBe(
    false,
  );
  expect(
    calls.some((x) => x.method === "DELETE" && x.url.pathname.endsWith("/student_intakes")),
  ).toBe(false);
});
it("rejects a remaining exact report after deletion", async () => {
  const { client } = setup({ residual: "pathway_reports" });
  await expect(cleanupReportAssist(client, f, async () => {})).rejects.toThrow("absence failed");
});
it("supports preallocated student scope before setup without deleting nonexistent records", async () => {
  const { client, calls } = setup({ empty: true });
  await cleanupReportAssist(client, { ...f, intakeId: "", reportId: "" }, async () => {});
  expect(calls.some((x) => x.method === "DELETE")).toBe(false);
});
it.each([
  { studentId: "unsafe'" },
  { marker: "QA Report Assist old parent" },
  { ownerId: f.studentId },
  { role: "student" as any },
  { intakeId: f.reportId },
])(
  "refuses malformed or overlapping identity before read, write or SQL generation %#",
  async (change) => {
    const { client, calls } = setup();
    await expect(cleanupReportAssist(client, { ...f, ...change }, async () => {})).rejects.toThrow(
      "Invalid",
    );
    expect(calls).toHaveLength(0);
    expect(() => reportAssistAbsenceSql({ ...f, ...change })).toThrow("Invalid");
  },
);
it("independent cleanup query requires privileged table ownership and remains read-only for every exact table", () => {
  const sql = reportAssistAbsenceSql(f);
  expect(sql).toContain("BEGIN READ ONLY;");
  expect(sql).toContain("current_user<>'postgres'");
  expect(sql).toContain("relforcerowsecurity");
  expect(sql).toContain(f.studentId);
  expect(sql).toContain(f.reportId);
  expect(sql).toContain(f.intakeId);
  for (const table of CREATOR_EMPTY_STUDENT_TABLES) expect(sql).toContain("public." + table);
  expect(sql).not.toMatch(/\b(DELETE|INSERT|UPDATE|ALTER|DROP|TRUNCATE)\b/i);
});

const env = { RUN_REPORT_ASSIST_LIVE_QA: "true", REPORT_ASSIST_CONFIRMATION: "disposable-report-assist", REPORT_ASSIST_RUN_ID: "12345-1", PLAYWRIGHT_BASE_URL: "https://gentle-forward-reach.lovable.app", STAGING_SUPABASE_URL: "https://qgrertkqbwanerqqemph.supabase.co", STAGING_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_synthetic", E2E_EXPECTED_BUILD_SHA: "a".repeat(40), EXPECTED_RUNTIME_SOURCE_FINGERPRINT: "b".repeat(64), EXPECTED_RUNTIME_SOURCE_FILE_COUNT: "1190" };
it("requires an exact confirmed isolated target and fixed four-action budget", () => {
  expect(reportAssistLiveTarget(env)).toMatchObject({ origin: "https://gentle-forward-reach.lovable.app", fileCount: 1190 });
  expect(REPORT_ASSIST_BUDGET).toEqual({ students: 2, intakes: 2, reports: 2, historyVersions: 0, translationActions: 2, suggestionActions: 2, modelInvocationsMax: 4, sdkAttemptsMax: 12, screenshots: 2, pdfs: 0, testRetries: 0 });
});
it.each([{ RUN_REPORT_ASSIST_LIVE_QA: "false" }, { REPORT_ASSIST_CONFIRMATION: "" }, { REPORT_ASSIST_RUN_ID: "old" }, { PLAYWRIGHT_BASE_URL: "https://transitionforwardct.com" }, { STAGING_SUPABASE_URL: "https://lrqcntqyekucamifpffs.supabase.co" }, { STAGING_SUPABASE_SERVICE_ROLE_KEY: "forbidden" }, { STAGING_SUPABASE_PUBLISHABLE_KEY: "sb_secret_synthetic" }, { E2E_EXPECTED_BUILD_SHA: "dev" }, { EXPECTED_RUNTIME_SOURCE_FINGERPRINT: "" }, { EXPECTED_RUNTIME_SOURCE_FILE_COUNT: "0" }])("refuses unsafe test configuration before networking %#", change => expect(() => reportAssistLiveTarget({ ...env, ...change })).toThrow());
it("rejects the Creator fixture under the separate assist cleanup policy", async () => {
  const { client, calls } = setup();
  const other = { ...f, marker: "QA Pathway Creator 12345-1 parent" };
  await expect(cleanupReportAssist(client, other, async () => {})).rejects.toThrow("Invalid");
  expect(calls).toHaveLength(0);
});
it("keeps the AI workflow manual, separately confirmed, non-cancelling and sanitized", () => {
  const w = readFileSync(".github/workflows/staging-role-verification.yml", "utf8");
  expect(w).toContain("workflow_dispatch:"); expect(w).toContain("environment: staging");
  expect(w).toContain("inputs.scope == 'report-assist-live-bounded' && 'staging-report-assist-live-bounded'");
  expect(w).toContain("cancel-in-progress: ${{ inputs.scope != 'report-assist-live-bounded'");
  expect(w).toContain('"$STAGING_FIXTURE_CONFIRMATION" != "disposable-report-assist"');
  expect(w).toContain("steps.sanitize-artifacts.outcome == 'success'");
  const step = w.split("      - name: Bounded Family and Educator report-assist acceptance")[1].split("      - name:")[0];
  expect(step).toContain("inputs.scope == 'report-assist-live-bounded'"); expect(step).toContain("--no-deps --retries=0 --workers=1");
  expect(w).not.toContain("SERVICE_ROLE_KEY");
});
it("retains uncertain-operation reconciliation, exact source readback and two deliberate UI actions", () => {
  const spec = readFileSync("tests/e2e/release-readiness/report-assist-live.signedin.spec.ts", "utf8");
  expect(spec).toContain('mode: "serial", retries: 0'); expect(spec).toContain('trace: "off", video: "off", screenshot: "off"');
  expect(spec).toContain("if (pending)"); expect(spec).toContain("expect(after.data).toEqual(before.data)");
  expect(spec).toContain('history.count !== 0'); expect(spec).not.toMatch(/\.like\(|SERVICE_ROLE|storageState:/);
  expect(spec.match(/name: "Suggest next steps", exact: true \}\)\.click/g)).toHaveLength(1);
  expect(spec.match(/name: "Translate", exact: true \}\)\.click/g)).toHaveLength(1);
  expect(spec).not.toMatch(/Refresh suggestions.*, exact: true \}\)\.click/);
});

it("budgets only the two existing report-assist model call sites and no fallback generations", () => {
  const source = readFileSync("src/lib/ai-assist.functions.ts", "utf8");
  expect(source.match(/await generateText\(/g)).toHaveLength(2);
  expect(REPORT_ASSIST_BUDGET.modelInvocationsMax).toBe(2 * 2);
  expect(REPORT_ASSIST_BUDGET.sdkAttemptsMax).toBe(3 * REPORT_ASSIST_BUDGET.modelInvocationsMax);
});
