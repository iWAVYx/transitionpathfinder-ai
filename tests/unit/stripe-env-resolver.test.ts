import { describe, it, expect } from "vitest";
import {
  assertRequestedStripeEnv,
  classifyStripeKey,
  stripeEnvForAppEnv,
  webhookEnvAllowed,
} from "@/lib/billing/stripe-env";

describe("server-owned Stripe environment", () => {
  it("maps APP_ENV to a Stripe environment", () => {
    expect(stripeEnvForAppEnv("production")).toBe("live");
    expect(stripeEnvForAppEnv("staging")).toBe("sandbox");
  });

  it("fails closed on other or missing APP_ENV", () => {
    expect(() => stripeEnvForAppEnv("development")).toThrow();
    expect(() => stripeEnvForAppEnv(undefined)).toThrow();
    expect(() => stripeEnvForAppEnv(null)).toThrow();
    expect(() => stripeEnvForAppEnv("")).toThrow();
  });

  it("rejects a client-supplied environment that disagrees", () => {
    expect(assertRequestedStripeEnv(undefined, "sandbox")).toBe("sandbox");
    expect(assertRequestedStripeEnv("sandbox", "sandbox")).toBe("sandbox");
    expect(() => assertRequestedStripeEnv("live", "sandbox")).toThrow();
    expect(() => assertRequestedStripeEnv("sandbox", "live")).toThrow();
  });

  it("gates webhook env for all four combinations", () => {
    expect(webhookEnvAllowed("sandbox", "sandbox")).toBe(true);
    expect(webhookEnvAllowed("live", "sandbox")).toBe(false);
    expect(webhookEnvAllowed("live", "live")).toBe(true);
    expect(webhookEnvAllowed("sandbox", "live")).toBe(false);
    expect(webhookEnvAllowed(null, "sandbox")).toBe(false);
    expect(webhookEnvAllowed("bogus", "live")).toBe(false);
  });

  it("classifies Stripe credentials", () => {
    expect(classifyStripeKey("mk_live_conn")).toBe("gateway");
    expect(classifyStripeKey("sk_test_123")).toBe("direct_test");
    expect(classifyStripeKey("rk_test_123")).toBe("direct_test");
    expect(classifyStripeKey("sk_live_123")).toBe("direct_live");
    expect(classifyStripeKey("whsec_123")).toBe("unknown");
    expect(classifyStripeKey(undefined)).toBe("unknown");
  });
});
