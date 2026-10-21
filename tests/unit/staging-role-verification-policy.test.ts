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
  expect(workflow.indexOf("Verify Staging Deployment Identity")).toBeLessThan(workflow.indexOf("Create All Seven Auth Storage States"));
  expect(workflow).toContain("steps.sanitize-artifacts.outcome == 'success'");
});

it("runs independent role-access checks after dashboard failures only with all role states ready", () => {
  expect(workflow).toContain("id: require-role-states");
  expect(workflow).toContain("if: ${{ !cancelled() && steps.require-role-states.outcome == 'success' && inputs.scope != 'report-history-no-ai' }}");
});

it("offers a fixed no-retry Partner diagnostic without broadening credential or mutation scope", () => {
  expect(workflow).toContain("default: all-roles");
  expect(workflow).toContain("--retries=0 --grep 'Partner Organization /demo signed-in coverage renders /demo/plan$'");
  expect(workflow).toContain("if: ${{ inputs.scope != 'partner-demo-plan' && inputs.scope != 'owner-history-return' && inputs.scope != 'report-history-no-ai' }}");
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
