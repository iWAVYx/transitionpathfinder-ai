## Goal

One source of truth for demo sample data. Every dashboard tile preview and every dedicated feature page reads from the same resolver keyed on `{ role, contextType, contextId, featureId }`. No layout, routing, or design changes.

## Scope inventory (audit first)

I'll produce a written inventory table before touching code, covering every demo feature we render today:

- Student / Family / Educator features (student-scoped): Transition Workspace, Pathway Report, Intake, Student Voice, Documents, Assessments, Calendar, Next Actions, Opportunities, Partner Network, Matches, Saved Items, Applications/Referrals, Reports, Activity.
- School Admin features (school-scoped): Enrollment, IEP Caseload, Staff, Caseload Distribution, Students, Reports, Implementation, Service Coverage, Partners, Opportunities, Activity, Alerts, Next Actions, Charts.
- District Admin features (district-scoped): School Roster, Enrollment, IEP Population, Staffing, Coordinators, Reports, Implementation, Provider Coverage, Opportunities, Regional Gaps, Activity, Alerts, Charts.
- Partner features (plan-scoped): Listing Status, Posting Allowance, Opportunities, Analytics, Match Insights, Team, Connections, Referrals, Scheduling, Premium Toolkit.
- Owner features: existing tiles (kept read-only against a fixed context — owner has no context selector).

For each row: current data source (fixture, hook, hardcoded), preview component path, full-page component path, detail component path, gaps.

## Architecture

1. **`activeDemoContext`** — single hook `useActiveDemoContext(role)` in `src/lib/demo/active-context.ts`, wrapping the existing `useRoleContext` external store plus `useDemoStudent` (student journey) so it returns:
   ```
   { role, contextType: "student" | "school" | "district" | "partnerPlan" | "owner", contextId }
   ```
2. **`getDemoFeatureData({ featureId, role, contextType, contextId })`** — pure resolver in `src/lib/demo/feature-data.ts`. Dispatches to per-feature builders that receive the resolved profile/context object and return a typed dataset. Deterministic, no I/O.
3. **Per-feature builders** — one file per feature under `src/lib/demo/feature-data/<featureId>.ts`. Each returns the union of records used by both preview and full page (preview = projection). Existing per-role `feature-details.ts` narrative content is folded in so title/summary/next-step also switch by context.
4. **Consumers** — every tile preview, drawer, feature page, and detail page calls `getDemoFeatureData(...)` (via a thin `useDemoFeatureData(featureId)` hook that reads `activeDemoContext`). Static fixture imports and `array[0]` / `defaultDemoStudent` / `defaultSchool` / `defaultDistrict` / `defaultPartnerPlan` fallbacks get deleted.

## Execution steps

1. Land the inventory table in `docs/demo-feature-data-audit.md` (evidence artifact).
2. Add `active-context.ts` + `feature-data.ts` skeleton with typed dispatch and no-op builders that delegate to existing per-role detail maps, so nothing breaks.
3. Migrate features in this order (each = tile preview + full page + detail, with tests):
   1. Partner Network (already close — becomes the reference implementation).
   2. Student-scoped features: Pathway Report, Opportunities, Matches, Documents, Assessments, Calendar, Next Actions, Intake, Student Voice, Reports, Activity, Applications/Referrals, Saved Items, Transition Workspace.
   3. School Admin features.
   4. District Admin features.
   5. Partner plan features.
5. Delete now-unused fixtures / `defaultX` fallbacks. Rip out per-component `useState(initialFromProps)` where it caused staleness; replace with derived reads.
6. Route search state: ensure detail routes carry only the record id; profile/context comes from `activeDemoContext`. When record id is not present in the active context's dataset, render the profile-specific empty state (no fallback).

## Tests (evidence)

New Vitest suite `tests/unit/demo-feature-data-propagation.test.ts`:

- For every `(role, featureId, contextId)` triple, snapshot at least three fingerprints (record id, headline metric, primary record title).
- Assert Profile-A fingerprints disappear and Profile-B fingerprints appear after `setActiveContext(B)`.
- Assert preview projection ⊆ full-page dataset (same ids).

New Playwright suite `tests/e2e/demo-context-switch.spec.ts`:

- Per feature: open preview → open full page → capture fingerprints → switch context → assert new fingerprints, no stale flash → refresh → assert persistence → back to dashboard → assert context preserved.

Existing suites kept green: `demo-nav`, `demo-feature-map`, `demo-feature-details-audit`, `demo-role-contexts`, `dashboard-tile-destinations`, `partner-network`, `pathway-engine`, `opportunity-matcher`, `demo-profile-sample-fingerprint`.

## Deliverables (evidence report)

At the end I'll return:

- The audit table (inventory).
- List of removed static reads (file + line).
- Path to the new resolver + list of per-feature builders.
- Before/after fingerprints per context per feature.
- Preview vs full-page consistency table.
- Test totals (unit + Playwright).

## Non-goals

- No UI, layout, tile, routing, or copy changes beyond what falls out of context substitution.
- No new profiles/contexts/plans.
- No changes to signed-in production data paths.

## Size warning

This touches ~40+ feature surfaces across 7 roles and rewrites the data layer under them. Expect this to land as a single large change; I'll keep every step behind existing tests so nothing regresses mid-migration. Confirm to proceed and I'll start with the inventory + skeleton in the next turn.
