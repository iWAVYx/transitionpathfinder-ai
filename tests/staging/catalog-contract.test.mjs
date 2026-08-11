// Catalog contract: the app's plan catalog (src/lib/billing/plans.ts) and the
// database capacity table must agree with what actually exists in the Stripe
// sandbox. Read-only — this test never creates or edits Stripe objects.
//
//   node --experimental-strip-types --test tests/staging/catalog-contract.test.mjs

import { test } from "node:test";
import assert from "node:assert/strict";
import { STRIPE_PRICE_SPECS, stripePriceMismatches } from "../../src/lib/billing/stripe-catalog.ts";
import { SKIP, adminClient, stripeGet } from "./harness.mjs";

async function catalogPrices() {
  const prices = [];
  const lookupKeys = STRIPE_PRICE_SPECS.map((spec) => spec.lookupKey);
  for (let index = 0; index < lookupKeys.length; index += 10) {
    const response = await stripeGet("prices", {
      active: true,
      limit: 100,
      lookup_keys: lookupKeys.slice(index, index + 10),
      expand: ["data.product"],
    });
    prices.push(...response.data);
  }
  return prices;
}

test("every app price id exists as an active Stripe lookup key", { skip: SKIP }, async () => {
  const expected = STRIPE_PRICE_SPECS.map((spec) => spec.lookupKey);
  assert.ok(expected.length > 0, "catalog must declare price ids");

  const prices = await catalogPrices();
  const live = new Set(prices.map((p) => p.lookup_key).filter(Boolean));

  const missing = expected.filter((k) => !live.has(k));
  assert.deepEqual(missing, [], `missing from the Stripe sandbox catalog: ${missing.join(", ")}`);
});

test("no duplicate active prices share a lookup key", { skip: SKIP }, async () => {
  const prices = await catalogPrices();
  const seen = new Map();
  for (const price of prices) {
    if (!price.lookup_key) continue;
    seen.set(price.lookup_key, (seen.get(price.lookup_key) ?? 0) + 1);
  }
  const dupes = [...seen.entries()].filter(([, n]) => n > 1).map(([k]) => k);
  assert.deepEqual(dupes, [], `duplicate lookup keys: ${dupes.join(", ")}`);
});

test(
  "every Stripe price matches the app amount, cadence, and product",
  { skip: SKIP },
  async () => {
    const prices = await catalogPrices();
    const byLookupKey = new Map(prices.map((price) => [price.lookup_key, price]));
    const drift = [];

    for (const spec of STRIPE_PRICE_SPECS) {
      const price = byLookupKey.get(spec.lookupKey);
      if (!price) continue;
      const mismatches = stripePriceMismatches(price, spec);
      if (mismatches.length > 0) drift.push(`${spec.lookupKey}: ${mismatches.join(", ")}`);
    }

    assert.deepEqual(drift, [], `Stripe catalog drift:\n${drift.join("\n")}`);
  },
);

test("plan_capacities covers every non-addon plan the app sells", { skip: SKIP }, async () => {
  const admin = adminClient();
  const { data: rows, error } = await admin
    .from("plan_capacities")
    .select("plan_code, pathway_licenses, staff_seats, admin_seats");
  assert.equal(error, null);

  const byPlan = new Map((rows ?? []).map((row) => [row.plan_code, row]));

  for (const plan of ["school_core", "school_plus", "district_starter"]) {
    const row = byPlan.get(plan);
    assert.ok(row, `plan_capacities is missing ${plan}`);
    assert.ok(row.pathway_licenses > 0, `${plan} must define pathway license capacity`);
  }
});

test("capacity numbers are non-negative integers", { skip: SKIP }, async () => {
  const admin = adminClient();
  const { data: rows } = await admin
    .from("plan_capacities")
    .select("plan_code, pathway_licenses, staff_seats, admin_seats");
  for (const row of rows ?? []) {
    for (const field of ["pathway_licenses", "staff_seats", "admin_seats"]) {
      assert.ok(
        Number.isInteger(row[field]) && row[field] >= 0,
        `${row.plan_code}.${field} has invalid capacity ${row[field]}`,
      );
    }
  }
});
