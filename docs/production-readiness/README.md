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
- `migration-and-rollback-plan.md` — ordering, verification, and rollback.
- `release-checklist.md` — operator go/no-go procedure.
- `audit-state.json` — fail-closed CI contract.
