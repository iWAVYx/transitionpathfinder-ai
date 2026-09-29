# Dashboard simplification — local review

Branch: `codex/dashboard-simplification`

The six planning-role dashboards and their hubs end at the widget section.
Repeated reports, progress strips, next-step panels, and related links below
the widgets are removed. Widgets fill the available width and show up to five
items with readable detail text.

The Owner Hub at `/owner` is strictly for website management. Its implementation
is unchanged by this branch; the role-dashboard layout does not apply to it.

## Tools and navigation

- Family and student tools remain available through their overview cards.
- The educator's full caseload, filters, notes, and action controls are available
  from **Open Caseload**, at `/caseload?view=students`.
- School and district overviews use the existing authorized live tool grids,
  with organization switching preserved and no card linking back to itself.
- Partner tools remain available through the live overview cards. **Create
  opportunity** opens `/partners-manage?view=opportunities` from the opportunity
  list. The editor opens immediately and its fields have associated labels.
- Dashboard widget preferences and role-access boundaries are unchanged.

## Local validation

- Complete unit suite: 100 files, 1,099 tests passed.
- Role guard and navigation contract checks: 5 tests passed.
- TypeScript: passed with no diagnostics.
- Application build and service-worker generation: passed.
- `git diff --check`: passed.
- No Owner Hub implementation changes, database migrations, or hosting changes.

## Staging review still required

No branch publication or deployment has been performed for this update.
Signed-in browser acceptance of the changed build remains outstanding.

After authorization to publish and deploy this branch to staging:

1. Confirm the staging deployment reports this branch's exact commit.
2. Check all six dashboard and hub layouts on mobile and desktop: the content
   ends after the widgets and the retained cards still open the intended tools.
3. Check widget show/hide, ordering, refresh persistence, empty states, and
   loading/error states using synthetic staging accounts.
4. Open the full educator caseload, use its filters, and return to the dashboard.
5. Open the partner opportunity editor, create a synthetic draft, and confirm
   it appears in the opportunity list. Check organization switching.
6. Confirm `/owner` remains the website-management console without role widgets.

Deployment can target this branch through the manual staging workflow; merging
is not required for that review. Production remains outside this approval scope.
