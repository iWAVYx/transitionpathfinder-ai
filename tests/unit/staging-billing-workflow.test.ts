import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const workflow = readFileSync(".github/workflows/staging-billing-verification.yml", "utf8");

describe("staging billing workflow database isolation", () => {
  it("constructs the connection from fixed staging fields and a raw password", () => {
    expect(workflow).toContain("STAGING_DB_PASSWORD: ${{ secrets.STAGING_DB_PASSWORD }}");
    expect(workflow).toContain("PGHOST: aws-0-ca-central-1.pooler.supabase.com");
    expect(workflow).toContain("PGUSER: postgres.qgrertkqbwanerqqemph");
    expect(workflow).toContain("PGSSLMODE: require");
    expect(workflow).not.toContain("STAGING_DB_URL");
  });

  it("verifies database identity before running billing assertions", () => {
    const identityGate = workflow.indexOf("Verify exact staging database identity");
    const grantCheck = workflow.indexOf("Require billing grant hardening on staging");

    expect(identityGate).toBeGreaterThan(-1);
    expect(grantCheck).toBeGreaterThan(identityGate);
    expect(workflow).toContain("select current_database() || '|' || current_user;");
  });
});
