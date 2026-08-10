import { createHmac, randomBytes } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  FIXTURE_TAG,
  SKIP,
  STAGING,
  adminClient,
  assertStagingSafe,
  fixtureEmail,
} from "./harness.mjs";

const WEBHOOK_ENV_MISSING = [
  ["STAGING_BASE_URL", STAGING.baseUrl],
  ["STAGING_STRIPE_WEBHOOK_SECRET", STAGING.webhookSecret],
]
  .filter(([, value]) => !value)
  .map(([name]) => name);
const WEBHOOK_SKIP = SKIP || WEBHOOK_ENV_MISSING.length > 0;

if (process.env.REQUIRE_STAGING_TESTS === "true" && WEBHOOK_ENV_MISSING.length) {
  throw new Error(
    `Signed webhook acceptance is fail-closed; missing: ${WEBHOOK_ENV_MISSING.join(", ")}`,
  );
}

function id(prefix, token, suffix) {
  return `${prefix}_qa_${token}_${suffix}`;
}

function signedHeader(
  body,
  { timestamp = Math.floor(Date.now() / 1000), secret = STAGING.webhookSecret } = {},
) {
  const signature = createHmac("sha256", secret)
    .update(`${timestamp}.${body}`, "utf8")
    .digest("hex");
  return `t=${timestamp},v1=${signature}`;
}

function eventPayload(eventId, type, object) {
  return {
    id: eventId,
    object: "event",
    api_version: "2026-07-29.dahlia",
    created: Math.floor(Date.now() / 1000),
    data: { object },
    livemode: false,
    pending_webhooks: 1,
    request: { id: null, idempotency_key: null },
    type,
  };
}

function subscriptionObject(scenario, status = "active") {
  return {
    id: scenario.subscriptionId,
    object: "subscription",
    cancel_at_period_end: false,
    collection_method: "charge_automatically",
    current_period_start: scenario.periodStart,
    current_period_end: scenario.periodEnd,
    customer: scenario.customerId,
    items: {
      object: "list",
      data: [
        {
          id: id("si", scenario.token, scenario.key),
          object: "subscription_item",
          current_period_start: scenario.periodStart,
          current_period_end: scenario.periodEnd,
          quantity: 1,
          price: {
            id: id("price", scenario.token, scenario.key),
            object: "price",
            lookup_key: scenario.priceLookupKey,
            product: id("prod", scenario.token, scenario.key),
          },
        },
      ],
    },
    metadata: {
      userId: scenario.userId,
      ...(scenario.organizationId ? { organizationId: scenario.organizationId } : {}),
    },
    status,
  };
}

async function assertNoError(promise, context) {
  const result = await promise;
  assert.equal(result.error, null, `${context}: ${result.error?.message}`);
  return result.data;
}

test(
  "signed staging webhooks reconcile billing, capacity, lifecycle, and idempotency",
  { skip: WEBHOOK_SKIP },
  async (t) => {
    assertStagingSafe();
    assert.match(
      STAGING.webhookSecret,
      /^whsec_/,
      "staging webhook secret must be a Stripe endpoint signing secret",
    );

    const admin = adminClient();
    const token = randomBytes(8).toString("hex");
    const webhookUrl = `${STAGING.baseUrl.replace(/\/$/, "")}/api/public/payments/webhook?env=sandbox`;
    const userIds = [];
    const organizationIds = [];
    const subscriptionIds = [];
    const customerIds = [];
    const eventIds = [];

    t.after(async () => {
      if (eventIds.length) {
        await admin.from("processed_payment_events").delete().in("event_id", eventIds);
      }
      if (subscriptionIds.length) {
        await admin.from("subscriptions").delete().in("stripe_subscription_id", subscriptionIds);
      }
      if (customerIds.length) {
        await admin.from("billing_accounts").delete().in("stripe_customer_id", customerIds);
      }
      if (organizationIds.length) {
        await admin.from("organizations").delete().in("id", organizationIds);
      }
      for (const userId of userIds) {
        await admin.auth.admin.deleteUser(userId);
      }
    });

    async function createUser(label) {
      const { data, error } = await admin.auth.admin.createUser({
        email: fixtureEmail(`webhook-${label}`),
        password: `WebhookQA!${randomBytes(18).toString("base64url")}`,
        email_confirm: true,
        user_metadata: { synthetic: true, fixture: FIXTURE_TAG },
      });
      assert.equal(error, null, error?.message);
      assert.ok(data.user?.id, `fixture user ${label} was not created`);
      userIds.push(data.user.id);
      return data.user.id;
    }

    async function createOrganization(label, type) {
      const data = await assertNoError(
        admin
          .from("organizations")
          .insert({ name: `${FIXTURE_TAG} ${label}`, type })
          .select("id")
          .single(),
        `create ${label} organization`,
      );
      organizationIds.push(data.id);
      return data.id;
    }

    async function send(eventId, type, object) {
      const body = JSON.stringify(eventPayload(eventId, type, object));
      const response = await fetch(webhookUrl, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "stripe-signature": signedHeader(body),
        },
        body,
      });
      const responseBody = await response.text();
      assert.equal(
        response.status,
        200,
        `${type} returned ${response.status}: ${responseBody.slice(0, 300)}`,
      );
      assert.deepEqual(JSON.parse(responseBody), { received: true });
    }

    async function assertRejected(label, eventId, url, signature) {
      const body = JSON.stringify(
        eventPayload(eventId, "checkout.session.completed", {
          id: id("cs", token, label),
          object: "checkout.session",
        }),
      );
      const headers = { "content-type": "application/json" };
      if (signature) headers["stripe-signature"] = signature(body);

      const response = await fetch(url, { method: "POST", headers, body });
      assert.equal(response.status, 400, `${label} webhook must be rejected`);

      const { count, error } = await admin
        .from("processed_payment_events")
        .select("event_id", { count: "exact", head: true })
        .eq("event_id", eventId);
      assert.equal(error, null, error?.message);
      assert.equal(count, 0, `${label} webhook must not claim an event`);
    }

    const rejectedEvents = {
      unsigned: id("evt", token, "unsigned"),
      forged: id("evt", token, "forged"),
      stale: id("evt", token, "stale"),
      liveEnvironment: id("evt", token, "live_environment"),
    };
    await assertRejected("unsigned", rejectedEvents.unsigned, webhookUrl, null);
    await assertRejected("forged", rejectedEvents.forged, webhookUrl, (body) =>
      signedHeader(body, { secret: `whsec_${randomBytes(32).toString("hex")}` }),
    );
    await assertRejected("stale", rejectedEvents.stale, webhookUrl, (body) =>
      signedHeader(body, { timestamp: Math.floor(Date.now() / 1000) - 600 }),
    );
    await assertRejected(
      "live environment",
      rejectedEvents.liveEnvironment,
      webhookUrl.replace("env=sandbox", "env=live"),
      (body) => signedHeader(body),
    );

    const now = Math.floor(Date.now() / 1000);
    const individualUserId = await createUser("individual");
    const educatorUserId = await createUser("educator");
    const schoolId = await createOrganization("school", "school");
    const districtId = await createOrganization("district", "district");
    const partnerId = await createOrganization("partner", "partner");

    const scenarios = [
      {
        key: "individual",
        token,
        userId: individualUserId,
        organizationId: null,
        priceLookupKey: "tf_family_monthly",
        planCode: "individual_pathway",
        planType: "family_early_access",
        pools: { pathway: 1 },
      },
      {
        key: "educator",
        token,
        userId: educatorUserId,
        organizationId: null,
        priceLookupKey: "tf_educator_monthly",
        planCode: "educator_solo",
        planType: "educator_individual",
        pools: { pathway: 5, staff: 1 },
      },
      {
        key: "school",
        token,
        userId: individualUserId,
        organizationId: schoolId,
        priceLookupKey: "tf_school_yearly",
        planCode: "school_core",
        planType: "school_plan",
        pools: { pathway: 30, staff: 8, admin: 2 },
      },
      {
        key: "district",
        token,
        userId: individualUserId,
        organizationId: districtId,
        priceLookupKey: "tf_district_starter_yearly",
        planCode: "district_starter",
        planType: "school_plan",
        pools: { pathway: 150, staff: 35, admin: 5 },
      },
      {
        key: "partner",
        token,
        userId: individualUserId,
        organizationId: partnerId,
        priceLookupKey: "tf_partner_premium_monthly",
        planCode: "partner_premium",
        planType: "partner_featured",
        pools: {},
      },
    ].map((scenario, index) => ({
      ...scenario,
      customerId: id("cus", token, scenario.key),
      subscriptionId: id("sub", token, scenario.key),
      periodStart: now + index,
      periodEnd: now + 31 * 24 * 60 * 60,
    }));

    for (const scenario of scenarios) {
      subscriptionIds.push(scenario.subscriptionId);
      customerIds.push(scenario.customerId);
      const eventId = id("evt", token, `${scenario.key}_created`);
      eventIds.push(eventId);
      await send(eventId, "customer.subscription.created", subscriptionObject(scenario));

      const subscription = await assertNoError(
        admin
          .from("subscriptions")
          .select("id, billing_account_id, plan_code, status, user_id, organization_id")
          .eq("stripe_subscription_id", scenario.subscriptionId)
          .eq("environment", "sandbox")
          .single(),
        `${scenario.key} subscription`,
      );
      assert.equal(subscription.plan_code, scenario.planCode);
      assert.equal(subscription.status, "active");
      assert.ok(subscription.billing_account_id);
      assert.equal(subscription.organization_id, scenario.organizationId);
      assert.equal(subscription.user_id, scenario.organizationId ? null : scenario.userId);

      const pools = await assertNoError(
        admin
          .from("license_pools")
          .select("license_type, purchased, status")
          .eq("subscription_id", subscription.id),
        `${scenario.key} pools`,
      );
      const actualPools = Object.fromEntries(pools.map((row) => [row.license_type, row.purchased]));
      assert.deepEqual(actualPools, scenario.pools);
      assert.ok(pools.every((row) => row.status === "active"));

      let entitlementQuery = admin
        .from("access_entitlements")
        .select("status, source, grants_partner_access")
        .eq("plan_type", scenario.planType);
      entitlementQuery = scenario.organizationId
        ? entitlementQuery.eq("organization_id", scenario.organizationId)
        : entitlementQuery.eq("user_id", scenario.userId);
      const entitlement = await assertNoError(
        entitlementQuery.single(),
        `${scenario.key} entitlement`,
      );
      assert.equal(entitlement.status, "active");
      assert.equal(entitlement.source, "stripe:sandbox");
      assert.equal(entitlement.grants_partner_access, scenario.key === "partner");
    }

    // Replaying the exact event is a 200 no-op with one database claim.
    const replayScenario = scenarios[0];
    const replayEventId = eventIds[0];
    await send(replayEventId, "customer.subscription.created", subscriptionObject(replayScenario));
    const { count: replayCount, error: replayError } = await admin
      .from("processed_payment_events")
      .select("event_id", { count: "exact", head: true })
      .eq("event_id", replayEventId);
    assert.equal(replayError, null, replayError?.message);
    assert.equal(replayCount, 1, "replay must not create a second event claim");

    // Modern Stripe invoice fields update dunning state without changing access.
    for (const [type, expected] of [
      ["invoice.payment_failed", "payment_failed"],
      ["invoice.paid", "paid"],
    ]) {
      const eventId = id("evt", token, type.replaceAll(".", "_"));
      eventIds.push(eventId);
      await send(eventId, type, {
        id: id("in", token, expected),
        object: "invoice",
        parent: {
          subscription_details: {
            subscription: replayScenario.subscriptionId,
          },
        },
      });
      const row = await assertNoError(
        admin
          .from("subscriptions")
          .select("last_invoice_status")
          .eq("stripe_subscription_id", replayScenario.subscriptionId)
          .single(),
        `${type} outcome`,
      );
      assert.equal(row.last_invoice_status, expected);
    }

    // Cancellation keeps the ledger while removing paid access and capacity.
    for (const scenario of scenarios) {
      const eventId = id("evt", token, `${scenario.key}_deleted`);
      eventIds.push(eventId);
      await send(eventId, "customer.subscription.deleted", subscriptionObject(scenario));

      const subscription = await assertNoError(
        admin
          .from("subscriptions")
          .select("id, status")
          .eq("stripe_subscription_id", scenario.subscriptionId)
          .single(),
        `${scenario.key} canceled subscription`,
      );
      assert.equal(subscription.status, "canceled");

      const pools = await assertNoError(
        admin
          .from("license_pools")
          .select("purchased, status")
          .eq("subscription_id", subscription.id),
        `${scenario.key} canceled pools`,
      );
      assert.ok(pools.every((row) => row.purchased === 0 && row.status === "expired"));

      let entitlementQuery = admin
        .from("access_entitlements")
        .select("status")
        .eq("plan_type", scenario.planType);
      entitlementQuery = scenario.organizationId
        ? entitlementQuery.eq("organization_id", scenario.organizationId)
        : entitlementQuery.eq("user_id", scenario.userId);
      const entitlement = await assertNoError(
        entitlementQuery.single(),
        `${scenario.key} canceled entitlement`,
      );
      assert.equal(entitlement.status, "canceled");
    }

    await mkdir("test-results/staging-billing", { recursive: true });
    await writeFile(
      "test-results/staging-billing/webhook-acceptance.json",
      `${JSON.stringify(
        {
          environment: "staging",
          stripeMode: "sandbox",
          scenarios: scenarios.map(({ key, planCode, pools }) => ({
            key,
            planCode,
            pools,
          })),
          idempotency: "passed",
          signatureRejection: "passed",
          environmentMismatchRejection: "passed",
          invoiceLifecycle: "passed",
          cancellationLifecycle: "passed",
          cleanup: "registered",
        },
        null,
        2,
      )}\n`,
      "utf8",
    );
  },
);
