# Production migration maintenance window — 2026-08-26

Decision: **DATABASE MIGRATION GATE PASSED**. Production remains **NO-GO**
for the independent application, hosting, payment, security, operational, and
release gates in `release-checklist.md`.

This maintenance window changed only the Lovable-managed production database.
It did not publish or deploy the application, change DNS or Cloudflare, rotate
or read secrets, change Stripe, or modify isolated staging.

## Authorization and target

The owner authorized exactly these three reviewed migrations, in order:

1. `20260821230000_security_remediation_hardening.sql`
2. `20260825041500_restore_admin_helper_grants_and_public_cms_reads.sql`
3. `20260825050000_scope_public_cms_admin_policies.sql`

The operator used Lovable project
`a4a5068b-10df-4e31-8d22-73186657d452`, the production project mapped by the
release control set to Supabase ref `lrqcntqyekucamifpffs`. The isolated
staging ref `qgrertkqbwanerqqemph` was not targeted. The approved repository
baseline was protected `main` at
`9a4bbb979118abb05d34da79dd44c8db8a76d2e3`.

## Recovery and pre-migration gates

- Newest visible Lovable automatic backup point immediately before the window:
  **2026-08-25 10:14:51 UTC**. No restore was started.
- The separately recorded isolated export/restore drill remained passing with
  measured RTO 23 minutes 51.487 seconds.
- A fresh SELECT-only production history export was captured at approximately
  2026-08-26 03:44:36 UTC in
  `evidence/production-migration-history-pre-window-2026-08-26.csv`.
- The content-aware comparator accounted for all 181 production rows with zero
  malformed versions, duplicate versions or mappings, unresolved production
  content, or policy errors. Its only blocker was the exact authorized
  three-file pending list above.

The migration transaction window started at 2026-08-26 03:50:39.482 UTC.
Each file was hash-checked against the reviewed repository copy, applied in its
own transaction with a five-second catalog lock timeout and sixty-second
statement timeout, and committed together with its exact one-element migration
history record. Any statement or history-record error would have rolled back
that file's complete transaction.

## Per-file results

### 20260821230000

The exact version/content record was present after commit. The targeted checks
all passed: private collaboration notes remained creator-protected, attachment
UPDATE was denied, partner contact columns remained denied to public client
roles, archived/outdated resource sources were excluded, the public resource
function ACL matched the reviewed roles, and invitation acceptance remained
authenticated/service-role only.

### 20260825041500

The exact version/content record, both admin-helper ACLs, and all four
published-content policy roles and predicates passed. A real anonymous read
then reproduced the reviewed `is_platform_admin` execution failure. This did
not affect data integrity and was the exact condition the already-reviewed
third migration was designed to correct, so the operator advanced using that
approved forward correction rather than improvising rollback SQL.

### 20260825050000

The exact version/content record passed. All five CMS management policies were
limited to `{authenticated}` with the reviewed admin predicate. Real anonymous
queries then succeeded for blog posts, testimonials, page sections, FAQs, and
media assets; unpublished blog posts and page sections remained invisible.

## Final verification

The window completed at 2026-08-26 03:56:18.711 UTC, an elapsed time of
**5 minutes 39.229 seconds**.

- Production migration history contains 184 rows and latest version
  `20260825050000`.
- All 167 public tables still have row-level security enabled.
- There are zero invalid public indexes, zero unvalidated public constraints,
  and zero public-table grants to the `PUBLIC` pseudo-role.
- The final SELECT-only export is
  `evidence/production-migration-history-post-window-2026-08-26.csv`.
- The content-aware comparator reports `aligned`, zero blockers, 184 directly
  covered production rows, six reviewed supersessions, one production-forbidden
  staging fixture, and **zero pending migrations**.

No database recovery, application rollback, or incident escalation was
required. Production release authorization remains separate and is not
granted by this evidence.
