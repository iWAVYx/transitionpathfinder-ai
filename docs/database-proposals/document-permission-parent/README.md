# Document Permission Parent Binding — Verified Review Draft

This separate, noncanonical draft closes the confirmed mismatched-student grant path. The canonical INSERT policy checks editing access against the supplied student, and its document-view lookup previously ignored that grant's student. UPDATE could similarly retarget a grant. Both baseline reproductions, all32 local PostgreSQL/WASM cases, all41 real PostgreSQL cases and the full225+41+two-separate-draft schema installation/catalog proof pass. This completes the parent-binding component in source/disposable scope, not hosted acceptance. Exact source, case/log hashes and schema metadata proof are retained in `document-permission-parent-verified-2026-11-15.json` under the production-readiness evidence directory.

The new invoker trigger checks the true document parent under caller RLS and holds a SHARE row lock through the write. It rejects parent identity reassignment. The existing document-view helper also ignores historical mismatches without deleting or rewriting them. Only its exact reviewed body changes; its OID, owner, ACL, mode and path are preserved. Existing table policies, grants, indexes and rows are preserved. Unknown baseline or repeat installation stops for review.

The successful native job ran41 fresh-database cases:32 common cases and nine observed concurrent/cached-statement cases. COMMIT/ROLLBACK exercises insertion versus parent movement and the migration versus cached old INSERTs. The successful full-schema job first executed the unchanged56-stage225+41+admin-retirement installer, then installed this second separate draft and compared every public routine, every policy, relevant table ACL and document/grant data fingerprints. Existing original regression suites are not claimed as rerun by this focused installer.

Correctly bound limited-tier and role-wide grants deliberately retain their prior behavior. Raw-file tier privacy, broad audience scoping, retirement after access removal and the separate rights-transfer upsert remain release blockers under5.2/5.3. This is not a complete sharing-privacy solution.

No ledger or migration number is assigned. Final promotion/order/preflight must include the earlier admin-grant retirement and preserve the distinct225 canonical,41 prior control,15-migration batch and two separate-draft inventories. Do not execute against a hosted target without fresh authorization. Existing signed URLs and provider operations are unaffected. Restoring the old function during rollback would reopen the old boundary, so operational recovery requires separate review.

Local command using the trusted PGlite0.5.8 module:

```sh
DOCUMENT_PARENT_PGLITE_MODULE=/absolute/path/to/pglite/dist/index.js node --test tests/database/document-permission-parent.test.mjs
```

Native execution requires the dedicated GitHub Actions marker, a fresh disposable loopback service and fixed fake credentials. It never accepts a hosted database URL.

The first native run passed40/41: the cached-read test setup retained the authenticated role when attempting trusted DDL. Resetting only that setup connection fixed it; SQL and cached-read assertions were unchanged. Both corrected push/PR workflows pass. The separate failed run remains recorded. All56 inherited scripts/logs, all297 original SQL source hashes and the unchanged original native-test hash were independently checked; no claim is made that this focused job reran the prior2,405 regression cases.
