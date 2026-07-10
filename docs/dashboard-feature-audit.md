# Dashboard Feature Connection Audit

Phase 1 of the dashboard feature connection pass (plan: `.lovable/plan.md`).
Source-of-truth mapping of every tile on every role dashboard to its
Demo Workspace preview and its real signed-in destination.

Legend:
- **connected** — CTA already points to the real, correct feature.
- **wrong-target** — CTA points to a route that exists but isn't the feature
  the tile promises (e.g. Family Priorities → `/pathway`, Case Notes →
  `/caseload`). Fix = rewire OR build the missing sub-page.
- **missing-page** — no real signed-in page exists for the feature the tile
  advertises. Fix = build the page (Phase 4).
- **duplicate** — two tiles route to the same destination with different
  labels. Fix = one of them needs its own destination or preview.
- **demo-preview-needed** — public `/demo/*` currently redirects to a
  Transition Workspace stage instead of previewing the actual tool. Fix =
  build an in-place preview (Phase 3).

Existing signed-in routes (from `src/routes/_authenticated/`) that the
audit uses as ground truth: `caseload`, `dashboard`, `district.overview`,
`district.reports`, `district.schools`, `district.team`, `documents`,
`feed`, `goals`, `insights`, `meetings`, `meetings.$meetingId`,
`meeting-templates`, `messages`, `opportunities`, `partners-manage`,
`pathway`, `ppt-prep`, `reports`, `reports.$reportId`, `resources.saved`,
`school.implementation`, `school.overview`, `school.reports`,
`school.team`, `settings`, `student-voice`, `students`, `students.$id`,
`teacher-portal`, `workspace.$stage`, plus the entire `owner.*` set.

---

## Student (`StudentOverviewGrid`)

| # | Tile | Current CTA | Real feature target | Status | Fix |
|---|---|---|---|---|---|
| 1 | Student Voice | `/student-voice` | `/student-voice` | connected | — |
| 2 | My Pathway | `/pathway` | `/pathway` | connected | — |
| 3 | Next Action | `/dashboard` | *no dedicated Action Items page* | wrong-target, missing-page | Build `/action-items` (student-scoped list) |
| 4 | Saved Resources | `/resources/saved` | `/resources/saved` | connected | — |
| 5 | Meeting Prep | `/ppt-prep` | `/ppt-prep` | connected | — |
| 6 | Upcoming Meetings | `/meetings` | `/meetings` | connected | — |
| 7 | Pathway Report — Student View | `/reports` | *no student-view variant* | wrong-target | Route to `/reports` list is OK; add `/pathway/student` viewer OR keep and label as "My Reports" |

Demo previews needed on `/demo/workspace/*` for tiles 1, 4, 5, 6, 7 (in-place expansion, not redirect).

## Parent / Guardian (`ParentOverviewGrid`)

| # | Tile | Current CTA | Real feature target | Status | Fix |
|---|---|---|---|---|---|
| 1 | Connected Student | `/students` | `/students` | connected | — |
| 2 | Documents | `/documents` | `/documents` | connected | — |
| 3 | Family Priorities | `/pathway` | *no dedicated page* | wrong-target, missing-page | Build `/family/priorities` |
| 4 | Pathway Report — Family View | `/reports` | *no family-view variant* | wrong-target | Build `/pathway/family` OR keep `/reports` and relabel |
| 5 | Meeting Prep Questions | `/ppt-prep` | `/ppt-prep` | connected | — |
| 6 | Action Items | `/dashboard` | *no dedicated page* | wrong-target, missing-page | Build `/family/action-items` |
| 7 | Sharing & Consent | `/settings` | *no dedicated page* | wrong-target, missing-page | Build `/family/consent` (or deep-link `/settings#sharing`) |
| 8 | Recommended Resources | `/resources` | `/resources` | connected | — |

## Educator / Case Manager (`EducatorOverviewGrid`)

| # | Tile | Current CTA | Status | Fix |
|---|---|---|---|---|
| 1 | Caseload Snapshot | `/caseload` | connected | — |
| 2 | Student Readiness | `/insights` | wrong-target | Build `/educator/readiness-gaps` OR relabel tile "Insights" |
| 3 | Pending Educator Input | `/teacher-portal` | connected | — |
| 4 | Pathway Reports | `/reports` | connected | — |
| 5 | Meeting Prep | `/ppt-prep` | connected | — |
| 6 | Case Notes | `/caseload` | duplicate + wrong-target | Build `/educator/notes` |
| 7 | Action Items | `/caseload` | duplicate + wrong-target | Build `/educator/action-items` |
| 8 | Calendar | `/meetings` | connected | — |

## School Admin (`SchoolAdminOverviewGrid`)

| # | Tile | Current CTA | Status | Fix |
|---|---|---|---|---|
| 1 | School Overview | `/school/overview` | connected | — |
| 2 | Planning Status by Grade | `/school/implementation` | wrong-target | Build `/school/planning-status` |
| 3 | Team Activity | `/school/team` | connected | — |
| 4 | Report Completion | `/school/reports` | connected | — |
| 5 | Readiness Trend | `/insights` | wrong-target | Build `/school/readiness-trends` |
| 6 | Resource Usage | `/resources` | wrong-target | Build `/school/resource-usage` |
| 7 | Support Needs | `/caseload` | wrong-target (role leak: school admin ≠ case manager) | Build `/school/support-needs` |

## District Admin (`DistrictAdminOverviewGrid`)

| # | Tile | Current CTA | Status | Fix |
|---|---|---|---|---|
| 1 | District Overview | `/district/overview` | connected | — |
| 2 | Connected Schools | `/district/schools` | connected | — |
| 3 | School-by-School Progress | `/district/schools` | duplicate | Build `/district/school-progress` |
| 4 | Readiness Trend | `/insights` | wrong-target | Build `/district/readiness-trends` |
| 5 | Implementation Progress | `/school/implementation` | wrong-target (school route, district context) | Build `/district/implementation` |
| 6 | District Reports | `/district/reports` | connected | — |
| 7 | Service Gaps | `/insights` | wrong-target | Build `/district/service-gaps` |

## Partner (`PartnerOverviewGrid`)

| # | Tile | Current CTA | Status | Fix |
|---|---|---|---|---|
| 1 | Partner Profile | `/partners-manage` | connected (profile lives here) | — |
| 2 | Active Opportunities | `/opportunities` | connected | — |
| 3 | Submitted Programs | `/partners-manage` | duplicate | Build `/partner/submitted` |
| 4 | Upcoming Deadlines | `/opportunities` | duplicate | Build `/partner/deadlines` |
| 5 | Opportunity Management | `/opportunities` | duplicate | Keep — merge with #2 (drop tile) OR rewire to `/partners-manage` |
| 6 | PartnerForward Incentives | `/partnerforward/incentives` | connected | — |
| 7 | Partner Resources | `/resources` | connected | — |

## Owner / Platform Admin

The Owner Hub already has dedicated routes for essentially every operational
surface (`owner.waitlist`, `owner.users`, `owner.contacts`,
`owner.resource-review`, `owner.resource-sources`, `owner.partner-network`,
`owner.partner-submissions`, `owner.outreach`, `owner.feedback`,
`owner.issues`, `owner.health`, `owner.launch`, `owner.analytics`,
`owner.pilot-packages`, `owner.demo`). **Status: connected — no new admin
pages required.** Only work needed: confirm the Owner overview grid tiles
point at the right `owner.*` route (verify in Phase 2).

---

## Summary of net-new signed-in pages to build (Phase 4)

Student (1): `/action-items`
Parent (4): `/family/priorities`, `/family/action-items`, `/family/consent`, `/pathway/family`
Educator (3): `/educator/readiness-gaps`, `/educator/notes`, `/educator/action-items`
School Admin (5): `/school/planning-status`, `/school/readiness-trends`, `/school/resource-usage`, `/school/support-needs`
District Admin (5): `/district/school-progress`, `/district/readiness-trends`, `/district/implementation`, `/district/service-gaps`
Partner (2): `/partner/submitted`, `/partner/deadlines`
Owner (0)

Total: **20 new signed-in pages**, each requiring role guard, semantic
`<main>`, empty/loading/error states, and `dashboard-testid` metadata.

## Rewires only (Phase 2, no new pages)

- Student tile 7 relabel: "Open my report" is fine, tile label matches `/reports`.
- Partner tile 5 removal or rewire.
- Educator tile 2 relabel or new page (choose per Phase 4 decisions).

## Demo Workspace previews to build (Phase 3)

For each role, an in-place expandable preview per tile that shows sample
data instead of navigating away. Sample data is already available via
`src/lib/demo/*` for most surfaces; the missing ones (readiness gaps,
school planning status, district service gaps, partner deadlines, partner
submitted programs) need small role-safe fixtures.

## Open questions for you (blocking Phases 3–4)

1. **Sub-pages for split tiles.** Should Educator "Case Notes" and
   "Action Items" be **new top-level routes** (`/educator/notes`,
   `/educator/action-items`) or **tabs inside `/caseload`**? Same
   question for Parent action-items/priorities/consent — new
   `/family/*` routes vs tabs inside `/dashboard` or `/settings`?
2. **Data backing for new pages.** Tables that already exist that map
   well: `action_items`, `collaboration_notes`, `readiness_scores`,
   `sharing_permissions`. Others (`/district/service-gaps`,
   `/school/support-needs`, `/school/resource-usage`) have no obvious
   backing table — should I (a) render empty-state-only, (b) compute
   from existing tables (readiness_scores + resources), or (c) create
   new tables via migration?
3. **Pathway Report — Student/Family View.** Should these be **separate
   routes** (`/pathway/student`, `/pathway/family`) or a **role-aware
   variant of `/reports/$reportId`** that changes copy/sections by role?

Once these are answered I'll proceed with Phase 2 (rewires) in the same
turn, then Phase 3–4 role-by-role as agreed in the plan.
