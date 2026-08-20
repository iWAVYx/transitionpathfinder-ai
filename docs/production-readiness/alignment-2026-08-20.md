# Production hosting alignment — 2026-08-20

Decision: **Cloudflare Workers is the approved target production hosting path;
production remains NO-GO.**

This alignment follows the exact `ff0594c05f6a84aa7ce5cff8542b302dbc397a76`
staging candidate and the final Lovable hosted-build diagnostic. It does not
deploy Cloudflare, publish Lovable, change DNS, provision a secret, run a live
payment, restore a backup, or migrate production.

## Why the hosting path changed

The exact candidate passes the GitHub build/SSR suite, isolated staging deploy,
exact-SHA identity, release-readiness, seven-role verification, RLS and
permission suites, staging billing, accessibility, and migration replay.
Lovable's hosted build still terminates before compiler diagnostics because the
container cannot accommodate the application's approximately 3.9 GB total build
working set. Lower heap ceilings and disabled minification were measured and do
not create a safe repository fix. Removing routes or product dependencies only
to fit the preview container is not an acceptable production repair.

Cloudflare Workers is therefore the selected release target because the exact
application already builds and runs there in the isolated staging environment.
The current public Lovable deployment remains untouched until a separately
approved Cloudflare cutover.

## Guarded workflow prepared by this PR

`.github/workflows/deploy-production.yml` and `wrangler.production.toml` prepare
the release mechanism but cannot deploy in the current audit state. The workflow:

- is manual-only and protected by the GitHub `production` environment;
- accepts only `main` and an exact approved 40-character SHA;
- refuses to continue unless `audit-state.json` is `go` and every blocking
  production control is true;
- requires successful manual staging deployment, release-readiness, seven-role,
  billing, and migration-replay runs for that same SHA;
- requires production-specific GitHub configuration and live client Stripe mode;
- verifies the pre-provisioned Worker secret-name inventory without reading or
  printing values, and rejects staging/sandbox names;
- records the previous Worker deployment before mutation;
- verifies production hostname, Supabase project, live Stripe mode, exact SHA,
  isolation verdict, and privacy-safe PWA assets after deployment.

The workflow does not apply database migrations or provision Worker secrets.

## Controls still required before GO

1. Verify the Cloudflare account and zone that will own both production routes,
   create the production Worker, restrict the API token to the minimum account,
   Worker, and zone scope, and record the rollback version.
2. Provision the listed GitHub production values and Worker secrets under a
   reviewed change window. Staging values must remain absent.
3. Re-export the SELECT-only production migration history immediately before
   release and reconfirm aligned/zero-pending status.
4. Complete an isolated backup restore drill and record RPO/RTO evidence.
5. Complete Stripe live catalog/webhook/portal/tax readiness and the approved
   low-risk transaction/refund/reconciliation test.
6. Close or formally disposition security findings, dependency risk, upload
   malware scanning, email domain controls, observability/redaction, incident
   response, and legal/privacy controls required for real student/IEP data.
7. Review DNS/cutover and rollback evidence, then change `audit-state.json` to
   `go` only in a separate reviewed PR after every boolean control is proven.

Until then, dispatching the workflow fails before any Cloudflare mutation.
