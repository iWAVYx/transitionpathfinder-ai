# Production migration baseline — 2026-08-26

Decision: **blocked; exactly three reviewed production migrations are pending**.

This was a fresh, read-only audit of the Lovable-managed production database,
compared with 191 canonical migrations at current `main` SHA
`586e18e3970471d802a5146260d6a725ce2d9a93`. It did not deploy, publish, apply
a migration, or modify production data, schema, settings, secrets, users, or
files.

## Target and query evidence

- Lovable project: `a4a5068b-10df-4e31-8d22-73186657d452`, the established
  production project for Supabase ref `lrqcntqyekucamifpffs`.
- The Lovable Cloud overview showed the matching production database signature:
  167 tables, 46 Auth signups, four Storage buckets, and the restore-drill export
  bucket. The staging project and staging ref were not used.
- Query completed at 2026-08-26 02:50:51 UTC. It selected only migration version,
  name, statement count, and MD5 hashes from
  `supabase_migrations.schema_migrations`; it never returned migration SQL.
- Raw ordered export:
  `evidence/production-migration-history-2026-08-26.csv`.
- Raw export SHA-256:
  `AC38ABFC95C6B215E329D13CFC295707301952DCE926D8D6ED6B154AF6D7C9BD`.
- Canonically normalized dataset SHA-256:
  `702b5f8cee96d3e904e3bdea6ed788a8df4b97420e1d62189f873e6bc4602415`.
  This exactly matches the normalized 2026-08-23 evidence, proving no production
  migration-history row changed between the two reads.

## Comparator result

The fail-closed comparator reports:

- 181 recorded production migrations;
- 191 canonical migration files;
- 181 directly covered production rows;
- 6 reviewed canonical supersessions;
- 1 production-forbidden staging-only fixture;
- 0 malformed rows, duplicate versions, duplicate mappings, unresolved
  production rows, or policy errors;
- exactly 3 pending canonical migrations, in order:
  1. `20260821230000_security_remediation_hardening.sql`
  2. `20260825041500_restore_admin_helper_grants_and_public_cms_reads.sql`
  3. `20260825050000_scope_public_cms_admin_policies.sql`

The comparator now accepts the semicolon-delimited CSV format exported by
Lovable as well as the existing comma-delimited evidence format. Unit coverage
pins both formats.

## Release gate

The fresh baseline confirms the exact three-file delta rehearsed successfully
on the isolated restored production clone. It does **not** authorize applying
those files to production. Production remains **NO-GO**, and
`migrationBaselineVerified` remains false until a separately approved
maintenance window applies the reviewed files one at a time, all post-file
invariants pass, and a new SELECT-only baseline reports zero pending migrations.
