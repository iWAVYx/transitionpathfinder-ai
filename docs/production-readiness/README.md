# Production readiness

Current decision: **NO-GO** (audit opened 2026-08-13).

The dated audit, migration/rollback plan, and release checklist in this
directory are the production release control set. `audit-state.json` is the
machine-readable summary enforced by `npm run test:production-readiness`.

This audit does not authorize a production deployment or database migration.
The status can move to `go` only in a reviewed PR after every blocking item is
closed with evidence. A production release still requires a separate,
explicitly approved publish and DNS window.

Documents:

- `audit-2026-08-13.md` — evidence and original blockers.
- `alignment-2026-08-14.md` — staging RLS and migration-alignment evidence.
- `alignment-2026-08-15.md` — PR #19 failure and permission-alignment controls.
- `alignment-2026-08-16.md` — GitHub protections and Lovable production evidence.
- `alignment-2026-08-20.md` — superseded historical Cloudflare Worker target.
- `alignment-2026-08-21.md` — current Lovable application/backend origin and
  Cloudflare domain/protection boundary.
- `lovable-build-trigger-2026-08-24.md` — documentation-only connected-build
  trigger scope and exact-SHA post-merge acceptance requirements.
- `preflight-2026-08-25.md` — current exact-SHA staging acceptance, three-file
  production migration delta, production health recheck, and remaining release
  gates.
- `preflight-2026-08-23.md` — refreshed exact-SHA staging acceptance, live
  production health, GitHub control, Cloudflare, and email-authentication evidence.
- `production-migration-baseline-2026-08-23.md` — historical content-aware
  production migration evidence captured when one migration was pending; the
  current three-file comparison is recorded in `preflight-2026-08-25.md`.
- `recovery-gate-2026-08-23.md` — current Lovable backup/restore evidence,
  support response, live backup and Storage inventory, and the still-blocking
  isolated restore drill.
- `isolated-restore-drill-plan-2026-08-25.md` — fail-closed Data Export restore
  procedure, target-isolation rules, cost gate, timing, and pass criteria.
- `staging-credential-containment-2026-08-23.md` — synthetic staging credential
  containment, rotation evidence, and the password-form native fallback fix.
- `production-migration-baseline-2026-08-17.md` — prior historical baseline.
- `production-migration-policy.json` — pinned aliases, historical variants,
  supersessions, and the production-forbidden staging fixture.
- `migration-and-rollback-plan.md` — ordering, verification, and rollback.
- `release-checklist.md` — operator go/no-go procedure.
- `production-worker-secret-provisioning.md` — retired, non-runnable Worker
  secret path and controls preventing accidental revival.
- `audit-state.json` — fail-closed CI contract.
