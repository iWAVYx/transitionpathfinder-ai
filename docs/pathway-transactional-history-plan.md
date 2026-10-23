# Transactional Pathway Report History

## October 23 — Canonical Report-History Candidate (Not Applied)

- [x] Prepared additive `20261023020000_enforce_pathway_report_content_history.sql` from the validated proposal; no applied migration was edited. Permitted content updates snapshot prior content and actual actor; client version fabrication and structural grants are removed while report RLS/editing and service table administration remain.
- [x] Registered the exact internal trigger as client-execution-forbidden and the sole service-role EXECUTE exception. It has no ordinary RPC caller. All other privileged routines retain their reviewed service grants; PUBLIC/client allowlists are unchanged.
- [x] Local disposable validation: 37 database cases pass, two multi-session cases await native PostgreSQL; 41 source/permission/readiness contracts pass. Earlier prototype native evidence remains historical, not acceptance of this canonical candidate.
- [x] Exact candidate `f821aa753bd52281f4ffe897ff99e0f301e281e6` passes all automatic checks, including 4,399 units, build/SSR and accessibility. Native history passes 39 cases with zero skips; combined 205-migration replay verifies all 92 privileged routines, the exact trigger exception, trigger metadata, table/column grants and invoker RPC permissions. Protected hosted skips are unperformed. See `docs/production-readiness/evidence/report-history-canonical-validation-2026-10-23.json` and the concrete `docs/production-readiness/report-history-staging-candidate-2026-10-23.md` packet.
- [ ] Review exact candidate/checksum and staged application compatibility; settle Owner/admin planning-data access separately. Existing administrative exceptions are preserved, not approved for production by this change.
- [ ] Obtain new specific authorization before any hosted migration, deployment, publication or bounded fixture acceptance run. Previously approved fixture runs are complete.

Canonical source inventory is now 205 migrations; 11 are pending against the **saved September 17 production observation**. This does not claim a fresh production inspection. Current staging remains approved `a2c5564c` / runtime `c4e3096b…9adb13d`, 1,184 files. The local reader-control fix and this migration are not deployed. Production remains NO-GO. Stale browser intent, retention/large reports, removed-member bearer access and full role/demo/provider/export acceptance remain open. Full TF-01–TF-26 roadmap and deferred Parent Pilot/Pathway Report Snapshot are retained.


## Owner-Only Report Controls Prepared Across Role Readers — October 23, 2026

The authenticated report reader now returns a strict `is_report_owner` hint derived from the stored report owner and authenticated caller, without exposing the owner ID or accepting a client ownership claim. The saved reader hides both regeneration entry points and Restore for non-owning/unconfirmed readers while retaining readable history, printing and existing sharing. Owners retain restore and linked-student generation. The panel defaults to read-only when the capability is absent and cancels a pending version fetch if restore eligibility disappears. Existing mutation handlers still independently enforce ownership/RLS/entitlements; this hint does not grant access or settle Owner/admin report SELECT.

Validation: 103 focused component/actual-handler cases pass, including both ownership outcomes for all seven role labels, forged hints, missing/malformed capability, existing router/late-response recovery and permission loss during a version fetch. Full unit suite: 311 files /4,399 tests; TypeScript and diff checks pass. Local runtime fingerprint `5ba40cce2a4b1a0e1213a37c3ea5c40e854b8fb2c001c60c5145b335ad43b58c`, 1,184 files. All eight automatic checks pass on exact `ee3cbf5c77117b84196719a6cb9da19af9b76372`, including build/SSR, native replay, full units, accessibility, readiness, role guard and seed checks. Protected skips are not acceptance. Hosted acceptance remains required; no publication/sync is implied.

Both actual staging sites retain the approved `c4e3096b…9adb13d` runtime. The report-history proposal remains unapplied and unchanged from its 39-case native/concurrency/full-replay acceptance. Next: review and prepare an additive canonical migration for that database boundary, then obtain specific authorization before any migration, deployment/publication or bounded fixture test. Owner data-access policy and stale browser intent remain distinct gates. No hosted/database/account/access/payment/secret or AI/production action occurred in this local change. Full roadmap and deferred Parent Pilot/Pathway Snapshot are retained.


## Target-Reconciled History Boundary Passed Native Validation — October 23, 2026

Review-only proposal `95678424` passes all 39 native PostgreSQL cases, zero skips, both concurrency journeys and full canonical replay in [run39964618618](https://github.com/iWAVYx/transitionpathfinder-ai/actions/runs/39964618618); all eight automatic checks pass. The source/fixture now reflects the read-only staging catalog's broad grants and current Team history policies. It snapshots permitted content updates and proposes explicit removal of ordinary-client structural/version-write privileges while preserving report CRUD/RLS/editor and service behavior. [Exact checksums, evidence, all-role assessment and next gates](production-readiness/report-history-write-boundary-review-2026-10-23.md).

This remains an unapplied proposal outside canonical migrations. Next: review the new trigger privilege boundary, canonical migration/ledger/recovery scope, Owner administrative planning-data access and source-confirmed owner-only Restore/Regenerate controls shown to non-owning readers. Stale browser intent remains separate. No new hosted fixtures, schema/grant/ledger writes, synchronization, deployment/publication, AI call, account/access change or production action. Both approved staging runtimes and the full roadmap/deferred Parent Pilot–Pathway Snapshot remain unchanged.


## Report History Proposal Reconciled to Actual Staging Catalog — October 23, 2026

Initial review-only candidate `01c1a57d` passes all 37 native PostgreSQL cases (zero skips, both concurrency journeys), full canonical replay and all eight automatic checks. A subsequent read-only isolated staging catalog query confirms the RPC identity and current Team history policies but finds broader effective client TRIGGER/TRUNCATE and version write grants than the narrow initial fixture. No hosted mutation was attempted. The replacement proposal explicitly narrows those structural/version-write capabilities, preserves report CRUD/RLS/editor/service behavior and uses the actual Team policies plus broad grants in its disposable fixture. Local replacement: 37 pass/two native concurrency skips, 39 total. Exact-head native CI remains required. [Evidence, scoped proposal, role matrix and limits](production-readiness/report-history-write-boundary-review-2026-10-23.md).

Only catalog metadata was read; no application content, hosted fixture, schema/grant/ledger change, synchronization, deployment/publication, AI call or production access. The proposal remains outside canonical migrations, with both staging runtimes unchanged. Owner administrative report access, stale browser intent, full roadmap and deferred Parent Pilot/Pathway Snapshot remain open.


## Direct Report History Boundary Proposed — October 23, 2026

Disposable SQL now reproduces direct owner content edits without history and fabricated version insertion/actor attribution. A review-only trigger proposal snapshots every permitted SQL content UPDATE and blocks ordinary direct version mutations while preserving existing report RLS/editor capabilities and the owner-only invoker RPC. Owner administrative SELECT/UPDATE remains an explicit unresolved policy decision; the proposal does not silently remove it. Local SQL: 35 pass, two native concurrency cases skipped; three retained source contracts pass. Exact-commit native PostgreSQL/replay and fresh read-only staging catalog review are next. [Scope, all-role assessment, security/recovery gates and limitations](production-readiness/report-history-write-boundary-review-2026-10-23.md).

No canonical migration or application source changed; runtime remains approved `c4e3096b…9adb13d` /1,184 files. No hosted query/fixture, synchronization/deployment/publication, provider call, account/access change or production action occurred. Production stays NO-GO and the complete roadmap/deferred Parent Pilot–Pathway Snapshot remain preserved.


Prepared October 12, 2026; staging execution recorded October 13, 2026. The specifically authorized migration is applied to isolated staging only. Both callers are switched only in draft source; neither hosted application has been deployed with this cutover. Production is unchanged; hosted save/regenerate behavior still uses separate snapshot and content requests.

## Current Writer Inventory and Release Order — October 22, 2026

This checkpoint supersedes historical statements below that the callers are draft-only or not deployed. Reviewed source is `202dc28c058f41f5ed738f7ee9cb8d3476223a7d`; its deployed application is `eb72bd87f287eeea86c6540616b66f5ec48a1346`. Both stable staging sites serve runtime fingerprint `550c963f1472ef6723c1125011deb400a3acfab5da9d79602cf2ce0a1f673b64`, 1,183 files. No production inspection, migration or release occurred in this review.

### Application Writer Inventory

Repository searches covered literal report/version table mutations in `src`, `scripts`, `supabase/functions`, and canonical SQL migrations, plus the shared helper and its callers. This inventories the checked-in paths, not arbitrary dynamic clients, deployed database drift or external/privileged consumers.

| Path | Mutation and boundary | History coverage / remaining acceptance |
| --- | --- | --- |
| `src/lib/pathway.functions.ts`: `updateReportContent` | Authenticated caller, explicit owner check, server-derived saved-section metadata, one `writeReportContent` call. | Content replacement and previous-content snapshot share the RPC transaction. Restore in `ReportVersionsPanel` verifies the selected version belongs to the report and uses this same handler. Family/Educator hosted restore/reload/export passed in run39870631001; this is not all-role/provider acceptance. |
| `src/lib/pathway.functions.ts`: `regeneratePathwayReport` | Authenticated owner, generated-section metadata, same RPC helper after generation. | No separate content PATCH/version insert or automatic generation retry in the handler. Live generation quality, Student/linked-student cases and hosted large-request/timeouts remain open. |
| `src/lib/report-content-write.server.ts` | One caller-authenticated `save_pathway_report_content_atomic` RPC. Validates content/summary and positive integer result; translates conflict to reload language and sanitizes other errors. | Missing function, transport failure or conflict stops the operation. No admin client or split-write fallback. |
| `src/lib/pathway.functions.ts`: `createPathwayReport` | Inserts a new report after intake and generation; optional provenance work follows. | Initial creation is outside replacement history. Intake, generation and report insertion are not one database transaction; failure/retry reconciliation is not established by restore acceptance. |
| `src/lib/pathway.functions.ts`: `linkReportToStudent`, `deleteReport` | Caller-scoped student-link update or report deletion. | Neither is a content replacement or immutable history event. Linking/denial and deletion/cascade behavior need their applicable acceptance. |
| `src/lib/action-items.functions.ts` | Marks `inputs_stale_at` after a completed linked action. | Dedicated freshness column only; not a content snapshot. The action/feed/report updates are separate requests. |
| `src/lib/golden-path.functions.ts`: `seedDemoStudent` | Authenticated caller inserts a fictional report among multiple sample records. | Initial creation, not replacement history; multiple seed writes are not atomic. Do not execute during this review or use it as live-generation proof. |
| `src/lib/owner/demo-seed.functions.ts`: `seedDemoData` | Platform-admin check, privileged demo report deletion/recreation among other demo operations. | Outside caller history. Production seeding/reset availability and exact demo scoping require an explicit release disposition; no seed operation was run. |
| `src/lib/pathway-generate-shadow.functions.ts` / `pathway-report-writer.server.ts` | Default input `enabled=false`; an authenticated admin supplying true can invoke a privileged writer for recommendation/provenance columns. No product invocation was found beyond the defining module and its read-only companion references. | This is default-off, not proof of a deployment-enforced kill switch. It does not replace the `content` JSON via the history RPC. Review admin reachability and intended release availability; do not enable or call it as part of this inventory. |
| `supabase/migrations/20261012190000_atomic_pathway_report_content.sql` | Invoker function locks owned report, compares observed content, inserts previous content/version, then replaces content. | Only literal version INSERT found in checked-in canonical SQL; no direct version INSERT found in application `src`. Existing table grants/policies and external writers are not removed by this RPC. |

### What This Closes and What Remains

- [x] Inventory the checked-in application report/content/version writers and distinguish creation, metadata, deletion, admin and transactional replacement paths.
- [x] Re-run the three existing atomic-history source contract checks: caller scope, lock/snapshot/update order and both-caller no-fallback behavior pass. These are source checks, not a new hosted test.
- [x] Retain completed staging run39870631001: seven role sessions, two Family/Educator restore/history/export journeys, exact fixture cleanup and inspected saved PDF samples. No AI call was made.
- [ ] Review production effective table/RPC grants and all external/privileged writers against a fresh specifically authorized baseline. Source inventory does not close this gate.
- [ ] Resolve stale client intent: comparison protects the content observed by the server, but the UI does not submit its own observed revision. Do not describe this as universal lost-update prevention or an immutable audit trail.
- [ ] Record release decisions for admin shadow generation and demo seeding; default input values/comments alone do not establish that a server action is unavailable.
- [ ] Complete applicable Student/linked-student, provider generation, sharing/revocation, request-size/timeout and concurrent browser acceptance without repeating completed tests unnecessarily.

### Production Dependency Order

1. Freeze/review the candidate and complete the outstanding permission, provider, configuration and recovery gates. Preserve exclusions explicitly.
2. Obtain authorization for a fresh production schema/grant/migration inventory; compare required function definitions, canonical hashes and sharing dependencies. Saved September evidence is not a current baseline.
3. Review recovery point, rollback/abort conditions and exact migration plan, then obtain separate authorization for necessary production database changes. Verify the history function and effective grants before publishing its callers.
4. Complete protected-main checks and record the authentic release SHA. Merge and publication remain separately authorized; this document does not authorize either.
5. Publish the exact reviewed production snapshot only after dependency verification; verify identity, access/save/reopen/export and approved service checks during the observation window. Stop or roll back on failed invariants. Never substitute staging secrets or the old split-write behavior.

## Prepared Database Operation

`20261012190000_atomic_pathway_report_content.sql` adds a SECURITY INVOKER function. It uses the authenticated caller's `auth.uid()`, explicit report ownership and existing RLS; it accepts no claimed owner ID, uses no service-role client and returns only the saved version number. Anonymous/PUBLIC/service-role execution is revoked. This is outside the security-definer allowlist because it does not elevate privileges.

The function locks the owned report row, compares the complete content the server observed, computes the next snapshot number, inserts that exact prior content and updates the report inside one RPC transaction. A rejected comparison, snapshot failure, update failure or uniqueness failure must abort the whole transaction. Concurrent participating calls for the same report serialize on that row; the loser with an outdated expected value receives a conflict without adding a snapshot. Different reports do not share this lock. SQL object key order is ignored by JSONB equality; array ordering remains significant.

Full-content comparison also detects changed content from writers that omit the section write marker. It does not protect stale client intent predating the server read: the current UI does not send an observed revision. It does not prevent later privileged/direct writes, make history immutable, or certify generated content. Existing direct version inserts do not acquire this report lock; until all active content/history writers are inventoried and coordinated, atomic version allocation across those writers is not guaranteed.

## Caller Cutover — Draft Source Prepared

After separately authorized database acceptance, update both `updateReportContent` and `regeneratePathwayReport` together to call this function with the authenticated middleware client. Preserve their current owner checks, server-derived section metadata, generated/saved semantics, input-diff summaries and response shapes. Supply the exact content fetched by that operation as `_expected_content`, the metadata-stamped replacement as `_next_content`, and the existing summary capped at 500 characters. Restore continues through the same save handler and counts as Saved. No new roles or dashboard tools are introduced: Student/Family/Educator ownership rules and fixed share readers remain unchanged; Owner remains management only.

The expected content travels in a POST RPC body, never a URL/filter. Verify actual SDK serialization, request-size limits with large reports, timeouts and returned integer handling before cutover. Translate `40001` to a reload message. Every other database failure stops the save. Never retry generation automatically, reread-and-overwrite after conflict, or fall back to the old two-request sequence after an RPC error. Initial report creation is outside the snapshot operation. Dedicated-column engine/admin writers require an explicit scope review rather than a claim that this RPC covers them.

Do not add a runtime toggle or enable a caller before the function exists and acceptance passes. Refresh generated database types from the accepted staging schema or prepare a reviewed typed RPC boundary during cutover; do not fabricate live schema verification.

## Acceptance and Release Gates

1. Review canonical migration history, table grants/policies and every content/version writer against the exact candidate. Replay in a disposable PostgreSQL database before requesting the staging change. Local SQL text checks do not prove transaction or RLS behavior.
2. Obtain specific approval to apply this migration only to isolated staging `qgrertkqbwanerqqemph`. Confirm target isolation and exact source before any write. Production requires separate authorization.
3. Use disposable synthetic identities/reports. Owner succeeds with exactly one snapshot of prior content and one new current value; unauthenticated and different-owner identities are denied with zero changes. Verify actual effective grants and RLS, including missing report and revoked permissions.
4. Use two independent sessions with controlled lock timing: same expected content yields exactly one success/one conflict and no orphan history. Sequential fresh saves produce unique ordered numbers. Hold a row lock to inspect waiting behavior; verify unrelated reports proceed.
5. Inject a snapshot constraint failure and a report-update failure in a disposable database: neither table changes. Test malformed/null payloads, oversized summaries, legacy reports without metadata, restored content, direct intervening content updates without a marker, and version collisions from a legacy writer. These are unrun database checks.
6. Cut over both callers in one reviewed source change; verify SDK body, error mapping and no old-write fallback with mocked handler tests. Specifically authorize staging deployment and signed-in save/regenerate/restore acceptance. Use only previously approved synthetic generation limits; this plan grants no new AI calls.
7. Verify matching Cloudflare/Lovable source identity, applicable role navigation/readers, saved reload, complete history, permitted sharing/export and cleanup counts. Record exact commit/fingerprint and each result separately. Reconcile builder edits before sync.

Rolling source back after migration can reintroduce the old split-write risk; stop affected writes while diagnosing instead of claiming a safe fallback. The added function alone does not change current handlers or any stored record. The separate server-only share-grant migration remains its own authorization dependency.

## Disposable Execution Evidence — October 12, 2026

At test source commit `cfd7f9122b1e474a507c8c1fc91b58e6d7b06fdc`, all 12 cases passed in real PostgreSQL, with zero skips, in both [PR replay 38342745672](https://github.com/iWAVYx/transitionpathfinder-ai/actions/runs/38342745672) and [branch replay 38342742641](https://github.com/iWAVYx/transitionpathfinder-ai/actions/runs/38342742641). Both full canonical migration replays and their security checks passed. An earlier CI attempt exposed a CommonJS driver import problem; the corrected adapter was then exercised successfully.

The behavioral suite creates a uniquely named disposable database on literal loopback only, reads the actual report foundation/update-policy/version/new-function migrations, and stubs the referenced identity/admin helpers. It verifies exact prior snapshots, sequential saves/restore, explicit owner denial even with broadened SELECT visibility, effective function grants, missing identity/report, malformed payloads, summary limits, full-content conflict without metadata, JSONB equality, snapshot constraint/uniqueness failure, raised/skipped update failure, restrictive update RLS and revoked UPDATE privileges. Failed cases leave both report content and history unchanged. Three independent sessions verify that a stale second save waits on the same report and fails with `40001` after the winner commits, while another report saves successfully. Connections are closed and the disposable database is dropped.

Local PGlite executed 11 cases successfully and explicitly skipped the multi-session case. The separate 12 source/security checks also passed. This is disposable-database evidence, not hosted schema/RLS, PostgREST request size, actual handler integration, real account or AI acceptance. The helper stubs do not establish current hosted collaborator/admin policy correctness. No application package or lockfile was changed; pinned test runtimes are installed outside the project.

Next remains an explicitly authorized isolated-staging migration, live database acceptance and then both-caller cutover with mocked SDK/error handling plus separately authorized staging release checks. Current handlers still use separate snapshot/content calls. The full-content comparison protects the server-observed revision only; stale client intent and direct/privileged writers remain documented limits.

Local command (install the same pinned PGlite `0.5.8` outside the project first):

```sh
PATHWAY_HISTORY_PGLITE_MODULE=/absolute/path/pglite/dist/index.js node --test tests/database/atomic-pathway-history.test.mjs
```

Real multi-session execution is wired into `.github/workflows/migration-replay.yml` using its disposable service, `pg@8.16.3` installed under `RUNNER_TEMP`, and a throwaway database. Do not repoint that runner to a hosted database.

## Authorized Hosted Staging Evidence — October 13, 2026

The user approved this specific history migration and synthetic acceptance on isolated staging `qgrertkqbwanerqqemph`. The signed-in Supabase dashboard identified that exact project as `staging/E2E`, Healthy. Its normal branch label says main/PRODUCTION; project identity, rather than that branch label, establishes the approved isolated target. No production project was visited or changed.

Preflight verified existing report/version tables with RLS enabled, the unique report/version constraint, actual hosted owner/team policies, synthetic QA Parent/Educator identities and absence of both the new function and ledger version. Only `20261012190000_atomic_pathway_report_content.sql` was applied; no bulk migration runner or other pending migration was used. Reviewed file SHA256: `20fd2d2c2c7efc8bd9d3695fef4f7cf86c3a92cd10f76aaf026b5be54400aea0`.

Function creation/grants and the migration-ledger insertion committed together. Ledger statements retain the reviewed SQL without transaction wrappers; they are stored as one statement-array entry. Verification confirmed exact `pg_proc.prosrc` equality to the reviewed function body, SECURITY INVOKER, `search_path=pg_catalog`, authenticated execution and no PUBLIC/anonymous/service-role execution. Ledger version/name/source equality also passed. An automatic approval review rejected the initial proposed execution over the embedded ledger transaction wrapper; nothing ran then. Removing transaction wrappers from the ledger's stored source produced a single BEGIN/COMMIT submitted script that passed review. No function/grant changes were made to bypass that review.

Nine hosted SQL assertions passed: Family and Educator owner saves and exact snapshots; each identity restoring exact prior saved content; four ordered versions; stale-content conflict with no extra snapshot; conflict after a direct edit without metadata; different-owner denial; missing-identity denial. The first fixture attempt found an ambiguous PL/pgSQL variable in the test script; the labeled/qualified fixture corrected it without changing the installed function. Final execution asserted all nine result rows before rollback. The archived [rollback-only SQL](production-readiness/atomic-history-staging-acceptance-2026-10-13.sql) records the executed fixture. Existing accounts/roles were unchanged. No persistent RLS policy, constraint or failure trigger was altered for hosted checks.

Cleanup independently queried the run-scoped IDs after ROLLBACK: zero reports, zero report versions and zero intakes. No test record was committed. The evidence screenshot is `/private/tmp/tf-atomic-staging-acceptance.png`. No AI/provider request or charge occurred.

Scope limits: SQL sessions set authenticated role and synthetic JWT claim settings; this is actual hosted SQL/RLS execution, not an authenticated browser login or PostgREST/RPC request. Simultaneous-session and injected rollback cases remain established in disposable PostgreSQL, not re-run by imposing failures on hosted tables. Linked-student collaborator policies, Student owner behavior, actual RPC size/timeout serialization, application save/regenerate/restore and committed reload still require their planned checks. Current handlers have not changed; the installed function is available but unused by the product. Next is both-caller source cutover and mocked SDK/error verification, followed by separately authorized staging deployment/application acceptance. Production application remains separately authorized.

## Draft Caller Cutover Verification — October 13, 2026

Both `updateReportContent` and `regeneratePathwayReport` now call the shared `report-content-write.server.ts` boundary in draft source. The version-number read, separate snapshot insert and conditional report PATCH have been removed from these handlers. Ownership checks and server-derived section status still run as before; restores use the same save path and count as Saved. The RPC receives the exact full server-observed content and normalized replacement, with the existing manual/input-diff summary. A narrow typed RPC boundary reflects the verified staging signature without rewriting platform-generated database types or using an admin client.

Exactly one RPC is issued per attempted save. Success requires a positive PostgreSQL-range integer version returned by the database. `40001` gives the existing plain-language reload message; other returned/thrown errors produce a generic save failure without revealing database details. There is no split-write fallback, automatic generation retry or reread-and-overwrite on conflict. Invalid content, JSON serialization failures and summaries exceeding 500 characters stop before a request.

All 200 unit files / 1,916 tests and TypeScript pass; all 12 scoped source/security checks pass. Thirty-one actual-handler cases and seven boundary cases cover metadata/restore semantics, supplied/retained generation fields, early ownership denial, summaries, one-RPC success/conflicts/errors, invalid return versions and malformed inputs. Two actual Supabase SDK fixtures send a large observed report (216,000-character summary) as POST JSON with caller authorization and no content URL filter. Three additional SDK fixtures verify conflict, missing function and transport failure stop after the read plus one POST. Fetch is entirely mocked at `report-wire.fixture.test`; no network, account, provider, AI or database mutation occurred during these checks. This proves SDK serialization and handler behavior, not hosted request-size limits or actual signed-in application acceptance.

No presentation component or demo sample changed. The shared save path applies to authorized report owners under existing role permissions; this is not a grant of planning tools to Partner/School/District/Owner. Existing demo samples remain fictional, and fixed shared readers remain read-only. Student/linked-student collaborator and role-specific signed-in acceptance are still open.

The function exists on isolated staging; the hosted applications still serve older callers until a separately authorized deployment. Production release must be blocked until this exact function is applied and verified there under separate migration authorization, then the reviewed shared source is released. Do not hide a missing function with a fallback or an environment-specific implementation. The other prepared share-grant migration is a separate dependency. Full draft review, exact source parity, live RPC/save/regenerate/restore/reload acceptance, request limits/timeouts, direct writer inventory and stale client intent remain open.

## Ledger Hash Review Finding — October 13, 2026

Review of `compare-production-migration-history.mjs` and baseline SQL confirms the previously stored wrapper-free ledger representation is not identical to the canonical full-file hash (BEGIN/COMMIT are included by that comparator). Earlier `migration_recorded` equality verified the intended stored representation, not canonical-file hash alignment. Exact function body/grants and hosted SQL behavior remain separately verified. Canonical ledger reconciliation is an open release gate; do not weaken the production comparator or silently alter applied migration source. No additional database change occurred during this review.

## Ledger Hash Reconciliation Completed — October 13, 2026

Corrected only the authorized staging history ledger entry using an atomic, guarded DO statement. Full canonical SQL is stored as text data and never re-executed. Both canonical statement and executable-code hashes now match; the installed function-definition hash is unchanged (`608213f8eb968032b2c78016069ef196`), invoker configuration and effective grants still pass. Exact hash values, tested correction source and hosted evidence are recorded in [the candidate review](pr211-release-review.md#ledger-reconciliation-execution--october-13-2026). No function/grant/RLS DDL or other migration was executed. Do not infer full staging history alignment or production approval from this one-row bookkeeping correction.

All 16 disposable real PostgreSQL cases pass with zero skips in runs 38348726102 and 38348720997 at e1dfca66; local PGlite passes 15 and skips concurrency. Four added cases cover correction/idempotence, unexpected source, forced rollback and changed grants. All 68 credential-free static checks pass. Production, actual signed-in application acceptance and deployments remain unchanged/open as previously recorded.
