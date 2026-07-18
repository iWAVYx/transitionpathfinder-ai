
## Audit result (what is already in place vs. what still needs work)

The previous turn already built the foundation and removed the "2.5" section, the extra dashboard cards, `RosterMatchBoard`, `DemoCohortStrip`, `PlatformMatchesPreview`, `PartnerCohortFit`, and redirected `/demo/network` → `/demo/opportunities`. It also mounted a compact `StudentSwitcher` inside the existing `RoleNavChips` header (not a new card/section/tile — same header row as the role chips).

What is NOT yet wired to `useDemoStudent()` and must be:

- `src/lib/demo/role-previews.ts` – `dashboardTiles`, `toolPreviews`, `tools`, `actions`, `outputs`, `dashboardTitle`, `headline`, and `intro` are static Jordan strings.
- `RolePreviewShell` header aside – renders `SHARED_DEMO_STUDENT` instead of the selected profile.
- `src/components/dashboard/StudentPathwaySections.tsx` and other components consumed inside per-role overview grids (`StudentOverviewGrid`, `FamilyOverviewGrid`, `EducatorOverviewGrid`, `SchoolAdminOverviewGrid`, `DistrictAdminOverviewGrid`, `PartnerOverviewGrid`).
- `src/routes/demo_.workspace.$stage.tsx` and each legacy `/demo/<stage>` route (intake, voice, plan, next, resources, meeting, calendar, documents, hub, opportunities already partially wired) – must pull profile-specific content.
- `PathwayReport` in `src/components/demo/PathwayReport.tsx` already reads the profile via the engine — verify `/demo/report`, `/demo/workspace/roadmap`, Student/Family/Educator report lenses all pass through the same report id/version for the same profile.

Nothing here changes dashboard layout, card counts, workspace grid, or the report design.

## Phased plan

### Phase 1 — Centralized profile is the single source of truth
- Keep `useDemoStudent()` as the only reader/writer.
- Convert `SHARED_DEMO_STUDENT` in `RolePreviewShell`'s header aside to derive from the selected profile (name, pronouns, grade, school placeholder, one voice quote). No layout change.
- Add a tiny helper `getRoleTilesForProfile(role, profile)` in `role-previews.ts` that returns the same 4 tiles the role always shows, but with values computed from the selected profile (pathway stage, voice progress, evidence count, next milestone). Same tile count, same labels, values swap.
- Same helper pattern for `dashboardTitle`, `headline`, `intro`, and `toolPreviews` bullet values.

### Phase 2 — Route/component wiring (no UI redesign)
- `demo_.student.tsx`, `demo_.family.tsx`, `demo_.educator.tsx`, `demo_.school-admin.tsx`, `demo_.district-admin.tsx`, `demo_.partner.tsx`: pass `profile` from `useDemoStudent()` into `RolePreviewShell` and the existing OverviewGrid components via a new optional `profile` prop; grids render existing cards with profile-derived text.
- Legacy demo stage routes (`demo_.intake`, `demo_.voice`, `demo_.plan`, `demo_.next`, `demo_.hub`, `demo_.workspace.$stage`, `demo_.calendar`, `demo_.documents`, `demo_.meeting`, `demo_.connection`, `demo_.report`): swap any static `DEMO_STUDENT` reads for the selected profile's equivalent fields. `demo-fixture.ts` stays as a fallback shape only.
- Confirm URL `?student=` persists across role and stage links (already true via `useDemoStudent`), and that browser Back/Forward retain both `role` and `student` params.

### Phase 3 — Age-aware content differentiation
- `pathway-engine.ts` already emits materially different pathway themes per `stage.emphasizedThemes` / `disallowedThemes`. Verify that:
  - Sam (G7) never surfaces adult employment / agency referrals / rights transfer in the Pathway Report, Next Actions, or Opportunities.
  - Riley (G9) surfaces early exploration + course direction rather than postsecondary applications.
  - Jordan (G11) keeps the current advanced content.
- `opportunity-matcher.ts` filters opportunities by profile — already scoped, add explicit assertion tests.

### Phase 4 — Permissions unchanged
- Confirm Workspace-authorized roles (student, family, educator) still open the Workspace; School/District Admin and Partner keep their existing boundary card and do NOT get a Workspace link injected. Verified against `RolePreviewShell` and `boundary` config.
- No new Owner dashboard; existing Admin Hub is untouched.

### Phase 5 — Website / demo hub copy
- Update `src/routes/demo.tsx` hero copy and one paragraph in `src/routes/platform.tsx` to mention three student journeys and the switcher. No new sections, no new cards, no new profile gallery.
- BridgeForward demo links open with `?student=sam`; TransitionForward demo links open with `?student=jordan` (default) or `?student=riley` where appropriate. Same routes, just deep links.

### Phase 6 — Tests
Run and, where needed, extend:
- `tests/unit/demo-nav.test.ts`
- `tests/unit/demo-feature-map.test.ts`
- `tests/unit/demo-feature-details-audit.test.ts`
- `tests/unit/demo-report-fixtures.test.ts`
- `tests/unit/dashboard-static.test.ts`
- `tests/unit/dashboard-tile-destinations.test.ts`
- `tests/unit/pathway-engine.test.ts`
- `tests/unit/opportunity-matcher.test.ts`
- Add a new `tests/unit/demo-profile-switch.test.ts` that asserts, for each `(role, profile)` combination, the shell renders the correct profile name and grade, the correct pathway stage themes, and no disallowed themes.
- Confirm role-guard, permission-regression, and dashboard-regression suites still pass unchanged.

### Deliverables report format
On completion, respond with:
- A requirement → status → file → test table covering every acceptance bullet in the prompt.
- The redundant UI removed (already done in the previous turn).
- The centralized state module (`useDemoStudent` + `demo-profiles.ts`).
- The three profile ids (`jordan`, `riley`, `sam`) and their focus labels.
- Which existing cards were enhanced (Pathway, Opportunities, Next Actions, Header aside, Dashboard tiles) — no new cards added.
- Explicit confirmation that dashboard card count and grid layout are unchanged.
- Pass/fail for every test suite listed above.

## Notes on scope

This is a wiring + fixture pass across ~20 files. It does not redesign any surface. If you want, I can execute Phases 1-3 now (core wiring + content differentiation) and then Phases 4-6 in a follow-up turn, or attempt all six in one turn accepting a higher risk of a test needing a follow-up patch. Confirm which you'd prefer and I'll proceed.
