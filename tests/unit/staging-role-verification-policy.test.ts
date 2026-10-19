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
  expect(workflow).toContain("expectedFingerprint: expected.fingerprint");
  expect(workflow).toContain("actualFingerprint: health.runtime_source_fingerprint");
  expect(workflow).toContain("health.runtime_source_file_count !== expected.fileCount");
  expect(workflow.indexOf("Verify Staging Deployment Identity")).toBeLessThan(workflow.indexOf("Create All Seven Auth Storage States"));
  expect(workflow).toContain("steps.sanitize-artifacts.outcome == 'success'");
});
