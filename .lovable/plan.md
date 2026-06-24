
## Audit findings (current state)

Reviewed `public.documents`, `public.document_permissions`, `public.audit_log`, `storage.objects` policies, `student-documents` bucket, and all `documents.functions.ts` / upload UI paths.

**What is already correct**
- Bucket `student-documents` is private; downloads use 5-min signed URLs.
- `documents` RLS gates SELECT on `can_access_student(uid, student_id)` and INSERT/UPDATE/DELETE on `can_edit_student(...)`.
- Storage object policies key off the first folder segment = `student_id`, mirroring DB access.
- `can_access_student` = owner ∪ accepted collaborator ∪ approved `student_relationships` ∪ `has_role(uid,'admin')` — so school/district admins get NO automatic document access (matches spec) and partners get none either.
- Upload server fn writes an `audit_log` row with action `document.upload`.

**Gaps vs. the spec**
1. `has_role(uid,'admin')` (app role `admin` from `user_roles`) grants every admin broad raw-document access via `can_access_student` and storage policies. Spec wants platform-admin raw access *minimized, gated by explicit reason, and logged*.
2. Partner role is not explicitly denied anywhere — it relies on absence of relationships. A future partner row in `student_relationships` would silently leak access. Need a hard "partners cannot access" guard.
3. Missing metadata: `uploaded_by_role`, `organization_id`, `review_status` (separate from upload `status`), `consent_required`, `archived_at`, `deleted_at`.
4. `deleteDocument` hard-deletes the row + storage object and writes no audit entry. Spec wants soft archive by default, hard delete only by platform admin with reason + audit.
5. `getDocumentSignedUrl` (download/preview) and any AI summary trigger are not audited — only uploads are.
6. `document_permissions.permission_level` enum doesn't carry `summarize` / `download` / `review` distinctions; spec lists those as separate permission types.
7. `FamilyDocumentUpload` does the storage `upload` then calls `registerDocument`. There is no server-side check that the caller actually has a parent/guardian/student-self relationship to this student before the upload — RLS catches it, but the failure surface is the storage 403 rather than a clean "you don't have permission" message + confirmation step.
8. No frontend role guard on `/documents` or `/documents/$id/review` rejecting partner role explicitly (today they'd hit empty lists, but the route renders).

## Plan

### Phase 1 — Schema & policy hardening (single migration)

- **Extend `public.documents`** with: `uploaded_by_role text`, `organization_id uuid references public.organizations(id)`, `review_status text not null default 'pending_review' check (review_status in ('pending_review','in_review','reviewed','needs_followup','rejected'))`, `consent_required boolean not null default true`, `archived_at timestamptz`, `archived_by uuid references auth.users(id)`, `archive_reason text`, `deleted_at timestamptz` (soft-delete marker for admin hard-delete trail).
- **Extend permission level enum** with `download_document`, `request_summary`, `review_document` values (keep existing).
- **Tighten RLS on `public.documents`**:
  - Replace SELECT policy: `archived_at IS NULL AND deleted_at IS NULL AND (can_access_student(uid, student_id) OR can_view_document(uid, id))`. Add a separate "archived docs visible to editors only" policy.
  - Block app-role `admin` from auto-SELECT of raw docs; instead require `is_platform_admin(uid) AND <explicit access log row in last 5 minutes>` via a new `has_recent_admin_doc_access(uid, doc_id)` security-definer check. Educator/parent/student/case-manager access paths are unchanged.
  - Add explicit `partner` deny: new `is_partner_only(uid)` helper; block SELECT/INSERT/UPDATE/DELETE whenever true.
  - DELETE policy: only `is_platform_admin(uid)` (hard delete). Editors get UPDATE → archive instead.
- **Storage policies on `storage.objects` for bucket `student-documents`**: mirror partner deny + archived/deleted filter via a new SECURITY DEFINER `storage_can_read_student_doc(uid, path)` helper that joins to `documents` so archived/deleted files become unreachable too.
- **New table `public.document_access_log`** (id, document_id, student_id, actor_id, action ∈ {`view_metadata`,`download`,`preview`,`summarize`,`archive`,`restore`,`hard_delete`,`admin_override`}, reason text, ip text null, created_at). Insert-only for `authenticated`; SELECT only for `is_platform_admin`. Grants + RLS in the same migration.
- **New table `public.admin_doc_access_grants`** (actor_id, document_id, reason, expires_at default now()+'15 min'). Powers `has_recent_admin_doc_access`. Insert-only by platform admin; SELECT by platform admin.

### Phase 2 — Server functions

- `src/lib/documents.functions.ts`:
  - `registerDocument`: derive `uploaded_by_role` from caller's `user_roles` (refuse `partner`), set `organization_id` from caller's active org membership when present, default `consent_required=true`, require `consent_acknowledged` for IEP/evaluation/assessment/transition_plan types.
  - Replace `deleteDocument` with `archiveDocument` (editor) — sets `archived_at`, writes `document_access_log` row `archive`. Add separate `hardDeleteDocument` requiring `is_platform_admin` + non-empty `reason`, logs `hard_delete`.
  - `getDocumentSignedUrl`: insert `document_access_log` row (`download` or `preview` based on input flag) before returning URL; require `request_summary` permission to mint URLs used by AI summary path.
  - New `requestAdminDocAccess({document_id, reason})` (platform-admin only): inserts a `admin_doc_access_grants` row, writes `admin_override` audit entry, returns a one-shot signed URL.
- `src/lib/role-policy.ts`: add `assertNotPartner(role)` helper; call from `registerDocument`, `archiveDocument`, `requestSummary`, `getDocumentSignedUrl`.

### Phase 3 — Frontend role/relationship guards

- `src/routes/_authenticated/documents.tsx` + `documents.$documentId.review.tsx`: add `beforeLoad` check via existing `useAudience`/`role-policy` to redirect partners to `/dashboard` with toast "Partner accounts cannot access student documents."
- `FamilyDocumentUpload`: call new `assertCanUploadForStudent({student_id})` server fn before storage `upload()`; require explicit checkbox "I confirm I have permission to upload and share this document about <student name>." Block submit until checked.
- Hide raw doc download buttons for school_admin / district_admin views; show review-status badges only. Already-existing aggregate views unchanged.
- Pathway Report doc-source section: hide for partner audience; mark AI-extracted fields as `needs_review` until accepted, with accept/reject buttons that write `document_access_log` `summarize` + `audit_log` entries.

### Phase 4 — Tests

- `tests/unit/documents-permissions.test.ts`: role→upload permission matrix, partner deny, consent gating, archive vs hard-delete, signed-URL audit insertion.
- Extend Playwright `role-access` project: parent-vs-unrelated-student doc 403, educator caseload boundary, school_admin no raw download, district_admin no raw download, partner blocked from `/documents*`, signed URL expiry, archived doc invisible.
- Run `bun run test:unit`, `bunx playwright test --project=dashboard-setup`, `--project=role-access`, `--project=dashboard-regression` per spec.

### Out of scope (per "do not break" list)

Auth flows, role guards on non-document routes, dashboard test IDs, owner 2FA, owner hub routes, billing/entitlement — untouched.

### Risks

- Tightening `can_access_student` for app-role `admin` may regress legitimate internal admin debugging until the new `admin_doc_access_grants` workflow ships. Mitigation: ship the grants table + helper in the same migration; existing platform-admin UI keeps working by going through `requestAdminDocAccess`.
- Adding `archived_at IS NULL` to SELECT may hide rows currently shown. Mitigation: backfill is a no-op (column starts NULL); add explicit "Show archived" toggle for editors in a follow-up if needed.

### Deliverables

- 1 migration (schema + enum + RLS + new tables + storage helpers + grants)
- Updates to `src/lib/documents.functions.ts`, `src/lib/role-policy.ts`, `src/lib/cross-docs.functions.ts` (summary path), `src/routes/_authenticated/documents*.tsx`, `src/components/students/FamilyDocumentUpload.tsx`, Pathway Report extras
- New `src/lib/owner/admin-doc-access.functions.ts`
- New unit + Playwright tests
