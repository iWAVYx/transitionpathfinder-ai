import { describe, it, expect } from "vitest";
import {
  PRODUCTION_PROJECT_REF,
  STAGING_PROJECT_REF,
  evaluateStagingIdentity,
  isStagingHostname,
  projectRefFrom,
  stripeModeFromToken,
} from "@/lib/env-identity";

const OK = {
  appEnv: "staging",
  viteAppEnv: "staging",
  hostname: "e2e.transitionforwardct.com",
  supabaseProjectRef: STAGING_PROJECT_REF,
  stripeMode: "sandbox" as const,
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

  it("fails when APP_ENV is missing or wrong", () => {
    expect(evaluateStagingIdentity({ ...OK, appEnv: null }).ok).toBe(false);
    expect(evaluateStagingIdentity({ ...OK, appEnv: "production" }).ok).toBe(false);
    expect(evaluateStagingIdentity({ ...OK, viteAppEnv: undefined }).ok).toBe(false);
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
    expect(isStagingHostname("transitionforwardct.com")).toBe(false);
  });

  it("parses project refs and Stripe token modes", () => {
    expect(projectRefFrom("https://qgrertkqbwanerqqemph.supabase.co")).toBe(
      STAGING_PROJECT_REF,
    );
    expect(projectRefFrom(undefined)).toBe("unknown");
    expect(stripeModeFromToken("pk_test_123")).toBe("sandbox");
    expect(stripeModeFromToken("sk_live_123")).toBe("live");
    expect(stripeModeFromToken("mk_abc")).toBe("unknown");
    expect(stripeModeFromToken(undefined)).toBe("unknown");
  });
});
