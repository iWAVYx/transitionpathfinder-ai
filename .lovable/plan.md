
## Goal

Right now the School / District / Partner-plan selectors only swap the four top-tier overview tiles and the page headline. The dashboard grids (`SchoolAdminOverviewGrid`, `DistrictAdminOverviewGrid`, `PartnerOverviewGrid`), the feature-drawer detail tables (`school-admin/feature-details.ts`, etc.), and the `PremiumPartnerToolkitTile` still hold hardcoded values. This plan makes every one of those values come from a single per-context data bundle.

## Scope

**In scope**
- New centralized bundles: `schoolDemoProfiles`, `districtDemoProfiles`, `partnerDemoPlans`.
- Rewire the three overview grids and all feature-drawer detail rows to read from the active bundle.
- Rewire `PremiumPartnerToolkitTile` state from the Partner plan bundle.
- Per-context session state (already have `useProfileSession` — extend key space to include `school:*`, `district:*`, `plan:*`).
- Derived-metric helpers so completion %, totals, and roster counts agree with underlying rows.
- Fingerprint tests: sequential switch (A → B → A) asserts no residual values.

**Out of scope**
- No structural / layout changes to any dashboard.
- No new tiles other than the already-authorized Premium Partner Toolkit tile.
- No changes to Student, Family, Educator profile logic.
- No dedicated per-context feature pages beyond what already exists (the drawer detail rows already cover the "feature preview" surface).

## Data bundle shape

```text
schoolDemoProfiles[id] = {
  identity:   { name, type, gradeBands, enrollment, iepCaseload }
  staff:      { caseManagers[], educators[], unassignedCaseload }
  reports:    { complete[], inProgress[], missing[] }         // rows -> totals
  planning:   { byStage: {…}, readyForPPT, behind }
  readiness:  { onTrack, needsSupport, byDomain: {…} }
  resources:  { opens, uniqueResources, recommendedUnopened }
  calendar:   events[]
  supportNeeds: items[]
  implementation: { staffActive, studentsConnected, milestones[] }
  activity:   items[]
  nextActions: items[]
}

districtDemoProfiles[id] = {
  identity, schoolsRoster[], coordinators[], enrollmentByBand,
  iepPopulation, completionByReport, serviceGaps[],
  partnerCoverage[], opportunityAvailability[], trendsSeries[],
  alerts[], activity[], nextActions[]
}

partnerDemoPlans[id] = {
  identity (shared org — never changes),
  entitlements[], postings[], visibility, engagement,
  analytics: { basic | advanced }, matchInsights[],
  teamAccess[], referral, toolkitTileState
}
```

All numeric tiles derive from these arrays (e.g. `completionPct = complete.length / (complete+inProgress+missing).length`).

## Files to add / change

**Add**
- `src/lib/demo/school-admin/sample-bundles.ts`
- `src/lib/demo/district-admin/sample-bundles.ts`
- `src/lib/demo/partner/sample-bundles.ts`
- `src/lib/demo/derive.ts` (small helpers)
- `tests/unit/context-sample-fingerprint.test.ts`

**Change**
- `src/lib/demo/role-contexts.ts` — re-export bundle-derived tiles instead of hardcoded numbers.
- `src/lib/demo/school-admin/feature-details.ts` — replace inline rows with `getSchoolAdminFeatureDetails(schoolId)`.
- `src/lib/demo/district-admin/feature-details.ts` — same treatment.
- `src/lib/demo/partner/feature-details.ts` — same treatment, keyed by plan.
- `src/components/dashboard/role/SchoolAdminOverviewGrid.tsx` — read active school via `useDemoSchool`; derive `TILES` from bundle.
- `src/components/dashboard/role/DistrictAdminOverviewGrid.tsx` — same, via `useDemoDistrict`.
- `src/components/dashboard/role/PartnerOverviewGrid.tsx` — same, via `useDemoPartnerPlan`.
- `src/components/demo/PremiumPartnerToolkitTile.tsx` — already plan-aware; wire remaining copy to bundle.
- `src/components/dashboard/school-admin/SchoolAdminFeatureDrawer.tsx` (+ district / partner drawers) — accept bundle-derived detail via props/hook.
- `src/lib/demo/use-profile-session.ts` — namespace keys by context id (`school:<id>:…`, `district:<id>:…`, `plan:<id>:…`) so completed actions don't bleed across contexts.

## Switching behavior

- The three `useDemo{School,District,PartnerPlan}` hooks already persist selection. Selection change re-renders grids via bundle read; route + tab preserved because we only swap data, not URLs.
- Per-context session keys ensure completed tasks / filters don't leak.
- Empty datasets render existing "empty state" treatment (already exists in the drawer's `empty` variant).

## Testing

`tests/unit/context-sample-fingerprint.test.ts`:
- Snapshot every tile value, drawer detail row set, and toolkit tile state for each of the 6 contexts.
- Assert `comprehensive ≠ specialized`, `regional-network ≠ local-district`, `free ≠ premium` across every field.
- Sequential switch A→B→A returns identical snapshot to first A (no drift).
- `local-district.schoolsRoster.length ≤ 10`.
- Derived totals: `reports.complete.length + inProgress.length + missing.length === totalReports` for every school and district.
- Premium bundle never contains PII fields (`iep`, `diagnosis`, `familyContact`, `unconsentedName`).

Existing suites (`demo-role-contexts`, `demo-profile-sample-fingerprint`, `dashboard-static`, `demo-profile-switch`) must remain green.

## Non-goals / guardrails

- No changes to Student / Family / Educator code paths.
- No dashboard layout or card-count changes; Partner keeps exactly one Premium Partner Toolkit tile.
- No borrowing across contexts as a fallback — missing → empty state.
- No new routes.

## Estimated size

~11 files changed, 4 new files, ~1,200–1,600 net LOC (mostly sample data). No schema, no server changes.
