// Catalog contract: the app's plan catalog (src/lib/billing/plans.ts) and the
// database capacity table must agree with what actually exists in the Stripe
// sandbox. Read-only — this test never creates or edits Stripe objects.
//
//   node --test tests/staging/catalog-contract.test.mjs

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { SKIP, adminClient, stripeGet } from "./harness.mjs";

/** Lookup keys referenced by the app, parsed from the client-safe catalog. */
function appLookupKeys() {
  const src = readFileSync("src/lib/billing/plans.ts", "utf8");
  const keys = new Set();
  for (const match of src.matchAll(/"(tf_[a-z0-9_]+)"/g)) keys.add(match[1]);
  return [...keys].sort();
}

test("every app price id exists as an active Stripe lookup key", { skip: SKIP }, async () => {
  const expected = appLookupKeys();
  assert.ok(expected.length > 0, "catalog must declare price ids");

  const prices = await stripeGet("prices", { limit: 100, active: true });
  const live = new Set(prices.data.map((p) => p.lookup_key).filter(Boolean));

  const missing = expected.filter((k) => !live.has(k));
  assert.deepEqual(
    missing,
    [],
    `missing from the Stripe sandbox catalog: ${missing.join(", ")}`,
  );
});

test("no duplicate active prices share a lookup key", { skip: SKIP }, async () => {
  const prices = await stripeGet("prices", { limit: 100, active: true });
  const seen = new Map();
  for (const price of prices.data) {
    if (!price.lookup_key) continue;
    seen.set(price.lookup_key, (seen.get(price.lookup_key) ?? 0) + 1);
  }
  const dupes = [...seen.entries()].filter(([, n]) => n > 1).map(([k]) => k);
  assert.deepEqual(dupes, [], `duplicate lookup keys: ${dupes.join(", ")}`);
});

test("plan_capacities covers every non-addon plan the app sells", { skip: SKIP }, async () => {
  const admin = adminClient();
  const { data: rows, error } = await admin
    .from("plan_capacities")
    .select("plan_key, license_type, included");
  assert.equal(error, null);

  const byPlan = new Map();
  for (const row of rows ?? []) {
    if (!byPlan.has(row.plan_key)) byPlan.set(row.plan_key, new Set());
    byPlan.get(row.plan_key).add(row.license_type);
  }

  for (const plan of ["school_core", "school_plus", "district_starter"]) {
    const types = byPlan.get(plan);
    assert.ok(types, `plan_capacities is missing ${plan}`);
    assert.ok(
      types.has("pathway"),
      `${plan} must define pathway license capacity`,
    );
  }
});

test("capacity numbers are non-negative integers", { skip: SKIP }, async () => {
  const admin = adminClient();
  const { data: rows } = await admin
    .from("plan_capacities")
    .select("plan_key, license_type, included");
  for (const row of rows ?? []) {
    assert.ok(
      Number.isInteger(row.included) && row.included >= 0,
      `${row.plan_key}/${row.license_type} has invalid capacity ${row.included}`,
    );
  }
});
