# Dashboard simplification — review and staging evidence

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

## Completed staging verification

Draft [PR #198](https://github.com/iWAVYx/transitionpathfinder-ai/pull/198)
was deployed to the isolated
[staging site](https://transitionforward-staging.caysi101.workers.dev).
The verified application commit is
`4f6f2a2b38858c5279362bb37bb147e410b44314`; later documentation edits
do not imply a new deployment or verification run.

- [Deployment](https://github.com/iWAVYx/transitionpathfinder-ai/actions/runs/36618907793)
  passed the exact-commit and isolation checks. Staging used its own Supabase
  project (`qgrertkqbwanerqqemph`) and Stripe sandbox mode.
- [Signed-in verification](https://github.com/iWAVYx/transitionpathfinder-ai/actions/runs/36618438792)
  passed all 7 role sign-ins, all 84 dashboard regression checks across mobile,
  tablet, and desktop, and 237 role-access/navigation checks.
- Two conditional checks were skipped: Owner demo forbidden routes (none
  defined) and student grade-band coupling (the seeded student had no grade band).
- The temporary exact-branch staging deployment exception was removed after
  verification. The original `main`-only policy and required reviewer remain.
- PR #198 remains a draft. No merge, database migration, or production deployment
  was performed as part of this dashboard update.

## Completed family interaction review

After the user signed in, Codex's in-app browser reached the synthetic parent
workspace for Robin Staging. The Chrome connection timeout was avoided by using
the in-app browser directly.

- Hiding Meetings removed its widget. Moving Upcoming calendar before Next
  actions persisted after a full page refresh, as did the hidden Meetings choice.
- Hiding all widgets produced the explicit empty state, which also survived a
  full page refresh.
- All three widgets were restored in their original order: Next actions,
  Upcoming calendar, Meetings.
- The family dashboard was visually checked at 390 × 844 and 1440 × 900. The
  document width matched the viewport at both sizes, with no horizontal overflow.
- `/hubs/family` loaded the restored widget layout and ended at the widget section.
- Keyboard activation worked for customization, checkboxes, and reorder buttons.
  Pointer automation did not activate the controls in this browser session.
- Temporary viewport overrides were reset; the signed-in staging session remains
  available for continued review.

## Remaining interaction review

The completed regression suite checks dashboard rendering, overflow, landmarks,
duplicate links, button markup, refresh behavior, navigation, and role access.
Together with the family checks above, it does not establish completion of the
following interaction checklist. The current browser session has the parent role;
other role-specific checks require their respective staging sessions.

1. Review the remaining five dashboard and hub layouts visually: the content
   ends after the widgets and the retained cards still open the intended tools.
2. Check role-specific widget customization on the other planning roles and
   exercise loading/error states. Family show/hide, ordering, empty states, and
   refresh persistence are complete.
3. Open the full educator caseload, use its filters, and return to the dashboard.
4. Open the partner opportunity editor, create a synthetic draft, and confirm
   it appears in the opportunity list. Check organization switching.
5. Visually confirm `/owner` remains the website-management console without role
   widgets; this branch does not change its implementation.

Use the existing staging deployment for this review. Any future branch deployment
must respect the restored environment restrictions. Production remains outside
this approval scope.
