# Billing / licensing verification against staging

This suite verifies the product catalog, capacity enforcement, sponsored
access, and the governance audit trail. It never runs against production:
`tests/staging/harness.mjs` throws if the Supabase URL resolves to the
production project ref or the Stripe key is a live key.

## Required environment

| Variable | Purpose |
| --- | --- |
| `STAGING_SUPABASE_URL` | Staging project URL (must not be the production ref) |
| `STAGING_SUPABASE_PUBLISHABLE_KEY` | Anonymous key, used to sign fixture users in |
| `STAGING_SUPABASE_SERVICE_ROLE_KEY` | Fixture creation and teardown only |
| `STAGING_STRIPE_API_KEY` | Stripe **sandbox** key (`sk_test_…`) |
| `STAGING_BASE_URL` | Optional — app URL for Playwright journeys |
| `STAGING_DB_URL` | Optional — direct Postgres URL for the pgTAP file |

With none of these set, every test skips, so CI stays green until a staging
backend exists.

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

# 4. Database invariants (optional, needs pgtap on staging).
psql "$STAGING_DB_URL" -f tests/staging/pgtap/billing_capacity.sql
```

Or all of the Node tests at once:

```bash
bun run test:staging
```

## Fixture hygiene

Every fixture is namespaced `qa_billing_<timestamp>` (`FIXTURE_TAG`) and
removed in `after()`. Organizations cascade to their memberships, pools, and
allocations. Audit rows are immutable by design and are left in place — that
is the behaviour the suite asserts.

## What is deliberately not covered here

* No writes to Stripe. Catalog checks are read-only; creating sandbox
  products belongs to the `payments` tooling, not the test suite.
* No production webhook replay. Webhook handling is verified by signing
  fixtures locally against `PAYMENTS_SANDBOX_WEBHOOK_SECRET`.
