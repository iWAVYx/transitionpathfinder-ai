# Production readiness

Current decision: **NO-GO** (audit opened 2026-08-13).

The dated audit, migration/rollback plan, and release checklist in this
directory are the production release control set. `audit-state.json` is the
machine-readable summary enforced by `npm run test:production-readiness`.

This audit does not authorize a production deployment or database migration.
The status can move to `go` only in a reviewed PR after every blocking item is
closed with evidence. A production release still requires a separate,
explicitly approved run.

Documents:

- `audit-2026-08-13.md` — evidence and current blockers.
- `alignment-2026-08-14.md` — current staging RLS and migration-alignment evidence.
- `alignment-2026-08-15.md` — PR #19 post-merge failures and document/permission alignment controls.
- `alignment-2026-08-16.md` — GitHub protections and current Lovable production-control evidence.
- `alignment-2026-08-20.md` — approved Cloudflare target path, guarded
  production workflow, and remaining cutover controls.
- `production-migration-baseline-2026-08-17.md` — content-aware production
  migration evidence and the zero-pending result.
- `production-migration-policy.json` — pinned aliases, historical variants,
  supersessions, and the production-forbidden staging fixture.
- `migration-and-rollback-plan.md` — ordering, verification, and rollback.
- `release-checklist.md` — operator go/no-go procedure.
- `audit-state.json` — fail-closed CI contract.
