# Lovable security-finding alignment — 2026-09-07

Decision: **STAGING CONTROLS VERIFIED; PRIVILEGED-ROUTINE FOLLOW-UP
REQUIRED**. Production remains **NO-GO**.

PR #98 merged as protected `main` SHA
`2b256c8389f7c400d24d449e7af31558a0e2a40a`. The exact SHA was deployed only
to the isolated staging Worker, and migration
`20260907190000_security_finding_alignment.sql` was applied only to Supabase
project `qgrertkqbwanerqqemph`. Both Lovable's basic and deep scans were then
refreshed. They reported no active issues and 0 known dependency issues, but
all nine findings remain in Lovable's ignored list. Ignored status is not
treated as proof that a finding is closed.

| # | Lovable finding | Staging disposition after live evidence | Remaining action |
|---|---|---|---|
| 1 | Partner organization contact emails readable by authenticated users | Verified remediated: authenticated callers lack `SELECT` on both `contact_email` and `phone`. | Reconfirm production catalog state in the eventual production preflight. |
| 2 | Collaboration-note visibility depends on `note_type` | Verified remediated: the live policy requires both non-private `note_type` and non-private `visibility` for non-creators. | Reconfirm production catalog state before release. |
| 3 | Channel attachment metadata lacks explicit UPDATE control | Verified remediated: authenticated callers lack table-level `UPDATE`. | Reconfirm production catalog state before release. |
| 4 | Partner-only restriction could fail when roles are added | Verified in staging: the new helper is search-path pinned, PUBLIC/anonymous execution is revoked, and zero existing role sets disagree with the fail-closed definition. | Apply the reviewed migration to production only in a separately authorized maintenance window. |
| 5 | Resource-source metadata is publicly viewable | Verified intentional and column-limited: anonymous callers cannot read the base table but can execute the reviewed listing function, which excludes sensitive/admin fields and archived/outdated rows. | Preserve this explicit anonymous allowlist. |
| 6 | Form templates are readable by authenticated users | Verified intentional and fail closed: RLS remains enabled, no anonymous grant exists, authenticated table-wide `SELECT` is absent, and only the eight reviewed columns are selectable. | Apply the reviewed migration to production only after separate authorization. |
| 7 | Public can execute a SECURITY DEFINER function | **Not closed.** The live catalog found 17 public-executable security-definer routines. Several are trigger functions, but non-trigger helpers also inherit PUBLIC execution. | Create a focused least-privilege migration that explicitly revokes PUBLIC/anonymous execution except for the narrow anonymous RPC allowlist, then replay and test it. |
| 8 | Signed-in users can execute a SECURITY DEFINER function | **Not closed.** All 74 security-definer routines are search-path pinned, but 68 are executable by authenticated callers and 24 by anonymous callers through explicit or inherited grants. | Review each caller boundary and reduce grants to the minimum required roles; add a machine-readable routine allowlist and regression tests. |
| 9 | Extension installed in the public schema | Scanner label is not reproduced in staging: all nine installed extensions are in `pg_catalog`, `extensions`, `pgmq`, or `vault`; zero are in `public`. | Run the same read-only namespace inventory in production before closing the finding globally. |

## Recorded verification

- Deploy Staging run
  [34176604002](https://github.com/iWAVYx/transitionpathfinder-ai/actions/runs/34176604002)
  deployed and verified the exact 40-character SHA with 31/31 guard tests.
- The staging migration ledger contains exactly one
  `20260907190000` row. Its canonical SQL MD5 is
  `eccebb8899612891df9d1e2882fa4c88`.
- The focused live catalog checks passed for partner contacts, collaboration
  notes, attachment updates, partner-only role semantics, public resources,
  form-template columns, and extension locations.
- Every protected push workflow passed, including disposable migration replay,
  live permission/RLS/cross-district checks, dashboard and role-guard journeys,
  build verification, accessibility, and the credential-free readiness audit.
- Consolidated Release Readiness run
  [34177650200](https://github.com/iWAVYx/transitionpathfinder-ai/actions/runs/34177650200)
  passed at the same exact SHA.
- Lovable basic and deep scans both completed after the merge. Lovable showed
  no active issues, the same nine ignored findings, 77 packages, and 0 known
  dependency issues.

`securityFindingsClosed` remains false because findings 7 and 8 require a
least-privilege routine-grant follow-up, and production still needs the
read-only extension inventory plus a separately authorized migration window.
These staging results do not authorize a production migration. A future rescan
is evidence only and cannot substitute for the remaining live catalog
verification or a separate owner-approved maintenance window.
No Lovable build or publish, production database change, DNS change, secret
change, or payment occurred during this evidence pass.
