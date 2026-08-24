# Refreshed production preflight — 2026-08-23

Decision: **NO-GO**. This was an evidence-only audit. It did not publish
Lovable, change a secret, deploy production, alter DNS, run a live payment,
restore a backup, or migrate the production database.

## Exact candidate and staging acceptance

PR #54 merged to protected `main` as
`a2192d8e0f79742211be349e411e076301aea7fc`.

- Isolated staging deployment run
  [`32685433926`](https://github.com/iWAVYx/transitionpathfinder-ai/actions/runs/32685433926)
  passed and verified the exact SHA, staging project identity, sandbox Stripe
  boundary, Worker dry run, deployed identity, and PWA assets.
- Consolidated protected release-readiness run
  [`32686237405`](https://github.com/iWAVYx/transitionpathfinder-ai/actions/runs/32686237405)
  passed on attempt 1. It verified all seven synthetic role sessions and storage
  states, public accessibility and visual journeys, signed-in workflows, and
  access controls against that exact staging deployment.
- Build/SSR, accessibility, CT Seed, RLS, permissions, cross-district isolation,
  Role-guard, and Dashboard workflows all passed for the same SHA.
- The canonical migration tree has not changed since successful disposable
  migration replay run
  [`32630746041`](https://github.com/iWAVYx/transitionpathfinder-ai/actions/runs/32630746041).

Lovable's actual preview document reports the exact candidate through
`data-app-build-sha`, and public CMS content renders without the former missing
service-role error. Lovable's build card nevertheless still says
`Build unsuccessful` and `Preview is out of date`. That control-plane conflict
remains a release stop; runtime evidence is recorded but the build-status gate
is not weakened.

## Live production observations

The public production health endpoint returned HTTP 503, which is the correct
fail-closed behavior for its current state. Its non-secret response proves the
production Supabase ref is `lrqcntqyekucamifpffs`, but also reports:

- `APP_ENV` unset and `VITE_APP_ENV` unknown;
- Stripe mode unknown;
- build SHA `dev` instead of an exact 40-character commit;
- the names `STAGING_STRIPE_API_KEY`, `STAGING_SUPABASE_SERVICE_ROLE_KEY`, and
  `STAGING_SUPABASE_URL` still detected in the Lovable production runtime.

GitHub's `production` environment requires owner review and deployments from
protected `main`. Secret-name metadata contains the public Supabase connection,
Cloudflare account identifier, and payments gateway token, but no Supabase
service-role secret. Repository-level secret-name metadata likewise exposes no
production service-role credential. No secret value was read.

Public DNS and HTTP observations show that both apex and `www` resolve through
Cloudflare, the signed-out homepage returns HTTP 200 with `CF-Cache-Status:
DYNAMIC`, HTML is marked `no-cache`, and HSTS includes subdomains. The current
response has no HTTP Content-Security-Policy header; the final edge review must
confirm the intended application CSP and Cloudflare WAF/cache rules.

Email DNS is incomplete for production sending: Google MX and a monitoring
DMARC record (`p=none`) exist, but no apex SPF record was returned and the
common Google Workspace DKIM selector publishes an empty key. Provider-specific
DKIM selector evidence is still required if another selector is intended.

## Remaining release blockers

1. Remove or rotate the three detected staging credentials from Lovable's
   production runtime and prove preview activity cannot mutate live records.
2. Configure production application labels, exact build identity, and live
   Stripe mode in Lovable; resolve the contradictory hosted-build status before
   any publish.
3. Complete the Lovable-assisted isolated restore drill, including database,
   Auth, and Storage coverage plus measured RPO/RTO.
4. Re-baseline production immediately before a maintenance window, then apply
   only the reviewed pending migration
   `20260821230000_security_remediation_hardening.sql`. Do not reapply the
   already-covered public-resources alignment migration.
5. Complete Stripe live catalog, webhook, portal, tax, transaction,
   entitlement, cancellation/refund, and ledger reconciliation evidence.
6. Select and integrate a malware-scanning provider; prove clean and infected
   upload paths end to end before accepting real IEP/student files.
7. Close or formally disposition Lovable security findings and dependency
   vulnerabilities, and verify observability redaction and alerting.
8. Publish valid SPF and DKIM records, choose the DMARC enforcement plan, and
   attach deliverability evidence before enabling production email.
9. Complete legal/subprocessor/DPA review, incident-response ownership, and the
   final Cloudflare DNS/WAF/rate-limit/cache export and rollback procedure.

Production may move to **GO** only in a reviewed PR after every machine-readable
production control is supported by evidence. Publishing, DNS cutover, the
production migration, and live payment smoke testing each require separate,
explicit owner authorization.
