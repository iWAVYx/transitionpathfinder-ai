import { expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { pptLiveAcceptanceTarget } from "../e2e/helpers/ppt-live-acceptance-policy";
const env = {
  RUN_PPT_LIVE_STAGING_QA: "true",
  PPT_FIXTURE_CONFIRMATION: "disposable-ppt-live",
  PPT_QA_RUN_ID: "12345-1",
  PLAYWRIGHT_BASE_URL: "https://gentle-forward-reach.lovable.app",
  STAGING_SUPABASE_URL: "https://qgrertkqbwanerqqemph.supabase.co",
  STAGING_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_synthetic",
  E2E_EXPECTED_BUILD_SHA: "a".repeat(40),
  EXPECTED_RUNTIME_SOURCE_FINGERPRINT: "b".repeat(64),
  EXPECTED_RUNTIME_SOURCE_FILE_COUNT: "1185",
};
it("accepts only explicit isolated synthetic caller-RLS acceptance", () => {
  expect(pptLiveAcceptanceTarget(env)).toMatchObject({
    origin: "https://gentle-forward-reach.lovable.app",
    controlOrigin: "https://transitionforward-staging.caysi101.workers.dev",
    runId: "12345-1",
    fileCount: 1185,
  });
});
it.each([
  { RUN_PPT_LIVE_STAGING_QA: "false" },
  { PPT_FIXTURE_CONFIRMATION: "" },
  { PPT_QA_RUN_ID: "" },
  { PLAYWRIGHT_BASE_URL: "https://example.com" },
  { PLAYWRIGHT_BASE_URL: "https://gentle-forward-reach.lovable.app/path" },
  { STAGING_SUPABASE_URL: "https://example.com" },
  { STAGING_SUPABASE_SERVICE_ROLE_KEY: "secret-not-allowed" },
  { STAGING_SUPABASE_PUBLISHABLE_KEY: "sb_secret_synthetic" },
  { E2E_EXPECTED_BUILD_SHA: "dev" },
  { EXPECTED_RUNTIME_SOURCE_FINGERPRINT: "" },
  { EXPECTED_RUNTIME_SOURCE_FILE_COUNT: "0" },
  { EXPECTED_RUNTIME_SOURCE_FILE_COUNT: "NaN" },
])("refuses unsafe or unconfirmed inputs %# before a client can be constructed", (change) => {
  expect(() => pptLiveAcceptanceTarget({ ...env, ...change })).toThrow();
});
it("keeps the AI scope manual, explicitly confirmed, separate and human-protected", () => {
  const w = readFileSync(".github/workflows/staging-role-verification.yml", "utf8");
  expect(w).toContain("workflow_dispatch:");
  expect(w).toContain("default: all-roles");
  expect(w).toContain("environment: staging");
  expect(w).toContain("disposable-ppt-live");
  expect(w).not.toContain("SERVICE_ROLE_KEY");
  const step = w
    .split("      - name: Bounded Family and Educator PPT live acceptance")[1]
    .split("      - name: Remove credential")[0];
  expect(step).toContain("inputs.scope == 'ppt-live-bounded'");
  expect(step).toContain("steps.require-role-states.outcome == 'success'");
  expect(step).toContain("PPT_FIXTURE_CONFIRMATION: ${{ inputs.fixture_confirmation }}");
  expect(step).toContain("--retries=0 --workers=1");
  expect(step).toContain("STAGING_SUPABASE_PUBLISHABLE_KEY");
  expect(step).not.toMatch(/SERVICE_ROLE|LOVABLE_API_KEY|deploy|migrate/);
  expect(w).toContain(
    "group: ${{ inputs.scope == 'iep-extraction-live-bounded' && 'staging-iep-extraction-live-bounded' || inputs.scope == 'report-assist-live-bounded' && 'staging-report-assist-live-bounded' || inputs.scope == 'readiness-live-bounded' && 'staging-readiness-live-bounded' || inputs.scope == 'pathway-creator-live-bounded' && 'staging-pathway-creator-live-bounded' || inputs.scope == 'ppt-live-bounded' && 'staging-ppt-live-bounded' || 'staging-role-verification' }}",
  );
  expect(w).toContain("cancel-in-progress: ${{ inputs.scope != 'report-assist-live-bounded' && inputs.scope != 'iep-extraction-live-bounded' && inputs.scope != 'readiness-live-bounded' && inputs.scope != 'ppt-live-bounded' && inputs.scope != 'pathway-creator-live-bounded' }}");
  const old = readFileSync(".github/workflows/ppt-live-staging-qa.yml", "utf8");
  expect(old).toContain("if: github.ref == 'refs/heads/main'");
  expect(old).toContain("This protected workflow may run only from main.");
});
it("gated spec performs only two role requests with no recordings, fixed fictional scope and exact cleanup", () => {
  const s = readFileSync("tests/e2e/release-readiness/ppt-live-staging.signedin.spec.ts", "utf8");
  expect(s).toContain('mode: "serial", retries: 0');
  expect(s).toContain('trace: "off", video: "off", screenshot: "off"');
  expect(s).toContain("pptLiveAcceptanceTarget(process.env)");
  expect(s).toContain("cleanupPptExact");
  expect(s).toContain("pptExactAbsenceSql");
  expect(s).toContain("manualGroundingAndSpeakerReviewRequired: true");
  expect(s.match(/name: "Generate meeting prep", exact: true/g)).toHaveLength(1);
  expect(s).not.toContain("SERVICE_ROLE");
  expect(s).not.toContain(".like(");
  expect(s).toContain("cleanupErrors.push(error)");
  expect(s).toContain("if (generationStarted && !prepId)");
  expect(s).toMatch(/throw new AggregateError\(\s*cleanupErrors,/);
  expect(s.indexOf("await context.close()")).toBeLessThan(s.indexOf("await cleanupPptExact"));
});
