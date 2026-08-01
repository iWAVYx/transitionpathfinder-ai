// Preflight: prove the target is a real staging environment before any
// fixture is written. This file must pass before the rest of the suite runs.
//
//   node --test tests/staging/preflight.test.mjs

import { test } from "node:test";
import assert from "node:assert/strict";
import {
  SKIP,
  STAGING,
  PRODUCTION_PROJECT_REF,
  adminClient,
  assertStagingSafe,
  projectRefFrom,
  stripeGet,
} from "./harness.mjs";

test("staging target is not the production project", { skip: SKIP }, () => {
  assertStagingSafe();
  const ref = projectRefFrom(STAGING.supabaseUrl);
  assert.notEqual(ref, PRODUCTION_PROJECT_REF);
});

test("Stripe key is sandbox mode", { skip: SKIP }, async () => {
  // /v1/balance is cheap and reports livemode without exposing the key.
  const balance = await stripeGet("balance");
  assert.equal(balance.livemode, false, "Stripe key must be in test mode");
});

test("staging database has the billing schema", { skip: SKIP }, async () => {
  const admin = adminClient();
  for (const table of [
    "plan_capacities",
    "billing_accounts",
    "license_pools",
    "license_allocations",
    "access_entitlements",
    "entitlement_audit_events",
  ]) {
    const { error } = await admin.from(table).select("*").limit(1);
    assert.equal(error, null, `${table} must exist on staging: ${error?.message}`);
  }
});

test("staging database is not carrying production volume", { skip: SKIP }, async () => {
  const admin = adminClient();
  const { count, error } = await admin
    .from("students")
    .select("id", { count: "exact", head: true });
  assert.equal(error, null);
  // A guard, not a rule: production carries dozens of real students. A staging
  // clone that large is almost certainly the wrong database.
  assert.ok(
    (count ?? 0) < 500,
    `staging has ${count} students — confirm this is not a production copy`,
  );
});

test("discovery report", { skip: SKIP }, async () => {
  const admin = adminClient();
  const { data: capacities } = await admin
    .from("plan_capacities")
    .select("plan_key, license_type, included")
    .order("plan_key");
  const prices = await stripeGet("prices", { limit: 100, active: true });
  const endpoints = await stripeGet("webhook_endpoints", { limit: 10 });

  console.log("\n=== staging discovery ===");
  console.log("supabase ref:", projectRefFrom(STAGING.supabaseUrl));
  console.log("stripe mode: sandbox");
  console.log("plan_capacities rows:", capacities?.length ?? 0);
  console.log(
    "stripe lookup keys:",
    prices.data.map((p) => p.lookup_key ?? p.id).sort().join(", "),
  );
  for (const ep of endpoints.data) {
    console.log("webhook:", ep.url, "->", ep.enabled_events.join(", "));
  }
  console.log("=========================\n");
  assert.ok(true);
});
