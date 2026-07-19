# Hardening Program — Evidence Ledger

Requirement → code/migration/test evidence per slice.

## Workstream A — Identity, Org, Entitlement Normalization

### Slice A1 — Foundation
- **Central authorization entry point**: SQL `public.authorize(user_id, action, resource_type, resource_id)` → migration `slice_a1_authorize_helpers`.
- **District→school cascade**: SQL `public.effective_org_access(user_id)` → same migration.
- **Partner tier enforcement**: SQL `public.partner_tier_allows(user_id, capability)` → same migration.
- **Durable audit surface**: `public.org_access_audit` table + RLS (actor + platform admin read) → same migration.

### Slice A2 — First wiring + boundary test
- **Client-side helper**: `src/lib/authz.ts` (`isAuthorized`, `assertAuthorized`, `AuthorizationError`) — wraps the RPC and records denial rows.
- **Audit writeability**: migration `slice_a2_audit_writes` — `GRANT INSERT` + `actor can insert own audit rows` policy scoped to `actor_id = auth.uid()`.
- **Wired into server fns** (all additive, RLS still enforced):
  - `linkReportToStudent` — `authorize('edit','student', student_id)` when linking.
  - `createOpportunity` (partner-workspace) — `authorize('publish_opportunity','partner_capability')`.
  - `updateOpportunity` (partner-workspace) — same capability check.
- **Boundary regression test**: `tests/authorize-rpc.test.mjs` — verifies allow/deny for district admins and partner baseline capability via signed-in fixture users.

### Slice A3 — Document mutation sweep + entitlement boundary
- **Document mutations gated by `authorize()`** in `src/lib/documents.functions.ts`:
  - `archiveDocument` — `authorize('edit','student', row.student_id)` before archive/restore.
  - `getDocumentSignedUrl` — `authorize('view','document', row.id)` before minting the signed URL, layered on top of RLS + revoked-access alerting.
- **Entitlement/waitlist-style boundary tests** added to `tests/authorize-rpc.test.mjs`:
  - Parent user is denied `publish_opportunity` on `partner_capability` (no partner entitlement).
  - Parent user is denied `view` on `organization` (no district membership).
- **Rollback**: helper is additive; removing the two `assertAuthorized` calls restores prior behavior. RLS still enforces on its own.
