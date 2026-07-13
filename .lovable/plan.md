# Dashboard Feature-Depth Rebuild — Plan

Grounded in the audit of `/hubs/student`, `/hubs/family`, `/hubs/caseload`, `/hubs/school`, `/hubs/district`, `/hubs/partner`, and `/owner`. Non-goals: rewriting auth, changing the `_authenticated` layout, touching routing internals, altering Playwright projects, or rebuilding pages already classified "dedicated" (e.g. `/caseload`, `/school/reports`, `/owner/*`).

## What the audit actually found

- **1 broken CTA in production**: `/school/calendar` tile → route file does not exist.
- **1 auth boundary to verify**: `/partnerforward/incentives` sits outside `_authenticated/`.
- **Drawer parity gap**: `StudentFeatureDrawer` has only a `ready` body; District Admin and Partner grids have **no drawer at all**.
- **Mis-routed tiles pointing at generic hubs** instead of feature-specific views:
  - Parent → Invite Team Members lands on `/students` (same target as Connected Student tile).
  - Parent → Recommended Resources lands on `/resources/saved` (that's "saved", not "recommended").
  - Educator → Pending Educator Input lands on generic `/teacher-portal`.
  - Educator → Document Review lands on generic `/documents`.
- **1 thin file to verify**: `/district/readiness-trends` (61 lines vs. 115–433 for siblings).
- **Breadcrumb round-trip**: for non-family/student roles the Home icon points at `/dashboard`, which is the router-shim that redirects them back to their hub — no true "Back To Dashboard" affordance today.
- **Owner Hub is deliberately different** (bespoke ops console). Recommend keeping it that way; not part of this pass.

## Phase 1 — Ship the audit fixes (this pass)

Focused, low-risk work that closes the concrete gaps found. Nothing speculative.

1. **Fix broken `/school/calendar` CTA.**
   - Create `src/routes/_authenticated/school.calendar.tsx` as a real School Calendar feature window (school-wide meetings, transition deadlines, PD dates, filters, export). Reuse the existing `DashboardCalendar` component; scope to school-level events.
   - Use the shared `SchoolPageShell` for header + back-to-dashboard consistency with the other 8 school pages.

2. **Bring `StudentFeatureDrawer` to parity.**
   - Add `loading | error | permission | empty | ready` bodies mirroring `ParentFeatureDrawer` (skeletons, retry, permission copy, empty CTA, sample-route mapping).
   - Extend `src/lib/demo/student/feature-details.ts` with `emptyHeadline`/`emptyBody` fields.

3. **Add drawer treatment to District Admin.**
   - Create `src/lib/demo/district-admin/feature-details.ts` (aggregate-only fixtures — no individual student rows).
   - Create `src/components/dashboard/district-admin/DistrictAdminFeatureDrawer.tsx` (same contract as School Admin drawer).
   - Refactor `DistrictAdminOverviewGrid.tsx` to the `Preview` + drawer + `defaultState` pattern used by the other four roles.
   - Verify `/district/readiness-trends` (61 lines) — if it's a stub, promote it to a real feature page using the district aggregate pattern.

4. **Add drawer treatment to Partner.**
   - Create `src/lib/demo/partner/feature-details.ts` (strict privacy — no student names, IEPs, Voice, reports, readiness detail).
   - Create `src/components/dashboard/partner/PartnerFeatureDrawer.tsx`.
   - Refactor `PartnerOverviewGrid.tsx`. Preserve the existing "Partners never see student data" banner.
   - Verify `/partnerforward/incentives` route file: if it sits outside `_authenticated/` without its own guard, add a partner-role guard or move it under `_authenticated/`.

5. **Fix Parent mis-routes with real dedicated windows.**
   - Rewrite `/family/invites` (create it) as a real Invite Team Members feature: invite co-parent / educator / support person, role selector, pending invites, permission explanation. Reuse `InvitePeopleCard` and `InvitesInbox`. Repoint the tile.
   - Split "Recommended" from "Saved": create `/family/resources/recommended` as its own feature window (matched to student profile/report). Keep `/resources/saved` for the saved list. Repoint the tile.

6. **Fix Educator mis-routes with filtered dedicated views.**
   - `/educator/pending-input` — new feature window listing sections of Pathway Reports awaiting this educator's input, deep-linking into `/teacher-portal` per section.
   - `/educator/document-review` — new feature window scoped to documents awaiting educator review (processing status, missing-doc flags, related report section). Distinct from the generic `/documents`.

7. **Add explicit "Back To Dashboard" to every dedicated feature window.**
   - Small shared `BackToDashboard` component that reads the caller's role from context and links to the correct `/hubs/<role>` (bypassing the `/dashboard` router-shim round-trip).
   - Wire into `SchoolPageShell`, `HubShell` sub-pages, and the new feature pages above.

8. **Mirror everything new into demo.**
   - Update `/demo/student`, `/demo/family`, `/demo/educator`, `/demo/school-admin`, and add `SchoolAdminOverviewGrid` equivalents for District and Partner via `isSample` on the new grids. All demo mode uses the static fixtures under `src/lib/demo/**` — no signed-in-only data.

## Phase 2 — After Phase 1 lands (separate turn)

Not in this pass. Listed so you can see the roadmap.

- Full 12-field completeness audit inside every existing dedicated page (secondary actions, permission-aware states, explicit Pathway Report connection panels).
- Standardize `HubShell` sub-pages on a `FeatureWindowShell` primitive (title + purpose sentence + status + Back + optional prev/next feature nav).
- Decide whether Owner Hub adopts the tile+drawer pattern or stays a bespoke ops console.

## Explicitly out of scope

- Auth flow, `_authenticated` layout, Supabase clients, or bearer middleware.
- Playwright projects, config, or test weakening.
- Owner Hub structural rebuild.
- Any change to `/caseload`, `/school/reports`, `/pathway/*`, `/student-voice`, `/action-items`, `/family/consent`, `/family/action-items`, `/school/*` (except adding calendar), or any `/owner/*` page.

## Technical details

- **Shared drawer contract** already established by Parent/Educator/SchoolAdmin: `Sheet` from `@/components/ui/sheet`, `loading | error | permission | empty | ready` state prop, `sampleRoute()` mapping for demo, `isSample` badge, sticky primary action. New Student/District/Partner drawers copy this exact shape.
- **Fixture shape** (`src/lib/demo/<role>/feature-details.ts`): `{ id, title, eyebrow, summary, what, dataSource, primaryAction, connectsTo, rows, stats?, emptyHeadline, emptyBody }`. Aggregate-only for District and School Admin; strict-privacy for Partner.
- **New route files** all follow file-based routing under `src/routes/_authenticated/`: `school.calendar.tsx`, `family.invites.tsx`, `family.resources.recommended.tsx`, `educator.pending-input.tsx`, `educator.document-review.tsx`. Each defines `head()` with title + description, `errorComponent`, `notFoundComponent`.
- **BackToDashboard** reads role via existing auth context (no new context created). One-line component; no route changes.
- **Verification**: `bunx tsgo --noEmit`, then Playwright: `bunx playwright test --project=dashboard-setup && bunx playwright test --project=dashboard-regression && bunx playwright test --project=role-access` (unchanged config, no test weakening).

## Approval

Phase 1 is a single implementation pass covering items 1–8. Approve and I'll build it; or say which items to drop/reorder and I'll adjust.
