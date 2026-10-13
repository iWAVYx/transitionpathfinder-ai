# Transactional Pathway Report History

Prepared October 12, 2026. No migration has been applied and no caller has been switched. Existing save/regenerate behavior still uses separate snapshot and content requests.

## Prepared Database Operation

`20261012190000_atomic_pathway_report_content.sql` adds a SECURITY INVOKER function. It uses the authenticated caller's `auth.uid()`, explicit report ownership and existing RLS; it accepts no claimed owner ID, uses no service-role client and returns only the saved version number. Anonymous/PUBLIC/service-role execution is revoked. This is outside the security-definer allowlist because it does not elevate privileges.

The function locks the owned report row, compares the complete content the server observed, computes the next snapshot number, inserts that exact prior content and updates the report inside one RPC transaction. A rejected comparison, snapshot failure, update failure or uniqueness failure must abort the whole transaction. Concurrent participating calls for the same report serialize on that row; the loser with an outdated expected value receives a conflict without adding a snapshot. Different reports do not share this lock. SQL object key order is ignored by JSONB equality; array ordering remains significant.

Full-content comparison also detects changed content from writers that omit the section write marker. It does not protect stale client intent predating the server read: the current UI does not send an observed revision. It does not prevent later privileged/direct writes, make history immutable, or certify generated content. Existing direct version inserts do not acquire this report lock; until all active content/history writers are inventoried and coordinated, atomic version allocation across those writers is not guaranteed.

## Caller Cutover — Still Open

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
