# TransitionForward — Readiness Audit, Safe Improvements, and Roadmap

I ran a full static audit across every signed-in role and the Pathway Report surface. Most primary flows already round-trip real data to the backend. The platform is in much better shape than its surface suggests — the work below is targeted polish + a handful of real GAPs, not a rewrite.

This plan has three parts:
1. **What I found** (per role, condensed).
2. **What I will change now** (safe, high-value, non-breaking).
3. **What goes in the roadmap** (P0 / P1 / P2) — delivered as a checked-in markdown doc.

I will not touch: the integration-managed `_authenticated/route.tsx`, role guards (`withRoleGuard`, `has_role`), owner 2FA, `/auth`, dashboard `<main>` test IDs, or anything the dashboard-regression / role-access E2E projects assert on.

---

## 1. Audit Findings (condensed)

### Student
WORKS: action items, BridgeForward save, JourneyStrip/Checklist persistence, age-band split (6–8 → BridgeForward, 9–12 → Pathway).
GAP: A signed-in student with no linked student record sees an instructional empty state and has no way to self-connect — they're blocked until someone else acts.
POLISH: JourneyStrip and OnboardingChecklist track the same milestones twice on student/family dashboards.

### Parent / Guardian
WORKS: document upload + parse, generate / regenerate / share / link Pathway Report, invite people, family priorities, accept proposed goals.
POLISH: Pathway Report has three entry points (dashboard, `/reports`, `/students/$id`) — noisy but not broken.

### Educator / Case Manager
WORKS: caseload search/filter, notes, quick-assign action item, teacher portal milestones, calendar.
GAP: "Missing Pathway Report" KPI is a dead-end number — no drill-down to the affected students.
GAP: `listStudentNotes` errors are swallowed silently.
POLISH: `/teacher-portal` appears in both quick links and SiteShell nav.

### School Admin
WORKS: org switcher, team, date-windowed reports (just shipped), KPIs, grade-band breakdown, compliance & milestones anchor.
GAP: `/school/implementation` content depth not verified end-to-end.
POLISH: Pathway-report count shown on both Overview and Reports.

### District Admin
WORKS: district switcher, KPIs, school-by-school table, CSV/PDF export, follow-up list.
GAP: `/district/reports` already polished; need spot-check that all CTAs land.
POLISH: same metric (reports / open actions) duplicated between progress bars and implementation tiles.

### Partner
WORKS: org setup, opportunity CRUD with full status lifecycle (draft → pending_review → approved → inactive), PartnerForward incentives entry point.
GAP: `/partners-manage/impact` depth not verified.
POLISH: opportunity status stats appear both as widget and tab counts.

### Platform Admin / Owner
WORKS: KPIs, review queues, owner analytics, system health checklist (with honest `coming_soon` labels), 2FA, `/admin` alias to `/owner`.
RISK: `src/routes/index.tsx:779` has a `{/* Right: mock hub */}` comment on the live landing page — misleading; will rename to "Right: feature preview" so future agents don't think it's inert.

### Pathway Report (flagship)
Nearly every v2.1 field is surfaced. Single real GAP:
- **`inputs_used` is populated during generation but never rendered.** Users cannot see what data went into the report (intake, voice, IEP extractions, readiness, goals, etc.). This is the single highest-value Report fix available.

Smaller POLISH: after restoring a version, the version panel doesn't auto-refresh until the user reloads.

---

## 2. Safe High-Value Improvements I Will Implement Now

Each item is scoped, persistence-aware, and respects the stability constraints.

### A. Pathway Report — Render "Inputs Used"
File: `src/components/pathway/ReportV2Extras.tsx` (+ small wiring in `ReportView.tsx`).
- Add a collapsed-by-default "Sources Used in This Report" panel showing each `inputs_used` entry (intake, voice, IEP docs, IEP extractions, goals, readiness, prior report) with the label, count/timestamp where available, and a tone indicator (✓ available / – missing).
- Pure presentation — no schema changes, no new server fn.

### B. Pathway Report — Refresh Version Panel After Restore
File: `src/routes/_authenticated/reports.$reportId.tsx`.
- Wire `onRestored` to bump a `versionsKey` state so `ReportVersionsPanel` remounts and shows the restored version at the top.

### C. Caseload — "Missing Pathway Report" KPI becomes a real filter
Files: `src/routes/_authenticated/caseload.tsx`.
- Make the KPI tile a button that sets the existing `no-report` filter chip (already implemented) and scrolls to the list.
- Wrap `listStudentNotes` in a try/catch + `toast.error("Could not load notes")` so the failure isn't silent.

### D. Student — Self-connect CTA when not linked
File: `src/components/dashboard/StudentDashboard.tsx`.
- In the no-student empty state, add a primary CTA: "Ask a guardian or case manager to invite me" that opens a `mailto:` prefilled invite blurb plus a "Copy invite text" button. No backend change; unblocks the student immediately and avoids fake buttons.

### E. Family / Student — De-duplicate JourneyStrip vs OnboardingChecklist
Files: `src/components/dashboard/StudentDashboard.tsx`, family dashboard surfaces.
- Show `OnboardingChecklist` only while there is at least one unchecked step; once complete, collapse it into a single "Onboarding complete ✓" pill and keep `JourneyStrip` as the ongoing-journey view. No data loss, no test-id change.

### F. Landing page — Remove misleading "mock hub" comment
File: `src/routes/index.tsx:779`.
- Rename the comment to `{/* Right: feature preview (live composition) */}` so the live landing block is never mistaken for placeholder by a future agent.

### G. School / District / Partner — Drill-down hardening
- School `StatCard` "Pathway Reports" on `/school/overview` → wrap in a `<Link to="/school/reports" hash="reports-list">` so the number is actionable.
- District follow-up "View all" already works; verify partner `/partners-manage/impact` either renders real data or shows a calm "No impact events yet" empty state — patch only if it currently renders nothing.

### H. Verification scaffolding
- After changes, run the requested test commands:
  - `bun run test:unit`
  - `bunx playwright test --project=dashboard-setup`
  - `bunx playwright test --project=role-access`
  - `bunx playwright test --project=dashboard-regression`
- Fix any direct regressions caused by the above changes. I will NOT chase pre-existing flakes or unrelated failures beyond reporting them.

I am explicitly NOT going to:
- Rewrite dashboards.
- Touch role guards, auth, 2FA, or the managed `_authenticated` layout.
- Change dashboard `<main>` test IDs.
- Add new top-level routes.
- Introduce new tables or migrations in this slice.

---

## 3. Roadmap Deliverable

I will create `docs/READINESS_ROADMAP.md` containing:

### P0 — Required Before Market Release
- Billing / entitlement enforcement on protected actions (today entitlement checks gate visibility, not write paths in every server fn) — add server-side `requireEntitlement` middleware for create/generate paths.
- Notifications: wire the in-app notifications bell to a real read/unread store (table exists: `in_app_notifications`) with deep-link targets for invitations, share-link views, report regenerations, and admin review actions.
- Consent + sharing: surface a single "Who can see this?" panel on each student profile combining `student_collaborators`, `student_relationships`, and active `share_tokens`.
- Document review workflow: explicit reviewer queue states (uploaded → AI-extracted → human-reviewed → linked to report) backed by `document_summaries.review_status`.
- Report export: produce a deterministic PDF (not just `window.print()`) for at least the educator audience, with audience watermark.
- Launch readiness criteria checklist materialized on `/owner/launch` (already has skeleton) tied to `system_health_checks` outcomes.

### P1 — Important Shortly After Release
- District-paid access model: enforce that connected schools/families inherit entitlement from district org via `effective_entitlement_for_user` in the UI (gate "Add Student" by entitlement, not role).
- Family early-access flow: separate pilot vs post-pilot copy + invite codes.
- Partner moderation: dedicated owner review queue with diff view between previous and pending opportunity edits.
- AI-generated content review: add a "Was this helpful?" thumbs row on each Pathway Report section that writes to `admin_audit_reviews` for owner QA.
- Opportunity inquiry workflow: a partner-safe "Interest received" inbox that exposes counts + first name only, never IEP / Pathway / voice data.
- Student rights at 18: surface `rights_transfer_status` on student profile and Pathway Report header with the recommended action.
- Notifications email digest: daily/weekly summary built from `in_app_notifications` + `notification_prefs`.

### P2 — Future Expansion
- Public-facing partner directory with vetted listings.
- District benchmarks across CT districts (anonymized).
- Multi-language Pathway Report (already have AI assist scaffolding).
- Mobile-first parent app shell (PWA).
- Long-form analytics for districts (cohort trends, year-over-year).
- Archive / data-deletion lifecycle with audit trail (`audit_log` table exists; needs UI).
- Support / help center beyond `/help` placeholder.

The doc will also list what was changed in this turn (A–G above) and explicitly mark items remaining as future-phase, so it doubles as a release-readiness ledger.

---

## Technical Notes (for review)

- All changes use existing server functions; no schema migrations in this slice.
- No new packages required.
- The `inputs_used` panel reads from the report's existing `content` JSON — purely additive in `ReportV2Extras.tsx`. If the field is empty on a legacy report, the panel hides itself.
- The caseload `no-report` filter already exists in `caseload.tsx`; the KPI becomes a button that calls the same setter — zero new logic.
- Onboarding/JourneyStrip de-dup is CSS/conditional only; both components keep persisting their own state.
- `mailto:` self-connect is the only user-facing flow that doesn't write to the DB; this is intentional — a fake "Send invite" button would violate the no-inert-button rule, and a real self-invite needs a Phase-1 invitation flow (covered in P1 roadmap).

Approve this and I'll implement A–H, write `docs/READINESS_ROADMAP.md`, and run the four verification commands.
