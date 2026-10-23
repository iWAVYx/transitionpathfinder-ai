# Share Link Restriction — Staging Acceptance Packet

Prepared October 22, 2026. Status: canonical source candidate / hosted changes NOT authorized. This packet does not authorize a migration, deployment, publication, fixtures or production access. No applied migration is edited. The earlier proposal is retained outside the canonical tree; the newly prepared additive file is listed below.

## Native PostgreSQL Acceptance and Inventory Correction — October 23, 2026

Candidate source commit `7cd69645a949946102005a9b68b5db428ca997fc` is recorded on draft PR211; it is not deployed. [Automatic push replay39912312267](https://github.com/iWAVYx/transitionpathfinder-ai/actions/runs/39912312267) passes all 23 native PostgreSQL sharing cases with zero skips, then the complete canonical replay and retained RLS/grant/security invariants. Separate automatic PR replay39912317853 also passes. Build/SSR, unit, accessibility, role guard and static seed checks pass on that source; protected hosted suites remain skipped, not accepted.

The first automatic readiness check failed because its machine-readable/pinned expectations still counted 203 canonical files and nine pending against saved September production evidence. The correction updates only that inventory to 204 and ten, the exact new filename, and each historical CSV comparison's additional pending file. Production read timestamps/evidence, historical applied-row counts, comparator logic, exclusions, hashes and NO-GO controls are preserved. All 53 affected source/readiness/hosting/migration-comparator contracts now pass locally. Exact-head automatic readiness must verify the correction; no unchanged workflow is manually retried.

The earlier broad mixed Node attempt additionally exposed these two inventory assertions, not just absent credentials/loader prerequisites. Its nonpassing result is retained; do not count it as overall acceptance or characterize every failure as an environment issue. The scoped corrected contracts and named hosted results above are the evidence for this candidate.

## Canonical Candidate Finalized — October 23, 2026

Prepared the new additive [20261023010000_restrict_report_share_token_writes.sql](../../supabase/migrations/20261023010000_restrict_report_share_token_writes.sql), not applied anywhere. SHA256: `5a67b23c3666182054a962aa9465897e36daa6fb1ffbda433d6223562903e187`. Its transaction matches the reviewed proposal exactly; only the header differs. The migration first verifies anonymous/authenticated execution is absent and service execution remains on both raw share RPCs, so the observed missing prerequisite causes an immediate transactional abort. The existing `20261006180000` grant migration must be separately authorized and verified first.

All 23 disposable PGlite cases pass, including canonical/proposal equality and abort-without-write-restriction when the prerequisite is missing. Existing CI now runs these behavioral cases in a new loopback-only throwaway PostgreSQL database using its already pinned pg runtime; the complete canonical migration replay remains enabled. This native PostgreSQL job has not yet passed for this candidate. No arbitrary database URL is accepted and no hosted schema is used.

Nineteen targeted source/hosting/authorization/migration-comparator contracts pass. A broader `node --test tests/*.test.mjs` attempt is NOT an acceptance result: 378 pass, 147 fail and 34 skip because this mixed entry point includes credential-dependent hosted suites and a path-alias-loading case not configured by plain Node. No staging credentials were supplied and no protected hosted workflow was run to work around those prerequisites. Retain `/private/tmp/tf-share-policy-tests/canonical-source-contracts.log`; do not claim all Node tests passed. Runtime remains unchanged since its full 4,363-unit and TypeScript passes.

Offline comparison with the saved September 17 production CSV now reports ten pending canonical migrations (the previously recorded nine plus this candidate), with no unresolved history rows or policy errors. This uses saved evidence only; production was not queried and the comparator's expected blocked status is preserved.

Rollback review: transaction failure restores its original permissions automatically before commit. After a successful restriction, retain the narrowed permissions if application rollback is needed because the older revoke caller remains compatible. Do not automatically regrant broad UPDATE/DELETE or browser raw-RPC access. Any security-reopening change needs separate review/authorization.

## Read-Only Isolated Staging Preflight Completed — October 23, 2026

[Captured catalog evidence](evidence/staging-share-catalog-2026-10-23.json) was read in the existing signed-in Supabase SQL editor for `qgrertkqbwanerqqemph` / staging/E2E at `2026-10-23T00:52:21.896332+00:00`. The result explicitly reports `transaction_read_only=on`. Query execution completed once. The CSV download callback later timed out, but the downloaded file exists; its single JSON row matches the already observed timestamp/metadata. Evidence records its checksum. No query/export rerun was used.

Confirmed at that observation:

- `share_tokens` and `pathway_reports` have RLS enabled, owned by postgres. Authenticated/anonymous roles have no superuser or BYPASSRLS flags, and no direct memberships were returned. This is not a complete transitive role-membership inventory.
- All ten expected token columns currently permit authenticated UPDATE. Authenticated SELECT/INSERT/table UPDATE/DELETE are true; anonymous table privileges and token-column UPDATE are false. Existing token UPDATE policy checks creator identity only and has no explicit WITH CHECK. This confirms the reviewed write surface at the metadata level, without executing a retarget or reading a report.
- Both raw share RPCs currently grant anonymous and authenticated execution as well as service-role execution. Their observed body MD5s match the exact canonical function body text (`resolve_share_token`: `202a554b5536957147d0cd9a3b4873e2`; `track_share_view`: `0b5ec346923e2ec0dc29ea4a302c9a10`); this verifies these two bodies only, not complete migration history. The selected ledger query has no `20261006180000` server-only share-grant entry. Therefore source-level server-only assertions are NOT hosted permission acceptance; this prerequisite is missing on this staging database.
- July share-token INSERT hardening and October atomic report history are present in the selected ledger. Their stored statement hashes are captured, but this narrow query does not reconcile the complete migration history or prove canonical hash parity.
- Existing Owner/admin report SELECT/UPDATE exceptions remain visible in the policy metadata; no grant or policy was changed.

The executable plan must therefore review TWO separate database changes, in order: the existing canonical `20261006180000_server_only_report_share_rpcs.sql` (after reconfirming the deployed server-only caller and canonical function bodies), then a newly reviewed additive token-write restriction derived from the proposal. Do not apply either implicitly or conceal the missing prerequisite behind a health/source-parity result. Target-specific canonical migration preparation, hash/ledger reconciliation, fresh effective-grant verification, protected checks and specific authorization are still required.

Production was not opened or queried. No application records, auth identities, sharing tokens, grants, schema, ledger entries or secrets were modified. The SQL editor may retain its normal private query history; that is not a database migration or saved application record. The query is metadata only and contains no private token values.

## Scope and Candidate Identity

- Source branch: `codex/ppt-output-quality-print`, based on `202dc28c058f41f5ed738f7ee9cb8d3476223a7d`; the runtime/migration candidate is committed as `7cd69645a949946102005a9b68b5db428ca997fc`. A follow-up inventory/test/documentation correction is prepared; record its exact committed SHA and readiness result before release authorization.
- Local application fingerprint: `c4e3096bb114388a5ff91157df2c8dd75ec8b92f2fa358d8cfbe2e14f9adb13d`, `transitionforward-runtime-source-v1`, SHA256, 1,184 files. This is not claimed as deployed.
- Runtime changes: shared `revoke-share-token.server.ts` plus the Students and Trust revoke callers. No role, tool, demo, navigation or document-layout access is added. Demo samples have no real tokens to revoke.
- Staging sites currently remain on approved eb72bd87 / fingerprint `550c963f1472ef6723c1125011deb400a3acfab5da9d79602cf2ce0a1f673b64`, 1,183 files.
- Only eligible hosted database target for a future separately authorized staging change: `qgrertkqbwanerqqemph`. Explicitly reject production `lrqcntqyekucamifpffs` and any unknown target. Repeat identity in the signed-in management UI and site health immediately before a hosted operation; labels such as a project's main branch do not prove environment identity.

## Compatibility Review Completed

All checked-in share-token references in application `src`, `scripts` and `supabase/functions` were searched. Application mutations are creation plus the two revoke callers. No application token DELETE, retarget, expiry/audience edit or reactivation caller was found. Other references list/query tokens, summarize caller-visible access, or count them for Owner health.

| Existing behavior | Proposed compatibility |
| --- | --- |
| Saved report generates family/educator link with 30-day expiry | INSERT policy/entitlement and audience projection are unchanged. |
| Saved report revokes and refreshes its list | UPDATE `revoked=true` remains allowed for the actual creator; exact result must be returned before confirmation. |
| Trust page revokes and reports success | Same shared confirmation helper. Existing UI student-owner eligibility does not override token-creator RLS; an inaccessible row now reports an unconfirmed operation instead of success. |
| Previously revoked link is revoked again | Allowed/confirmable; no reactivation is introduced. |
| Service-only view tracking and administrative expiry maintenance | Existing service privileges preserved; tested in the disposable database. |
| Client deletion/reactivation or changing report/audience/token/expiry | Intentionally prohibited. No product caller was found. External tooling/current effective grants remain unverified and must be checked before migration. |
| Another permissive policy allows broad updates | A restrictive creator/revoked check intersects permissive policies; an added broad fixture policy cannot permit reactivation or foreign revocation. |

This review does not settle broader Owner data access, direct report/history writers, sharing by read-only collaborators, or automatic link invalidation on membership removal. Those remain release-scope decisions in the report-access review.

## Reviewed Files and Checksums

| File | SHA256 |
| --- | --- |
| [SQL restriction proposal](proposals/share-token-write-restriction.sql) | `10b719585c13f9a55bf7191f8c3a7c2dfa92100a36bde5d5f6570587be5dafc6` |
| [Read-only catalog preflight](proposals/share-token-preflight.sql) | `1f92b341df87be142c8d14f3c8d9ca9cbc113e7be73c102c0bc48c3079aa1531` |

The preflight inventories only catalog metadata: table owner/RLS, relevant role flags and direct memberships, effective column/table privileges, policy predicates, resolver signatures/configuration/body hashes and execution grants. It reads no application rows, tokens, report content, credentials or secrets. Indirect privilege behavior is checked by the proposal's effective grant/role assertions; resolve unexpected inheritance before proceeding.

## Required Execution Order

1. **Read-only staging preflight (completed; refresh before a later mutation window).** Confirm the isolated target and capture the catalog result. Compare the ten expected columns, existing policy names, RLS/role ownership assumptions, service role behavior and server-only resolver grants. Check current migration history separately without exposing application records. Do not run mutation SQL if the state differs unexpectedly.
2. **Canonical migration prepared; review/verification pending.** The target state is now recorded and the additive canonical candidate is prepared below. Review its exact transaction and dependency order before authorization. Do not modify a previously applied file or weaken the comparator. Record its filename, full canonical hash, dependency order, verification and ledger transaction representation. The older server-only resolver-grant migration is a separate prerequisite if absent; do not silently bundle it.
3. **Commit and automatic checks.** Record the candidate's authentic commit and runtime identity, rerun checks affected by the final canonical migration and obtain exact-head CI. Review Lovable remote changes before any future source sync. No upstream-main merge is needed merely to inspect this candidate.
4. **Specific staging authorization.** Present exact migration(s), target, source/deployment/publication identity and bounded fixture scope below for owner authorization. GitHub protected jobs still require the human reviewer. Prior release/fixture approvals are not reused.
5. **Migration window.** Capture reviewed pre-change policies/grants and recovery/abort owner. Apply only the individually authorized canonical file and exact ledger representation in a transaction, with stop-on-error verification. No bulk runner. Column/RLS/inheritance mismatches abort; no application data backfill/deletion occurs. Both the older and proposed caller issue only `revoked=true`, so this restriction does not require temporarily restoring broad writes.
6. **Application release, only if authorized.** Deploy the exact confirmed-result caller candidate to Cloudflare staging, reconcile/sync isolated Lovable, verify private identity, and update only its existing staging publication. Recheck both stable fingerprints, sandbox payments, isolated backend and health. Production/main remains untouched.
7. **Bounded no-AI hosted acceptance, only if authorized.** Use the existing seven role accounts, with at most two fictional intakes/reports (Family/Educator) and up to eight run-scoped share tokens total. No new accounts, membership changes, invitation grants, uploads, AI calls or live payments. Verify real caller creation and both applicable revoke surfaces, projected fresh public reads, direct authenticated retarget/audience/token/expiry/creator/metrics denial, reactivation/deletion denial, missing/non-issuer confirmation failure, expiry, anonymous raw-RPC denial, and intact service tracking. Never point any fixture token at a real report. Observe existing Owner exceptions rather than changing them.
8. **Exact cleanup and sign-off.** Because authenticated token DELETE is intentionally removed, pre-authorize a trusted cleanup operator for only the recorded fixture token/report/intake IDs and their fixture versions if any. Delete tokens before parent records, verify exact-ID absence with the authorized privileged cleanup client, retain sanitized evidence and no token-bearing screenshots/URLs/auth artifacts. Do not enumerate/delete other rows. If a scope cap or unexpected partial failure prevents safe cleanup, stop and report exact outstanding fixture IDs privately. No replacement run is implied.

## Acceptance and Abort Criteria

GO for the isolated change requires canonical/effective grant and RLS verification, exact identity parity, the named create/revoke/projection/denial journeys, confirmed cleanup and reviewed evidence. Twenty in-memory cases are local evidence only, not hosted GO. A new failure remains open; do not retry unchanged tests or weaken assertions to pass.

On SQL/assumption failure before commit, roll back the transaction and do not publish. If application acceptance fails after a committed restriction, stop rollout and preserve the narrowed security boundary; the previous caller is compatible with revoke-only writes. Do not automatically restore broad token UPDATE/DELETE. Any corrective migration, security-reopening rollback, fixture rerun or additional publication needs its own reviewed scope and authorization. Restore the exact previous application snapshot only within the approved rollback scope.

## Local Evidence

- Twenty PGlite 0.5.8 cases pass, with actual SQL RLS/grants and no hosted connection. Fixture helper functions intentionally simplify admin/student access; no concurrency or complete canonical-replay claim.
- Both actual revoke handler entry points pass 14 new mocked regressions. Full suite: 309 files / 4,363 tests. Final TypeScript and 15 retained source contracts passed on the unchanged runtime candidate.
- Preflight SQL itself executes successfully in the disposable fixture. The final proposal also rejects disabled RLS, client ownership/BYPASSRLS assumptions and unexpected inherited/column write grants.
- Local sanitized evidence: `/private/tmp/tf-share-policy-tests/database-compatibility.log`, `full-unit.log`, `candidate-fingerprint.json`, `compatibility-manifest.json`. No credentials or real records are included.

The wider production checklist, all-role/provider acceptance and deferred Parent Pilot/Pathway Report Snapshot remain intact. This packet does not establish production readiness.
