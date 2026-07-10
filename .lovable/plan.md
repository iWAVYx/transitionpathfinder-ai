# Dashboard Feature Connection Pass

This is a very large scope (7 roles × ~10 features each, plus building missing signed-in pages). Doing it in a single turn would produce shallow work and destabilize routing. I'll structure it as an auditable, phased pass.

## Phase 1 — Audit (this turn)

Produce a single source of truth: `docs/dashboard-feature-audit.md` + expand `src/lib/demo/feature-map.ts` to cover every dashboard tile per role.

For each role's dashboard tile I'll record:
- Label + intended feature
- Current CTA destination
- Demo Workspace target (in-place preview vs route)
- Signed-in target (real route)
- Status: `connected` | `generic-redirect` | `missing-page` | `dead`
- Fix: `rewire` | `build-preview` | `build-signed-in-page` | `mark-out-of-scope`

This audit is the contract Phases 2–4 execute against and what the tests in Phase 5 assert.

## Phase 2 — Rewire wrong destinations

For tiles that already have a correct target but point somewhere generic (Transition Workspace step, wrong hub), fix the `to`/`params` on the ToolPreviewCard. No new pages. This is the fastest, highest-signal win.

Files most likely touched:
- `src/components/dashboard/role/*OverviewGrid.tsx` (Student, Parent, Educator, SchoolAdmin, DistrictAdmin, Partner, Owner)

## Phase 3 — Demo Workspace previews

Replace demo-side CTAs that currently redirect into `/demo/workspace/$stage` for unrelated stages with:
- in-place expandable preview panels using existing `DemoToolPreviewCard` + role-safe sample data from `src/lib/demo/*`
- new lightweight preview components under `src/components/demo/previews/` per feature (Calendar, Meeting Prep, Saved Resources, Documents, Consent, Caseload, Readiness, Notes, Team Activity, Report Completion, Trends, Schools List, School Progress, Service Gaps, Opportunities, Deadlines, PartnerForward, Partner Profile, Waitlist, Contacts, Resource Queue, Partner Submissions, System Health)
- reuse existing `PathwayReportDeepPreview` pattern for structure

## Phase 4 — Build missing signed-in pages

For each `missing-page` row in the audit, create a route under `src/routes/_authenticated/` with:
- correct `createFileRoute` path matching filename
- role guard via `ROUTE_AUDIENCES` + `withRoleGuard` fallback where dynamic
- semantic `<main>` with `data-testid` from `dashboard-testids`
- page heading (Title Case), role-scoped description
- loading (Suspense) / error boundary / empty state
- backend hook via `createServerFn` when a table exists; static empty state otherwise
- `head()` metadata

Expected new routes (only where not already present — audit will confirm):
- Student: `/action-items`, `/saved-resources`, `/calendar`, `/meeting-prep`, `/student-voice`, `/pathway/student`
- Parent: `/family/priorities`, `/family/consent`, `/family/action-items`, `/family/resources`, `/pathway/family`
- Educator: `/educator/input`, `/educator/readiness-gaps`, `/educator/notes`, `/educator/action-items`
- School Admin: `/school/team-activity`, `/school/planning-status`, `/school/report-completion`, `/school/readiness-trends`, `/school/resource-usage`, `/school/support-needs`, `/school/implementation`
- District Admin: `/district/schools`, `/district/school-progress`, `/district/readiness-trends`, `/district/implementation`, `/district/reports`, `/district/service-gaps`, `/district/staff-access`
- Partner: `/partner/profile`, `/partner/submitted`, `/partner/deadlines`
- Owner: `/admin/users`, `/admin/contacts`, `/admin/resource-queue`, `/admin/source-libraries`, `/admin/partner-submissions`, `/admin/outreach`, `/admin/feedback`, `/admin/bugs`, `/admin/system-health`, `/admin/launch-readiness`, `/admin/analytics`, `/admin/pilot-outreach`, `/admin/demo-materials`

Update `ROUTE_AUDIENCES` in `src/lib/role-policy.ts` and the `FORBIDDEN` map in `tests/e2e/helpers/roles.ts` for each addition.

## Phase 5 — Tests

- Extend `tests/unit/demo-feature-map.test.ts` to require every dashboard tile has a mapped entry with non-generic destination.
- New `tests/unit/dashboard-tile-destinations.test.ts`: for each role grid, assert no two tiles share the same destination and none point to `/workspace/$stage` unless the tile IS "Transition Workspace".
- New `tests/e2e/dashboard-tile-nav.signedin.spec.ts`: for each role, click every tile CTA, assert URL is not a generic workspace redirect and `<main>` renders with the expected `data-testid`.
- Extend `role-access-control.signedin.spec.ts` FORBIDDEN map for new admin/school/district routes.

## Phase 6 — Verify

`bunx tsgo --noEmit`, `bunx vitest run`, targeted Playwright role runs, screenshot mobile/desktop for each role dashboard.

## Scope note

Phases 2–6 are large. I recommend I execute this **iteratively across turns, one role per turn**, starting with the audit in this turn and Student in the next. That keeps each turn reviewable and lets you course-correct before I build ~40 new signed-in pages.

## Confirmation needed

1. OK to proceed role-by-role over multiple turns starting with the audit doc + Student role?
2. For new signed-in pages with no backing table yet (e.g. `/admin/bugs`, `/admin/launch-readiness`), should I (a) wire to an existing table I can find, (b) create a new table via migration, or (c) render an empty-state-only page marked "collection starts once you enable it"?
3. For Owner Hub items that already exist inside `/admin` as tabs/sections (e.g. Waitlist, Contacts), do you want them **promoted to standalone routes**, or is deep-linking into the existing admin subview acceptable?