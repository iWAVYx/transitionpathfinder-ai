# Production-readiness alignment — 2026-08-16

Scope: read-only production-control review and GitHub protection alignment after
PR #21. This work did not publish the Lovable project, deploy Cloudflare,
change a production secret, run a live payment, restore a backup, or migrate a
production database.

## Exact staging candidate

PR #21 merged to `main` as
`e8ee0ebd4e9a0117d7f5ee60ca824f0b89bda9fa`. That exact commit was deployed to
the isolated staging Worker. The protected release-readiness suite and all
exact-commit `main` workflows passed, so staging is complete for this candidate.

Evidence:

- Staging deploy: <https://github.com/iWAVYx/transitionpathfinder-ai/actions/runs/31929236911>
- Release readiness: <https://github.com/iWAVYx/transitionpathfinder-ai/actions/runs/31929330708>
- Role guard: <https://github.com/iWAVYx/transitionpathfinder-ai/actions/runs/31929216620>

## GitHub release protections

- `main` requires a pull request, the `Clean Production Build` check, an
  up-to-date branch, and resolved conversations. Administrator enforcement is
  enabled; force pushes and deletions are disabled.
- The `staging` environment requires owner review and accepts deployments only
  from `main`.
- The new `production` environment requires owner review and accepts
  deployments only from `main`. It contains no production secrets yet.
- The single-owner repository intentionally uses zero required approving
  reviews while retaining the pull-request, CI, conversation, and environment
  approval gates.

## Production hosting and identity

- The current public host is Lovable Cloud. The Lovable project is connected to
  `iWAVYx/transitionpathfinder-ai` on `main` and owns
  `transitionforwardct.com`, `www.transitionforwardct.com`, and the Lovable
  application hostname.
- Recent connected GitHub builds are unsuccessful and Lovable reports that the
  preview is out of date. Unpublished changes are available. No publish action
  was taken during this audit.
- The live `/api/public/env-health` response identifies production project ref
  `lrqcntqyekucamifpffs`, but its application labels, Stripe mode, and exact Git
  SHA are unknown. The currently published application therefore does not prove
  the strict production identity required by `main`.
- The signed-in Cloudflare account has no Workers, Pages projects, or managed
  domains. It is not the control plane for the current production site. A
  Cloudflare production workflow/configuration must not be invented or enabled
  without an explicit hosting decision and release authorization.

## Production data and recovery

- The production backend is Lovable Cloud-managed and is not present in the
  separately signed-in Supabase organization. The similarly visible Supabase
  projects must not be treated as production by inference.
- Lovable reports 167 tables, 3 views, 46 signups, 3 storage buckets, PostgreSQL
  `17.6.1.127`, and a US East (Northern Virginia) region. These observations
  identify the live data plane but do not prove its migration history.
- Fourteen daily backups were visible, covering August 2 through August 15, 2026. Backup inventory is verified; an isolated restore drill is not.
- `supabase_migrations.schema_migrations` has not been read and compared to the
  187 canonical repository migrations. The exact production delta remains
  unknown, so no production migration is authorized.

## Secrets, payments, and security

- The Lovable production project contains secret names for staging database,
  Supabase, service-role, and Stripe credentials alongside production services.
  Values were not opened. Co-locating staging credentials in the production
  control plane fails the required isolation control; removal or rotation must
  be separately authorized and coordinated.
- A live Stripe account is connected, but Lovable's live readiness check is not
  started and the final go-live action remains available. No live payment or
  refund smoke test was performed.
- The latest Lovable security view reports changes since its scan, nine ignored
  findings (including one critical authenticated-email exposure), and 24 known
  package vulnerabilities. Ignored findings are not evidence of closure.
- An OPSWAT secret name exists, but secret presence does not prove that uploads
  are scanned, quarantined, released, and audited end to end. Malware-scanning
  verification remains open.
- No separate Lovable Test/Live database selector is visible. Preview and live
  data isolation must be proven or replaced with an approved operating control
  before real student/IEP data is accepted.

## Decision and next gates

Production remains **NO-GO**. The next safe phase is evidence and remediation,
not deployment:

1. Make the connected Lovable `main` build succeed without publishing, then
   prove the exact candidate SHA and production environment identity.
2. Remove or rotate staging credentials out of the production Lovable project
   under an approved secret-change window.
3. Read the production migration history, produce the exact forward-only delta,
   and complete an isolated backup restore drill.
4. Close or formally remediate the ignored security findings, dependency
   vulnerabilities, preview/live isolation risk, and malware-scanning proof.
5. Complete Stripe live readiness and the approved low-risk transaction,
   webhook, refund, and reconciliation smoke procedure.
6. Add an approval-gated production release procedure only after the chosen
   Lovable/Cloudflare control plane, identities, rollback path, and secrets are
   proven.

Changing this audit to `go`, publishing Lovable, deploying Cloudflare, or
migrating production each requires reviewed evidence and separate explicit
authorization.
