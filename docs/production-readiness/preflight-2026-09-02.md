# Production preflight — 2026-09-02

Decision: **NO-GO.** Isolated staging is fully green for exact protected `main`
SHA `611789b11f00b86a3acaa5d092eddd3e84190d36`, but the currently published
Lovable production snapshot does not satisfy the fail-closed production health
contract. No production change was made during this preflight.

## Verified live state

The canonical homepage `https://transitionforwardct.com/` returned HTTP 200
through Cloudflare with HSTS and no-cache response headers. Public DNS for the
apex, `www`, and `e2e` hostnames is proxied by Cloudflare.

The canonical production health endpoint returned HTTP 503 with these
non-sensitive identity facts:

- `app_env=production`;
- production Supabase project `lrqcntqyekucamifpffs`;
- allowed production hostname `transitionforwardct.com`;
- `vite_app_env` missing;
- Stripe mode unknown; and
- deployed SHA `ba7655fa123d1f751c4d567ec44404920347f01d`.

The endpoint correctly failed closed on the missing build-time environment
label and unverified Stripe mode. The deployed Lovable SHA is an older Lovable
merge snapshot based on `6b02f9c8`; it is not the protected `main` candidate
and is not an ancestor of `611789b1`.

## Read-only Lovable control-plane evidence

The authenticated project was confirmed as **Transition Pathways Hub**, project
ID `a4a5068b-10df-4e31-8d22-73186657d452`.

- The Payments panel is connected to Stripe and visibly selected **Live mode**.
  It shows zero live revenue, customers, and transactions. This proves the
  connection selection, not the required end-to-end live transaction checks.
- The secret-name inventory contains `APP_ENV` and the live Stripe server and
  webhook variable names. It contains no `VITE_APP_ENV` project-secret entry.
  Secret values were neither opened nor recorded.
- Lovable explains that secret changes affect preview immediately but require a
  publish to affect the live app. No secret was changed and no publish occurred.
- The domain panel lists the Lovable subdomain, apex, `www`, and `e2e` as live.
  Independent health verification proves `e2e` is currently the isolated
  staging target, not production.
- The Security panel says changes exist since its last scan. It shows three
  current warnings, nine ignored findings, and zero known dependency issues.
  The warnings concern relationship self-approval defense in depth,
  unrestricted analytics-event metadata, and authenticated access to internal
  fields on `resource_sources`. No scan, auto-fix, or ignore action was run.

## Controls not yet verified

The Cloudflare dashboard required a fresh login, so the account-level WAF,
rate-limit, cache-bypass, DNS rollback, and authenticated route configuration
were not marked complete. No saved account was selected and no login was
attempted.

The following remain independent release stops:

1. successful Lovable connected build mapped to one reviewed protected-main
   SHA, followed by separately authorized production publish;
2. HTTP 200 production health proving both production environment labels, live
   Stripe mode, production Supabase/hostname, exact SHA, and no isolation errors;
3. review/remediation and a fresh Lovable security scan for all current and
   ignored findings;
4. Cloudflare account-level edge and rollback review;
5. live Stripe transaction, webhook, entitlement, cancellation/refund, and
   reconciliation evidence;
6. email-domain, observability, malware-scanning, incident-response, and
   privacy/legal evidence; and
7. post-publish smoke tests, observation window, rollback owner, and final GO
   decision.

The production database migration baseline remains aligned with zero pending
migrations. This preflight does not reopen or repeat the completed migration
window.
