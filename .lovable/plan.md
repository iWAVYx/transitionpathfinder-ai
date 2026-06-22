# Phase 6 — High-Impact Workflow Polish

Phases 1–5 cleaned dashboards, the Pathway Report, onboarding, partner
surfaces, and verified permissions. Phase 6 attacks the **daily-use loops**
— the multi-step jobs each role actually returns for. Ranked by impact ×
how broken/clunky they are today.

## Priority order

### 6A. Family → Pathway Report generation loop (highest impact)
The Pathway Report is the flagship output, but the path *to* a report is
fragmented: upload IEP → wait → find report → open. Polish the loop so a
parent or educator can go from "I just uploaded a doc" to "here is the
report" without hunting.

- Wire a single **"Generate Pathway Report"** CTA on the student detail
  page that triggers the v2 generation pipeline and streams status
  (queued → drafting → ready) inline; remove the duplicate "Generate" /
  "Refresh" buttons currently split across IepUpload and ReportV2 panels.
- On completion, toast + auto-deep-link to `/reports/$reportId`.
- Surface `last_generated_at` + "Refresh report" inline at the top of
  `ReportView` so users know how fresh it is and can regenerate without
  leaving the page.

### 6B. Educator caseload → meeting day loop
Educators today bounce between Caseload, PPT Prep, Meeting Templates, and
Documents. Compress to one ribbon per student row.

- Add a per-student action ribbon on `/caseload`: "Open Profile · Prep
  Meeting · Open Report · Upload Doc". Each is a direct link, no extra
  clicks.
- Sort caseload by **next meeting date** by default (falls back to
  recently updated); show the date chip on each row.
- Add "Today" and "This week" filters tied to upcoming meetings.

### 6C. Parent ↔ student connection loop
Parents in onboarding capture a student, but post-onboarding there is no
clear "invite my co-parent / my child's teacher" surface. This is the
single most common support question implied by the existing
`InvitesInbox`.

- Add an **"Invite People"** card to the Parent dashboard with two
  one-click flows: Invite Co-Parent, Invite Educator. Reuse existing
  `student_collaborators` invite functions; no new schema.
- Mirror an "Invite Family" affordance on the Educator student row
  (ribbon item above) so educators can pull a parent in when a profile
  is sparse.
- Show pending invites inline on the student card with a "Resend"
  button (the function already exists; just expose it).

### 6D. Student Voice → Report linkage (smaller, finishes a loop)
Phase 3 added Student Voice starter prompts to onboarding. Close the
loop on the consumption side:

- On `ReportView` Student audience tab, show a "Your Voice in this plan"
  block that lists the 2–3 most recent Student Voice entries used as
  sources (we already track this via `SourceChips` kind=`student_voice`).
- On the Student dashboard, if there are no voice entries, the
  "Open Student Voice" tile gets an "Add your first reflection" sub-line.

## Out of scope for Phase 6

- No schema changes. Everything above reuses existing tables
  (`pathway_reports`, `student_collaborators`, `student_voice_entries`,
  `meetings`).
- No auth / RLS / 2FA / role-policy changes.
- No new routes — every change lands in an existing route or component.

## Test discipline (same as prior phases)

- Before each sub-phase: `bunx playwright test --project=dashboard-setup` → 7/7.
- After each sub-phase: `bunx playwright test --project=dashboard-regression`
  and `--project=role-access`.
- Manual smoke: walk the polished loop end-to-end in the preview as the
  affected role.

## Suggested execution order

6A → 6B → 6C → 6D. 6A and 6B share components on the student detail and
caseload pages and benefit from being done back-to-back. 6C reuses the
invite components surfaced in 6B's ribbon. 6D is the cheapest and runs
last as a finishing pass.

## Open question

Confirm before I start 6A: should the "Generate Pathway Report" CTA
**replace** the current split buttons (preferred — cleaner) or stay
additive alongside the existing controls during a transition period?
