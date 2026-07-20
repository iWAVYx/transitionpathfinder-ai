// Workstream C — partner tier gating contract.
// Pure-JS unit tests over the tier config helpers. No DB.
// Run: node --experimental-strip-types --test tests/partner-tier-gating.test.mjs

import { test } from "node:test";
import assert from "node:assert/strict";
import {
  FREE_TIER_OPPORTUNITY_CAP,
  derivePartnerTier,
  opportunityCapFor,
  isAtOrOverCap,
  confidenceBand,
  normalizePartnerMatchScore,
} from "../src/lib/partner-tier-config.ts";

test("free tier cap is 3", () => {
  assert.equal(FREE_TIER_OPPORTUNITY_CAP, 3);
  assert.equal(opportunityCapFor("free"), 3);
  assert.equal(opportunityCapFor("premium"), null);
});

test("tier derivation: no premium caps → free", () => {
  assert.equal(derivePartnerTier({}), "free");
  assert.equal(
    derivePartnerTier({
      publish_unlimited_opportunities: false,
      view_analytics: false,
      featured_placement: false,
    }),
    "free",
  );
});

test("tier derivation: any premium cap → premium", () => {
  assert.equal(derivePartnerTier({ publish_unlimited_opportunities: true }), "premium");
  assert.equal(derivePartnerTier({ view_analytics: true }), "premium");
  assert.equal(derivePartnerTier({ featured_placement: true }), "premium");
});

test("free cap gate: below → allowed, at/above → blocked", () => {
  assert.equal(isAtOrOverCap("free", 0), false);
  assert.equal(isAtOrOverCap("free", 2), false);
  assert.equal(isAtOrOverCap("free", 3), true);
  assert.equal(isAtOrOverCap("free", 4), true);
});

test("premium cap gate is always open", () => {
  assert.equal(isAtOrOverCap("premium", 0), false);
  assert.equal(isAtOrOverCap("premium", 999), false);
});

test("confidence bands: <0.4 low, 0.4–0.75 medium, >=0.75 high", () => {
  assert.equal(confidenceBand(0), "low");
  assert.equal(confidenceBand(0.39), "low");
  assert.equal(confidenceBand(0.4), "medium");
  assert.equal(confidenceBand(0.74), "medium");
  assert.equal(confidenceBand(0.75), "high");
  assert.equal(confidenceBand(1), "high");
});

test("raw score normalization saturates at 60", () => {
  assert.equal(normalizePartnerMatchScore(-5), 0);
  assert.equal(normalizePartnerMatchScore(0), 0);
  assert.equal(normalizePartnerMatchScore(30), 0.5);
  assert.equal(normalizePartnerMatchScore(60), 1);
  assert.equal(normalizePartnerMatchScore(120), 1);
});
