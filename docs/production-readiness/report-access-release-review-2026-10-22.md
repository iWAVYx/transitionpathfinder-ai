# Report Access Release Review — October 22, 2026

Reviewed source: `202dc28c058f41f5ed738f7ee9cb8d3476223a7d`, application `eb72bd87f287eeea86c6540616b66f5ec48a1346`. This is a checked-in policy/caller review, not an inspection of production or a current hosted grant inventory. No database, account, sharing link, provider or application record was changed.

## Additive Canonical Candidate Prepared — October 23, 2026

The [staging packet](share-token-staging-acceptance-packet.md#canonical-candidate-finalized--october-23-2026) now pins `20261023010000_restrict_report_share_token_writes.sql`, requiring the separately reviewed server-only RPC grants before token restriction. Twenty-three local SQL cases pass, including exact proposal equality and the missing-prerequisite abort; disposable native PostgreSQL CI is wired but pending. No migration was applied. The mixed broad Node entry point is explicitly not accepted because protected-suite credentials/loader prerequisites are absent; 19 scoped source contracts pass. Full runtime unit/TypeScript evidence is unchanged. Production's saved-baseline pending count is now ten, not a fresh production inventory.

## Actual Staging Catalog Confirmed — October 23, 2026

Read-only inspection of the signed-in isolated target confirms authenticated UPDATE on every token column, creator-only UPDATE policy, and authenticated token DELETE. Both raw resolver/tracking RPCs also remain executable by anonymous/authenticated roles; `20261006180000` is absent from the selected ledger. This is an additional confirmed staging prerequisite gap, not merely a source finding. No real report/link or mutation was used. [Evidence and revised two-step plan](share-token-staging-acceptance-packet.md#read-only-isolated-staging-preflight-completed--october-23-2026). Do not infer production state or canonical hash alignment from this metadata query. Raw grants and write restrictions need separately reviewed/authorized migrations; the production blocker remains open.

## Compatibility Packet Prepared — October 22, 2026

[The staging packet](share-token-staging-acceptance-packet.md) records the caller matrix, exact proposal/preflight hashes, uncommitted source identity, ordered catalog/migration/release gates, bounded fixture/cleanup plan and fail-closed rollback criteria. No token edit/delete/reactivation product caller was found. The SQL proposal now adds a restrictive policy so other permissive policies cannot bypass creator-only one-way revocation, and checks RLS/client-role assumptions. Twenty in-memory SQL cases pass, including preflight execution, extra permissive policies, preserved service tracking/maintenance and disabled-RLS abort. The preceding 16-case result is historical; runtime remains unchanged since its full 4,363-unit/TypeScript validation. No canonical migration or hosted approval/execution is implied.

## Local Reproduction and Candidate — October 22, 2026

- [x] Reproduce the canonical policy issue in credential-free PGlite 0.5.8: an authenticated issuer changes its existing token to a foreign fictional report, and the service-only resolver returns that foreign report. Actual table grants, RLS and canonical resolver SQL execute inside the in-memory database. Student-access and admin helpers are fixture stubs returning false; this does not certify the full hosted schema or all roles.
- [x] Prepare [the review-only SQL restriction](proposals/share-token-write-restriction.sql), outside the canonical migration tree. It revokes client table/column UPDATE and DELETE privileges, permits only authenticated `revoked` updates, requires creator ownership and a true resulting revoked flag, and aborts on unexpected effective inherited/column grants. Service administration and legitimate INSERT policy are preserved. DELETE restriction prevents ordinary issuers deleting and recreating the same link to bypass revocation. Review this availability change explicitly before migration approval.
- [x] Sixteen in-memory database cases pass: baseline reproduction; exact/repeated revoke and fresh resolver denial; nine protected-column denials with unchanged rows; non-issuer/missing IDs; reactivation/deletion denial; allowed creation/foreign creation denial; expiry/anonymous RPC/update denial; inherited-grant abort. No network database URL is accepted, no concurrency case is claimed and no hosted table was touched.
- [x] Implement a shared local `revokeOwnedShareToken` helper for both Students and Trust callers. It filters the exact ID and authenticated creator, requests only `id, revoked`, and requires matching returned ID plus `revoked=true`. Empty/filtered/mismatched responses, database errors and transport failures return friendly generic failure; no privileged fallback or permission expansion.
- [x] Fourteen new actual-handler mocked cases pass across both callers, including repeated revoke, no-row denial, mismatched/false confirmation, sanitized errors and input validation. Initial malformed-ID assertions exposed a synchronous mock-validation mismatch; the mock now matches the asynchronous transport and all cases pass without changing validation.
- [x] Full unit suite: 309 files / 4,363 tests and final TypeScript pass. Fifteen retained source contracts covering share RPC grants, atomic history, authorization defense and hosting boundaries pass. The focused caller/projection/student-list run passes 59 tests. These mocked/source results supplement the 16 database cases; they do not establish hosted grants or browser acceptance.

Run the database fixture with the pinned PGlite runtime installed outside the repository:

```sh
SHARE_POLICY_PGLITE_MODULE=/absolute/path/pglite/dist/index.js node --test tests/database/share-token-write-restriction.test.mjs
```

The application candidate and SQL proposal are local only. The database blocker remains open until a reviewed canonical migration, target-specific preflight/approval, application/grant verification and acceptance are completed. Do not apply this proposal as an ad hoc hosted patch. Actual staging remains eb72bd87; production is unchanged. Other findings below remain open.

## Release Findings

### P1 — Share-token UPDATE permits more than revocation in canonical source

The initial migration `20260527160738_4b10cdd0-0c92-40e1-b652-b016a9a0cafd.sql` grants authenticated SELECT/INSERT/UPDATE/DELETE on `share_tokens`. Its UPDATE policy checks only `auth.uid() = created_by`; there is no column restriction or report-access predicate on the updated row. The July migration `20260715152133_8ed7834a-7f65-4ccc-987e-ad11d1ded410.sql` hardens INSERT only. No later share-token UPDATE policy/column-grant replacement was found in canonical migrations.

Consequently, under that canonical policy an issuer can update their own token's report reference, audience, expiry or revoked state, rather than only revoke it. The privileged resolver joins the token's current report reference and checks token expiry/revocation without rechecking issuer access. A retarget to a known foreign report ID could expose its projected document. This is a source-level authorization finding; do not claim exploitation or the same effective grants on any hosted environment without verification. The server-only resolver migration does not repair token-table writes.

Proposed direction for review: retain server-validated creation, but restrict authenticated UPDATE to `revoked` only if no legitimate client requires other token edits; keep service-only administration separate. A reviewed change must also account for existing column grants, inherited roles and intended reactivation semantics. Candidate grant shape, not executable migration authorization:

```sql
REVOKE UPDATE ON TABLE public.share_tokens FROM authenticated;
GRANT UPDATE (revoked) ON public.share_tokens TO authenticated;
```

This sketch alone is not a complete migration: fresh catalog inspection must establish PUBLIC/inherited/column privileges; effective-grant assertions and disposable behavioral tests must prove other columns cannot be updated. A one-way revoke operation would additionally need an explicitly reviewed rule preventing reactivation. Do not apply this snippet to a hosted database.

Required acceptance: issuer revocation succeeds; retarget to a foreign report, audience/token/expiry/creator edits and non-issuer changes fail with unchanged data; authorized creation and public projected reads still work. Test direct authenticated API writes as well as the UI. Verify effective grants and canonical ledger hashes after any separately authorized migration. This is a production release blocker until repaired or the affected surface is safely disabled under accepted scope.

### P1 — Report content/history is not an exclusive transactional write boundary

`20260605050011_dea7210b-36a2-424b-b150-4e85e892dec9.sql` permits report UPDATE for owners, linked editors and admin, while the original table grant permits authenticated UPDATE. Version policies permit eligible report owners to INSERT versions directly. The atomic RPC is SECURITY INVOKER and depends on caller privileges; routing normal handlers through it does not prevent direct table writes or guarantee that all edits create history. The RPC and save/regenerate handlers also deliberately require report ownership, a narrower boundary than direct editor/admin UPDATE.

Required disposition: decide whether direct edits are supported and document the exact integrity guarantee, or design a reviewed database write boundary that preserves intended owner/editor behavior while enforcing transactional history. A simple UPDATE revoke would break the invoker RPC and is not a safe standalone fix. Actual effective permissions and browser/API denial tests remain required. Stale client intent is a separate known limitation: comparison uses the server-observed content, not a client-observed revision.

### P1 scope decision — Management-only Owner UI does not mean data denial

Canonical report/intake SELECT policies include `has_role(..., 'admin')`; student read/edit helpers also include admin. This matches the recent synthetic test observing the Owner/admin SELECT exception. Do not equate the Owner-only navigation shell with a backend prohibition on planning data. Decide and record necessary administrative access, purpose, safeguards and test expectations before changing policies. No automatic removal or widening of Owner access is proposed here.

### Sharing lifecycle and confirmation limits

- Public links are bearer access independent of current collaborator membership. Resolver SQL checks token revocation/expiry, not continuing issuer membership. Removing a collaborator does not itself revoke a previously created public link in this reviewed path. Required release decision: explicit independent-link semantics or coordinated revocation, with actual removed-user tests.
- Share-token SELECT/UPDATE/DELETE policies are creator-scoped. `getStudentAccessOverview` reads with caller RLS; a complete query result is not necessarily every link another collaborator created. Do not label this a universal access inventory without policy/UX reconciliation.
- Both revoke handlers (`students.functions.ts` and `trust.functions.ts`) return success when an UPDATE has no error, without selecting/counting the affected row. A nonexistent or inaccessible token can therefore receive an unconfirmed success response. Confirm exact mutation outcomes before representing revocation as verified; this does not itself grant access.
- A revoked link can prevent future resolution; already downloaded/printed documents and content already delivered cannot be recalled. Test refreshed/new requests separately from previously delivered content.

## Source Permission Matrix

| Actor / surface | Canonical source behavior | Remaining evidence |
| --- | --- | --- |
| Report owner | Read own report; save/regenerate/restore handler requires owner; version reads/inserts additionally require student access when linked. | Student-owned and linked ownership changes, stale intent, actual grants and request limits. |
| Accepted student collaborator / approved relationship | Student helper permits reads; edit helper requires editor or allowed relationship permission. Report SELECT can follow student access. | Viewer/editor/relationship separation and loss-of-access transitions on exact candidate. |
| Linked Student identity | `can_access_student` / `can_edit_student` recognize `student_user_id`. | Does not imply ownership of someone else's report, history or generation rights; test each operation. |
| School / District / Partner | Role label alone is not report ownership or linked-student permission. | Actual organization/student scope, unrelated-account denials and allowed exports. |
| Owner/admin | Canonical admin SELECT and report UPDATE exceptions; normal save RPC still explicit owner only. | Management/data-access decision and direct API tests. |
| Public link viewer | Valid token with family/educator audience; server projects allowed document fields. | Direct RPC denial, token mutation, expiry/revocation, removed issuer and retained-content semantics. |

## Validation Completed

Five existing Node source-contract checks pass across server-only share RPC and atomic-history contracts. Five existing mocked unit files pass 61 tests: share resolver contract, share resolver, audience projection, report-content write and access-overview reader. They cover projection, invalid audiences/content, generic resolver failures, RPC error behavior and counted read completeness. They do not execute PostgreSQL RLS, prove effective table grants or reproduce the retarget finding against a real database. No new fixture run, provider call or production access occurred.

## Next Work and Authorization Boundary

- [x] Complete this source permission inventory and distinguish known staging results from untested database behavior.
- [ ] Prepare/review a disposable-database regression and narrow share-token write hardening proposal, preserving legitimate creation/revocation. Do not edit applied migrations.
- [ ] Resolve report direct-write/history, Owner access and sharing lifecycle decisions as a bounded release scope.
- [ ] Fix and test exact revoke outcome confirmation in both callers with friendly failure language, without changing role access.
- [ ] Obtain separate authorization before any hosted migration, new fixture run, deployment/publication or production action. Fresh production inventory and recovery preparation follow source/scope review.

The full product roadmap and deferred Parent Pilot/Pathway Report Snapshot remain preserved. Both staging applications remain unchanged at eb72bd87.
