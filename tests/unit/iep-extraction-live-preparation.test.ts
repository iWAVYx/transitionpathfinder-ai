import { expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { IEP_EXTRACTION_BUDGET, iepExtractionLiveTarget, syntheticIepText } from "../e2e/helpers/iep-extraction-live-policy";
const env = {
 RUN_IEP_EXTRACTION_LIVE_QA: "true", IEP_EXTRACTION_CONFIRMATION: "synthetic-iep-only", IEP_EXTRACTION_RUN_ID: "12345-1",
 PLAYWRIGHT_BASE_URL: "https://gentle-forward-reach.lovable.app", STAGING_SUPABASE_URL: "https://qgrertkqbwanerqqemph.supabase.co",
 STAGING_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_synthetic", E2E_EXPECTED_BUILD_SHA: "a".repeat(40), EXPECTED_RUNTIME_SOURCE_FINGERPRINT: "b".repeat(64), EXPECTED_RUNTIME_SOURCE_FILE_COUNT: "1190",
};
it("accepts only the separately confirmed no-save isolated targets", () => {
 expect(iepExtractionLiveTarget(env)).toMatchObject({ origin: "https://gentle-forward-reach.lovable.app", controlOrigin: "https://transitionforward-staging.caysi101.workers.dev", fileCount: 1190 });
});
it.each([
 { RUN_IEP_EXTRACTION_LIVE_QA: "false" }, { IEP_EXTRACTION_CONFIRMATION: "" }, { IEP_EXTRACTION_RUN_ID: "manual" },
 { PLAYWRIGHT_BASE_URL: "https://transitionforwardct.com" }, { PLAYWRIGHT_BASE_URL: "https://preview--gentle-forward-reach.lovable.app" },
 { STAGING_SUPABASE_URL: "https://lrqcntqyekucamifpffs.supabase.co" }, { STAGING_SUPABASE_SERVICE_ROLE_KEY: "forbidden" },
 { STAGING_SUPABASE_PUBLISHABLE_KEY: "sk_test_not_a_database_key" }, { E2E_EXPECTED_BUILD_SHA: "dev" },
 { EXPECTED_RUNTIME_SOURCE_FINGERPRINT: "unknown" }, { EXPECTED_RUNTIME_SOURCE_FILE_COUNT: "0" }, { EXPECTED_RUNTIME_SOURCE_FILE_COUNT: "1.5" },
])("rejects incomplete or unsafe test policy (%j)", patch => { expect(() => iepExtractionLiveTarget({ ...env, ...patch })).toThrow(); });
it("fixes a zero-fixture budget, two UI actions and zero test retries", () => {
 expect(IEP_EXTRACTION_BUDGET).toEqual({ students: 0, intakes: 0, reports: 0, documents: 0, goals: 0, evidenceLinks: 0, extractionActions: 2, modelInvocationsMax: 2, sdkAttemptsMax: 6, screenshots: 2, pdfs: 0, testRetries: 0 });
});
it.each(["parent", "educator"] as const)("supplies source-grounded fictional %s material with no unnecessary identifiers", role => {
 const text = syntheticIepText(role); expect(text).toContain("Fictional IEP excerpt"); expect(text).toContain("family-reported baseline of two");
 expect(text).toContain("one verbal prompt"); expect(text).toContain("proposed draft target"); expect(text).toContain("not adopted");
 expect(text).toContain("No longitudinal progress data"); expect(text).not.toMatch(/@|\b\d{3}-\d{2}-\d{4}\b/);
});
it("requires manual protected workflow review and isolates the exact new scope", () => {
 const workflow = readFileSync(".github/workflows/staging-role-verification.yml", "utf8");
 expect(workflow).toContain("workflow_dispatch:"); expect(workflow).toContain("environment: staging"); expect(workflow).toContain('"synthetic-iep-only"');
 expect(workflow).toContain("inputs.scope == 'iep-extraction-live-bounded' && 'staging-iep-extraction-live-bounded'");
 const cancel = workflow.split("cancel-in-progress:")[1].split("\n")[0]; expect(cancel).toContain("inputs.scope != 'iep-extraction-live-bounded'");
 const steps = workflow.split(/\n      - name: /).slice(1);
 for (const name of ["Dashboard Regression", "Role Access and Role-Leak Protection"]) {
   const step = steps.find(s => s.startsWith(name)); expect(step, name).toBeTruthy(); expect(step).toContain("inputs.scope != 'iep-extraction-live-bounded'");
 }
 const step = steps.find(s => s.startsWith("Bounded Family and Educator no-save IEP extraction"))!;
 expect(step).toContain("inputs.scope == 'iep-extraction-live-bounded'"); expect(step).toContain("--no-deps --retries=0 --workers=1");
 expect(step).not.toContain('E2E_READ_ONLY: "false"');
});
it("never creates/deletes fixture records, generates a report, uploads files, or preserves raw transport errors", () => {
 const spec = readFileSync("tests/e2e/release-readiness/iep-extraction-live.signedin.spec.ts", "utf8");
 expect(spec).toContain('mode: "serial", retries: 0'); expect(spec).toContain('trace: "off", video: "off", screenshot: "off"');
 expect(spec.replaceAll("observed.delete(request)", "removeObservedRequest")).not.toMatch(/\.(insert|update|upsert|delete|upload|setInputFiles)\(/); expect(spec).not.toContain('getByTestId("pathway-generate")');
 expect(spec).toContain('Confirm privacy review'); expect(spec).toContain('await expect(analyze).toBeDisabled()');
 expect(spec).toContain('JSON.stringify(after) !== JSON.stringify(before)'); expect(spec).toContain('deletionAuthorized: false');
 expect(spec).not.toMatch(/error\.message|error\.stack|request\.postData|request\.headers/);
});
