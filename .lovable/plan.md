# BridgeForward + PartnerForward Backend Implementation

This is a large, multi-phase backend pass. No redesign — we extend the existing schema, add admin source management, seed real CT data, and wire matching + frontend hooks. Below is the plan; I'll execute it in ordered phases to keep migrations approvable and reviewable.

## Scope guardrails

- **No UI redesign.** Reuse `SiteShell`, `Breadcrumbs`, existing card/table primitives, admin shell.
- **BridgeForward = gr 6-8 HS planning.** Not partners.
- **PartnerForward = partner incentives/funding layer.** Not Partner Network/Opportunity Directory.
- **Cautious language** everywhere ("possible fit", "review with school team", "consult a qualified professional").
- **RLS first.** Partners can't reach student data. BF records scoped via `can_access_student`. PF management scoped to platform admins; partners get read-only published view.

---

## Phase 1 — BridgeForward schema (migration 1)

New tables (all in `public`, all with GRANTs + RLS + policies):

- `ct_high_schools` — canonical CT high school directory (name, district, city, county, school_type enum, grades_served, urls, application_window, transportation_notes, source_url, verification_status, last_verified_at).
- `ct_high_school_programs` — programs per school (program_name, program_category enum, description, student_fit_tags text[], support_considerations, application_requirements, source_url, verification_status, last_verified_at).
- `high_school_program_tags` — controlled tag vocabulary (slug, label, category, description) for matching.
- `bridgeforward_school_matches` — saved/computed matches per (student_id, school_id, program_id?) with reasons jsonb, questions_to_ask text[], saved_by, status (suggested/saved/discussed/dismissed).
- `bridgeforward_resources` — curated articles/guides for families (title, summary, body, audience, url, tags, status).
- `bridgeforward_source_records` — raw imported rows awaiting admin review (source_name, source_url, raw jsonb, normalized jsonb, import_status, dedupe_key, suggested_school_id).
- `bridgeforward_import_reviews` — admin actions on source records (reviewer_id, action: approve/reject/merge/needs_changes, notes, target_school_id).

Enums: `ct_school_type`, `ct_program_category`, `bf_verification_status`, `bf_match_status`, `bf_import_status`.

**Access policies:**
- `ct_high_schools` / `ct_high_school_programs` / `high_school_program_tags` / `bridgeforward_resources`: `SELECT` to `authenticated` where `verification_status IN ('verified')` OR `has_role(admin)`. Full mutate only for admins. Anon `SELECT` for verified rows (public discoverability of school directory — non-PII).
- `bridgeforward_school_matches`: scoped via `can_access_student` for both read and write.
- `bridgeforward_source_records` / `bridgeforward_import_reviews`: admin-only.

Extends existing `bridgeforward_profiles` already present — leave as-is, only reference.

## Phase 2 — PartnerForward schema (migration 2)

We already have `partner_incentive_resources`. Add the missing surface to match spec without duplicating:

- `partnerforward_resources` — new table aligned with spec fields (title, category, summary, partner_value, eligibility_notes, action_steps, official_url, source_name, source_type enum, status enum, legal_financial_disclaimer_required, last_verified_at). We'll keep `partner_incentive_resources` for backward compat but route new admin/public flows through `partnerforward_resources`. The existing `listPublishedIncentives` server fn will be updated to read from the new table.
- `partnerforward_resource_sources` — source-of-truth registry (name, type, url, notes, last_checked_at).
- `partnerforward_incentive_categories` — controlled vocabulary (slug, label, description, disclaimer_required).
- `partnerforward_partner_saved_resources` — partner-user saves (partner_user_id, resource_id, notes).
- `partnerforward_admin_reviews` — admin review trail on resources.

**Access policies:**
- `partnerforward_resources`: `SELECT` where `status='published'` for `authenticated` (any role can read published incentives, including partners and public landing). Admin full mutate.
- `partnerforward_partner_saved_resources`: scoped to `auth.uid()` — partner saves only.
- `partnerforward_admin_reviews` / sources / categories: admin-only mutate, read where appropriate.

## Phase 3 — Server functions

New `.functions.ts` modules (all under `src/lib/`, all client-safe, handlers use `requireSupabaseAuth`):

- `src/lib/bridgeforward-schools.functions.ts`
  - `listCtHighSchools({ filters })` — public verified directory.
  - `getCtHighSchool({ id })` with programs joined.
  - `searchSchoolsForStudent({ studentId })` — matching engine.
  - `saveSchoolMatch`, `listSavedMatches`, `updateMatchStatus`.
- `src/lib/bridgeforward-admin.functions.ts` (admin-gated via `has_role`):
  - `adminListSourceRecords`, `adminImportSourceRecord`, `adminReviewSourceRecord`, `adminUpsertSchool`, `adminUpsertProgram`, `adminDeduplicateSchools`, `adminArchiveSchool`.
- `src/lib/partnerforward.functions.ts` (extend existing):
  - Replace/augment `listPublishedIncentives` to read from `partnerforward_resources` with fallback.
  - `savePartnerResource`, `listSavedResources` (partner-only).
- `src/lib/partnerforward-admin.functions.ts` (admin):
  - `adminListResources`, `adminUpsertResource`, `adminReviewResource`, `adminArchiveResource`, `adminListSources`, `adminUpsertSource`.

Matching engine details:
- Pull student grade + `bridgeforward_profiles` row.
- Score each verified school+program against: interests vs `student_fit_tags`, favorite_subjects vs program_category, support_needs vs support_considerations, transportation_notes proximity (string heuristic), preferred_school_environment, high_school_options_considered (boost), family_concerns (flag risks).
- Return ranked list with `reasons[]`, `student_factors[]`, `questions_to_ask[]`, `needs_review[]`, `discuss_with_team` flag — all using cautious language constants.

## Phase 4 — Seed data (insert tool, after migrations approved)

- **CT high schools seed:** ~40-60 representative schools covering each `school_type` — comprehensive publics from major districts (Hartford, New Haven, Bridgeport, Stamford, Waterbury, Greenwich, West Hartford, etc.), all 17 CTECS technical schools, RSCO magnets, ag-science (ASTE) centers, charter directory, Open Choice. Each row: `verification_status='needs_review'` unless from CSDE/EdSight (those marked `verified` with `source_url`). Programs added for CTECS trades, magnet specialties, ASTE pathways.
- **Tag vocabulary:** ~30 tags (stem, arts, trades, small_learning_community, executive_function_supports, sensory_friendly, project_based, dual_enrollment, etc.).
- **BridgeForward resources:** 8-12 family-facing guides ("How CT high school choice works", "Questions to ask on a school tour", "Understanding CTECS", "Magnet vs Open Choice", "Transition planning at 14", etc.).
- **PartnerForward resources:** seed the spec list — Disabled Access Credit, Barrier Removal Deduction, **WOTC (status: `needs_review`, disclaimer required, note authorization through 12/31/2025)**, CT BRS employer supports, free disability awareness training (CT BRS / disability:IN), VR employer partnerships, Level Up / Pre-ETS context, CT Workforce Development Boards (5 regional), accessibility/accommodation resources (JAN), inclusive hiring toolkits (EARN, disability:IN). Each with cautious copy + official URL + `legal_financial_disclaimer_required=true` on tax/funding items.

## Phase 5 — Frontend wiring (no redesign)

- **BridgeForward route** (`src/routes/bridgeforward.tsx` exists) — add tabs/sections: My Profile (existing), Explore Schools (new — uses `searchSchoolsForStudent`), Saved Matches, Resources. Render with existing `Card`, `Tabs`, `Table` primitives.
- **Eligibility gate** — existing `getProgramEligibility` already returns `hasMiddleSchoolStudent`. Use it to:
  - Show BF nav entry only for families/educators with a gr 6-8 student or for admins.
  - Hide for partners always.
- **Admin Hub**:
  - New route `src/routes/_authenticated/admin/bridgeforward-sources.tsx` — Source Manager (list, review, approve/reject, manual add, dedupe, tag, archive). Admin-gated.
  - New route `src/routes/_authenticated/admin/partnerforward-resources.tsx` — PF Resource Manager.
  - Add nav entries to existing admin nav component.
- **Partner Dashboard**: add "Incentives & Support" link pointing to existing `/partnerforward/incentives` route (already exists, just ensure visible from partner dashboard nav).
- **Public PartnerForward landing** (`src/routes/partnerforward.tsx` exists) — keep marketing copy, ensure it explains what PF is without exposing management.

All new screens: explicit `isLoading`, empty, error, and success states with toasts.

## Phase 6 — QA verification

Walk the 10 QA points end-to-end:
1. Admin imports source → record appears with `needs_review`.
2. Admin tags a program → tag persists, surfaces in match reasons.
3. Gr 6-8 family runs matching, saves matches → persists after refresh.
4. Match output renders reasons/questions/needs-review/discuss-with-team.
5. Partner sees Incentives & Support resources (published only).
6. Confirm PF page does NOT list partner orgs or opportunities (separation).
7. Admin CRUDs PF resources.
8. Grep new copy for "qualify", "guaranteed", "you will receive" — must not exist; only cautious phrasing.
9. Confirm RLS: partner role cannot SELECT from `students`, `bridgeforward_*`, `pathway_reports` (verify via `supabase--read_query` with role simulation or policy review).
10. Hard-refresh each new page; data reloads from server fns.

## Technical notes

- All new public-schema tables include `GRANT` block immediately after `CREATE TABLE`, then `ENABLE RLS`, then policies — per project conventions.
- Reuse `has_role(uid, 'admin')` and `can_access_student(uid, student_id)` security-definer fns. No new role tables.
- All server fns: `createServerFn` + `requireSupabaseAuth` middleware; admin-gated fns assert `has_role` via supabase RPC before privileged ops; if admin client needed, `await import('@/integrations/supabase/client.server')` inside handler.
- No edits to auto-generated Supabase client files or `client.server.ts`.
- Migrations run in 2 batches (BF then PF) to keep each diff reviewable. Seeds via `supabase--insert` after migrations are approved and types regenerate.
- Frontend uses `useServerFn` + `useQuery` pattern already established in codebase.

## Order of operations

1. Migration 1: BridgeForward schema + policies.
2. Migration 2: PartnerForward schema + policies.
3. Seed BF tags, schools, programs, resources (insert tool).
4. Seed PF categories, sources, resources (insert tool).
5. Write all server fn modules.
6. Update existing `partnerforward.functions.ts` to read new table.
7. Build BF Explore Schools UI + Saved Matches.
8. Build BF admin Source Manager.
9. Build PF admin Resource Manager.
10. Wire nav visibility (uses existing `getProgramEligibility`).
11. QA pass against the 10 acceptance points.

Estimated: ~2 large migrations, ~6 new server-fn files, ~4 new route files, ~3 nav edits, ~80-100 seed rows.

Reply **approve** to proceed, or tell me what to adjust (scope, seed depth, which CT schools to prioritize, whether to also migrate existing `partner_incentive_resources` rows into the new table, etc.).
