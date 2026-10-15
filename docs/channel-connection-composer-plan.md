# Connection Request Composer Plan

Status: source review proposal, October 15, 2026. Not implemented or approved for database execution. No requests, messages, partner verification or enrollment are performed by this plan.

## The Source Mismatch

The Partner Network reads directory entries from `partner_organizations`. Connection requests target `organizations.id`, despite the field name `target_partner_organization_id`. Partner workspace membership and self-management also use `organizations` and `organization_memberships`.

The current directory table has no verified workspace-organization foreign key. Names, websites, email domains and coincident UUID values are not evidence that these records represent the same receiving workspace. The older `partner_outreach_log` helpers have no active UI consumer. `/owner/partner-outreach` redirects to `/owner/outreach`, whose current contact pipeline uses `pilot_outreach_contacts` and different handlers in `validation.functions.ts`.

Source evidence:

- `src/integrations/supabase/types.ts`: directory and workspace identities, membership and connection-request foreign keys.
- `src/lib/partner-network.functions.ts`: directory reads and owner directory management.
- `src/lib/partner-workspace.functions.ts`: membership-scoped partner workspace selection.
- `supabase/migrations/20260721000023_94010d16-d613-440f-ba22-7d51a02e7dab.sql`: request target foreign key, default 30-day expiry and broad existing request policies.
- `src/routes/_authenticated/owner.partner-outreach.tsx` and `owner.outreach.tsx`: active Owner contact workflow.

This is a source audit, not a query of current staging or production records. A database may contain manually related records; no such relation has been authenticated here.

## Recommended Workflow

1. The Owner links a directory entry to a specific partner or agency workspace using explicit recorded evidence. No automatic matching, account creation, verification upgrade or membership creation occurs.
2. A current receiving organization administrator confirms that workspace accepts connection requests. A directory listing or a paid subscription alone does not provide that consent.
3. The existing directory/profile shows a request action only when that explicit link is current, the receiving workspace is enabled and the caller has an applicable role. Unlinked or unavailable entries retain their existing website/directory actions.
4. The composer names the directory partner and actual receiving workspace, the sender's selected organization where applicable, purpose, message and proposed next step. It does not attach student profiles, IEPs or other documents.
5. Submission creates one pending request, not a channel, membership, notification guarantee, referral or service booking. The sender sees recorded expiry and an exact destination for reviewing the request.
6. Only an accepted request with confirmed active participants offers Open Channel. Existing incomplete accepted requests need explicit reconciliation; submitting again is not recovery.

## Role Assessment

| Role | First Composer Scope |
| --- | --- |
| Educator / Case Manager | Existing Connections eligibility; the v1 prototype requires a verified active school/district context. Personal sending remains a separate design. |
| School Administrator | Existing Connections eligibility and current selected school membership. |
| District Administrator | Existing Connections eligibility and current selected district membership. |
| Partner | Existing Connections eligibility and current partner workspace membership. |
| Family / Guardian and Student | Preserve current Connections exclusion. No new sending capability until a separate role/consent/access design is approved. Directory browsing remains available under its existing policy. |
| Platform Owner / Administrator | Management, mapping and oversight in Owner Hub. No new personal dashboard or routine messaging capability. |

Aliases and multiple-role precedence must match the central role policy and settled Owner gate. Client role labels never authorize a write. The table above proposes the initial behavior; it does not grant any role or prove current database permission enforcement.

## Explicit Link and Receiving Consent

Prepare a separately reviewed database design with directory ID, receiving workspace ID, link version, active/suspended state, recorded reviewer/time and private evidence reference. Record receiver opt-in and its actual current administrator separately. Do not publish reviewer notes or personal contact details in public directory responses.

Recommended first version: one active receiving workspace per directory entry. Multiple directory entries may represent explicitly reviewed locations of the same workspace. Duplicate-request protection therefore uses the actual receiving workspace, not only the directory entry. Branch/multiple-recipient selection requires an explicit later design; never choose the first similarly named organization.

Suspending a link or receiving consent blocks new requests. Existing request history is retained. Do not silently retarget an existing request when a directory link changes. Determine authorization for historic responses and safe withdrawal independently of current directory publication.

## Transaction and Retry Contract

The create RPC accepts directory ID, expected link version, expected sender context, a client request UUID and the intended message fields. The server resolves the receiving workspace from the verified link and derives the actor from the authenticated session. Submitted target IDs, actor IDs, statuses, expiry, response metadata and channel IDs are not authority.

Within one transaction:

1. Check actual actor eligibility, current Owner separation, current source-organization membership, receiving link/consent/type and allowed purpose. Reject own-workspace requests for the first version; do not turn a self-request into self-approval.
2. Lock the relevant link/request scope and enforce current link version. Define consistent behavior for withdrawal, expiry and link suspension racing submission.
3. Use database-enforced idempotency bound to the actual actor and request UUID. The same key and identical normalized payload returns the existing exact result; the same key with a different target, context or body fails. A new tab cannot bypass the pending-request uniqueness rule.
4. Insert the pending request with original directory/workspace attribution and the existing 30-day expiry, plus an accountability event. Notification dispatch, if approved, uses an outbox and must not change primary-save success into failure.
5. Return exact request identity, actor context, pending status, expiry and saved fields. An uncertain network response supports an authenticated lookup by original key. Never auto-repeat a create or claim it failed just because opening the saved request failed.

Actual SQL, unique-index shape, archival retention and reconciliation must be reviewed against existing data before becoming a migration. This document contains no executable DDL and changes no policy or grant.

## Existing Policy and Acceptance Gates

The current request INSERT policy checks only requester identity. Its UPDATE policy broadly permits the requester or receiving admins/platform admins; it does not constrain direct-table requester edits to withdrawal. Current application-handler guards do not close those table API paths.

The existing acceptance handler also performs request decision, channel, link and member writes separately. A complete proposal must cover create/respond/withdraw authorization, allowed column/state transitions, atomic acceptance, idempotent recovery of incomplete accepted requests and audited historical repair. No unreviewed deletion or automatic new membership should be used to clean up old partial results.

Port and verify all affected clients before restricting direct table operations. Plan migration/client compatibility so an older client fails clearly instead of falling back to permissive writes. Do not enable the composer first and defer these controls until after real requests exist.

## Delivery Checklist

- [x] Trace directory, workspace, request and Owner contact identities in source.
- [x] Record the mismatch and preserve existing role/Owner boundaries.
- [x] Draft explicit mapping, receiver consent, idempotency and transactional contracts.
- [ ] Reconcile schema/data and role aliases in an authorized staging inspection.
- [x] Prepare a guarded SQL prototype, read-only inventory, syntax report and rollout/rollback/acceptance review package.
- [ ] Obtain independent SQL/catalog/security review and actual DB acceptance evidence; authorize any database application separately.
- [ ] Build Owner mapping/receiver-consent management and the eligible-role composer against that contract.
- [ ] Audit legacy request records and prepare a non-destructive, reviewed reconciliation process.
- [ ] Run rollback-only SQL tests for concurrent creates/responses, stale/revoked memberships, changed links/consent, direct-table denial, expiry, own-workspace targets and idempotency conflicts.
- [ ] Run exact-build signed-in role, save/refresh/reopen/withdraw/accept and failure-recovery browser checks in staging.
- [ ] Mirror the approved eligible-role interaction and honest pending/accepted/incomplete states in the fictional demo using local data only.
- [ ] Include the reviewed result in grouped release review; production remains a separate authorization.

Owner contact-pipeline reliability work is a management fix, not completion of this composer, outreach delivery, 25 verified partnerships or the deferred parent pilot. Sender identity and partnership offer drafts still need user review before any external outreach. Parent-pilot and Pathway Report Snapshot implementation remains deferred under the broader roadmap.


## October 15 SQL Review Package

The [guarded database proposal](database-proposals/channel-connections-v1/README.md) now includes source-aligned schema/RPC/cutover prototypes, an unexecuted read-only inventory, exact SQL hashes, a local syntax checker and an unexecuted acceptance matrix. It is outside the migration/runtime paths. Mutation files raise an unconditional exception and end in ROLLBACK; flags remain disabled.

The prototype chooses an explicitly verified organization context for every sender; personal educator sending is not implemented in v1. It separates recorded setup completion from current channel-opening permission, uses explicit request revisions rather than timestamps for concurrency, protects new attribution/bindings during additive rollout and preserves Owner management-only precedence. Existing legacy accepted partial setup is never automatically repaired or used to restore memberships. These are draft decisions to review, not new role grants or deployed behavior.

Parser evidence covers 82 SQL statements, 17 PLpgSQL function bodies, one SQL helper body and three execution guards with pglast 8.6 / PostgreSQL parser 18.6. No DB was contacted. Actual schema/type resolution, target PostgreSQL compatibility, function ownership/RLS behavior, retention effects, concurrent transactions and browser acceptance remain unverified. Existing application source and its last validation baseline are unchanged.


## Draft Caller Boundary Preparation

`src/lib/channel-connection-v1-contract.ts` now provides pure target-page and outcome validation with 26 boundary tests. It is unused by runtime callers and contains no network transport or activation path. Authentication, viewer/context scopes, idempotent mutation contracts, consent/link management, caller integration and database/browser acceptance remain outstanding. This is preparation, not completion of the composer checklist.


## Draft Decision Intent Preparation

`src/lib/channel-connection-v1-decision-contract.ts` now prepares immutable original request/revision/operation-key intent and validates exact acceptance/decline/withdrawal outcomes, including terminal read-back without membership restoration. The 27 new tests are local response-boundary checks, not authenticated RPC/database evidence. No transport, caller integration, UI or activation path exists. The guarded SQL outcome proposal also now explicitly excludes Owner/admin personal opening after a role transition; actual SQL permission tests remain open. Create-intent/key lookup, compatible server wrappers and the remaining delivery checklist are still incomplete.
