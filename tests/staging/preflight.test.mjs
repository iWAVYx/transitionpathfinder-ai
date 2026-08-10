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

const REQUIRED_WEBHOOK_EVENTS = [
  "checkout.session.completed",
  "customer.subscription.created",
  "customer.subscription.updated",
  "customer.subscription.deleted",
  "invoice.paid",
  "invoice.payment_failed",
];

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
  const { data: capacities, error: capacityError } = await admin
    .from("plan_capacities")
    .select(
      "plan_code, pathway_licenses, staff_seats, admin_seats, max_schools, family_accounts_per_pathway",
    )
    .order("plan_code");
  assert.equal(capacityError, null, capacityError?.message);
  assert.ok(capacities?.length, "staging plan capacities must not be empty");
  const prices = await stripeGet("prices", { limit: 100, active: true });
  const endpoints = await stripeGet("webhook_endpoints", { limit: 10 });

  console.log("\n=== staging discovery ===");
  console.log("supabase ref:", projectRefFrom(STAGING.supabaseUrl));
  console.log("stripe mode: sandbox");
  console.log("plan capacities:", JSON.stringify(capacities));
  console.log(
    "stripe lookup keys:",
    prices.data
      .map((p) => p.lookup_key ?? p.id)
      .sort()
      .join(", "),
  );
  for (const ep of endpoints.data) {
    console.log("webhook:", ep.url, "->", ep.enabled_events.join(", "));
  }
  console.log("=========================\n");
  assert.ok(true);
});

test(
  "Stripe sandbox has the isolated staging webhook destination",
  { skip: SKIP || !STAGING.baseUrl },
  async () => {
    const expectedUrl = `${STAGING.baseUrl.replace(/\/$/, "")}/api/public/payments/webhook?env=sandbox`;
    const endpoints = await stripeGet("webhook_endpoints", { limit: 100 });
    const endpoint = endpoints.data.find((row) => row.url === expectedUrl);

    assert.ok(endpoint, `missing Stripe webhook destination: ${expectedUrl}`);
    assert.notEqual(endpoint.status, "disabled", "staging webhook is disabled");

    const enabled = new Set(endpoint.enabled_events ?? []);
    const missing = enabled.has("*")
      ? []
      : REQUIRED_WEBHOOK_EVENTS.filter((event) => !enabled.has(event));
    assert.deepEqual(missing, [], `staging webhook is missing events: ${missing.join(", ")}`);
  },
);
