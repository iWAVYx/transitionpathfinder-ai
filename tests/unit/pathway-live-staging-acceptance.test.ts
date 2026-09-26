import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const workflow = readFileSync(".github/workflows/pathway-live-staging-qa.yml", "utf8");
const spec = readFileSync(
  "tests/e2e/release-readiness/pathway-live-staging.signedin.spec.ts",
  "utf8",
);
const pathwayRoute = readFileSync("src/routes/_authenticated/pathway.tsx", "utf8");
const reportRoute = readFileSync("src/routes/_authenticated/reports.$reportId.tsx", "utf8");
const rolePolicy = readFileSync("src/lib/role-policy.ts", "utf8");
const runbook = readFileSync("docs/pathway-live-staging-acceptance.md", "utf8");

describe("protected Pathway live-staging acceptance", () => {
  it("is manual, protected, main-only, and exact-SHA staging-only", () => {
    expect(workflow).toContain("workflow_dispatch:");
    expect(workflow).not.toContain("pull_request:");
    expect(workflow).not.toContain("push:");
    expect(workflow).toContain("if: github.ref == 'refs/heads/main'");
    expect(workflow).toContain("environment: staging");
    expect(workflow).toContain("transitionforward-staging.caysi101.workers.dev");
    expect(workflow).toContain("health.git_commit_sha !== process.env.GITHUB_SHA");
    expect(workflow).toContain('health.supabase_project_ref !== "qgrertkqbwanerqqemph"');
    expect(workflow).toContain('health.stripe_mode !== "sandbox"');
    expect(workflow).toContain("health.isolation?.ok !== true");
    expect(workflow).not.toMatch(/supabase\s+(?:db\s+push|migration\s+up)/i);
  });

  it("keeps privileged inputs behind the staging environment and outside PR execution", () => {
    expect(workflow).toContain("secrets.STAGING_SUPABASE_URL");
    expect(workflow).toContain("secrets.STAGING_SUPABASE_SERVICE_ROLE_KEY");
    expect(workflow).toContain("secrets.STAGING_E2E_PASSWORD");
    expect(workflow).toContain('RUN_PATHWAY_LIVE_STAGING_QA: "true"');
    expect(workflow).toContain('Type "pathway-staging"');
    expect(workflow).toContain("sanitize-playwright-artifacts.mjs");
    expect(workflow).toContain("rm -rf tests/e2e/.auth");
  });

  it("covers Family creation, Student and Educator visibility, and Partner denial", () => {
    for (const contract of [
      "Family creates one linked report",
      "Student sees the linked report",
      "Educator can open the authorized student intake",
      "Partner is denied both the Pathway builder",
      'page.getByTestId("pathway-generate").click()',
      'page.goto("/pathway/student"',
      "page.waitForURL(/\\/partners-manage",
    ]) {
      expect(spec).toContain(contract);
    }
    expect(spec.match(/pathway-generate/g)).toHaveLength(1);
    expect(rolePolicy).toContain('"/pathway": ["family", "educator", "admin"]');
    expect(rolePolicy).toContain('"/pathway/student": ["student", "family", "educator", "admin"]');
  });

  it("uses only synthetic staging identities and fail-closed targets", () => {
    for (const role of ["student", "parent", "educator", "partner"]) {
      expect(`${workflow}\n${spec}`).toContain(`e2e.${role}@staging.transitionforwardct.test`);
    }
    expect(spec).toContain('const STAGING_PROJECT_REF = "qgrertkqbwanerqqemph"');
    expect(spec).toContain(
      'const STAGING_APP_HOST = "transitionforward-staging.caysi101.workers.dev"',
    );
    expect(spec).toContain('throw new Error("Refusing the production Supabase project")');
    expect(spec).toContain('first_name", "Robin"');
    expect(spec).toContain('last_name", "Staging"');
  });

  it("verifies persisted linkage and removes all temporary QA records", () => {
    for (const contract of [
      'submitter_role).toBe("family")',
      "expect(report.intake_id).toBe(intakeId)",
      "expect(report.student_id).toBe(syntheticStudentId)",
      "Assistive technology:",
      "Accommodations:",
      "Readiness evidence:",
      "Information to verify:",
      "test.afterAll",
      "deleteQaRows",
      '.from("student_collaborators")',
      '.from("pathway_reports")',
      '.from("student_intakes")',
    ]) {
      expect(spec).toContain(contract);
    }
  });

  it("provides stable UI hooks without weakening role or report guards", () => {
    for (const testId of [
      "pathway-intake-form",
      "pathway-role-${r}",
      "pathway-connected-student",
      "pathway-continue",
      "pathway-generate",
    ]) {
      expect(pathwayRoute).toContain(testId);
    }
    expect(reportRoute).toContain('data-testid="pathway-report-page"');
    expect(reportRoute).toContain('withRoleGuard(["family", "educator", "student", "admin"]');
  });

  it("documents the one-generation, four-role, staging-only operating boundary", () => {
    for (const contract of [
      "one AI-generated report",
      "Family",
      "Student",
      "Educator",
      "Partner",
      "One report generation per authorized run",
      "No migration, deployment, Lovable publish",
      "must not merge, deploy, publish, migrate, or touch production",
    ]) {
      expect(runbook).toContain(contract);
    }
  });
});
