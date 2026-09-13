# Production migration baseline — 2026-09-13

## Decision

**BLOCKED / NO-GO.** This was a read-only production history audit. It did not
apply SQL, repair the migration ledger, change a bucket or policy, deploy,
publish, or otherwise mutate production.

## Target and query

- Reviewed repository state: protected `main` SHA
  `625ea0de386cd44fbef12344a1b1f852af4ae07d`.
- Lovable production project:
  `a4a5068b-10df-4e31-8d22-73186657d452`.
- Previously established production Supabase project ref:
  `lrqcntqyekucamifpffs`.
- The visible project signature at query time was 167 tables, 3 views,
  79 signups, and 4 storage buckets: `database_export_26_08_26`,
  `channel-attachments`, `site-media`, and `student-documents`.
- Query completed at approximately `2026-09-13T07:24:13Z` using
  `production-migration-baseline.sql` in Lovable's production SQL editor.
- The query is SELECT-only and returns migration version, name, statement count,
  and statement/code MD5 metadata. It does not return migration SQL, credentials,
  student data, or other application records.

Exported evidence:

- `evidence/production-migration-history-2026-09-13.csv`
- Source CSV download SHA-256:
  `F1A0CCD3CB2CDECC353199355E0F834D88704ABE9B70ABD03D7BB29461979BC5`
- Committed LF-normalized CSV SHA-256:
  `1FB7054BF0D92AB3D62C1D3DD14CB4A2B1A7CA950F53CA4B2C15913C248D2706`
- 184 migration-history rows.
- The normalized CSV content is line-for-line identical to
  `production-migration-history-post-window-2026-08-26.csv`; the production
  migration ledger has not advanced since that evidence was captured.

## Content-aware comparison

The repository comparator evaluated the fresh evidence against the canonical
migration directory at SHA `625ea0de386cd44fbef12344a1b1f852af4ae07d` and
failed closed as expected:

- Status: `blocked`
- Recorded production rows: 184
- Canonical migrations: 195
- Direct coverage: 184
- Reviewed supersessions: 6
- Production-forbidden exclusions: 1
- Pending production migrations: 4
- Latest recorded production version: `20260825050000`

Exact pending files:

1. `20260907190000_security_finding_alignment.sql`
2. `20260907224500_least_privilege_security_definer_grants.sql`
3. `20260908000500_channel_attachment_malware_gate.sql`
4. `20260909010000_create_private_channel_attachments_bucket.sql`

## Review boundaries

The pending files are not one indivisible release:

- `20260907190000_security_finding_alignment.sql` and
  `20260907224500_least_privilege_security_definer_grants.sql` are security and
  least-privilege changes that do not depend on the antivirus provider. They
  still require an exact current production routine/ACL inventory, final
  migration review, named maintenance and abort owners, and separately approved
  production execution before they can be considered ready.
- `20260908000500_channel_attachment_malware_gate.sql` and
  `20260909010000_create_private_channel_attachments_bucket.sql` belong to the
  private attachment and malware-scanning rollout. They remain blocked until a
  suitable private-scanning provider is contractually approved and protected
  clean-file/EICAR staging evidence passes.

The Lovable production UI already displays a `channel-attachments` bucket even
though the canonical bucket-creation migration is not recorded in the migration
ledger. Migration history alone therefore cannot prove full schema or storage
configuration parity. Before any production migration decision, run a separate
SELECT-only inventory of the existing bucket, its privacy setting, related
storage policies, attachment table constraints, and relevant routine grants.
Do not infer that the bucket migration should be applied or ledger-repaired from
this report.

## Required next evidence

1. Capture and review the SELECT-only production bucket/policy and routine/ACL
   inventory.
2. Review the two antivirus-independent security migrations against that exact
   inventory and current staging evidence.
3. Keep the attachment migrations blocked pending provider/privacy approval and
   a successful protected clean-file/EICAR staging run.
4. Request a separate, tightly scoped production maintenance-window
   authorization only after the exact executable set, owners, backup point,
   abort conditions, verification queries, and rollback procedure are recorded.
