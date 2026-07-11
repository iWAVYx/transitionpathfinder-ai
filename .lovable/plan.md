
## Scope

Presentation-only polish across the seven signed-in role dashboards. No changes to routing, auth, RLS, role guards, backend reads/writes, test IDs, or the dashboard/regression contracts. All existing links, tiles, and destinations stay wired to the same features.

Targeted surface area (≈40 files):
- Routes: `dashboard.tsx` (student/parent), `caseload.tsx`, `school.overview.tsx`, `district.overview.tsx`, `partners-manage.tsx`, `owner.index.tsx`, `admin.tsx`
- Role overview grids: `Student/Parent/Educator/SchoolAdmin/DistrictAdmin/PartnerOverviewGrid.tsx`
- Shared dashboard cards under `src/components/dashboard/*` (Advocacy, Compliance, Evidence, Matches, Fit, Meeting Prep, IepTranslator, DataGaps, EvidenceReview, NextSteps, ToolPreviewCard, JourneyStrip, StageJourneyCard, NextBestAction, MyIepSummary, PartnerImpact, OpportunityStats, InvitePeople, InvitesInbox, OnboardingChecklist)
- Shells: `OwnerShell`, `SchoolPageShell`, `DistrictPageShell` (loading + heading copy only)
- Loader/error copy in `DashboardErrorFallback.tsx` (already Title Case; verify)

## Approach (one pass per role, all files edited in batched writes)

### 1. Title Case pass
Convert to Title Case in headings, tile titles, card titles, section subheadings, chart/table headings, CTA labels, empty-state headings, tab labels, badge labels. Preserve exact forms: TransitionForward, Transition Workspace, Pathway Report, Student Voice, BridgeForward, PartnerForward, IEP, PPT, CT-SEDS, 504, 30/60/90. Keep sentence case for descriptions, helper text, body paragraphs, and empty-state body copy.

Where headings are dynamic strings, route through `toTitleCase()` from `src/lib/title-case.ts` (already exists and preserves acronyms and PascalCase brand names).

### 2. Copy rewrite pass, per role

Rewrite generic/AI-flavored copy with a clear voice per role:

- **Student** — simple, encouraging, action-first ("Share your voice", "See your pathway", "Prep for your PPT").
- **Parent / Guardian** — calming, organized, meeting-prep framed.
- **Educator / Case Manager** — practical, caseload-aware, PPT/IEP workflow language.
- **School Admin** — implementation, team coordination, school-level visibility.
- **District Admin** — strategy, readiness trends, service gaps, adoption.
- **Partner** — opportunity posting, deadlines, PartnerForward supports, no student PII.
- **Owner / Admin** — platform operations, review queues, launch readiness, system oversight.

Kill filler phrases like "manage your items here", "track your progress", repeated cross-role blurbs, and marketing fluff. Every card description must state what the section is for and what action it enables.

### 3. Layout & symmetry pass

For each dashboard:
- Normalize outer container to consistent `mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-8 space-y-8`.
- Overview grids: `grid gap-4 sm:gap-6 sm:grid-cols-2 lg:grid-cols-3` with `h-full` cards so tiles align.
- Card internals: consistent `p-6`, header `mb-4`, footer CTA row aligned to bottom via `mt-auto`.
- Buttons in same group share `size="sm"` (secondary rows) or `size="default"` (primary CTA).
- Fix the odd-count centering in Overview grids by promoting a lead tile to `sm:col-span-2 lg:col-span-1` where a 5-tile row leaves a gap, or padding to an even count with a compact "What This Shows" helper tile per role.
- Apply the `grid-cols-[minmax(0,1fr)_auto] sm:flex` header pattern (from responsive-layout memory) to every card header with a title + widget/badge row.
- Icon slots `shrink-0`; heading `truncate` on single-line titles.

### 4. Empty / loading / error states

- Empty states: Title Case heading + one-sentence helper + primary CTA.
- Loading (`dashboard.tsx`, shells): Title Case heading like "Loading Your Dashboard", one descriptive sentence.
- Error: `DashboardErrorFallback` already role-specific; verify Title Case and copy tone per role, tighten descriptions.

### 5. Responsive QA

Verify mobile / tablet / desktop for each dashboard route via Playwright screenshots at 375, 768, 1280; fix any wrap, overflow, or cramped-CTA regressions found.

### 6. Verification

- `bunx vitest run tests/unit` (all unit tests, including dashboard render contract and stage journey).
- `bunx playwright test --project=dashboard-regression`.
- `bunx playwright test --project=role-access` if any route file was edited beyond copy.
- Manual screenshot review of all 7 dashboards at 3 breakpoints.

## Out of scope

- New features, new tiles beyond even-count padding helpers, new routes.
- Backend/schema/RLS changes.
- Test ID / landmark / contract changes (`ROLE_DASHBOARD_TEST_IDS`, `data-dashboard-landmark`, `DASHBOARD_TESTID_CONTRACT_VERSION`).
- Auth, 2FA, role-guard logic.
- Design token / theme changes in `styles.css`.

## Risk & size note

This touches ~40 files (~10K LOC) as pure presentation edits. I will land it in role-batched commits (Student → Parent → Educator → School → District → Partner → Owner, then shared cards + shells), running unit + dashboard-regression after each batch so any regression is isolated to one role.
