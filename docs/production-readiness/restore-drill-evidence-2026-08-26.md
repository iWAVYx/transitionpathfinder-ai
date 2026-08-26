# Isolated Lovable restore drill evidence — 2026-08-26

Decision: **DATABASE RESTORE DRILL PASSED**. Production remains **NO-GO**.

This was a database-only recovery exercise on the local operator machine. It
did not connect to, restore, publish, migrate, or otherwise modify production
project `lrqcntqyekucamifpffs` or staging project `qgrertkqbwanerqqemph`.
No production or staging credentials, mail delivery, webhooks, background jobs,
Stripe calls, external AI calls, OAuth callbacks, domains, or application
runtime were attached to the target.

## Source and isolation evidence

- Source archive: `transitionpathfinder-ai_260826.backup` from Lovable Cloud
  project `a4a5068b-10df-4e31-8d22-73186657d452`.
- Exact size: 17,820,860 bytes.
- SHA-256:
  `2A70D53D32D6AFE1AC1F0A9B93AA4F336815230B88D9DAA461AEFD06A1660819`.
- PostgreSQL catalog metadata: custom-format, zstd-compressed archive created at
  2026-08-26 01:00:25 UTC from PostgreSQL 17.6 by `pg_dump` 18.4, with 3,110
  catalog entries.
- Target: disposable local Docker project
  `local-restore-drill-2026-08-26`, PostgreSQL image `17.6.1.127`. It used local
  development port `54322` during the drill and was stopped after verification,
  leaving no published container port.
- The restore workspace was created outside the Git repository. The archive,
  extracted catalog, schema-only SQL, local connection state, and database
  volume were not committed, uploaded, or copied into CI or GitHub.
- The archive fingerprint was rechecked before use and remained unchanged.

The restored database size was 543,632,531 bytes. That is larger than the
500 MB database allowance documented for the available free hosted-project
route, confirming the local $0 target was also the capacity-safe choice.

## Recovery timing

- Recovery-point timestamp from the archive: 2026-08-26 01:00:25 UTC.
- Restore clock start: 2026-08-26 02:03:58.271 UTC.
- Verification complete: 2026-08-26 02:27:49.758 UTC.
- Conservative measured RTO: **23 minutes 51.487 seconds**. This includes the
  first-time image pull, two fail-closed importer diagnostics, native restore,
  aggregate integrity checks, access-control smoke tests, and the local
  three-migration rehearsal.
- Recovery-point age at clock start: **1 hour 3 minutes 33.271 seconds**.
- The successful native archive import itself completed in 9.424 seconds.

This measures the on-demand Data Export recovery path. It does not claim that
Lovable's in-place daily-backup restore has the same RTO. A release-window
operator must still record the newest available recovery point immediately
before an authorized production migration.

## Fail-closed diagnostics and correction

1. The newly installed Docker executable was not yet on the Codex process PATH.
   The first command stopped before import. Docker was added to the environment
   for that local process only; Windows and hosted configuration were unchanged.
2. Supabase CLI's `db start --from-backup` path expects plain SQL and mounted
   the Lovable custom archive as a directory on Windows. It started an empty
   local database and logged the failure. Only that empty failed local container
   and volume were deleted. The original archive was retained and its checksum
   was verified again.
3. PostgreSQL's native `pg_restore` correctly parsed the archive. The first
   native attempt found the additional Lovable grant role `sandbox_exec`.
   `--single-transaction --exit-on-error` rolled the attempt back completely.
   The complete schema-only owner/grantee set was enumerated, standard Supabase
   roles plus a local no-login `sandbox_exec` role were created, and the retry
   committed without errors.

These failures are part of the measured RTO and are retained so the recovery
runbook uses native `pg_restore` for future Lovable custom-format exports.

## Restored baseline verification

Only aggregate counts, database metadata, booleans, and pass/fail results were
queried. No names, email addresses, student records, document contents,
credentials, password hashes, tokens, or raw row values were displayed.

- PostgreSQL 17.6; restored database size 543,632,531 bytes.
- 167 public tables; all 167 had RLS enabled.
- 513 public RLS policies and 85 public functions.
- 46 authentication users.
- 181 production migration-history rows; latest recorded version
  `20260823090553`.
- Four Storage bucket metadata rows and zero Storage object rows. Lovable's
  separate dashboard inventory had also shown zero uploaded files.
- Zero invalid public indexes.
- Zero unvalidated public constraints.
- Zero public-table grants to the `PUBLIC` pseudo-role.
- Representative aggregate queries succeeded for profiles, organizations,
  students, subscriptions, and processed payment events.
- An authenticated member could read its own organization membership, while a
  selected membership from a different organization remained invisible under
  RLS. The transaction was rolled back and displayed no identifiers.

The pre-migration anonymous blog query failed on `is_platform_admin` execution,
reproducing the known CMS permission blocker and confirming the clone matched
the reviewed production baseline rather than the already-fixed staging schema.

## Three-migration rehearsal

The exact reviewed pending delta was applied, one file at a time, with
stop-on-error and a transaction around each file, to the disposable clone only:

1. `20260821230000_security_remediation_hardening.sql`
2. `20260825041500_restore_admin_helper_grants_and_public_cms_reads.sql`
3. `20260825050000_scope_public_cms_admin_policies.sql`

Post-migration checks passed:

- private collaboration-note policy hardening was present;
- attachment UPDATE and partner contact-column grants were denied as required;
- public resource-source filtering excluded archived and outdated rows;
- invitation and admin-helper function execution matched the reviewed roles;
- all five CMS management policies were scoped to `{authenticated}`;
- anonymous queries succeeded on blog posts, testimonials, page sections,
  FAQs, and media assets;
- unpublished blog posts and page sections remained hidden from anonymous;
- the own-membership and cross-organization denial checks still passed;
- all 167 public tables still had RLS enabled, with zero invalid indexes,
  unvalidated constraints, or public-table grants to `PUBLIC`.

The rehearsal did not insert the three versions into the restored migration
history because it was a SQL compatibility and invariant test, not a new source
baseline. Production history must still be re-exported SELECT-only and compared
immediately before any separately authorized maintenance window.

## Decision and retention

The database export is recoverable into an isolated PostgreSQL 17.6 target, the
measured RPO/RTO is recorded, Auth and schema data are present, RLS and grants
survive recovery, representative access controls work, and the exact pending
migration sequence succeeds on a recovered production clone. The database
portion of the isolated restore drill therefore passes.

The local container was stopped after verification so it no longer listens on a
database port. The stopped container, database volume, and archive remain
present because teardown is a separate destructive action. They must continue
to be treated as sensitive and must not be deleted until the owner explicitly
authorizes teardown.

Production remains **NO-GO** for the independent blockers in the production
readiness checklist, including a fresh release-window migration baseline,
production publish/build identity and secret isolation, Stripe live evidence,
malware scanning, email/operational controls, incident response, legal review,
and the separately authorized release and smoke-test window.
