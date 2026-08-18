# Production migration baseline — 2026-08-17

Decision: **aligned; zero production migrations are pending**.

This is a read-only audit of the Lovable Cloud production database with project
ref `lrqcntqyekucamifpffs`, compared with the 187 canonical migration files at
reviewed `main` SHA `4196947d3b2b080c5ada9798e0968544a5264712`. It does not
authorize a production migration or deployment.

## Evidence and result

The SELECT-only query in `production-migration-baseline.sql` returned version,
name, statement count, and MD5 evidence; it did not return migration SQL or
credentials. The ordered result is preserved in
`evidence/production-migration-history-2026-08-17.csv`.

The content-aware comparator and reviewed policy produced:

- 180 ordered, unique production history rows;
- 187 canonical repository migrations;
- 180 canonical files directly covered by exact content, exact
  version-and-content, or a pinned reviewed alias/historical variant;
- 6 earlier canonical files covered by later synchronized production rows;
- 1 production-forbidden staging fixture;
- 0 unresolved production rows, policy errors, duplicate mappings, or pending
  production migrations.

The exact command is:

```sh
npm run audit:production-migrations -- docs/production-readiness/evidence/production-migration-history-2026-08-17.csv
```

It must report `ALIGNED` and `Pending production migrations: 0`.

## Why version-only comparison is unsafe

Lovable recorded many execution timestamps a few seconds away from repository
filenames. Only 25 of the 180 production versions matched a canonical filename
exactly, although all production rows were accounted for by pinned content
evidence. Treating every nonmatching filename as pending would attempt duplicate
schema work and could fail on objects that already exist.

Two August 14 rows contain the original reviewed statements; later repository
commits added idempotent guards. Their production statement hashes and source
commits are pinned in `production-migration-policy.json`.

Six earlier canonical files are semantically covered by later synchronized
production rows. The policy pins both the production statement hash and the
reviewed executable hash for each relationship. They must not be applied again
or marked manually.

## Production-forbidden migration

`20260621153500_e2e_role_dashboard_readiness.sql` creates synthetic E2E
organizations, profiles, memberships, and demo students for isolated staging.
It must never run in production. The comparison policy requires it to remain an
explicit `productionForbidden` exclusion.

## Release gate

Immediately before any approved production release, repeat the SELECT-only
export and comparator. Stop if the report is anything other than aligned with
zero pending migrations. The production release remains **NO-GO** until the
other controls in `release-checklist.md` are verified.
