## Product-Depth Upgrade Pass

This is a large, multi-area enhancement. To keep quality high and avoid regressions (auth, RLS, existing tests), I'll execute it in **five phases**, each self-contained, tested, and safe to ship. After each phase I'll report and pause so you can redirect.

I will **not** touch: auth, RLS/schema, existing dedicated feature pages, or existing test coverage (only add).

---

### Phase 1 — Calendar Upgrade (Feature #1)

Signed-in `/calendar` (`_authenticated/calendar.tsx`) plus role-specific demo previews.

- Add Week and Agenda views to `TransitionCalendar` (Month already exists). Today, Prev/Next, view switcher, type filters, empty state — audit and complete any that are missing.
- Feed events from: meetings, action-item due dates, document due dates (new), Pathway Report review dates (new), opportunity deadlines (new), implementation milestones (new, admin roles), partner program dates (new, partner), owner review checkpoints (new).
- Demo previews per role using `getSampleCalendarEvents()` (already role-scoped) — verify every role's sample set matches the spec above and add missing types.
- New demo route slice: `Calendar` tile on every role dashboard opens the correctly-scoped preview.

### Phase 2 — Documents + Pathway Report Upgrades (Features #2, #3)

- Documents: add Missing Document Checklist, upload/processing status chips, doc-type taxonomy, "Feeds Into Pathway Report" badge, suggested-missing surface. Respect existing RLS — presentation only over existing `documents` server fns.
- Pathway Report: version history strip, "What Changed Since Last Version" diff card, missing-inputs list, role-specific summary block, recommended next steps, download/share (existing permissions), cross-links to Student Voice / Documents / Action Items / Resources / Opportunities / Meeting Prep.
- Role gating enforced in UI (partner sees no private report; district admin sees aggregate only).
- Demo previews mirror both.

### Phase 3 — Meeting Prep + Action Items + Readiness Gaps (Features #4, #5, #6)

- Meeting Prep: agenda-builder pulling from Student Voice, family concerns, readiness gaps, docs, Pathway recommendations, action items, upcoming calendar. Add printable summary.
- Action Items: extend row model with priority, source, related goal/report section, related student, notes, start/done actions. Presentational — server fns already carry most fields; add UI + any missing optional columns.
- Readiness Gaps: domain, severity, reason, evidence gap, intervention, owner role, due, status, report-section link, suggested resource/action. Role-scoped views.

### Phase 4 — Partner Opportunities + Admin Dashboards (Features #7, #8)

- Opportunities: fit-criteria builder, accessibility/support fields, transportation, review lifecycle (draft/submitted/live/archived), impact tracking, PartnerForward incentive link. Partner PII invariants preserved and covered by existing partner-role test — I'll extend.
- Owner / School Admin / District Admin implementation dashboards: implementation health, launch/readiness status, support flags, staff & school onboarding, report completion blockers, review-queue, risk flags, recommended next action; owner waitlist segmentation, follow-up status, partner submissions review, feedback triage, bug priority, analytics snapshot, demo readiness, launch readiness; district school comparison + exportable overview.

### Phase 5 — Demo Parity + Copy + Tests (Features #9, #10, #11)

- Every upgraded feature has a matching Workspace/demo preview using safe sample data, role context preserved, opened from the role's dashboard tile.
- Copy sweep: Title Case for headings/tiles/tabs/section titles; sentence case body; no placeholder copy; no duplicate `<main>` links.
- Tests:
  - `bun run test:unit` — extend `demo-feature-details-audit`, `feature-inventory-audit` for new fields; add calendar-view smoke unit test.
  - `bunx playwright test --project=dashboard-setup`
  - `bunx playwright test --project=dashboard-regression`
  - `bunx playwright test --project=role-access`
  - Role-gated Playwright projects auto-skip when creds absent; I'll report ran-vs-skipped.

---

### Technical Notes

- Calendar view engine stays local (existing `TransitionCalendar` component) — no new deps.
- All new event/doc/report/opportunity fields are additive columns or presentational only; where a field doesn't yet exist server-side, it lives in the demo/sample layer this pass, with a follow-up note if you want persistence next.
- Role gating uses existing `RoleGuard` / role predicates; no new RLS.
- Every new drawer/dialog uses the recently-hardened Sheet scroll pattern (`touch-none` overlay, `touch-pan-y` + `overscroll-contain` content).

### Deliverables per phase

Each phase ends with: files changed list, tests run + results, and a short summary of what a user in each role will now see. I'll pause between phases for your go/no-go.

### Question before I start

**Do you want me to execute all 5 phases back-to-back in this session, or pause after each phase for review?** Back-to-back is faster but produces a very large diff; pausing lets you course-correct.
