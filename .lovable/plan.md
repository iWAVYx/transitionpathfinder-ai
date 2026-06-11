
# TransitionForward A-to-Z Service Logic Pass

This is a large, multi-area pass. To avoid breaking the existing platform, I'll ship it in **6 sequenced phases**, each independently shippable and verifiable. No redesign — only filling gaps, wiring the journey end-to-end, and adding the missing permission/extraction layer.

I'll check in between phases so you can redirect if needed.

---

## Phase 1 — Journey clarity & role-based Next Best Actions

Goal: Make the full A-to-Z flow legible from every dashboard without changing layouts.

- Audit `NextBestAction` + `getNextBestAction` server fn and expand the rule set per role (student, family, educator/case manager, school_admin, district_admin, partner, platform admin) to match the 13-step "Next Best Action" matrix in the brief.
- Add a one-time, dismissible **"How TransitionForward works"** journey strip (7 steps: Sign in → Student → Upload IEP → Review → Voice/Family/Educator inputs → Pathway Report → Act & meet) on each role dashboard. Reuses existing card components.
- Tighten empty states on Students, Documents, Reports, Calendar, Action Items, Meetings to point to the next step in the journey.
- Verify "Educator / Case Manager" wording is consistent (sweep for "Educator" → "Educator / Case Manager" in role labels, onboarding copy, NBAs).
- Confirm Platform Admin vs School Admin vs District Admin are never collapsed in copy or routing.

## Phase 2 — Student profile as the hub (fill gaps only)

Goal: Make the student profile clearly the center, without restructuring the page.

- Audit `students.$studentId.tsx` against the brief's Basic / Transition / Services / Voice / Documents sections. Add the missing fields to `student_profiles` / `transition_profiles` (independent living, community participation, self-advocacy, transportation, daily living, agency connections) via migration only if not already there.
- Add a compact **Profile Completeness** chip on the student page header (uses existing data — no new infra).
- Surface "Create student" entry from the empty-state of every relevant dashboard.

## Phase 3 — IEP upload & document permissions (core)

Goal: Make IEP upload a first-class, multi-entry workflow with real permissions.

- Generalize the existing `FamilyDocumentUpload` into a shared **`DocumentUploadFlow`** with the 6-step model (Select student → Upload → Type → Details → Privacy notice → Save). Keep the family variant as a thin wrapper.
- Add entry points: Onboarding, Student profile, Documents tab, Pathway Report setup, Meeting Prep, Family dashboard, Educator dashboard. Each entry passes a pre-selected student where applicable.
- Migration: `document_permissions` table (id, document_id, student_id, user_id NULLABLE, role_type NULLABLE, permission_level enum [`none`,`view_summary`,`view_document`,`edit_metadata`,`manage`], granted_by, timestamps) with proper GRANTs + RLS scoped through `can_access_student` and a new `can_view_document(_user_id, _document_id)` security-definer fn.
- Update document list/download server fns to enforce `can_view_document`. Partner role is hard-blocked from IEPs and student docs at the RLS layer (already true via `can_access_student`; double-check and add a regression test).
- Add document-detail fields if missing: `document_type` (already exists per code), `school_year`, `meeting_date`, `effective_date`, `review_date`, `visibility` (`private` / `team` / `family` / `student`), `consent_acknowledged_at`.
- Add the privacy/consent reminder copy as a required checkbox in the flow.

## Phase 4 — Guided IEP review & extraction

Goal: Turn the existing one-shot extractor into a section-by-section review surface that can feed the Pathway Report.

- Migration: `document_extractions` table per the brief (status enum, per-section extracted fields, `missing_information`, `review_notes`, reviewer, timestamps). GRANT + RLS via `can_access_student`.
- Reuse `extractFromIep` to populate a `document_extractions` row with `status = needs_review`.
- New route segment on the student page (or a `documents/$documentId/review` modal route under `_authenticated`) with section cards: Student Info, School Info, Transition Goals, Services, Accommodations, Strengths, Needs, Meeting Dates, Missing Information, Suggested Questions. Each card: Accept / Edit / Reject / Uncertain + notes.
- Only Accepted sections write through to `student_profiles` / `transition_profiles` and become eligible inputs for Pathway Report generation.
- Add the trust copy verbatim where extraction is shown.

## Phase 5 — Pathway Report wiring & Meeting Prep linkage

Goal: Ensure the Pathway Report visibly draws from all the right sources, and Meeting Prep connects back.

- Audit `pathway.functions.ts` `generateReport`/`saveReport` inputs and confirm all 21 sections from the brief are represented (most are — fill any gaps as additive fields in `pathway_reports.content` JSON; no destructive schema change).
- Source badges on the report sections ("From IEP", "From Student Voice", "From Family input", "From Educator input") so users can see what fed each section. Pure UI on `ReportView`.
- Migration: `pathway_report_versions` (id, report_id, version_number, content snapshot, created_by, created_at) + a version-bump on `saveReport`. List previous versions on the report page.
- Meeting Prep: ensure `ppt_meeting_preps` pulls latest Pathway Report summary, missing-info list, and student voice. Add a "Documents to review" picker that lists the student's documents respecting `can_view_document`.

## Phase 6 — Cross-cutting glue, privacy copy, audit

Goal: Final tightening so the journey is consistent and safe.

- Add the standard privacy/AI-disclaimer block (reuses `AIDisclaimer`/`TrustNote`) to: IEP upload, IEP review, Pathway Report top, Resource recommendations, Partner matches.
- Action item creation: ensure "Create action item" buttons exist on Pathway Report sections, Resource cards, Partner cards, Meeting notes (most exist — fill the gaps).
- Calendar: confirm IEP review_date / partner deadlines / action item due dates / meeting dates all surface in `calendar_events`. Add a server-fn helper to backfill missing event rows when those dates are set.
- Audit log: log document views, document permission grants, and IEP extraction reviews into existing `audit_log`.
- Acceptance sweep against the 22-point checklist; produce a short pass/fail table in `docs/atoz-acceptance.md`.

---

## Out of scope (explicitly not touched)

- No visual redesign, no branding changes, no public marketing page restructuring.
- No changes to Admin Hub, Resource Library, Partner Network, Calendar, Action Items, or Pathway Report **structure** — only additive fields, source badges, version history, and wiring.
- No new auth providers, no role renames.
- PDF export for the Pathway Report stays where it is (brief says "eventually downloadable").

---

## Technical notes (for reviewers)

- All new tables: `CREATE TABLE` → `GRANT` (authenticated + service_role; no anon) → `ENABLE RLS` → policies through `can_access_student` / `can_view_document` security-definer fns. Privilege escalation guard: never `GRANT UPDATE` on `user_roles`.
- All new server fns: `createServerFn` with `requireSupabaseAuth`; admin client only when explicitly authorized (e.g. permission grants by owner).
- All file edits are additive or surgical — no big rewrites of existing routes.
- After each phase I'll verify build + targeted checks (RLS regression tests for document_permissions, role-guard matrix for new entry points).

---

## What I need from you before starting

1. **Approve the phased approach** (or tell me to collapse/reorder phases).
2. **Phase 3 permission_level granularity** — the brief lists 5 levels (`none`, `view_summary`, `view_document`, `edit_metadata`, `manage`). OK to ship all 5, or do you want to start with just `view_summary` / `view_document` / `manage` and add the rest later?
3. **Phase 4 review UI** — prefer (a) inline section cards on the student page, or (b) a dedicated `/documents/$id/review` route? I'd recommend (b) for focus.

Once you answer, I'll start Phase 1.
