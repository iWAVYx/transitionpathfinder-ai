# Demo Preview → Real Feature Pages (in Demo Mode)

## Problem

Every role dashboard (Student / Family / Educator / School Admin / District Admin / Partner) has tiles with a Preview button + a "Open full page" CTA. In demo mode the CTA is rewritten by a per-drawer `sampleRoute()` map to one of about a dozen legacy tour URLs — `/demo/hub`, `/demo/report`, `/demo/school-admin`, `/demo/district-admin`, `/demo/partner`, `/demo/intake`, `/demo/voice`, `/demo/documents`, `/demo/calendar`, `/demo/meeting`, `/demo/next`, `/demo/resources`, `/demo/opportunities`, `/demo/workspace`. Several of those redirect into the Workspace Tour (`/demo/voice` → `legacyWorkspaceRedirect(...)`). So tiles as different as School Admin "Report Completion" and District Admin "Readiness Trends" all land on the same generic marketing page. That's the "old Transition Workspace / unrelated marketing / placeholder" behavior the message calls out.

## Target behavior

- Each role tile's Preview CTA opens a dedicated demo route that renders the SAME component the signed-in feature page renders, wrapped in a demo shell that provides sample data + "Back to {role} Dashboard" nav.
- Signed-in routes are unchanged: they still fetch real data and enforce role guards.
- Drawer stays as the in-place quick peek; the CTA becomes "Open Full Feature (Sample)" and goes to the dedicated demo route.
- Browser back returns to the demo role dashboard; role context is preserved.

## Approach

1. **Introduce a `DemoFeatureShell`** in `src/components/demo/DemoFeatureShell.tsx`:
   - Header with feature title + eyebrow, "Sample data" badge, and a `BackToDashboard`-style link whose destination is the caller's demo role dashboard (`/demo/student`, `/demo/family`, `/demo/educator`, `/demo/school-admin`, `/demo/district-admin`, `/demo/partner`).
   - Wraps children in `SiteShell`.
   - Provides a `DemoModeContext` (`{ isSample: true, sampleFixture }`) that feature modules can read to short-circuit server-fn calls and render the demo fixture. Signed-in pages never mount the provider so behavior is unchanged.

2. **Extract feature modules** where a route file still owns the UI. Preference: reuse existing modules (`StudentVoiceModule`, `ParentOverviewGrid`, `IepTranslatorCard`, `FamilyMeetingPrepCard`, `AdvocacyResourcesCard`, `EvidenceReviewCard`, `DataGapsCard`, `NextStepsTimeline`, `ComplianceOverviewCard`, `TransitionEvidenceCard`, `CaseloadRollupsCard`, `DistrictComplianceCard`, `DistrictEvidenceCoverageCard`, `DistrictTrendMetricsCard`, `PartnerImpactSummaryCard`, `PartnerMatchesCard`, `StudentPathwaySections`, `MyIepSummaryCard`, `OpportunityStatusStats`). When a feature only exists inside a route file (e.g. `/educator/readiness-gaps`, `/school/reports`, `/district/readiness-trends`, `/partners-manage/opportunities`), pull the presentational body into `src/components/dashboard/<role>/<Feature>Module.tsx` and re-import in the original route. No logic change for signed-in users.

3. **Add dedicated demo feature routes** — one per unique `featureId`, keyed off the drawer's featureId contract, under `src/routes/demo_.feature.<role>.<slug>.tsx`. Each file is ~20 lines:
   ```
   createFileRoute("/demo_/feature/student/student-voice")({
     component: () => (
       <DemoFeatureShell role="student" title="Student Voice" backTo="/demo/student">
         <StudentVoiceModule isSample />
       </DemoFeatureShell>
     ),
   })
   ```
   Roll-up per role (final counts approximate; matches each `<Role>OverviewGrid` TILES array):
   - Student ~7, Family ~7, Educator ~7, School Admin ~9, District Admin ~7, Partner ~5.

4. **Route resolver** — replace each drawer's private `sampleRoute()` map with a shared `resolveDemoFeatureRoute(role, featureId)` in `src/lib/demo/feature-routes.ts`. Drawers pass `role + featureId` instead of the signed-in URL. Single source of truth; the fallback (when a featureId has no dedicated demo route yet) keeps its current behavior so nothing breaks mid-rollout.

5. **Sample data plumbing** — each `<role>/feature-details.ts` already holds preview rows/stats. Extend with an optional `sampleModuleProps` for modules that need richer fixtures (e.g. NextStepsTimeline). Existing signed-in server-fn calls are guarded by `useDemoMode()` — if `isSample`, the module returns the fixture synchronously instead of calling `useServerFn(...)`.

6. **Remove the legacy tour redirects from the Preview path.** `/demo/voice`, `/demo/hub`, `/demo/report`, etc. remain reachable from the marketing site's Workspace Tour — we don't delete them — but nothing in the role dashboards points at them anymore.

## Deliverables

- `src/components/demo/DemoFeatureShell.tsx` (new)
- `src/lib/demo/feature-routes.ts` (new, shared resolver)
- `src/lib/demo/mode-context.ts` (new, tiny provider + hook)
- `~40` new one-screen route files under `src/routes/demo_.feature.<role>.<slug>.tsx`
- Small extractions of feature bodies from ~6 signed-in route files into `<Feature>Module.tsx` components (signed-in behavior unchanged)
- Update 6 drawer `sampleRoute()` sites to call the shared resolver
- Update `demo_.student.tsx`, `demo_.family.tsx`, etc. so the role dashboards render the OverviewGrids (already do) — no change beyond ensuring `isSample` flows through

## Acceptance checks (verify at end)

- From `/demo/student`, `/demo/family`, `/demo/educator`, `/demo/school-admin`, `/demo/district-admin`, `/demo/partner`: click each tile's Preview → CTA → land on a page whose title matches the tile, showing sample data, with a working "Back to {role} dashboard" link + browser back.
- From `/dashboard` signed in as each role: same tiles route to the real signed-in feature and still fetch live data.
- No dashboard tile CTA in demo mode ends on `/demo/hub`, `/demo/report`, `/demo/school-admin`, `/demo/district-admin`, `/demo/partner`, `/demo/workspace/*`, `/demo/intake`, `/demo/voice`, `/demo/documents`, `/demo/meeting`, `/demo/calendar`, `/demo/resources`, `/demo/opportunities`, `/demo/next` unless that IS the dedicated feature route for that tile.
- Typecheck + dashboard-regression e2e suites pass.

## Out of scope

- Deleting the Workspace Tour marketing pages (still linked from public marketing).
- Owner Hub — bespoke shell was kept in the previous slice and has no Preview tiles.
- New sample data invention — reuse existing demo fixtures under `src/lib/demo/*` and extend only where a module has none.

## Rollout order (single PR, big but mechanical)

1. Shell + context + resolver (foundation, no user-visible change).
2. Extract feature-body components where needed.
3. Add demo feature routes role-by-role (Student → Family → Educator → School Admin → District Admin → Partner).
4. Switch drawers to the shared resolver.
5. Run typecheck + dashboard-regression e2e; walk each role dashboard in the preview browser to eyeball.
