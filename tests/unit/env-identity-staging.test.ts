import { describe, it, expect } from "vitest";
import {
  PRODUCTION_PROJECT_REF,
  STAGING_LOVABLE_AI_HOSTNAME,
  STAGING_PROJECT_REF,
  evaluateStagingIdentity,
  isStagingHostname,
  projectRefFrom,
  resolveDeploymentEnvLabels,
  resolveDeploymentStripeProof,
  resolveDeploymentStripeMode,
  stripeModeFromToken,
} from "@/lib/env-identity";

const OK = {
  appEnv: "staging",
  viteAppEnv: "staging",
  hostname: "e2e.transitionforwardct.com",
  supabaseProjectRef: STAGING_PROJECT_REF,
  stripeMode: "sandbox" as const,
  gitCommitSha: "a".repeat(40),
};

describe("staging deployment identity", () => {
  it("passes for the exact staging configuration", () => {
    expect(evaluateStagingIdentity(OK)).toEqual({ ok: true, errors: [] });
  });

  it("fails when Supabase points at production", () => {
    const v = evaluateStagingIdentity({
      ...OK,
      supabaseProjectRef: PRODUCTION_PROJECT_REF,
    });
    expect(v.ok).toBe(false);
    expect(v.errors.join(" ")).toMatch(/production project/);
  });

  it("fails for an arbitrary non-production Supabase project", () => {
    const v = evaluateStagingIdentity({ ...OK, supabaseProjectRef: "abcdefgh" });
    expect(v.ok).toBe(false);
    expect(v.errors.join(" ")).toContain(STAGING_PROJECT_REF);
  });

  it("fails when the Supabase project ref is unknown or missing", () => {
    expect(evaluateStagingIdentity({ ...OK, supabaseProjectRef: "unknown" }).ok).toBe(false);
    expect(evaluateStagingIdentity({ ...OK, supabaseProjectRef: null }).ok).toBe(false);
  });

  it("fails on live Stripe", () => {
    const v = evaluateStagingIdentity({ ...OK, stripeMode: "live" });
    expect(v.ok).toBe(false);
    expect(v.errors.join(" ")).toMatch(/sandbox/);
  });

  it("fails on unknown or missing Stripe mode", () => {
    expect(evaluateStagingIdentity({ ...OK, stripeMode: "unknown" }).ok).toBe(false);
    expect(evaluateStagingIdentity({ ...OK, stripeMode: null }).ok).toBe(false);
  });

  it("fails when the exact deployed Git SHA is unknown or malformed", () => {
    expect(evaluateStagingIdentity({ ...OK, gitCommitSha: "unknown" }).ok).toBe(false);
    const verdict = evaluateStagingIdentity({ ...OK, gitCommitSha: "abc123" });
    expect(verdict.ok).toBe(false);
    expect(verdict.errors.join(" ")).toMatch(/exact 40-character Git commit SHA/);
  });

  it("fails when APP_ENV is missing or wrong", () => {
    expect(evaluateStagingIdentity({ ...OK, appEnv: null }).ok).toBe(false);
    expect(evaluateStagingIdentity({ ...OK, appEnv: "production" }).ok).toBe(false);
    expect(evaluateStagingIdentity({ ...OK, viteAppEnv: undefined }).ok).toBe(false);
  });

  it("uses build labels only when runtime bindings are unavailable", () => {
    expect(
      resolveDeploymentEnvLabels({
        runtimeAppEnv: undefined,
        runtimeViteAppEnv: undefined,
        buildAppEnv: "staging",
        buildViteAppEnv: "staging",
      }),
    ).toEqual({ appEnv: "staging", viteAppEnv: "staging" });

    expect(
      resolveDeploymentEnvLabels({
        runtimeAppEnv: "production",
        runtimeViteAppEnv: "production",
        buildAppEnv: "staging",
        buildViteAppEnv: "staging",
      }),
    ).toEqual({ appEnv: "production", viteAppEnv: "production" });

    expect(
      resolveDeploymentEnvLabels({
        runtimeAppEnv: "  ",
        runtimeViteAppEnv: "",
        buildAppEnv: "production",
        buildViteAppEnv: "production",
      }),
    ).toEqual({ appEnv: "production", viteAppEnv: "production" });
  });

  it("uses the public build payment token only when runtime bindings are unavailable", () => {
    expect(
      resolveDeploymentStripeMode({
        buildVitePaymentsClientToken: "pk_live_build",
      }),
    ).toBe("live");

    expect(
      resolveDeploymentStripeMode({
        runtimeVitePaymentsClientToken: "pk_test_runtime",
        buildVitePaymentsClientToken: "pk_live_build",
      }),
    ).toBe("sandbox");

    expect(
      resolveDeploymentStripeMode({
        runtimeVitePaymentsClientToken: " ",
        runtimePaymentsClientToken: "",
        buildVitePaymentsClientToken: "pk_live_build",
      }),
    ).toBe("live");
  });

  it("requires matching client and named server payment identities for known targets", () => {
    expect(
      resolveDeploymentStripeMode({
        expectedMode: "sandbox",
        runtimeStripeSandboxApiKey: "sk_test_server",
        buildVitePaymentsClientToken: "pk_test_build",
      }),
    ).toBe("sandbox");

    expect(
      resolveDeploymentStripeMode({
        expectedMode: "live",
        runtimeStripeLiveApiKey: "mk_managed_connection",
        buildVitePaymentsClientToken: "pk_live_build",
      }),
    ).toBe("live");

    expect(
      resolveDeploymentStripeMode({
        expectedMode: "live",
        runtimeStripeLiveApiKey: "mk_managed_connection",
        buildVitePaymentsClientToken: "pk_test_build",
      }),
    ).toBe("unknown");

    expect(
      resolveDeploymentStripeMode({
        expectedMode: "live",
        buildVitePaymentsClientToken: "pk_live_build",
      }),
    ).toBe("unknown");
  });

  it("reports only client and server modes when a known payment target fails closed", () => {
    expect(
      resolveDeploymentStripeProof({
        expectedMode: "live",
        runtimeStripeLiveApiKey: "mk_managed_connection",
        buildVitePaymentsClientToken: "pk_test_build",
      }),
    ).toEqual({ clientMode: "sandbox", serverMode: "live", mode: "unknown" });

    expect(
      resolveDeploymentStripeProof({
        expectedMode: "live",
        buildVitePaymentsClientToken: "pk_live_build",
      }),
    ).toEqual({ clientMode: "live", serverMode: "unknown", mode: "unknown" });
  });

  it("fails closed when an explicit runtime payment token is malformed", () => {
    expect(
      resolveDeploymentStripeMode({
        runtimeVitePaymentsClientToken: "malformed",
        buildVitePaymentsClientToken: "pk_live_build",
      }),
    ).toBe("unknown");
  });

  it("fails on a production hostname", () => {
    const v = evaluateStagingIdentity({
      ...OK,
      hostname: "transitionforwardct.com",
    });
    expect(v.ok).toBe(false);
    expect(v.errors.join(" ")).toMatch(/production hostname/);
  });

  it("fails on an unlisted hostname", () => {
    expect(evaluateStagingIdentity({ ...OK, hostname: "example.com" }).ok).toBe(false);
    expect(evaluateStagingIdentity({ ...OK, hostname: "" }).ok).toBe(false);
  });

  it("fails when production credentials exist in staging", () => {
    const v = evaluateStagingIdentity({
      ...OK,
      productionSecretsPresent: ["STRIPE_LIVE_API_KEY"],
    });
    expect(v.ok).toBe(false);
    expect(v.errors.join(" ")).toContain("STRIPE_LIVE_API_KEY");
  });

  it("recognizes allowed staging hostnames only", () => {
    expect(isStagingHostname("e2e.transitionforwardct.com")).toBe(true);
    expect(isStagingHostname("transitionforward-staging.acme.workers.dev")).toBe(true);
    expect(isStagingHostname(STAGING_LOVABLE_AI_HOSTNAME)).toBe(true);
    expect(isStagingHostname("id-preview--another-project.lovable.app")).toBe(false);
    expect(isStagingHostname("id-preview--95c97302-11c6-4e89-bac3-2c68b970dd3d.lovable.app")).toBe(false);
    expect(isStagingHostname("preview--another-project.lovable.app")).toBe(false);
    expect(isStagingHostname("transitionforwardct.com")).toBe(false);
  });

  it("parses project refs and Stripe token modes", () => {
    expect(projectRefFrom("https://qgrertkqbwanerqqemph.supabase.co")).toBe(STAGING_PROJECT_REF);
    expect(projectRefFrom(undefined)).toBe("unknown");
    expect(stripeModeFromToken("pk_test_123")).toBe("sandbox");
    expect(stripeModeFromToken("sk_live_123")).toBe("live");
    expect(stripeModeFromToken("mk_abc")).toBe("unknown");
    expect(stripeModeFromToken(undefined)).toBe("unknown");
  });
});

describe("isolated Lovable fingerprint identity", () => {
  const isolated = {
    ...OK, hostname: STAGING_LOVABLE_AI_HOSTNAME, gitCommitSha: "dev",
    runtimeSourceFingerprint: "a".repeat(64),
    runtimeSourceSchema: "transitionforward-runtime-source-v1",
    runtimeSourceFileCount: 1060,
  };
  it("accepts computed source identity only on the exact isolated host", () => {
    expect(evaluateStagingIdentity(isolated).ok).toBe(true);
    for (const hostname of ["e2e.transitionforwardct.com", "transitionforward-staging.caysi101.workers.dev", "localhost", "transitionforwardct.com", "id-preview--95c97302-11c6-4e89-bac3-2c68b970dd3d.lovable.app", "preview--another-project.lovable.app"])
      expect(evaluateStagingIdentity({ ...isolated, hostname }).ok).toBe(false);
  });
  it("rejects invalid fingerprint evidence and preserves other isolation gates", () => {
    for (const patch of [
      { runtimeSourceFingerprint: "unknown" }, { runtimeSourceSchema: "unknown" },
      { runtimeSourceFileCount: 0 }, { runtimeSourceFileCount: 1.5 },
      { stripeMode: "unknown" as const }, { stripeMode: "live" as const },
      { supabaseProjectRef: PRODUCTION_PROJECT_REF }, { appEnv: "production" },
      { productionSecretsPresent: ["STRIPE_LIVE_API_KEY"] },
    ]) expect(evaluateStagingIdentity({ ...isolated, ...patch }).ok).toBe(false);
  });
});
