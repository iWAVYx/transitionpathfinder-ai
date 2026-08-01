// Licensing capacity contract — pure unit tests over the shared catalog.
// Database-level enforcement (over-allocation, expiry release, revocation)
// is covered by tests/licensing-capacity.test.mjs.
//
// Run: node --experimental-strip-types --test tests/licensing-catalog.test.mjs

import { test } from "node:test";
import assert from "node:assert/strict";
import {
  PLANS,
  PRICE_TO_PLAN,
  QUANTITY_BASED_PRICE_IDS,
  capacityForPurchase,
  planForPriceId,
  utilizationBand,
} from "../src/lib/billing/plans.ts";

test("every sellable plan resolves from its price lookup key", () => {
  for (const plan of Object.values(PLANS)) {
    for (const id of [plan.monthlyPriceId, plan.yearlyPriceId, plan.oneTimePriceId]) {
      if (!id) continue;
      assert.equal(PRICE_TO_PLAN[id], plan.key, `${id} → ${plan.key}`);
      assert.equal(planForPriceId(id)?.key, plan.key);
    }
  }
});

test("price lookup keys are unique across the catalog", () => {
  const ids = Object.values(PLANS).flatMap((p) =>
    [p.monthlyPriceId, p.yearlyPriceId, p.oneTimePriceId].filter(Boolean),
  );
  assert.equal(new Set(ids).size, ids.length);
});

test("contracted capacities match the published plans", () => {
  assert.deepEqual(
    [
      PLANS.individual_pathway.capacity.pathwayLicenses,
      PLANS.individual_pathway.capacity.familyAccountsPerPathway,
    ],
    [1, 3],
  );
  assert.equal(PLANS.educator_solo.capacity.pathwayLicenses, 5);
  assert.equal(PLANS.school_core.capacity.pathwayLicenses, 30);
  assert.equal(PLANS.school_core.capacity.staffSeats, 8);
  assert.equal(PLANS.school_core.capacity.adminSeats, 2);
  assert.equal(PLANS.school_plus.capacity.pathwayLicenses, 50);
  assert.equal(PLANS.school_plus.capacity.staffSeats, 15);
  assert.equal(PLANS.district_starter.capacity.maxSchools, 3);
  assert.equal(PLANS.district_starter.capacity.pathwayLicenses, 150);
  assert.equal(PLANS.district_growth.capacity.maxSchools, 8);
  assert.equal(PLANS.district_growth.capacity.staffSeats, 90);
  assert.equal(PLANS.founding_pilot.termMonths, 6);
  assert.equal(PLANS.founding_pilot.autoConvert, false);
  assert.equal(PLANS.district_enterprise.salesAssisted, true);
});

test("only add-on packs are sold by quantity", () => {
  assert.deepEqual(
    [...QUANTITY_BASED_PRICE_IDS].sort(),
    ["tf_staff_addon_yearly", "tf_student_addon_yearly"],
  );
});

test("add-on capacity multiplies by pack count", () => {
  assert.equal(capacityForPurchase("tf_student_addon_yearly", 3)?.pathwayLicenses, 30);
  assert.equal(capacityForPurchase("tf_staff_addon_yearly", 4)?.staffSeats, 20);
  // Base plans stay fixed no matter what quantity Stripe reports.
  assert.equal(capacityForPurchase("tf_school_yearly", 1)?.pathwayLicenses, 30);
});

test("utilization alert bands fire at 80, 90 and 100 percent", () => {
  assert.equal(utilizationBand(0.79), null);
  assert.equal(utilizationBand(0.8), 80);
  assert.equal(utilizationBand(0.89), 80);
  assert.equal(utilizationBand(0.9), 90);
  assert.equal(utilizationBand(1), 100);
  assert.equal(utilizationBand(1.5), 100);
});
