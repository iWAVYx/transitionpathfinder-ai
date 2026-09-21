# Student route hosting-boundary alignment — 2026-09-21

Decision: **BOUNDARY REVIEWED; production remains NO-GO.** This record aligns
the fail-closed hosting inventory with the student route correction based on
protected `main` SHA `11f1200d146801cd6e4d934f6fe1b11dba7c0106`. It does not
authorize a deployment, migration, malware test, Lovable publish, secret
change, DNS change, or production action.

## Reviewed source change

The student directory route moves from
`src/routes/_authenticated/students.tsx` to
`src/routes/_authenticated/students.index.tsx`. This makes `/students` and
`/students/$studentId` sibling routes beneath the existing authenticated shell.
The change prevents the directory component from masking the student detail
page while preserving the same authentication and role-guard boundary.

No server function, privileged runtime file, public endpoint, secret boundary,
database object, storage policy, or hosting responsibility changes.

## Recalculated inventory

The inventory was recalculated with the sorted repository-relative path and
SHA-256 algorithm enforced by
`tests/hosting-portability-boundary.test.mjs`.

| Surface | Files | SHA-256 | Change |
| --- | ---: | --- | --- |
| Public top-level routes | 68 | `03d25a10539bb65319e104d1169be19aa6c54a1df8ac7c41e16b095195496db3` | None |
| Authenticated routes | 138 | `29851f22411669a694d6e9dd5bd6aab5a3a9d626cb91369e9164a3687f57d654` | One reviewed path rename |
| Server-function files | 117 | `1e5a20619ba7bd9e984776465efdb67bf7d7054fe2b3bddad15ff983bb7906c2` | None |
| Privileged-runtime files | 61 | `b59f97e471d66361bd48a12c3d7969b17955c6b643d4e73a523ab1a6352a710c` | None |
| Explicit API/Lovable endpoints | 11 | `3e4b9dba31c85523010e064be8e726691303eba71dcd91dbf93987e3fdceb863` | None |

## Unchanged controls

- Lovable Cloud remains the application origin and privileged runtime.
- Cloudflare remains the edge provider and isolated-staging host.
- The student directory and detail page remain inside the authenticated shell.
- Production publishing and deployment still require separate authorization.
- Overall production release status remains **NO-GO**.
