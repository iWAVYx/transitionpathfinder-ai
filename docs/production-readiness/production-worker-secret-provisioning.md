# Production Worker secret provisioning

Status: **prepared but not authorized to run; production remains NO-GO.**

The Cloudflare Worker `transitionforward-production` exists as a placeholder.
Its `workers.dev` URL and preview URLs are disabled, and it has no custom domain
or route. Initial placeholder version `387b17be` is the pre-provisioning
baseline.

`.github/workflows/provision-production-worker-secrets.yml` is the only approved
secret-provisioning path. It is manual-only, runs on `main`, requires the exact
reviewed SHA and confirmation phrase, and uses the protected GitHub `production`
environment. Merging its PR does not authorize dispatching it.

## Protected GitHub values

The workflow maps these environment secrets to the existing Worker without
printing or reading back values:

| GitHub `production` environment secret    | Worker secret                  |
| ----------------------------------------- | ------------------------------ |
| `PRODUCTION_SUPABASE_URL`                 | `SUPABASE_URL`                 |
| `PRODUCTION_SUPABASE_PUBLISHABLE_KEY`     | `SUPABASE_PUBLISHABLE_KEY`     |
| `PRODUCTION_SUPABASE_SERVICE_ROLE_KEY`    | `SUPABASE_SERVICE_ROLE_KEY`    |
| `PRODUCTION_PAYMENTS_CLIENT_TOKEN`        | `PAYMENTS_CLIENT_TOKEN`        |
| `PRODUCTION_STRIPE_LIVE_API_KEY`          | `STRIPE_LIVE_API_KEY`          |
| `PRODUCTION_PAYMENTS_LIVE_WEBHOOK_SECRET` | `PAYMENTS_LIVE_WEBHOOK_SECRET` |
| `PRODUCTION_CRON_WEBHOOK_SECRET`          | `CRON_WEBHOOK_SECRET`          |

The Cloudflare account ID and least-privilege token remain separate protected
environment values:

- `PRODUCTION_CLOUDFLARE_ACCOUNT_ID`
- `PRODUCTION_CLOUDFLARE_API_TOKEN`

## Fail-closed behavior

Before mutation, the workflow verifies the repository, `main` SHA, NO-GO audit
state, exact approved Cloudflare account, approved Supabase project, live Stripe
key formats, distinct service-role and cron values, Worker existence, and
disabled Worker/preview URLs. Staging and sandbox values are rejected.

Provisioning uses `wrangler secret bulk --name transitionforward-production`
without a Wrangler configuration file. Cloudflare creates a secret-only version
of the existing placeholder; no application build is uploaded and no route,
domain, DNS record, or production application release is created. The Worker is
still unreachable because both public URL modes remain disabled.

After mutation, the workflow requires the Worker secret-name inventory to equal
the seven approved names exactly and rechecks that public and preview URLs remain
disabled. A separate explicit approval is required before dispatching this
workflow, and the production deployment remains independently blocked by the
NO-GO audit.
