# Production-readiness alignment — 2026-08-14

Scope: read-only review of `main` through
`01e4c1408c1287178849af2978bcc2e84ea12acf`, isolated staging evidence, and
repository contracts. This work did not deploy or migrate production.

## Protected staging RLS evidence

- Protected run: <https://github.com/iWAVYx/transitionpathfinder-ai/actions/runs/31842319604>
- The workflow used the GitHub `staging` environment and the fixed database
  identity `postgres.qgrertkqbwanerqqemph`.
- The capture job and artifact upload passed.
- The live visibility matrix is semantically identical to the committed
  matrix.
- The live policy contains additional access checks for partner, pathway
  report, action-item, and meeting references. Those checks came from the
  existing July 15 security-hardening migration and are stricter than the stale
  repository snapshot. The reviewed live policy is now the proposed baseline.

## Migration alignment

The canonical directory now contains 187 migrations. Nine versions were added
after the prior 178-file audit. Six repeat previously canonical SQL under later
version numbers. The remaining three replace a public SECURITY DEFINER view
with an explicit column-limited function, restrict public resource columns, and
add malware-scan/document/audit-log security gates.

The synchronized copies of the webhook conflict-target and student ownership
migrations contained non-idempotent index creation. Their versioned files are
preserved, but those index statements are made idempotent so clean replay does
not fail after the original versions have already created the indexes.

## Remaining gates

Production remains **NO-GO**. After this alignment is reviewed and merged, the
protected `main` migration replay, RLS regression, permission regression,
production-readiness contract, and exact-candidate browser suites must pass.
Production migration history, backup/restore evidence, production secrets,
Stripe live separation, Cloudflare protections, malware scanning, smoke tests,
and rollback operations are still unverified.
