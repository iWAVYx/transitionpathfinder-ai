# A-to-Z Compliance-Aware Service Flow — Acceptance

This pass extends the original A-to-Z acceptance with the IDEA / FERPA-aware
service flow work (Phases A–E).

## Phase A — Transfer of Rights tracking
- ✅ `students.rights_status` + `rights_transfer_status` history table (RLS via `can_access_student` / `can_edit_student`).
- ✅ `RightsStatusCard` on every student profile with "not legal advice" disclaimer and age-17 reminder.
- ✅ `setRightsStatus` writes to `audit_log` and inserts a `consent_records` entry when continued parent/guardian access is authorized.

## Phase B — Student-facing access
- ✅ New `view_student_friendly_summary` permission level on `document_permissions`.
- ✅ `getStudentFriendlyDocumentSummary` + `listStudentFriendlyDocuments` server fns (no extra AI calls — reuse extractions).
- ✅ `MyIepSummaryCard` on the student dashboard.
- ✅ Auto-grant: when a student is marked `rights_transferred_to_student`, the connected `student_user_id` is granted `view_document` on every IEP / transition-plan document for that student.

## Phase C — Parent / guardian consent records
- ✅ `consent_records` write inside `setRightsStatus` whenever the student authorizes continued parent/guardian access or status is `parent_guardian_authorized_by_student`.
- ✅ "Authorize continued parent/guardian access" toggle in the Rights Status dialog.

## Phase D — CT age prompts, partner privacy, copy hygiene
- ✅ `lib/transition-age.ts` derives band (`early` / `age_14` / `age_16` / `age_17` / `age_18_plus` / `exit_year`) from DOB + grade.
- ✅ `CtTransitionPrompts` on every student profile.
- ✅ `lib/legal-copy.ts` exports `PRIVACY_UPLOAD`, `AI_REVIEW`, `PARTNER_PRIVACY`, `NOT_LEGAL_ADVICE`, `NOT_OFFICIAL_IEP` for single-source disclaimer language.
- ✅ Partner audience is **hard-disabled** for IEP / transition-plan documents in `DocumentPermissionsDialog` — visible amber warning + explicit "Partner organizations cannot be granted access" copy.

## Phase E — Audit surfacing + Platform Admin compliance checklist
- ✅ `listStudentAuditTrail` + `AuditTrailPanel` on student profile.
- ✅ 12 compliance & trust items seeded into `system_health_checks` under category `compliance`, surfaced in the existing Platform Admin checklist UI.

## Out of scope (unchanged)
- No visual redesign, no role renames.
- Admin Hub, Resource Library, Partner Network, Calendar, Action Items, Meeting Prep, Pathway Report structures untouched.
- No new auth providers.
- No legal-advice language; all disclaimers point to district / counsel.
