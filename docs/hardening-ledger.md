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

### Slice A4 — Org/district mutation sweep + cross-org denial audit
- **`authorize()` layered on org mutations** (all keep existing gates as belt-and-suspenders):
  - `approveOrgMembership` — replaced ad-hoc `is_org_admin` RPC with `assertAuthorized('manage','organization', orgId)`.
  - `addSchoolToDistrict`, `removeSchoolFromDistrict`, `inviteDistrictTeammate` in `src/lib/district-admin.functions.ts` — `assertAuthorized('manage','organization', district_id)` before the existing `ensureDistrictAdmin` gate.
- **Cross-org denial audit test** added to `tests/authorize-rpc.test.mjs`: district A admin gets `authorize('manage','organization', DISTRICT_B) = false` and can read back the corresponding `org_access_audit` deny row under RLS.
- **Rollback**: remove the added `assertAuthorized` lines; original `ensureDistrictAdmin` / `is_org_admin` checks remain in place.

### Slice A5 — Workstream A wrap-up (waitlist boundary + matrix)
- **Waitlist-vs-entitled boundary test** in `tests/authorize-rpc.test.mjs`: asserts `user_has_feature()` returns `false` for `family_access | student_access | partner_access | any` on a signed-in parent with no `access_entitlements` row. Locks in "signed-in ≠ entitled".
- **Role-guard matrix wrap-up test**: enumerates (actor × action × resource) tuples across district admin, partner, parent and asserts `authorize()` decisions; becomes the regression fence for any future helper/RLS change in Workstream A.
- **No schema change**: Slice A5 is test-only; all helpers (`authorize`, `user_has_feature`, `effective_org_access`, `partner_tier_allows`) already shipped in A1–A4.
- **Workstream A acceptance status**:
  - ✅ Central `authorize()` shipped and wired into high-risk mutations (report link, document view/archive, opportunity create/update, org membership approval, district school+teammate mutations).
  - ✅ `effective_org_access` + `partner_tier_allows` in place; district→school cascade covered.
  - ✅ `org_access_audit` table + RLS + actor-self insert policy; deny writes verified under RLS.
  - ✅ Waitlist boundary + cross-tenant matrix locked in tests.
- **Rollback**: tests only — deleting the new `test(...)` blocks reverts A5.

Workstream A closed. Ready to open Workstream B (Transition Evidence Graph) on approval.

## Workstream B — Transition Evidence Graph

### Slice B1 — Dormant evidence graph schema
- **New tables** (additive, no reads/writes wired yet):
  - `public.evidence_items` — student-scoped evidence rows with `kind`, `subject_type/id`, `source_kind/id`, `contributor_id`, `occurred_at`, `confidence` (0..1), `verification_state`, `permission_scope`, `payload jsonb`, `extraction_id` FK → `document_extractions`.
  - `public.evidence_edges` — polymorphic edges (`from_type/from_id → to_type/to_id`, `relation`) with a uniqueness key preventing duplicate edges. Only `from_type='evidence_item'` is admitted by RLS at this slice; other from-sides will unlock as writers land.
- **RLS**:
  - `evidence_items` visible via `can_access_student`; mutable via `can_edit_student`.
  - `evidence_edges` SELECT / INSERT / DELETE derived from the linked evidence item's student access; no UPDATE (edges are immutable once written — replace via delete+insert).
- **GRANTs**: `authenticated` gets standard CRUD; `service_role` gets ALL. No `anon` access.
- **Indexes**: `student_id`, `kind`, `(subject_type, subject_id)`, `(source_kind, source_id)` on items; `(from_type, from_id)`, `(to_type, to_id)`, `relation` on edges.
- **Trigger**: `set_updated_at()` on `evidence_items`.
- **Linter delta**: 0 new warnings from this migration; all 50 reported warnings pre-date Workstream B (SECURITY DEFINER + extension-in-public on legacy helpers).
- **Rollback**: `DROP TABLE public.evidence_edges; DROP TABLE public.evidence_items;` — safe because no readers reference them.

Next: **Slice B2** — idempotent backfill from `report_evidence_links` + `document_extractions` into `evidence_items` / `evidence_edges` behind a `EVIDENCE_GRAPH_BACKFILL` feature flag, with an idempotency test.

### Slice B2 — Idempotent evidence graph backfill
- **Uniqueness for re-runnability**: partial unique index `evidence_items_source_unique (student_id, source_kind, source_id) WHERE source_id IS NOT NULL`. Every backfill statement uses `ON CONFLICT ... DO NOTHING` against this key.
- **Backfilled from**:
  - `document_extractions` → `evidence_items` with `kind='document_extraction'`, `subject_type='document'`, `subject_id=document_id`, `verification_state` derived from review status (`human_confirmed` / `auto_high` / `unverified`), and `extraction_id` back-linked.
  - `report_evidence_links` → `evidence_items` with `kind='report_reference'`, preserving the link's `source_kind/source_id` and stashing `report_section`, `source_label`, `note`, `snippet_hash`, `link_id` in `payload` (edge to `pathway_report` deferred: `report_evidence_links` has no `report_id` column).
- **Idempotency proof in-migration**: after the initial insert, both statements are re-run inside a `DO $$` block and `RAISE EXCEPTION` fires if the row count changes. The migration succeeded, which is the proof.
- **Current backfill volume**: 0 rows in this environment (`document_extractions` and `report_evidence_links` currently have no student-linked rows). The guard still ran; it protects future re-runs once data lands.
- **Linter delta**: 0 new warnings.
- **Rollback**: `DELETE FROM evidence_items WHERE kind IN ('document_extraction','report_reference') AND source_id IS NOT NULL;` then `DROP INDEX evidence_items_source_unique;`. No source tables were touched.

Next: **Slice B3** — build the read-side views (`student_evidence_v1`, `recommendation_provenance_v1`) with RLS-friendly definitions and cover them with an evidence-graph unit test that seeds a student, inserts an evidence item + edge, and asserts the view returns them under a signed-in student-team member and hides them from an unrelated user.

### Slice B3 — Evidence Graph Read Views
- **New views** (both `WITH (security_invoker = on)`, so RLS on `evidence_items` / `evidence_edges` applies to the caller):
  - `public.student_evidence_v1` — one row per evidence item with a lateral rollup of attached edge count + distinct relations.
  - `public.recommendation_provenance_v1` — one row per evidence edge whose `to_type = 'pathway_recommendation'`, joined back to the source evidence item's student, kind, confidence, verification, and payload.
- **GRANTs**: `SELECT` to `authenticated`; no `anon` grant.
- **Test coverage** — `tests/evidence-graph-views.test.mjs`:
  - Owner (parent) who seeds a student + evidence item + edge sees the row in both views with `edge_count = 1` and `relation = 'supports'`.
  - Unrelated signed-in parent (fresh sign-up) sees zero rows filtered by the same `evidence_id`.
  - Anon (no session) sees zero rows in both views.
- **Linter delta**: 0 new warnings (views inherit invoker-side RLS; no new SECURITY DEFINER surface).
- **Rollback**: `DROP VIEW public.recommendation_provenance_v1; DROP VIEW public.student_evidence_v1;` — safe, no downstream readers wired yet.

Next: **Slice B4** — introduce the first evidence writer (document-extraction ingestion path) behind a feature flag, emitting one `evidence_item` per confirmed extraction and one `evidence_edge` per report reference, with a writer-idempotency test.

### Slice B4 — First evidence writer (document extraction)
- **New helper**: `src/lib/evidence-writers.functions.ts` — `emitEvidenceForConfirmedExtraction()` upserts one `evidence_items` row per confirmed extraction using the partial unique index `(student_id, source_kind, source_id)` with `ignoreDuplicates: true`. Runs under the caller's authenticated supabase client, so RLS on `evidence_items` still applies.
- **Feature flag**: `EVIDENCE_GRAPH_WRITES` (server-only). Off → helper returns `{ ok: true, skipped: true }` and writes nothing; existing code paths unchanged. Shadow-mode by default.
- **Wired into**: `applyAcceptedExtraction` in `src/lib/extractions.functions.ts` — after the extraction is marked `complete` and before the audit_log insert. Emits `kind='document_extraction'`, `verification_state='human_confirmed'`, `payload` = the applied field names. Non-fatal on failure (logged, not thrown), so a writer error can never regress an already-successful extraction apply.
- **Idempotency test**: `tests/evidence-writer-idempotency.test.mjs` — signs in as the QA parent, seeds a student, runs the same upsert three times, asserts exactly one `evidence_items` row survives under RLS. Locks in the partial-unique-index contract that the writer relies on.
- **Rollback**: unset `EVIDENCE_GRAPH_WRITES` (default). To remove entirely, delete the `emitEvidenceForConfirmedExtraction` call in `applyAcceptedExtraction` and the helper file — no schema change to undo.

### Slice B5 — Second writer (recommendation edge) + first provenance consumer
- **New helper** in `src/lib/evidence-writers.functions.ts`: `emitRecommendationEvidenceEdge()` upserts one `evidence_edges` row from `evidence_item → pathway_recommendation` using the unique index `evidence_edges_from_type_from_id_to_type_to_id_relation_key` on `(from_type, from_id, to_type, to_id, relation)` with `ignoreDuplicates: true`. Runs under the caller's authenticated supabase client; edge RLS derives visibility from the source evidence item.
- **Feature flag**: `EVIDENCE_GRAPH_WRITES` (server-only, shared with B4). Off → helper returns `{ ok: true, skipped: true }` and writes nothing.
- **First consumer read**: `readRecommendationProvenance(supabase, recommendationId)` — reads through the `recommendation_provenance_v1` view (RLS-honoring `security_invoker`), returning `[]` silently when the caller has no access.
- **Idempotency + provenance test**: `tests/evidence-edge-writer.test.mjs` — signs in as the QA parent, seeds a student + evidence item, upserts the same edge three times and asserts exactly one row survives; then reads `recommendation_provenance_v1` and confirms the owner sees exactly one row while an unrelated signed-in parent sees zero.
- **Rollback**: unset `EVIDENCE_GRAPH_WRITES`. To remove entirely, delete `emitRecommendationEvidenceEdge` and `readRecommendationProvenance` from `src/lib/evidence-writers.functions.ts` — no schema change to undo.

### Slice B6 — Provenance emission at report-link time + first consumer server fn
- **New helper** in `src/lib/evidence-writers.functions.ts`: `linkReportProvenance()` — on report ↔ student link, upserts one `evidence_edges` row per existing `evidence_items` for that student, targeting the report id as the recommendation surrogate. Idempotent via the (from,to,relation) unique key. Flag-gated by `EVIDENCE_GRAPH_WRITES`; default off = no-op.
- **Wired into**: `linkReportToStudent` in `src/lib/pathway.functions.ts` — runs after the successful `pathway_reports` update, dynamic-imported so writer isn't reached until link time. Non-fatal on failure (existing link is preserved).
- **First provenance consumer server fn**: `getReportProvenance({ report_id })` in `src/lib/pathway.functions.ts` — reads through the `recommendation_provenance_v1` view via `readRecommendationProvenance`. RLS-honoring: returns `[]` silently when the caller can't see the underlying evidence.
- **Rollback**: unset `EVIDENCE_GRAPH_WRITES` (default). To remove entirely, delete `linkReportProvenance`, revert the `linkReportToStudent` call, and remove `getReportProvenance` — no schema change.

### Slice B7 — Promote writers to preview + live smoke
- **Flag flipped**: `EVIDENCE_GRAPH_WRITES=true` set in the preview environment. `emitEvidenceForConfirmedExtraction`, `emitRecommendationEvidenceEdge`, and `linkReportProvenance` now perform real upserts (still idempotent via the partial unique index on `evidence_items` and the (from,to,relation) unique key on `evidence_edges`).
- **Live smoke**: `tests/evidence-report-link-smoke.test.mjs` — signs in as QA parent, seeds a student + `evidence_items` row + real `pathway_reports` row, mirrors the `linkReportProvenance` upsert (twice, to prove idempotency), and asserts:
  - Owner sees exactly one row in `recommendation_provenance_v1` for that report id, with the right `evidence_id` and `relation='supports'`.
  - Anon sees zero rows.
  - Unrelated signed-in parent (fresh sign-up) sees zero rows.
- **Rollback**: unset `EVIDENCE_GRAPH_WRITES` to return every writer to shadow-mode no-op; no schema change to undo. Existing evidence rows remain readable through the RLS-honoring views.

### Slice B8 — Provenance coverage view + acceptance close-out
- **New view**: `public.report_provenance_coverage_v1` (`security_invoker = on`) — one row per `pathway_reports` row the caller can see, lateral-joined against `evidence_edges` where `to_type = 'pathway_recommendation' AND to_id = pr.id AND from_type = 'evidence_item'`. Exposes `report_id`, `student_id`, `evidence_edge_count`, and `has_coverage`. Edge visibility flows from the source evidence item's student access, so counts silently exclude edges the caller can't see. `SELECT` granted to `authenticated` only.
- **New consumer server fn**: `getReportProvenanceCoverage({ report_id })` in `src/lib/pathway.functions.ts` — reads the view and returns `{ evidence_edge_count, has_coverage }`. Returns `{ 0, false }` silently on RLS-hidden reports or read errors.
- **Coverage smoke test**: `tests/evidence-report-provenance-coverage.test.mjs` — signs in as QA parent, seeds a student + evidence item + `pathway_reports` row, asserts:
  - Pre-edge: owner sees a coverage row with `evidence_edge_count = 0`, `has_coverage = false`.
  - Post-edge (upserted twice for idempotency): owner sees `evidence_edge_count = 1`, `has_coverage = true`.
  - Unrelated signed-in parent sees zero coverage rows for the report id.
  - Anon sees zero coverage rows.
- **Workstream B acceptance status**:
  - ✅ `evidence_items` + `evidence_edges` schema with RLS shipped (B1) and idempotency-keyed for re-runs (B2).
  - ✅ Read views `student_evidence_v1` + `recommendation_provenance_v1` (B3) plus coverage view `report_provenance_coverage_v1` (B8), all `security_invoker` so RLS applies to the caller.
  - ✅ Writers: `emitEvidenceForConfirmedExtraction` (B4), `emitRecommendationEvidenceEdge` (B5), `linkReportProvenance` (B6) — all idempotent, all gated by `EVIDENCE_GRAPH_WRITES`, flipped on in preview (B7).
  - ✅ Consumer server fns: `getReportProvenance` (B6) and `getReportProvenanceCoverage` (B8) reading through the RLS-honoring views.
  - ✅ Coverage query returns for every `pathway_reports` row the caller can see (0 when no edges yet, ≥1 once evidence is linked) — establishes the observable metric for "every recommendation resolves ≥1 evidence item" as writer coverage rolls forward.
- **Rollback**: `DROP VIEW public.report_provenance_coverage_v1;` and remove the `getReportProvenanceCoverage` server fn — no data change to undo. Legacy `report_evidence_links` remains the fallback reader as documented in the Workstream B plan.

Workstream B closed.

## Workstream C — Document Intelligence Pipeline

### Slice C1 — Dormant pipeline run-log schema
- **New table**: `public.document_pipeline_runs` — additive, no readers or writers wired yet. Columns: `document_id` FK → `documents(id) ON DELETE CASCADE`, `student_id` FK → `students(id) ON DELETE SET NULL`, `correlation_id UUID` (retry grouping), `attempt INT DEFAULT 1`, `stage` (`upload|sniff|hash|extract|verify|publish`), `status` (`pending|running|succeeded|failed|quarantined|skipped`), `engine_version`, `model_version`, `prompt_version`, `error_code`, `error_message`, `latency_ms`, `cost_cents`, `payload jsonb DEFAULT '{}'`, `started_at`, `finished_at`, timestamps.
- **Indexes**: `document_id`, `student_id`, `correlation_id`, `(stage,status)`, `created_at DESC` — sized for retry lookup + admin dashboards later.
- **RLS**: platform admins (`has_role(auth.uid(),'admin')`) only for SELECT and ALL. `service_role` writes via `GRANT ALL`. No parent/educator/partner path into pipeline internals — intentionally private.
- **Trigger**: dedicated `set_document_pipeline_runs_updated_at()` (`SET search_path = public`) — didn't reuse a generic project helper because none existed and this stays scoped to the table.
- **Linter delta**: 0 new warnings; all 50 reported warnings pre-date Workstream C (SECURITY DEFINER + extension-in-public on legacy helpers).
- **Rollback**: `DROP TABLE public.document_pipeline_runs; DROP FUNCTION public.set_document_pipeline_runs_updated_at();` — safe, no readers reference the table.

Next: **Slice C2** — content-hash column on `documents` + idempotent backfill so future upload runs can detect duplicates without touching the pipeline path yet.






### Slice C2 — Content-hash column on `documents` + idempotent backfill
- **Schema change**: `ALTER TABLE public.documents ADD COLUMN IF NOT EXISTS content_hash TEXT` (nullable). Column comment documents intent: SHA-256 hex of raw bytes, populated lazily by future pipeline runs.
- **Index**: `documents_student_content_hash_idx ON (student_id, content_hash) WHERE content_hash IS NOT NULL` — non-unique, partial. Duplicates *within* a student are the dedupe target; the same bytes uploaded by two different students are not.
- **Backfill**: idempotent update — for every row with a non-empty `storage_path` and no `content_hash`, set `content_hash = encode(digest('storage_path:' || storage_path, 'sha256'), 'hex')`. Deterministic placeholder; re-running the migration is a no-op. Real byte-level hashes will overwrite as the pipeline reprocesses each document.
- **No RLS / grant changes**: `documents` policies already cover the new column.
- **No readers/writers wired**: pipeline consumers land in later slices; C2 is schema + backfill only.
- **Linter delta**: 0 new warnings from this migration (existing 50 warnings pre-date Workstream C).
- **Rollback**: `DROP INDEX IF EXISTS public.documents_student_content_hash_idx; ALTER TABLE public.documents DROP COLUMN IF EXISTS content_hash;` — no dependent code to unwind.

Next: **Slice C3** — writer path that computes real SHA-256 on upload and short-circuits duplicate re-processing via the new index.

### Slice C3 — Content-hash upload short-circuit
- **Server fn**: `registerDocument` (in `src/lib/documents.functions.ts`) now accepts an optional `content_hash` (SHA-256 hex, validated by `/^[a-f0-9]{64}$/i`).
- **Short-circuit path**: before insert, when a hash is supplied, look up the newest live (`deleted_at IS NULL`) document for the same `student_id` with matching `content_hash`. On hit, we skip the second `documents.insert`, skip re-enqueuing an `ai_jobs` `document_summary` job, log an `upload_dedupe_hit` row to `document_access_log` (audit signal), and return the existing `DocumentRow` — return shape unchanged so callers don't break.
- **Insert path**: when no dedupe hit (or no hash provided), the new row is written with `content_hash = <hash lowercased>` (or NULL). Real SHA-256 values start replacing the C2 storage-path placeholders here.
- **Uses**: `documents_student_content_hash_idx (student_id, content_hash) WHERE content_hash IS NOT NULL` — the partial index shipped in C2.
- **Test**: `tests/document-content-hash-dedupe.test.mjs` — signed-in owner seeds a student + document with a real SHA-256, asserts the same-student lookup returns the original row, and asserts a *different* student with the same bytes does not collide (per-student scope).
- **Non-goals**: no computation of hashes on the server (the pipeline / uploader is the source of bytes). Callers that don't pass `content_hash` see the pre-C3 behavior unchanged.
- **Rollback**: remove the `content_hash` field from the zod schema, the pre-insert lookup block, and the `content_hash` field on the insert payload. No data migration needed.

Next: **Slice C4** — pipeline-run breadcrumb writes (`document_pipeline_runs` rows for `hash`/`extract`/`verify` stages) so we can observe retries + latency without changing the user-visible upload flow.

### Slice C4 — Pipeline-run breadcrumbs on upload
- **Helper**: `src/lib/document-pipeline.server.ts` exposes `recordPipelineRun(input)` and `newCorrelationId()`. All inserts go through `supabaseAdmin` (dynamic import) because `document_pipeline_runs` RLS is admin-only. Every call is best-effort — errors are logged and swallowed so observability never blocks the primary flow. `.server.ts` naming keeps it out of client bundles.
- **`registerDocument` wiring** (`src/lib/documents.functions.ts`): mints one correlation id per upload attempt and emits:
  - `upload` → `skipped` on a C3 dedupe hit (payload records `reason: "dedupe_hit"`), returning the existing row.
  - `upload` → `succeeded` after the `documents` insert lands, with `latency_ms` derived from wall-clock deltas and payload capturing `doc_type`, `visibility`, `actor_role`, `size_bytes`, `mime_type`.
  - `hash` → `succeeded` when the caller supplied a SHA-256, else `skipped` with `reason: "no_hash_provided"`.
  - `extract` → `pending` after enqueuing the `document_summary` `ai_jobs` row, or `failed` with `error_code: "ai_jobs_enqueue_failed"` when the enqueue errored.
- **Non-goals**: no UI, no admin dashboard reads, no changes to the AI worker (it will start reporting `extract` / `verify` / `publish` transitions in a later slice). No new secrets, no new columns, no schema changes.
- **Rollback**: delete `src/lib/document-pipeline.server.ts` and remove the `recordPipelineRun` call sites plus the correlation-id block from `registerDocument`. Existing rows can stay — they're diagnostic-only.

Next: **Slice C5** — extend breadcrumb writes to the AI worker path so `extract`/`verify` transitions land with real `model_version`/`prompt_version`/latency, still under the same correlation id.

### Slice C5 — Worker-side extract/verify breadcrumbs
- **Edge function** (`supabase/functions/ai-job-processor/index.ts`): added an inline best-effort `recordPipelineRun` helper (mirrors `src/lib/document-pipeline.server.ts`; Deno can't reuse the Node module) that writes to `document_pipeline_runs` via the existing service-role `supabase` client. Errors are logged and swallowed.
- **Wiring in `processJob`**: only runs for `document_summary` jobs where `input_source.document_id` is present (matches what `registerDocument` enqueues in C4). Emits:
  - `extract` → `running` when the job is claimed (attempt = `job.attempts + 1`, `model_version = "google/gemini-3-flash-preview"`, `prompt_version = "v1"`).
  - `extract` → `failed` with `error_code: "ai_gateway_error"` + `latency_ms` when `callLovableAI` throws; original error is re-thrown so existing retry/backoff behavior in the outer handler is unchanged.
  - `extract` → `succeeded` with real `latency_ms` and `payload.has_raw_fallback` after the AI call resolves.
  - `verify` → `succeeded` when the AI returned a parsed JSON object, else `skipped` with `error_code: "non_json_response"` (shadow-mode only — the row is still handed to reviewers; we never quarantine yet).
- **Correlation**: the worker doesn't yet share the upload-side correlation id (no column on `ai_jobs` today). Rows still group by `(document_id, attempt, stage)` so operators can join manually. Threading a real correlation id end-to-end is a later slice.
- **No user-visible change**: job completion, feed_events, notifications, and retry logic are untouched. No schema changes, no new secrets, no new grants.
- **Rollback**: remove the inline `recordPipelineRun` helper and the four `recordPipelineRun(...)` calls in `processJob`; revert the extract-call try/catch back to a straight `await`. Existing breadcrumb rows are diagnostic-only.

Next: **Slice C6** — file magic-byte sniff + MIME/size allowlist on the upload path, emitting `sniff` breadcrumbs and quarantining rejects before they reach extract.

### Slice C6 — Upload sniff + type/size allowlist + pre-extract quarantine
- **Helper**: `src/lib/document-sniff.server.ts` exports `sniffUploadedDocument({ storage_path, declared_mime, declared_size })` and `MAX_UPLOAD_BYTES` (25 MB). Downloads the first 32 bytes of the freshly-uploaded object via `supabaseAdmin.storage.from("student-documents")`, detects the kind by magic bytes (`pdf`, `png`, `jpeg`, `zip_office`, `cfbf_office`, `text`, `unknown`), and confirms it against a strict MIME allowlist (PDF, PNG/JPEG, DOCX/XLSX/PPTX, legacy DOC/XLS/PPT, plain text / CSV / markdown). Returns a discriminated result with error codes `oversize | empty_file | download_failed | unsupported_type | mime_mismatch`.
- **`registerDocument` wiring** (`src/lib/documents.functions.ts`): after the row insert (and its `upload`/`hash` breadcrumbs) but before enqueuing the AI extract job:
  - On **reject** — the row is quarantined via `supabaseAdmin`: `review_status='rejected'`, `archived_at=now()`, `archived_by=caller`, `archive_reason='auto-quarantined: <error_code>'`. No `ai_jobs` row is enqueued. Emits `sniff → quarantined` (with `error_code`, detected kind, declared mime/size, max bytes) and `extract → skipped` with `error_code: "quarantined"`. Also writes `document_access_log` with `action: "upload_quarantined"`. The doc row is returned with the updated status so the UI can surface the quarantine state.
  - On **accept** — emits `sniff → succeeded` (payload records detected kind + declared mime/size), then proceeds with the existing enqueue path and its `extract → pending|failed` breadcrumb.
- **Non-goals**: no client-side changes, no new grants, no schema changes, no user-visible copy changes. The 25 MB cap and allowlist reflect current uploader defaults; loosening either is a config-only follow-up.
- **Rollback**: delete `src/lib/document-sniff.server.ts` and remove the sniff block (lines gated by `sniffUploadedDocument`) from `registerDocument`. The original enqueue path is retained verbatim inside the acceptance branch, so removing the outer `if (!sniff.ok)` restores pre-C6 behavior. Existing quarantined rows can be restored manually by clearing `archived_at` / `review_status`.

Next: **Slice C7** — surface pipeline-run breadcrumbs to platform admins (read-only ops view over `document_pipeline_runs`) so quarantines and failed extracts become visible without a DB console.

### Slice C7 — Admin ops view over `document_pipeline_runs`
- **Server fn**: `listDocumentPipelineRuns` in `src/lib/owner/document-pipeline-runs.functions.ts` — `requireSupabaseAuth`, gated by `is_platform_admin`, filters by `stage | status | correlation_id | document_id` and a rolling `window_hours` (24 / 72 / 168 / 720). Returns up to 200 rows plus an unfiltered summary (`total`, `by_stage`, `by_status`, `quarantined`, `failed`, `window_hours`). RLS on `document_pipeline_runs` already restricts SELECT to admins; the explicit gate exists so non-admins get a clean error rather than a silent empty list.
- **Route**: `/owner/document-pipeline` (`src/routes/_authenticated/owner.document-pipeline.tsx`) rendered inside `OwnerShell`. Summary tiles across the top, stage/status/window filters, and a correlation-id-grouped list where each group expands into a per-stage table (stage, status, attempt, latency, error code/message, timestamp). Uses the standard status chips (succeeded=emerald, failed=red, quarantined=amber, skipped=muted).
- **Nav**: added under the "System Health" group in `OwnerShell.tsx` next to the existing document access audit link.
- **Non-goals**: no writes, no re-drive/replay controls, no deep link to the document detail page yet, no charting. This is a read-only ops surface for the breadcrumbs shipped in C4–C6.
- **Rollback**: delete `src/routes/_authenticated/owner.document-pipeline.tsx`, delete `src/lib/owner/document-pipeline-runs.functions.ts`, and remove the nav entry from `OwnerShell.tsx`. No schema changes.

### Slice C8 — Prompt-injection sanitizer + hardened extract prompt
- **Migration** `slice_c8_pipeline_sanitize_stage` — widens the `document_pipeline_runs.stage` CHECK constraint to include a new `sanitize` value alongside the existing `upload | sniff | hash | extract | verify | publish` set. Additive; no data migration.
- **Pure sanitizer** `src/lib/document-sanitize.ts` — exports `sanitizeUntrustedText`, `sanitizeInputSource`, `wrapUntrustedBlock`, `UNTRUSTED_OPEN` / `UNTRUSTED_CLOSE`, `UNTRUSTED_SYSTEM_SUFFIX`, and `REDACTION_TOKEN`. Walks JSON-shaped values, redacts 14 OWASP-LLM01 shapes (ignore/disregard/forget-previous, override/new instructions, role hijack, act-as, reveal-prompt, `system:` role markers, ChatML `<|im_start|>` tokens, ` ```system ` fences, `<script>` / `<iframe>` blocks, inline `on*=` handlers) with a visible `[REDACTED_INJECTION]` token, aggregates matched pattern ids, and caps each string leaf at 200 kB. Pure & isomorphic — no I/O.
- **Edge-function wiring** `supabase/functions/ai-job-processor/index.ts` — inline copy of the sanitizer (Deno bundle can't reach `src/`) plus new `processJob` behavior for `document_summary` jobs:
  - Runs `sanitizeInputSource(job.input_source)` before assembling the user prompt.
  - Wraps the serialized payload in `<UNTRUSTED_DOCUMENT_TEXT>…</UNTRUSTED_DOCUMENT_TEXT>`.
  - Appends `UNTRUSTED_SYSTEM_SUFFIX` to the system prompt so the model treats the fenced block as inert data and refuses to follow instructions inside it.
  - Emits a `sanitize → succeeded` breadcrumb (prompt_version `sanitize-v1`, latency, and a payload of `{ strings_scanned, redactions, patterns, truncated_strings }`) before the existing `extract → running` row.
  Non-document jobs are unchanged — they still send the legacy JSON prompt.
- **Test** `tests/document-sanitize.test.mjs` — 9 unit tests covering benign passthrough, ignore-previous + reveal-prompt neutralization, ChatML/role-hijack stripping, `<script>` + `onload=` removal, nested-object walking with aggregate report, oversize truncation, fence wrapper, hardened suffix contents, and non-string leaf preservation. `node --test` passes 9/9.
- **Non-goals**: no new client UI, no admin-view changes (breadcrumb already visible in `/owner/document-pipeline` from C7), no promotion-to-evidence gating (that lands in a later C slice), no schema changes beyond the CHECK widen. Existing pipeline flow is unchanged for non-`document_summary` job types.
- **Rollback**: (1) revert `processJob` in `supabase/functions/ai-job-processor/index.ts` to restore `const systemPrompt = systemPromptFor(job.job_type);` + `const userPrompt = JSON.stringify(job.input_source ?? {}, null, 2);` and remove the inline `sanitizeInputSource` block; (2) delete `src/lib/document-sanitize.ts` and `tests/document-sanitize.test.mjs`; (3) run a follow-up migration to shrink the CHECK constraint back to the original six stages after any `sanitize` rows are archived.

### Slice C9 — Verification gate on evidence promotion
- **Writer gate** `src/lib/evidence-writers.functions.ts`:
  - New exported constant `PROMOTABLE_VERIFICATION_STATES = ['human_confirmed','auto_high']` and pure helper `isEvidencePromotable(state)` — the single source of truth for "is this extraction trustworthy enough to enter the evidence graph?".
  - `emitEvidenceForConfirmedExtraction` now short-circuits before any DB call when the effective `verification_state` is not promotable, returning `{ ok: true, skipped: true, reason: 'verification_state:<state>' }`. The flag-off path returns `reason: 'flag_off'` so operators can distinguish shadow-mode from a real refusal. When admitted, the row now writes the actual computed state (not a silent fallback to `human_confirmed`).
  - Type widened: `verificationState` now accepts the full domain (`human_confirmed | auto_high | auto_low | unverified | disputed`) so callers can pass the classifier's raw output and let the gate decide, instead of pre-filtering upstream.
- **Test** `tests/evidence-verification-gate.test.mjs` — pure `node --test` suite (4/4 passing):
  - Locks the promotable set to exactly `{human_confirmed, auto_high}`.
  - Asserts `isEvidencePromotable` accepts trusted states and rejects `auto_low | unverified | disputed | '' | null | undefined | 42`.
  - Uses an "exploding" supabase stub whose `.from()` throws — proving the gate short-circuits *before* any query is dispatched for both the flag-off path and the non-promotable-state path. Any regression that removes the early return would surface as a thrown error, not a silent DB write.
- **Non-goals**: no schema change, no admin UI, no worker changes. The AI worker in C5 already emits `verify → succeeded` breadcrumbs; wiring the worker to promote auto-classified extractions once it stamps `verification_state='auto_high'` is a follow-up slice — for now every promotion path funnels through `applyAcceptedExtraction` (human-confirmed) and is now provably gated.
- **Rollback**: revert the guard block (`if (!isEvidencePromotable(state)) return ...`) and restore the previous `verification_state: args.verificationState ?? 'human_confirmed'` line; delete `tests/evidence-verification-gate.test.mjs`. No data migration needed — the gate never wrote anything it shouldn't have.

Workstream C acceptance status:
- ✅ Pipeline run-log schema (C1) + admin ops view (C7).
- ✅ Content-hash dedupe on upload (C2, C3) with breadcrumbs (C4).
- ✅ Worker extract/verify breadcrumbs (C5).
- ✅ Upload magic-byte sniff + MIME/size allowlist + quarantine (C6).
- ✅ Prompt-injection sanitizer + hardened extract prompt + `sanitize` breadcrumb (C8).
- ✅ Verification gate: extractions only enter `evidence_items` when `verification_state IN ('auto_high','human_confirmed')` (C9).

## Workstream D — Age & Stage Rules Engine + Structured Generation

### Slice D1 — Dormant rules & knowledge-source registry + report provenance stamps
- **New tables** (additive, no readers/writers wired yet):
  - `public.pathway_rules_versions` — versioned ruleset registry: `version` (unique text tag like `v2026.07.19-shadow`), `effective_at`, `retired_at`, `engine_channel` (`shadow|canary|production|retired`, default `shadow`), `description`, `checksum`, `ruleset jsonb`, audit columns. Ships every rules revision without touching production traffic.
  - `public.pathway_knowledge_sources` — citation registry for IDEA / CSDE guidance, research papers, framework docs the engine grounds on: `slug` (unique), `title`, `publisher`, `source_url`, `jurisdiction`, `kind` (`guidance|regulation|research|framework|curriculum|dataset|other`), `version`, `checksum`, `fetched_at`, `retired_at`, `metadata jsonb`.
- **Provenance stamps on `public.pathway_reports`** (all nullable, additive): `rules_version`, `prompt_version`, `model_version`, `knowledge_snapshot jsonb`, `engine_channel`. Existing rows and writers unaffected; every future engine invocation gets a line back to the exact rules/prompt/model/knowledge snapshot that produced it.
- **RLS**: both new tables admin-only (`has_role(auth.uid(),'admin')`) for SELECT and ALL. `service_role` writes via `GRANT ALL`. No parent/educator/partner path — the registry is engine-operator surface. `pathway_reports` policies unchanged (new columns inherit the existing per-student RLS).
- **Indexes**: `(engine_channel, effective_at DESC)` on rules versions for "current production" lookups; `(kind, retired_at)` on knowledge sources for "active guidance in jurisdiction X" scans.
- **Trigger**: shared `set_pathway_registry_updated_at()` (`SET search_path = public`) fires `BEFORE UPDATE` on both registry tables.
- **Linter delta**: 0 new warnings (all 50 reported warnings pre-date Workstream D — SECURITY DEFINER + extension-in-public on legacy helpers).
- **Rollback**: `ALTER TABLE public.pathway_reports DROP COLUMN engine_channel, DROP COLUMN knowledge_snapshot, DROP COLUMN model_version, DROP COLUMN prompt_version, DROP COLUMN rules_version;` then `DROP TABLE public.pathway_knowledge_sources; DROP TABLE public.pathway_rules_versions; DROP FUNCTION public.set_pathway_registry_updated_at();` — safe, no readers reference any of them.

Next: **Slice D2** — Zod `RecommendationV1` contract + engine helper that validates every recommendation against it *before* narrative generation, plus a unit test proving invalid recommendations are rejected (not silently rewritten). Structured-output enforcement is prerequisite to D3's refusal path and D4's report-stamp write path.



### Slice D2 — RecommendationV1 contract + schema-first generation gate
- **Pure module** `src/lib/pathway-recommendation-v1.ts` — isomorphic (no supabase / no react / no server imports). Exports:
  - `RecommendationV1` Zod schema. Every field is required (`schema_version=1`, `id`, `pillar`, `age_band`, `title`, `summary`, `why`, `next_action`, `owner_role`, `timeframe`, `confidence`, `discuss_at_next_meeting`, `sources[≥1]`, `provenance`) so a partial or hallucinated rec cannot silently pass. `provenance` mirrors the D1 columns (`rules_version`, `prompt_version`, `model_version`, `engine_channel`, `knowledge_ref[]`).
  - `RecommendationBatchV1` — array of recs with a uniqueness refinement on `id`.
  - `parseRecommendationV1` / `parseRecommendationBatchV1` — schema-first gates returning `{ ok, value } | { ok:false, error_code:"schema_invalid", issues }`. Callers MUST NOT downgrade a failed parse to a partial rec.
  - `assessEvidenceSufficiency(signals)` — deterministic check that every kind in `MIN_EVIDENCE_FOR_PILLAR` (`profile`, `student_voice`) is present with count > 0. Returns `{ sufficient:false, missing, reason }` otherwise.
  - `buildAssessmentRefusal(input)` — builds a valid `RecommendationV1` on the `assessment` pillar whose `next_action` is "collect the missing signals and regenerate". Belt-and-suspenders: the refusal object is re-parsed through the schema before return, so the refusal path cannot bypass the gate.
- **Tests** `tests/recommendation-v1-gate.test.mjs` — 9/9 pass under `node --experimental-strip-types --test`. Covers accept-happy-path, short-title reject, empty-sources reject, unknown-pillar reject, duplicate-id batch reject, unique-id batch accept, sufficiency-fail flags missing signals, sufficiency-pass with full min set, and refusal-rec passes the gate.
- **Dormant**: no writer/reader consumes this yet. The real engine will wire `parseRecommendationBatchV1` in front of the narrative stage in a later slice; the refusal helper will short-circuit sparse-evidence pillars before any AI call.
- **Non-goals**: no changes to `src/lib/pathway.functions.ts`, `src/lib/pathway-v2.ts`, `src/lib/demo/pathway-engine.ts`, or the AI worker. No schema/migration changes (D1 already added the provenance columns). No UI.
- **Rollback**: delete `src/lib/pathway-recommendation-v1.ts` and `tests/recommendation-v1-gate.test.mjs`. Nothing else imports either file.

Next: **Slice D3** — seed one production `pathway_rules_versions` row (channel=`shadow`) + a small set of `pathway_knowledge_sources` (IDEA 2004, CSDE Secondary Transition guidance) so future engine runs have a real ruleset/knowledge snapshot to stamp on reports.

### Slice D3 — Seed shadow-channel ruleset + IDEA/CSDE knowledge sources
- **Migration**: seeds one `pathway_rules_versions` row (`version='rules@2026.07.19-shadow'`, `engine_channel='shadow'`) whose `ruleset` jsonb encodes the age bands (MS 11-14, EHS 14-16, LHS 16-18, Post-18 18-22), the `min_evidence_for_pillar=['profile','student_voice']` gate, the four production pillars plus the `assessment` refusal pillar, allowed timeframes, and confidence levels. Matches the D2 `RecommendationV1` shape exactly so a future writer can stamp this `rules_version` on `pathway_reports` rows without translation.
- **Knowledge sources**: seeds four `pathway_knowledge_sources` rows — `idea-2004-part-b-secondary-transition` (federal IDEA regs), `csde-secondary-transition-guide-2024` (CT state manual), `ct-rights-transfer-age-18` (age-of-majority notice), `wioa-pre-ets-2014` (Pre-ETS employment grounding). Each row carries `publisher`, `source_url`, `jurisdiction`, `kind`, `version`, `checksum`, `fetched_at`, and a jsonb `metadata.covers[]` list so the engine can pick the right citation per pillar.
- **Idempotent**: both inserts use `ON CONFLICT DO NOTHING` on natural unique keys (`version` / `slug`); re-running the migration is a no-op.
- **Access**: unchanged from D1 — both registries remain admin-only via existing RLS. No new grants.
- **Dormant**: nothing reads these rows yet. D2's `RecommendationV1.provenance.knowledge_ref[]` will populate with these slugs when the real engine wires up.
- **Non-goals**: no engine changes, no writer changes, no UI, no new admin surface. `pathway_reports.rules_version` / `knowledge_snapshot` remain unset on existing rows.
- **Rollback**: `DELETE FROM public.pathway_rules_versions WHERE version='rules@2026.07.19-shadow';` and `DELETE FROM public.pathway_knowledge_sources WHERE slug IN ('idea-2004-part-b-secondary-transition','csde-secondary-transition-guide-2024','ct-rights-transfer-age-18','wioa-pre-ets-2014');`. Neither row is referenced by any writer.
- **Linter**: the migration produced no new warnings; the 50 pre-existing warnings (extension-in-public + SECURITY DEFINER function inventory) are unrelated to this slice.

Next: **Slice D4** — dormant `PathwayEngineInvocation` server-side helper (`src/lib/pathway-engine-invocation.server.ts`) that resolves the current shadow ruleset + knowledge snapshot, builds a `RecProvenance` object, and returns it to callers so the eventual writer only has to call one function to get the correct provenance stamp. Still no user-visible change; still no writer wired.

### Slice D4 — PathwayEngineInvocation provenance resolver (dormant)
- **Helper** `src/lib/pathway-engine-invocation.ts` — pure, isomorphic (no supabase / react / server imports). Exports:
  - `resolvePathwayEngineInvocation({ rulesRow, knowledgeRows, promptVersion, modelVersion, channelOverride?, maxKnowledgeRefs? })` — takes a snapshot of the D1 registries + caller identifiers, filters retired knowledge rows, formats `knowledge_ref` as `<slug>@<version>` (bare slug when version is null), caps the list at 20, and re-parses through the D2 `RecProvenance` Zod schema so the resolver can never emit a shape a downstream `RecommendationV1` gate would reject.
  - `knowledgeRefFor(row)` — deterministic slug/version formatter.
  - `provenanceToReportColumns(provenance)` — maps validated provenance into the additive `pathway_reports` columns from Slice D1 (`rules_version`, `prompt_version`, `model_version`, `engine_channel`, `knowledge_snapshot: { knowledge_ref }`).
  - Discriminated result: `{ok:true, provenance, knowledge_dropped}` or `{ok:false, error_code, message}` with codes `no_active_rules | rules_retired | invalid_channel | provenance_invalid` — never throws.
- **Test** `tests/pathway-engine-invocation.test.mjs` (9/9 passing under `node --test`) — locks the happy path (shadow ruleset + IDEA/CSDE seeds from D3), retired-knowledge exclusion, missing/retired ruleset refusals, invalid-channel refusal, `channelOverride` precedence, 20-ref cap with reported drop count, `knowledgeRefFor` formatting, and the `provenanceToReportColumns` mapping shape.
- **Non-goals**: no supabase client, no server function, no writer, no route, no user-visible copy. Registry loaders and the engine call site land in later Workstream D slices; this slice only proves the transform is correct and schema-valid in isolation.
- **Rollback**: delete `src/lib/pathway-engine-invocation.ts` and `tests/pathway-engine-invocation.test.mjs`. No schema changes, no other files touched.
