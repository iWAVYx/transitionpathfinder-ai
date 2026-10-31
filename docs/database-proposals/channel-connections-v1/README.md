# Connection Protocol v1 — Review Package

Prepared October 15, 2026. **Draft, not approved or applied.** This package changes no running product, database, role, membership or partner listing. It lives under `docs/database-proposals`, outside the migration directory and runtime archive.

The three mutation proposals begin with an unconditional exception and end in `ROLLBACK`. The inventory is a read-only transaction. Do not run selected blocks to bypass these barriers. Derive separately reviewed, versioned migrations only after authorization and the checks below.

## Package

| File | Scope |
| --- | --- |
| [00-preflight.sql](00-preflight.sql) | Read-only catalog/grant/trigger and aggregate legacy-cohort inventory. Not executed. Results depend on the executor's visibility; verify role, RLS bypass and selected staging project before treating counts as complete. |
| [10-schema.proposal.sql](10-schema.proposal.sql) | Private reviewed directory links, receiving consent, audit/operation records, explicit request revisions and idempotency attribution. Additive-phase RLS seals and unique channel binding. |
| [20-protocol.proposal.sql](20-protocol.proposal.sql) | Nine versioned public RPC contracts, private helpers and two narrow triggers. No notifications, providers or external I/O. |
| [30-cutover.proposal.sql](30-cutover.proposal.sql) | Draft direct-request-write restriction after callers are migrated; both readiness and creation remain disabled. Not an activation script. |
| [acceptance-matrix.md](acceptance-matrix.md) | Required catalog, permission, rollback, concurrency and browser evidence. All execution cases remain open. |
| [check_syntax.py](check_syntax.py) | Local SQL/PLpgSQL parser and execution-barrier checker. No database client or connection. |
| [syntax-report.json](syntax-report.json) | Generated parser results and hashes for the exact SQL files. Syntax evidence only. |

## Recommended v1 Decisions for Review

- Directory IDs and workspace IDs stay distinct. One current receiving workspace is reviewed per directory listing; multiple reviewed listings may share a workspace. No automatic matching or verification upgrades.
- Only published `verified`/`featured` directory entries linked to a verified partner/agency workspace with explicit current consent become delivery targets. Website/directory browsing remains available under its existing rules.
- A sender needs a recorded eligible role in `user_roles` and active membership in an explicitly selected verified organization. Educator roles use school/district contexts, School Administrators school contexts, District Administrators district contexts and Partners partner/agency contexts. Profile role labels are display input, never authority. Personal educator sending is deliberately not included in this first prototype.
- Receiving consent and response require the current receiving workspace's actual `owner`/`admin` membership plus the recorded Partner role. These stricter requirements must be reconciled against real staged role records; never backfill authority from profile labels automatically.
- Platform Owners/Administrators have mapping/oversight, not routine sending, response or personal channel-opening capability, even if they also hold another role. Family/Student roles alone gain no sending or response capability. Historic sender lookup and own-request withdrawal remain possible after loss of sending eligibility.
- Request purposes are the five explicit categories in the prototype. The ten-new-requests-per-actor rolling 24-hour limit is a proposed business default, not an approved product limit or complete abuse-control design.
- Link and consent changes use explicit versions and read-back recovery. Re-saving unchanged consent is a no-op. An actual consent toggle or mapping revision invalidates old pending acceptance intent; it never retargets requests. The Owner can suspend an existing link even after its workspace loses verification/type eligibility.
- Requests use an explicit integer revision for state comparison. Existing transaction-start timestamps are not concurrency authority. A protocol-only update stamp preserves useful recorded times after the known legacy timestamp trigger; all actual trigger ordering still needs catalog verification.
- Creation never creates a channel or shares a student/IEP/document. Acceptance atomically creates a fresh two-person channel, memberships, original request link and audit entries. It does not copy the introduction into the channel purpose or send a first message. No membership upsert or restoration occurs on retry.
- `setup_state` records whether setup completed; `can_open_channel` reflects current membership and Owner separation. Losing access does not relabel completed setup as broken or cause automatic re-enrollment. Archived channels have a separate state so clients can choose the proper route/filter.
- Pending-context duplication uses actual sender, receiving workspace, source context and purpose, including across different listings of the same workspace. Expired v1 slots are resolved under the lock; no volatile `now()` predicate is used in the unique index.

## Security and Compatibility Boundaries

Public mutating RPCs derive the caller from `auth.uid()`. Their privileged functions have empty search paths, explicit role/membership checks and narrow parameter lists. Private helpers/tables have no normal authenticated/API access. Verify actual function ownership, inherited ACLs, table ownership, RLS bypass and trigger execution behavior in the target PostgreSQL version; syntax parsing does not establish these properties.

The additive schema seals new request attribution against old direct writers and narrows v1 read scope. A new channel binding is sealed on insert and guarded against ordinary direct updates; routine title/archive updates do not change the binding. All existing v0 request mutations remain a known broad-policy gate until cutover. The cutover restricts table and known column write grants, removes the two known permissive request mutation policies and preserves SELECT/student-history/removal rules. Catalog drift, extra grants and every remaining writer need review first.

A single protocol advisory lock deliberately favors correctness and a small initial workload over throughput. Existing role/membership rows and receiving metadata are locked while checked. Foreign-key, account deletion, grant insertion, other application lock ordering and statement/caller timeouts still require two-session tests and review. Do not describe this source prototype as proven serializable with every other workflow.

Private audit/key/link foreign keys use `RESTRICT`. They may affect account deletion, directory deletion and retention workflows. Their lifecycle/erasure design is an explicit blocker before any schema application. No automated purge or retention policy is proposed here.

Legacy pending requests can only be declined or withdrawn through the narrow prototype cleanup paths; legacy acceptance needs reviewed reconciliation. Legacy accepted requests return `legacy_review` through the new outcome contract. Existing caller-visible Channels navigation is not removed. Do not infer a legacy channel from a title, timestamp or matching names, add missing members, rewrite old attribution or delete orphan candidates automatically.

## Rollout Order

1. Obtain source review, settle the proposed role/context, quota and retention choices, and identify the exact candidate commit plus SQL hashes. Current runtime wrappers and composer/management UIs are **not migrated**.
2. In a separately authorized read-only staging inspection, verify project `qgrertkqbwanerqqemph`, executor visibility, actual PostgreSQL version, schema, role aliases, grants, triggers, existing RPC writers and legacy cohorts. No production inspection is included.
3. Build and test the proposed schema/protocol in a separately authorized disposable database with synthetic accounts and fixtures. All failures must roll back; account/fixture creation and database application need their own scope. The SQL here remains blocked.
4. Derive reviewed migrations and compatibility/rollback artifacts. Do not merely remove the guards from these files or copy them into `supabase/migrations`.
5. Build v1 wrappers, Owner mapping/read-back, receiving consent/read-back, eligible-role target selection/composer and saved-state navigation. Require capability/version errors to fail clearly; no fallback to broad table writes. Keep new sending unavailable.
6. After explicit staging application/deployment authorization, stage the agreed schema/protocol with both control flags false. Verify additive seals before creating any v1 data. Do not leave an unsealed partial rollout.
7. Migrate all callers, confirm permissions and legacy handling, then authorize the restrictive cutover. Only after actual DB tests and exact-build browser evidence may `protocol_ready` be deliberately enabled while creation remains paused.
8. Verify mapping and receiving consent under the approved roles, then separately approve a bounded synthetic create/accept/withdraw/read-back exercise before enabling broader creation. No outreach, charges, provider calls or real partner requests are covered by this plan.
9. Mirror the approved eligible-role workflow and honest states in the fictional demo. Include exact source/schema parity and every relevant role in grouped release review. Production remains a separate release authorization.

## Rollback and Pause

- A creation-only pause sets creation unavailable while retaining compatible read-back and already-authorized response/withdrawal paths. If the entire protocol is unsafe, the broader readiness gate may also pause it, with an explicit recovery plan for pending requests.
- After restrictive cutover, do not restore permissive direct-write grants just to make an older client work. Show an unavailable state and roll forward to a compatible fixed client/protocol.
- Never drop request attribution, operation keys, evidence or audit tables while v1 data exists. Preserve exact request/channel/member outcomes for reviewed reconciliation. Do not reverse channel membership or history decisions as rollback.
- An additive rollback before any v1 data still requires an inventory and reviewed inverse migration. There is no executable destructive rollback in this package.

## Current Evidence

The generated syntax report parses the exact SQL, PLpgSQL bodies, SQL helper body and three execution guards using pglast 8.6 (PostgreSQL parser 18.6). No database connection, SQL execution or migration occurred. The target database version is unverified; parsing is not catalog resolution, RLS/ownership testing, transaction/concurrency proof or signed-in browser acceptance.

Pure response/intent validators and an unassembled server adapter now prepare caller integration. Only mocked tests import the adapter; no production dependency implementation, Supabase bridge, endpoint, UI or activation path is wired. Application evidence is 284 files / 4,087 unit tests plus 37 Node contracts and TypeScript. Candidate runtime fingerprint is `8e217f3877f7fe7192e73e36533d9be9254a532ae21cd141bf66dd12ef1fc88b`, 1,171 files. These checks do not validate SQL or prove hosted parity. No live or demo feature is enabled here.

The outcome helper explicitly excludes platform Owner/admin and legacy admin personal channel opening even when historical membership remains active. This closes a source-proposal omission found during caller preparation; the role-transition acceptance case remains unexecuted. All SQL execution guards remain intact. Decision confirmation validates original terms, exact revision transitions and preserved terminal setup/channel identity; fresh authenticated authorization and atomic operation-key enforcement are still database/caller obligations. Pure creation/key-lookup contracts are prepared; all live callers remain unimplemented.


Creation confirmation uses the proposed outcome's nullable `client_request_key` plus actual requester, source/receiving workspace, directory/consent versions and saved text. The key is an opaque actor-scoped retry identifier, not an authorization credential; lookup still derives its actor from authentication. Legacy attribution stays null. The coordinated draft response contract now requires this field, so old v1 prototype payloads are intentionally incompatible until updated together; no installed API/client uses these helpers.

Text normalization trims only ASCII space, tab, LF, VT, FF and CR at each edge in both the proposed SQL helper and the unused creation helper. Internal whitespace and non-ASCII text are preserved. Limits use Unicode code points rather than UTF-16 code units. Confirm this proposed normalization/round-trip behavior in the target PostgreSQL encoding/version before activation. Client validators do not replace SQL checks, fresh role/membership consent checks, viewer/workspace scopes, atomic operation keys or authorized database acceptance. Lookup not-found never generates a new key or automatically retries creation.


## Server Assembly Review Gates

The dormant adapter requires authentication and server readiness dependencies with no defaults. It snapshots intent before awaits, verifies negative viewer intent, accepts only explicit true readiness, calls only the five allowlisted request/target RPCs and validates results. The 28 new adapter tests use fake ports exclusively; they do not verify JWTs, middleware, bearer-client identity, schema installation, role permissions, gates or transaction behavior in a database. No actual dependency implementation or live endpoint is supplied.

Before assembly: bind the verified subject and transport to the same fresh `requireSupabaseAuth` caller-RLS context; never use service credentials or profile role labels. Review server-owned environment/schema/compatibility/readiness evidence for each operation. Preserve own-key recovery when new creation is paused or sending eligibility is lost, consistent with the proposed lookup function. Database role/membership/link/consent checks remain authoritative. Do not accept protocol/version/readiness flags from request input, retry uncertain writes automatically, or fall back to broad table APIs when an RPC is missing. UI callers must keep original keys and current viewer/workspace scope, and actual role/concurrency/browser evidence must precede enablement.
