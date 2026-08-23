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
- `production-migration-baseline-2026-08-23.md` — current content-aware
  production migration evidence and the exact one-migration pending list.
- `production-migration-baseline-2026-08-17.md` — prior historical baseline.
- `production-migration-policy.json` — pinned aliases, historical variants,
  supersessions, and the production-forbidden staging fixture.
- `migration-and-rollback-plan.md` — ordering, verification, and rollback.
- `release-checklist.md` — operator go/no-go procedure.
- `production-worker-secret-provisioning.md` — retired, non-runnable Worker
  secret path and controls preventing accidental revival.
- `audit-state.json` — fail-closed CI contract.
