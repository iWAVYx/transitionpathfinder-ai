import { describe, expect, it } from "vitest";
import { STRIPE_PRICE_SPECS, stripePriceMismatches } from "../../src/lib/billing/stripe-catalog";

const expectedPrices = {
  tf_district_growth_yearly: [3_200_000, "year"],
  tf_district_starter_yearly: [1_800_000, "year"],
  tf_educator_monthly: [3_900, "month"],
  tf_educator_yearly: [39_000, "year"],
  tf_family_monthly: [1_900, "month"],
  tf_family_yearly: [19_000, "year"],
  tf_founding_pilot_once: [250_000, null],
  tf_partner_premium_monthly: [9_900, "month"],
  tf_partner_premium_yearly: [99_000, "year"],
  tf_school_plus_yearly: [650_000, "year"],
  tf_school_yearly: [480_000, "year"],
  tf_snapshot_once: [7_900, null],
  tf_staff_addon_yearly: [50_000, "year"],
  tf_student_addon_yearly: [90_000, "year"],
} as const;

describe("Stripe catalog manifest", () => {
  it("contains the exact published prices and billing cadences", () => {
    expect(
      Object.fromEntries(
        STRIPE_PRICE_SPECS.map((spec) => [
          spec.lookupKey,
          [spec.unitAmount, spec.recurringInterval],
        ]),
      ),
    ).toEqual(expectedPrices);
  });

  it("uses one deterministic product per sellable plan", () => {
    const productIds = new Set(STRIPE_PRICE_SPECS.map((spec) => spec.productId));
    expect(productIds.size).toBe(11);
    expect([...productIds].every((id) => id.startsWith("prod_tf_"))).toBe(true);
  });

  it("detects immutable Stripe price drift", () => {
    const spec = STRIPE_PRICE_SPECS.find(
      (candidate) => candidate.lookupKey === "tf_family_monthly",
    )!;
    const matchingPrice = {
      active: true,
      currency: "usd",
      livemode: false,
      lookup_key: spec.lookupKey,
      metadata: { plan_key: spec.planKey },
      product: spec.productId,
      recurring: { interval: "month", interval_count: 1 },
      type: "recurring",
      unit_amount: 1_900,
    };

    expect(stripePriceMismatches(matchingPrice, spec)).toEqual([]);
    expect(stripePriceMismatches({ ...matchingPrice, unit_amount: 2_000 }, spec)).toContain(
      "unit_amount",
    );
  });
});
