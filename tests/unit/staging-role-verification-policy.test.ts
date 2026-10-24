import { readFileSync } from "node:fs";
import { expect, it } from "vitest";
import { assertRoleFixtureWriteAllowed } from "../e2e/helpers/role-setup-policy";
const workflow = readFileSync(".github/workflows/staging-role-verification.yml", "utf8");
it.each(["student", "parent", "educator", "school_admin", "district_admin", "partner", "owner"])(
  "refuses implicit fixture writes for read-only %s acceptance", (role) => {
    expect(() => assertRoleFixtureWriteAllowed(role, "true")).toThrow("No records were created or changed");
    expect(() => assertRoleFixtureWriteAllowed(role, "1")).toThrow("Read-only role acceptance");
  },
);
it("retains separately requested fixture preparation outside read-only mode", () => {
  expect(() => assertRoleFixtureWriteAllowed("partner", "false")).not.toThrow();
});
it("requires all existing staging accounts and excludes privileged reseeding credentials", () => {
  expect(workflow).toContain('E2E_READ_ONLY: "true"');
  expect(workflow).toContain('REQUIRE_ALL_ROLES: "true"');
  expect(workflow).not.toContain("seed-staging-identities");
  expect(workflow).not.toContain("SERVICE_ROLE_KEY");
  expect(workflow).toContain("fixture_confirmation");
  expect(workflow).toContain("disposable-report-history");
  expect(workflow).toContain("expectedFingerprint: expected.fingerprint");
  expect(workflow).toContain("actualFingerprint: health.runtime_source_fingerprint");
  expect(workflow).toContain("health.runtime_source_file_count !== expected.fileCount");
  expect(workflow).toContain("EXPECTED_RUNTIME_SOURCE_FILE_COUNT=${expected.fileCount}");
  expect(workflow.indexOf("Verify Staging Deployment Identity")).toBeLessThan(workflow.indexOf("Create All Seven Auth Storage States"));
  expect(workflow).toContain("steps.sanitize-artifacts.outcome == 'success'");
});

it("runs independent role-access checks after dashboard failures only with all role states ready", () => {
  expect(workflow).toContain("id: require-role-states");
  expect(workflow).toContain("if: ${{ !cancelled() && steps.require-role-states.outcome == 'success' && inputs.scope != 'report-history-no-ai' && inputs.scope != 'report-sharing-no-ai' && inputs.scope != 'linked-report-access-no-ai' && inputs.scope != 'role-tools-readonly' && inputs.scope != 'owner-tools-readonly' }}");
});

it("offers a fixed no-retry Partner diagnostic without broadening credential or mutation scope", () => {
  expect(workflow).toContain("default: all-roles");
  expect(workflow).toContain("--retries=0 --grep 'Partner Organization /demo signed-in coverage renders /demo/plan$'");
  expect(workflow).toContain("if: ${{ inputs.scope != 'partner-demo-plan' && inputs.scope != 'owner-history-return' && inputs.scope != 'seven-role-history-return' && inputs.scope != 'signed-out-history-return' && inputs.scope != 'directional-navigation' && inputs.scope != 'focused-return-position' && inputs.scope != 'scroll-diagnosis' && inputs.scope != 'remaining-role-scroll' && inputs.scope != 'deep-role-history-return' && inputs.scope != 'report-reader-lenses' && inputs.scope != 'report-history-no-ai' && inputs.scope != 'report-sharing-no-ai' && inputs.scope != 'linked-report-access-no-ai' && inputs.scope != 'role-tools-readonly' && inputs.scope != 'owner-tools-readonly' }}");
  expect(workflow).toContain("E2E_READ_ONLY");
});

it("offers a fixed Owner history recheck without retries, fixtures or dashboard reruns", () => {
  expect(workflow).toContain("          - owner-history-return");
  expect(workflow).toContain("--retries=0 --workers=1 --grep 'Platform Admin — actual-source return'");
  expect(workflow).toContain("inputs.scope != 'owner-history-return'");
  expect(workflow).toContain('environment: staging');
  expect(workflow).toContain('E2E_READ_ONLY: "true"');
  expect(workflow).not.toContain("SERVICE_ROLE_KEY");
});

it("offers bounded seven-role return-position checks with retained evidence and no retries", () => {
  expect(workflow).toContain("          - seven-role-history-return");
  expect(workflow).toContain("inputs.scope != 'seven-role-history-return'");
  expect(workflow).toContain("--retries=0 --workers=1 --grep '— actual-source return' --reporter=line,html");
  expect(workflow).toContain('E2E_READ_ONLY: "true"');
  expect(workflow).toContain("expectedFingerprint: expected.fingerprint");
  expect(workflow).toContain("steps.sanitize-artifacts.outcome == 'success'");
});

it("offers signed-out return checks through the anonymous project without retries", () => {
  expect(workflow).toContain("          - signed-out-history-return");
  expect(workflow).toContain("inputs.scope != 'signed-out-history-return'");
  expect(workflow).toContain("public-origin-navigation.spec.ts --project=anon --no-deps --retries=0 --workers=1 --reporter=line,html");
  expect(workflow).toContain('environment: staging');
  expect(workflow).toContain("steps.sanitize-artifacts.outcome == 'success'");
});

it("combines anonymous and signed-in directional journeys in one fixed read-only report", () => {
  expect(workflow).toContain("          - directional-navigation");
  expect(workflow).toContain("inputs.scope != 'directional-navigation'");
  expect(workflow).toContain("--project=role-access --project=anon --no-deps --retries=0 --workers=1 --grep '— actual-source return|signed-out source-aware navigation' --reporter=line,html");
  expect(workflow).toContain('environment: staging');
  expect(workflow).toContain('E2E_READ_ONLY: "true"');
  expect(workflow).toContain("steps.sanitize-artifacts.outcome == 'success'");
});

it("retains a fixed three-case measured-return diagnostic with no retries or mutation scope", () => {
  expect(workflow).toContain("          - focused-return-position");
  expect(workflow).toContain("inputs.scope != 'focused-return-position'");
  expect(workflow).toContain("--grep 'signed-out source-aware navigation 390px.*student demo|Student — actual-source return|Platform Admin — actual-source return' --reporter=line,html");
  expect(workflow).toContain('E2E_READ_ONLY: "true"');
  expect(workflow).toContain('environment: staging');
});

it("bounds scroll diagnosis to five failing journeys without changing acceptance thresholds", () => {
  expect(workflow).toContain("          - scroll-diagnosis");
  expect(workflow).toContain("inputs.scope != 'scroll-diagnosis'");
  expect(workflow).toContain("--grep 'signed-out source-aware navigation 390px.*(student demo|Platform returns)|signed-out source-aware navigation 1440px.*educator demo|District Administrator — actual-source return|Platform Admin — actual-source return' --reporter=line,html");
  expect(workflow).toContain('E2E_READ_ONLY: "true"');
  expect(workflow).toContain('environment: staging');
});

it("restricts the remaining-role trace to School and Owner with no retries", () => {
  expect(workflow).toContain("          - remaining-role-scroll");
  expect(workflow).toContain("inputs.scope != 'remaining-role-scroll'");
  const branch = workflow.split('elif [ "$STAGING_TEST_SCOPE" = "remaining-role-scroll" ]; then')[1].split("          elif")[0];
  expect(branch).toContain("School Administrator — actual-source return|Platform Admin — actual-source return");
  expect(branch).toContain("--retries=0 --workers=1");
  expect(branch).toContain("--reporter=line,html");
});

it("offers a separate read-only deep-position scope without rerunning the standard seven", () => {
  expect(workflow).toContain("          - deep-role-history-return");
  expect(workflow).toContain("inputs.scope != 'deep-role-history-return'");
  const branch = workflow.split('elif [ "$STAGING_TEST_SCOPE" = "deep-role-history-return" ]; then')[1].split("          elif")[0];
  expect(branch).toContain("--grep '— deep-source return'");
  expect(branch).toContain("--retries=0 --workers=1");
  expect(branch).toContain("--reporter=line,html");
});


it("keeps prepared report lens/PDF checks read-only and anonymous", () => {
  expect(workflow).toContain("          - report-reader-lenses");
  expect(workflow).toContain("inputs.scope != 'report-reader-lenses'");
  const branch = workflow.split('elif [ "$STAGING_TEST_SCOPE" = "report-reader-lenses" ]; then')[1].split("          elif")[0];
  expect(branch).toContain("report-reader-lenses.spec.ts --project=anon --no-deps --retries=0 --workers=1 --reporter=line,html");
  expect(workflow).toContain("environment: staging");
  expect(workflow).toContain('E2E_READ_ONLY: "true"');
  expect(workflow).toContain("steps.sanitize-artifacts.outcome == 'success'");
  const spec=readFileSync("tests/e2e/report-reader-lenses.spec.ts","utf8");
  expect(spec).toContain('storageState: { cookies: [], origins: [] }, trace: "off"');
  expect(spec).not.toMatch(/\.from\(|\.rpc\(|\.auth\.|getByRole\("button",\s*\{name:\s*"(?:Generate|Save|Share|Restore)/);
  expect(spec).toContain("nativePrintDialogVerified:false");
});

it("gates the bounded linked-access fixture behind its own confirmation and protected no-retry scope",()=>{
 expect(workflow).toContain('- linked-report-access-no-ai');
 expect(workflow).toContain('"$STAGING_FIXTURE_CONFIRMATION" != "disposable-linked-report-access"');
 expect(workflow).toContain("steps.require-role-states.outcome == 'success' && inputs.scope == 'linked-report-access-no-ai'");
 expect(workflow).toContain('RUN_LINKED_REPORT_ACCESS_STAGING_QA: "true"');
 expect(workflow).toContain('tests/e2e/release-readiness/linked-report-access-no-ai.signedin.spec.ts');
 expect(workflow).toContain('--project=release-signedin --no-deps --retries=0 --workers=1 --reporter=line');
 expect(workflow).not.toContain('STAGING_SUPABASE_SERVICE_ROLE_KEY');
});

it("keeps the opened-menu scope read-only and isolated from fixtures and broad reruns", () => {
  expect(workflow).toContain("          - role-tools-readonly");
  expect(workflow).toContain("inputs.scope != 'role-tools-readonly'");
  const step = workflow.split("      - name: Opened role Tools menus and exact destinations (read-only)")[1].split("      - name:")[0];
  expect(step).toContain("inputs.scope == 'role-tools-readonly'");
  expect(step).toContain('RUN_ROLE_TOOLS_READONLY: "true"');
  expect(step).toContain("role-tools-readonly.signedin.spec.ts");
  expect(step).toContain("--no-deps --retries=0 --workers=1");
  expect(step).toContain("opened Tools|School Administrator does not see /partners-manage$|High-school student sees readable grade and applicable planning links$");
  expect(step).toContain("--project=role-access");
  expect(step).not.toMatch(/SERVICE_ROLE|RUN_REPORT|RUN_LINKED|fixture_confirmation/);
});

it("limits the Owner follow-up to its two opened-menu cases without fixtures or broad reruns", () => {
  expect(workflow).toContain("          - owner-tools-readonly");
  expect(workflow).toContain("inputs.scope != 'owner-tools-readonly'");
  const step = workflow.split("      - name: Focused Owner Tools recheck (read-only)")[1].split("      - name:")[0];
  expect(step).toContain("inputs.scope == 'owner-tools-readonly'");
  expect(step).toContain('RUN_ROLE_TOOLS_READONLY: "true"');
  expect(step).toContain("--no-deps --retries=0 --workers=1");
  expect(step).toContain("--grep 'Platform Admin opened Tools'");
  expect(step).not.toMatch(/SERVICE_ROLE|RUN_REPORT|RUN_LINKED|fixture_confirmation|role-access-rules/);
});
