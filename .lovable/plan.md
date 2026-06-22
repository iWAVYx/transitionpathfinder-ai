# Signed-In Product Polish — Phased Plan

A phased, regression-gated polish pass across the 7 signed-in roles, onboarding, the Pathway Report, and the partner experience. No changes to auth, 2FA, E2E config, login test IDs, or role authentication.

## Acceptance gates (run between every phase)

- `bunx playwright test --project=dashboard-setup` → 7/7
- `bunx playwright test --project=dashboard-regression` → all pass
- No duplicate links inside `<main>`, no inert enabled buttons, Title Case on all dashboard/section headings.

## Phase 1 — Dashboard copy, structure, and UI quality (broadest payoff)

Scope: all 7 role dashboards. Goal: every dashboard answers "what do I do today / what tools do I have / what's connected to me", with clean copy and no clutter.

- **Copy + a11y sweep across all dashboards**
  - Title Case all section headings via `src/lib/title-case.ts` (per project memory).
  - Replace vague CTAs (`Go`, `View`, `Open`, `View all →`, icon-only Share/Download) with specific labels: `Open Student Voice`, `Review Pathway Report`, `Download Pathway Report (PDF)`, `Share With Team`, `Manage Caseload`, `Schedule Meeting`, etc.
  - Drop the `Dashboard` breadcrumb crumb on every dashboard route (we're already on it) — fixes Parent, Educator, Partner, Owner trails that link back to `/dashboard` and bounce through the wrong role.
- **Per-role dashboard structure normalization** — every dashboard gets the same six-region scaffold (skip a region if there's no data for that role):
  1. Role-specific heading + sub-line (what this surface is for)
  2. Next Best Step
  3. Role-specific tools (tiles)
  4. Recent / important activity
  5. Connected people or organizations
  6. Documents / reports / calendar / action items as appropriate
- **Role-specific gaps to close** (from audit):
  - Student: drop duplicate `Next Best Steps` landmark+heading; add "Your Team" connections card; rename `View all →` to `Open All Goals`.
  - Parent: add Activity feed (recent updates on the connected student); empty-state copy on connections; rename icon-only Share/Download to labeled buttons; multi-student switcher in the header if `>1` student.
  - Educator: add Document Hub shortcut + Upcoming Meetings rollup; rename "Add Student" → "Invite Student"; fix Caseload breadcrumb (no Dashboard link back to family view).
  - School Admin: rename "View Reports" → "Open School Reports"; add Recent Activity rail (new students, new staff invites accepted).
  - District Admin: normalize "Educators / Case Mgrs" stat label; rename quick actions to specific verbs; add Compliance Highlights rail (already partially there).
  - Partner: fix breadcrumb (no `/dashboard` link); ensure "Opportunity Objectives / Program Focus / Partnership Priorities / Support Opportunities" partner-safe wording per spec; rename `New opportunity` → `Create Opportunity`.
  - Platform Admin: rename meta description to match "Platform Admin" terminology; remove stray `Dashboard` links from owner sub-routes.
- **UI quality regressions**: enforce `type="button"`, no duplicate hrefs in `<main>`, even tile sizing, mobile-safe layouts.

## Phase 2 — Pathway Report as flagship output

Scope: `src/components/pathway/ReportView.tsx` + `ReportV2Sections.tsx`.

- Add a `student` audience toggle to `ReportView` (currently only `family | educator`).
- Add a top **Student Snapshot** card for all audiences (name, grade, school, graduation year, readiness, confidence, last updated, **next review date**).
- Surface `review_date` (add to schema if missing — see Open Questions below).
- Strengthen the closing footer: "Not a legal determination" planning disclaimer block, plain-language summary, AI-drafted disclosure, confidentiality note. Distinct from the existing minimal footer.
- Consolidate v1 + v2 overlap so a v2 report doesn't render IEP summary, education, employment, partner matches, and meeting prep twice. Decision: when `isV2(content)`, render the v2 section in place of the v1 equivalent.
- Replace dual "Print" + "Download as PDF" buttons (both `window.print()`) with a single **Download Pathway Report (PDF)** button + a print-optimized stylesheet pass to make the printed output read like a real planning document.
- Add role-specific Action Plan sections (Student, Family, Educator) at the bottom — already mostly present; clean copy + Title Case headings.
- Add Confidence/Readiness chips inline near each pathway recommendation.

## Phase 3 — Onboarding chronological audit

Scope: `src/routes/_authenticated/onboarding.tsx`, `src/lib/onboarding-questions.ts`.

- **Student**: role → grade/age → school/district → connected parent/educator (new step: invite or claim a connection) → Student Voice starter prompts (new step) → optional document upload → dashboard.
- **Parent**: role → connect child (existing) → school/district (new step if not inferred from student) → consent/sharing expectations (new step pulling from existing consent cards) → priorities/concerns (existing) → document upload (new optional step) → dashboard.
- **Educator**: role → school/district connection (new step) → caseload setup (existing) → invite/connect students (new step) → document/planning responsibilities (informational step) → caseload.
- **School Admin / District Admin**: add org-linking step (currently missing — they land on empty overview pages). Either claim an existing org by invite token or request a new org.
- **Partner**: add org profile creation step in onboarding (currently deferred to `FirstRunSetup` inside the workspace) → services/opportunity categories → eligibility/location → posting rules informational → PartnerForward supports informational → partner workspace.
- **Platform Admin**: no end-user onboarding; if reached, route to `/owner`.

## Phase 4 — Partner experience hardening

Scope: `src/routes/partner-directory.tsx`, `src/routes/_authenticated/partners-manage.tsx`, `src/components/dashboard/OpportunityStatusStats.tsx`.

- Normalize opportunity status labels to **Draft / In Review / Live / Archived** (map: `draft`→Draft, `pending_review`→In Review, `approved`→Live, `inactive`→Archived). Update `StatusPill`, filters, and stats widget consistently.
- Partner Directory: add filterable facets for service type, opportunity type, age/grade fit (already has county + pathway). Confirm no private student data is fetched or rendered (already clean per audit).
- Partner Dashboard: replace any student-borrowed wording (goals/etc.) with **Opportunity Objectives / Program Focus / Partnership Priorities / Support Opportunities**.
- Add an Impact summary card to the main Opportunities tab (currently only on the `_.impact` sub-route).

## Phase 5 — Role permissions audit (verification, not redesign)

Scope: `src/components/RoleGuard.tsx`, `src/lib/role-policy.ts`, `src/routes/_authenticated/owner.tsx`.

- Verify `owner.tsx` guards `/owner/*` for `admin` only — add a `withRoleGuard(["admin"])` wrapper if missing.
- Confirm `/opportunities` does not show partner-only management UI to students/families.
- Confirm `parent` audience cannot reach unrelated student detail pages (RLS-enforced, but re-check `RoleGuard` for `/students/$id`).
- Document the result in `docs/qa/` and update `mem://security-memory.md` if anything changes.

---

## Technical notes

- **File touchpoints (estimate):** ~25 component/route files in Phase 1, ~4 in Phase 2, ~6 in Phase 3, ~5 in Phase 4, ~3 in Phase 5.
- **Schema work (Phase 2 only):** likely 1 migration to add `review_date` to `pathway_reports` if absent; will confirm via `supabase--read_query` before writing the migration.
- **Style of edits:** copy + structure changes only — no business-logic or RLS changes outside Phase 5 verification.
- **Test discipline:** I will run `dashboard-setup` once at the start of every phase to confirm baseline 7/7, then `dashboard-regression` at the end of each phase. If a regression introduces a failure, I fix it before moving to the next phase.

## Open questions to confirm before Phase 2 + 3 (not blockers for Phase 1)

1. Does `pathway_reports.review_date` already exist? If not, OK to add a nullable column?
2. School/District Admin org-linking — invite-token model, or a "request to claim org" admin queue?
3. Should students see the full `ReportView` with a student-tailored audience toggle, or keep them on the dashboard summary view only?

## Suggested order

Start with Phase 1 (highest visible payoff, exercises the existing regression suite hardest). After Phase 1 lands clean, confirm answers to the three open questions, then proceed Phase 2 → 3 → 4 → 5.
