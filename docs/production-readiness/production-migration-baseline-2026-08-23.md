# Production migration baseline — 2026-08-23

Decision: **blocked; one reviewed production migration is pending**.

This was a read-only audit of the Lovable-managed production database with
project ref `lrqcntqyekucamifpffs`, compared with 189 canonical migrations at
reviewed `main` SHA `ee05339b3c53e8ef0b8c05bc9ab7620ff4c04f43`.
It did not deploy, publish, or mutate production.

## Evidence

The SELECT-only baseline query returned 181 ordered migration-history rows.
The first 180 rows exactly match the 2026-08-17 evidence after line-ending
normalization (SHA-256
`ada0b6fb3ae2b4af1f9229188d18ebbdbf16520a18c5c05d26028607b9877c4e`).
The only new row is Lovable-generated version `20260823090553`, pinned by name
and statement hash in `production-migration-policy.json`. The complete ordered
result is preserved in
`evidence/production-migration-history-2026-08-23.csv`.

A focused read-only inspection showed that the new statement drops
`Anyone reads verified resources` and creates
`Authenticated reads verified resources` for `authenticated` users with the
same verified/owner/admin predicate as the canonical migration. It omits only
the canonical file's redundant idempotent drop of the replacement policy.
A separate `pg_policies` query confirmed the legacy policy is absent, the
authenticated replacement has the expected role and predicate, and
`Public reads published resources` remains present for public reads.

## Comparator result

Run:

```sh
npm run audit:production-migrations -- docs/production-readiness/evidence/production-migration-history-2026-08-23.csv
```

The reviewed historical-variant rule accounts for the Lovable-generated row.
The fail-closed comparator then reports:

- 181 directly covered production rows;
- 6 reviewed canonical supersessions;
- 1 production-forbidden staging fixture;
- 0 unresolved production rows, policy errors, or duplicate mappings;
- 1 pending canonical migration:
  `20260821230000_security_remediation_hardening.sql`.

## Release gate

Do not apply the already-covered public-resources alignment migration again.
The remaining security-remediation migration may be applied only in an
explicitly approved production maintenance window after the backup/restore
gate, target-ref check, migration re-baseline, and operator review pass.
Production remains **NO-GO**.
