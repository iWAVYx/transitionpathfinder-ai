
# TransitionForward — Compliance-Aware Service Flow Pass

Builds on the just-completed A-to-Z pass (Phases 1–6). No redesign, no role renames, no structural changes to Admin Hub, Resource Library, Partner Network, Calendar, Action Items, Meeting Prep, Pathway Report, or public marketing pages. Five additive phases, each independently shippable and verifiable. I'll check in between phases.

---

## Phase A — Rights status & Transfer-of-Rights tracking

Goal: Encode IDEA's age-18 transfer of rights so the platform can reason about who controls sharing for each student.

- Migration: add `rights_status` enum to `students` (`under_18_parent_rights_active`, `approaching_transfer_of_rights`, `rights_transferred_to_student`, `student_shared_decision_making`, `parent_guardian_authorized_by_student`, `legal_representative_or_conservator`, `unknown_needs_review`) defaulting to `unknown_needs_review`, plus `transfer_notice_acknowledged_at`.
- Migration: new `rights_transfer_status` table (id, student_id, current_status, transfer_notice_date, student_authorized_parent_access, decision_making_notes, legal_representative_notes, reviewed_by_user_id, timestamps) with RLS scoped through `can_access_student` and an authorize-by-edit check via `can_edit_student`.
- Server fns: `getRightsStatus`, `setRightsStatus` (logs to `audit_log` and writes a `consent_records` row when access is authorized by a student post-18).
- UI: `RightsStatusCard` on the student profile header, just above existing `ProfileCompleteness`. Shows current status, last reviewed date, and a one-click "Review now" dialog with the seven options + free-text notes. Includes the explicit "this is not legal advice — check district guidance" disclaimer.
- Reminders: when current age ≥ 17 (derived from DOB on `students`), surface a dismissible advisory on the dashboard via `NextBestAction` rule extension (no schema change).

## Phase B — Student-facing access (the student is not excluded)

Goal: Give the student role a real surface for their own transition information.

- Add `view_student_friendly_summary` to the existing `permission_level` enum on `document_permissions` (migration). Update `can_view_document` to still gate full document text behind `view_document` or higher, but allow a separate "student-friendly summary" path.
- Server fn `getStudentFriendlyDocumentSummary` that returns a plain-language synthesis built from the already-stored extraction sections (no new AI calls — reuse `document_extractions.sections`). Falls back to "Your team is still preparing this summary" when extraction isn't complete.
- New panel `StudentPathwayPanel` on the student dashboard (`/dashboard` when role = student): renders the student's transition goals, accommodations in plain language, Student Voice responses, latest Pathway Report student sections, action items assigned to the student, and meeting-prep questions written for the student. Pure composition over existing data; no new tables.
- Document list on the student surface: every document the student is connected to is listed. If permission is only `view_student_friendly_summary`, show a "View student summary" button (opens the panel) and a clear "Ask your team for the full document" CTA instead of hiding the row.
- Default rule on student-self-owned profiles (post-18 with `rights_transferred_to_student`): student gets `view_document` on their own IEPs unless explicitly overridden.

## Phase C — Parent / guardian access controls & consent records

Goal: Make parent access explicit, revocable, and tied to rights status — without removing existing family functionality.

- Migration: ensure `consent_records` has the columns we need (student_id, granted_by_user_id, granted_to_user_id, scope text[], basis enum [`parent_rights`, `student_authorization`, `legal_representative`, `school_authorization`], effective_at, revoked_at, notes). Extend if missing; otherwise reuse.
- Server fns: `recordConsent`, `revokeConsent`, `listConsentsForStudent` — all `requireSupabaseAuth` + `can_edit_student` (or self-as-student post-18). Every grant/revoke writes to `audit_log`.
- UI: extend `CollaboratorsPanel` (or sibling panel) with a "Family & guardian access" section. Shows current parent/guardian rows from `student_guardians` and overlays consent status from `consent_records`. After `rights_transferred_to_student`, the student (or owner) must explicitly toggle "Authorize continued parent/guardian access" before the parent retains view rights — the toggle creates/revokes a `consent_records` row.
- Copy: add the FERPA-aware reminder block verbatim ("This document may contain sensitive student information…") on every grant action.

## Phase D — CT age-based prompts, partner privacy hardening, compliance copy

Goal: Make the platform visibly Connecticut-aware and tighten the partner-vs-student-record boundary.

- Age helper `lib/transition-age.ts`: derive `currentAge` from `students.date_of_birth` and map to `early` / `age_14` / `age_16` / `age_17` / `age_18_plus` / `exit_year` bands. Drives a small `CtTransitionPrompts` strip on the student profile (under Rights status) with the band-specific message from the brief. No new tables.
- Extend `getNextBestAction` rules with age-banded advisories for student/family/educator surfaces (e.g. "Start work-based learning conversations" at 16+; "Prepare for transfer of rights" at 17).
- Partner privacy hardening:
  - Audit existing partner-facing server fns (`partner-*.functions.ts`) and confirm none expose IEP rows, document storage paths, signed URLs, or transition_profiles. Add a regression test snapshot `tests/partner-pii-isolation.test.mjs` that asserts a partner-role JWT cannot select from `documents`, `document_extractions`, `transition_profiles`, `student_voice_responses`.
  - Add explicit "Partner organizations cannot view IEPs or private student documents…" notice on the partner directory empty state and on the document permissions dialog when a partner audience is even considered (gray-out the partner option for IEP/transition-plan document types).
- Standardize disclaimer copy: a tiny `lib/legal-copy.ts` exporting `PRIVACY_UPLOAD`, `AI_REVIEW`, `PARTNER_PRIVACY`, `NOT_LEGAL_ADVICE`, `NOT_OFFICIAL_IEP` strings, and replace the existing scattered phrasings with imports so future audits are single-source.

## Phase E — Audit log surfacing, Platform Admin compliance checklist, acceptance pass

Goal: Make the existing audit log usable, give Platform Admin a real compliance pulse, and close out the criteria.

- Server fn `listStudentAuditTrail(student_id, limit)` filtered to actions on that student's documents/permissions/extractions, scoped through `can_edit_student`. Surface in a collapsed `AuditTrailPanel` on the student profile.
- Extend `SystemHealthChecklist` (exists in `src/components/owner/`) with a Compliance & Trust section covering the 12-item checklist from the brief. Each item is a derived check (e.g. "Transfer of rights tracked" = at least one row in `rights_transfer_status`; "AI disclaimer active" = constant-true after Phase D; "Partner privacy restrictions active" = regression test snapshot present). Pure read; no schema changes.
- Wire `logDocumentView` (already shipped) into the document download/view paths that don't yet call it, so the audit trail isn't empty.
- Update `docs/atoz-acceptance.md` with the compliance criteria from the brief and check each one off with a one-line evidence pointer.

---

## Out of scope (explicitly not touched)

- No visual redesign, no role renames, no public marketing page restructuring.
- No new auth providers, no changes to Admin Hub / Resource Library / Partner Network / Calendar / Action Items / Pathway Report **structure**.
- Native PDF export of Pathway Reports stays where it is.
- No legal-advice text — every disclaimer points to district/official guidance.

---

## Technical notes (for reviewers)

- All new tables: `CREATE TABLE` → `GRANT` (authenticated + service_role; no anon) → `ENABLE RLS` → policies through `can_access_student` / `can_edit_student` / `can_view_document`. Never `GRANT UPDATE` on `user_roles`.
- Enum extensions (`permission_level`, `rights_status`) ship as `ALTER TYPE … ADD VALUE` in their own migration so they're commit-safe.
- All new server fns: `createServerFn` + `requireSupabaseAuth`. Admin client only when a server-side identity resolution is required (e.g. resolving an email to a user id for consent grants — already the pattern in Phase 3).
- Reuses existing `document_extractions`, `consent_records`, `audit_log`, `student_guardians`, `transition_profiles` rather than duplicating.
- Each phase ends with a build verify; Phases A/B/C/D also run targeted RLS regression tests.

---

## What I need from you before starting

1. **Approve the 5-phase order** (A → B → C → D → E) or tell me to reshuffle.
2. **Phase B default for post-18 students**: OK to auto-grant the self-owned student `view_document` on their own IEPs once `rights_transferred_to_student` is set, or do you want it to stay opt-in?
3. **Phase D partner audience for IEP docs**: hard-disable in the UI (recommended), or allow with a forced consent record + extra warning?

Once you answer, I'll start Phase A.
