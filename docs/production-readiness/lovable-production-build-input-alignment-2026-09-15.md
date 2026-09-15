# Lovable production build-input alignment — 2026-09-15

## Decision

**ALIGNMENT PREPARED FOR REVIEW; PRODUCTION REMAINS NO-GO.** This change does
not authorize a Lovable build or publish, a production deployment, a secret
change, a payment, a database action, or a change to staging, Stripe, or
Cloudflare.

## Read-only production evidence

At 2026-09-15 11:54:07 UTC, the public production identity endpoint returned
HTTP 503 and correctly failed closed. It reported:

- `APP_ENV=production`;
- `VITE_APP_ENV=unknown`;
- production hostname `transitionforwardct.com`;
- production Supabase ref `lrqcntqyekucamifpffs`;
- exact published Git SHA `6487bdc637e78cd9dfcab2706f574863d63bcb1f`;
- `stripe_mode=unknown`; and
- no staging target.

A separate read-only scan fetched the HTTP 200 homepage and its two public
JavaScript entry assets. It checked token prefixes without returning any token
value. Neither a live nor sandbox Stripe publishable token was present.

This narrows the current failure to Lovable's transport of approved public
build inputs. It does not establish whether the separate private live Stripe
connection is present, because the identity resolver intentionally reports
`unknown` whenever either the public or private half cannot prove live mode.

## Alignment

Vite already loads the reviewed production and development `VITE_` inputs and
validates their modes. The alignment emits those resolved public values as
literal exports from a build-time virtual module. Both the public identity
endpoint and browser Stripe loader consume that same module, so they cannot
silently diverge when Lovable's Nitro server build does not preserve
`import.meta.env` replacements.

The module contains only:

- the public application environment label;
- the default public Stripe publishable token;
- the sandbox public Stripe publishable token; and
- the live public Stripe publishable token.

No private Stripe credential is embedded. The server still requires the
Lovable-owned `STRIPE_LIVE_API_KEY` runtime binding before production health can
report live mode or billing can run.

## Acceptance sequence

1. Review the diff and run the credential-free build and production-readiness
   suites in GitHub.
2. Merge only with separate authorization.
3. Deploy the exact merge SHA to isolated staging and run its standard protected
   checks before any Lovable action.
4. Allow one Lovable preview build for the exact merge SHA and inspect the
   public identity fields without printing token values.
5. Do not publish production until preview evidence passes and the owner
   separately authorizes one exact-SHA publish.
6. After an authorized publish, require HTTP 200 with both environment labels,
   live Stripe mode, the production Supabase ref, the canonical hostname, the
   exact SHA, and `isolation.ok=true`.

Any missing, mismatched, sandbox, staging, or unknown value remains a hard
failure. This draft does not authorize any build, merge, deploy, publish,
configuration change, payment, or database operation.
