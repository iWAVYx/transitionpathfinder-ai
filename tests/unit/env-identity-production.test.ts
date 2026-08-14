import { describe, expect, it } from "vitest";
import { PRODUCTION_PROJECT_REF, evaluateProductionIdentity } from "@/lib/env-identity";

const OK = {
  appEnv: "production",
  viteAppEnv: "production",
  hostname: "transitionforwardct.com",
  supabaseProjectRef: PRODUCTION_PROJECT_REF,
  stripeMode: "live" as const,
  gitCommitSha: "a".repeat(40),
  stagingSecretsPresent: [],
};

describe("production deployment identity", () => {
  it("accepts only the complete production identity", () => {
    expect(evaluateProductionIdentity(OK)).toEqual({ ok: true, errors: [] });
  });

  it("fails when environment labels are missing or disagree", () => {
    expect(evaluateProductionIdentity({ ...OK, appEnv: null }).ok).toBe(false);
    expect(evaluateProductionIdentity({ ...OK, viteAppEnv: "staging" }).ok).toBe(false);
  });

  it("rejects staging and unknown Supabase targets", () => {
    expect(
      evaluateProductionIdentity({ ...OK, supabaseProjectRef: "qgrertkqbwanerqqemph" }).ok,
    ).toBe(false);
    expect(evaluateProductionIdentity({ ...OK, supabaseProjectRef: "unknown" }).ok).toBe(false);
  });

  it("rejects sandbox or unknown Stripe mode", () => {
    expect(evaluateProductionIdentity({ ...OK, stripeMode: "sandbox" }).ok).toBe(false);
    expect(evaluateProductionIdentity({ ...OK, stripeMode: "unknown" }).ok).toBe(false);
  });

  it("rejects unapproved hostnames and non-exact commit identities", () => {
    expect(evaluateProductionIdentity({ ...OK, hostname: "preview.example.test" }).ok).toBe(false);
    expect(evaluateProductionIdentity({ ...OK, gitCommitSha: "abc123" }).ok).toBe(false);
  });

  it("rejects staging-only credentials in production", () => {
    const verdict = evaluateProductionIdentity({
      ...OK,
      stagingSecretsPresent: ["STAGING_SUPABASE_URL"],
    });
    expect(verdict.ok).toBe(false);
    expect(verdict.errors.join(" ")).toContain("STAGING_SUPABASE_URL");
  });
});
