import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const webhook = readFileSync(
  new URL("../src/routes/api/public/payments/webhook.ts", import.meta.url),
  "utf8",
);
const migration = readFileSync(
  new URL(
    "../supabase/migrations/20260811131802_webhook_reconciliation_conflict_targets.sql",
    import.meta.url,
  ),
  "utf8",
);

test("webhook upserts use non-partial subject conflict targets", () => {
  assert.match(webhook, /onConflict:\s*"user_id,organization_id,environment"/);
  assert.match(webhook, /onConflict:\s*"organization_id,user_id,plan_type"/);
  assert.match(webhook, /onConflict:\s*"subscription_id,license_type,source"/);

  assert.match(
    migration,
    /billing_accounts_subject_environment_uidx\s+ON public\.billing_accounts \(user_id, organization_id, environment\)\s+NULLS NOT DISTINCT;/,
  );
  assert.match(
    migration,
    /access_entitlements_subject_plan_uidx\s+ON public\.access_entitlements \(organization_id, user_id, plan_type\)\s+NULLS NOT DISTINCT;/,
  );
  assert.match(
    migration,
    /license_pools_subscription_type_uidx\s+ON public\.license_pools \(subscription_id, license_type, source\);/,
  );
});

test("billing-account failures stop reconciliation before dependent writes", () => {
  assert.match(
    webhook,
    /Payment webhook: billing account upsert failed:[\s\S]*throw new Error\("Billing account upsert failed"\)/,
  );
});
