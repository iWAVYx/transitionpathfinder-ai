# Billing / licensing verification against staging

This suite verifies the product catalog, capacity enforcement, sponsored
access, and the governance audit trail. It never runs against production:
`tests/staging/harness.mjs` throws if the Supabase URL resolves to the
production project ref or the Stripe key is a live key.

## Required environment

| Variable                            | Purpose                                               |
| ----------------------------------- | ----------------------------------------------------- |
| `STAGING_SUPABASE_URL`              | Staging project URL (must not be the production ref)  |
| `STAGING_SUPABASE_PUBLISHABLE_KEY`  | Anonymous key, used to sign fixture users in          |
| `STAGING_SUPABASE_SERVICE_ROLE_KEY` | Fixture creation and teardown only                    |
| `STAGING_STRIPE_API_KEY`            | Stripe **sandbox** key (`sk_test_…`)                  |
| `STAGING_STRIPE_WEBHOOK_SECRET`     | Signing secret for the isolated staging destination   |
| `STAGING_BASE_URL`                  | Staging Worker URL used for signed webhook acceptance |
| `STAGING_DB_URL`                    | Direct Postgres URL for the pgTAP and grant checks    |

With none of these set, local runs skip safely. The GitHub workflow sets
`REQUIRE_STAGING_TESTS=true`, so a missing staging variable fails instead of
producing a misleading green run.

## Getting a staging backend

Lovable Cloud gives one backend per project, so staging must live elsewhere.
Two supported paths:

1. **Remix this project** into e.g. `transitionforward-staging`. The remix
   gets its own isolated Cloud backend; apply the same migrations, seed a
   small fixture set, and point the variables above at it.
2. **Bring your own Supabase project.** Apply `supabase/migrations` to it and
   point the variables at that project. This suite talks to it directly, not
   through the app's generated client.

Either way the app code is untouched — only the environment differs.

## Running

```bash
# 1. Preflight — proves the target is staging and reports the discovery data.
node --test tests/staging/preflight.test.mjs

# 2. Catalog contract — app price ids vs the Stripe sandbox catalog.
node --test tests/staging/catalog-contract.test.mjs

# 3. Capacity, sponsorship, and audit-trail enforcement.
node --test tests/staging/capacity-enforcement.test.mjs

# 4. Signature rejection, environment isolation, signed webhook lifecycle,
#    idempotency, and cleanup.
node --test tests/staging/webhook-acceptance.test.mjs

# 5. Database invariants (optional, needs pgtap on staging).
psql "$STAGING_DB_URL" -f tests/staging/pgtap/billing_capacity.sql
```

Or all of the Node tests at once:

```bash
bun run test:staging
```

## GitHub Actions

The manual-only **Staging Billing Verification** workflow runs fail-closed in
the GitHub `staging` environment. It requires every staging secret, confirms
the Worker identity, verifies the billing-table grant hardening directly,
runs the tests in safety-first order, and uploads the logs plus the lifecycle
summary. The workflow accepts the existing
`STAGING_STRIPE_SANDBOX_API_KEY` secret or `STAGING_STRIPE_API_KEY`.

In **Actions → Staging Billing Verification → Run workflow**, enter
`staging-billing`. A missing secret, skipped suite, production-shaped target,
live Stripe key, incorrect webhook secret, or unapplied migration fails before
any fixture write.

## Fixture hygiene

Every fixture is namespaced `qa_billing_<timestamp>` (`FIXTURE_TAG`) and
removed in `after()`. Organizations cascade to their memberships, pools, and
allocations. Audit rows are immutable by design and are left in place — that
is the behaviour the suite asserts.

## What is deliberately not covered here

- No writes to Stripe. Catalog checks are read-only; signed synthetic events
  exercise the deployed webhook without creating Stripe customers or charges.
- No production webhook replay. The lifecycle test signs fixtures with the
  isolated staging destination secret and hard-refuses the production host and
  project ref.
- Unsigned, forged, stale-timestamp, and live-environment requests must return
  `400` without creating an idempotency claim.
