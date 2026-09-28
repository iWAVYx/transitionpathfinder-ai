import { describe, expect, it } from "vitest";
import { evaluateHostedBuildIdentity } from "@/lib/build-validation";

const fingerprintOk = true;

describe("hosted build identity boundary", () => {
  it("accepts the isolated staging build without claiming deployment acceptance", () => {
    expect(
      evaluateHostedBuildIdentity({
        appEnv: "staging",
        viteAppEnv: "staging",
        supabaseProjectRef: "qgrertkqbwanerqqemph",
        runtimeSourceIdentityOk: fingerprintOk,
      }),
    ).toEqual({ ok: true, target: "staging", errors: [] });
  });

  it("fails closed on mixed production and staging markers", () => {
    const verdict = evaluateHostedBuildIdentity({
      appEnv: "staging",
      viteAppEnv: "production",
      supabaseProjectRef: "qgrertkqbwanerqqemph",
      runtimeSourceIdentityOk: fingerprintOk,
    });

    expect(verdict.ok).toBe(false);
    expect(verdict.target).toBe("unknown");
    expect(verdict.errors).toContain("Staging and production build markers conflict.");
  });

  it("rejects a production credential in isolated staging", () => {
    const verdict = evaluateHostedBuildIdentity({
      appEnv: "staging",
      viteAppEnv: "staging",
      supabaseProjectRef: "qgrertkqbwanerqqemph",
      runtimeSourceIdentityOk: fingerprintOk,
      productionSecretsPresent: ["STRIPE_LIVE_API_KEY"],
    });

    expect(verdict.ok).toBe(false);
    expect(verdict.errors).toContain(
      "Production credential STRIPE_LIVE_API_KEY must not exist in staging.",
    );
  });

  it("rejects missing source identity even when environment labels match", () => {
    const verdict = evaluateHostedBuildIdentity({
      appEnv: "staging",
      viteAppEnv: "staging",
      supabaseProjectRef: "qgrertkqbwanerqqemph",
      runtimeSourceIdentityOk: false,
    });

    expect(verdict.ok).toBe(false);
    expect(verdict.errors).toContain("Runtime source fingerprint is unavailable or invalid.");
  });

  it("keeps production and staging secret boundaries symmetric", () => {
    const verdict = evaluateHostedBuildIdentity({
      appEnv: "production",
      viteAppEnv: "production",
      supabaseProjectRef: "lrqcntqyekucamifpffs",
      runtimeSourceIdentityOk: fingerprintOk,
      stagingSecretsPresent: ["STAGING_SUPABASE_URL"],
    });

    expect(verdict.ok).toBe(false);
    expect(verdict.target).toBe("production");
    expect(verdict.errors).toContain(
      "Staging credential STAGING_SUPABASE_URL must not exist in production.",
    );
  });
});
