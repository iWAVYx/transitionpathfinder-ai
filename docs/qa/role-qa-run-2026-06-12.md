# Role-Based QA — Automated Run

Date: 2026-06-12
Suite: `tests/*.mjs` (role-guard matrix, all RLS, persistence smoke, IEP signed-URL, header responsive, demo isolation, owner shell, CT seed audit).
Runner: `node --test` (sequential, one suite at a time to avoid Supabase auth rate-limits).

Every script defined in `src/lib/owner/testing-scripts.functions.ts` (`qa-student`, `qa-parent`, `qa-educator`, `qa-school-admin`, `qa-district-admin`, `qa-partner`, `qa-platform-admin`) shares a 12-step baseline. The automated suites below cover the security-critical baseline steps for every role; UX-level steps remain manual checks in `/owner/testing-scripts`.

## Final tally

| Suite | Tests | Pass | Fail | Status |
|---|---|---|---|---|
| role-guard-matrix | 2 | 2 | 0 | ✅ PASS |
| documents-rls | 14 | 14 | 0 | ✅ PASS |
| cross-district-rls | 8 | 8 | 0 | ✅ PASS |
| calendar-rls | 4 | 3 | 1 | ⚠ snapshot drift (test data, not RLS) |
| rls-pii-access | 22 | 22 | 0 | ✅ PASS |
| rls-demo-isolation | 20 | 20 | 0 | ✅ PASS |
| persistence-smoke | 5 | 5 | 0 | ✅ PASS (after column-name fix) |
| parent-onboarding-rls | n/a | all | 0 | ✅ PASS |
| can-edit-student-boundaries | 9 | 9 | 0 | ✅ PASS |
| can-edit-student-multi-student | 8 | 8 | 0 | ✅ PASS |
| collaboration-notes-edit-rls | 4 | 4 | 0 | ✅ PASS |
| iep-upload-signed-url + expiry + revocation | all | all | 0 | ✅ PASS |
| dark-mode-csp | all | all | 0 | ✅ PASS |
| owner-back-to-main-app | all | all | 0 | ✅ PASS |
| ct-seed-v2-audit | all | all | 0 | ✅ PASS |
| header-responsive | 5 | 2 | 3 | ❌ FAIL — real |

Initial single-batch run reported 25 extra failures; all were `Request rate limit reached` from Supabase Auth and resolved when suites were re-run individually. Those are infrastructure noise, not product defects.

## Issues found (prioritized)

### 🔴 HIGH — none
No RLS, PII, role-guard, or signed-URL regressions. Sensitive student data is properly protected for every role, including Partner (`no_student_docs` step covered by `documents-rls` + `rls-pii-access`).

### 🟠 MEDIUM — 1

1. **Header responsive breakpoint mismatch** — `tests/header-responsive.test.mjs` fails 3 assertions:
   - `marketing <nav>` uses `hidden lg:flex` but the test (and prior contract) expects `hidden xl:flex` so user controls (bell, dashboard, more, sign out) have room at `lg` widths.
   - Hamburger trigger uses `lg:hidden` but should be `xl:hidden` to pair with the inline nav.
   - File: `src/components/site/SiteHeader.tsx` lines 242, 277, 354.
   - Impact: at 1024–1279 px the marketing nav and user controls can overlap or push controls offscreen. Confirmed by reading the component.
   - Fix: bump `lg:` → `xl:` on those three classes, or update the test snapshot if the new breakpoint is intentional.

### 🟡 LOW — 2

2. **`calendar-rls` snapshot drift on the `unrelated` actor** — the test picks an "unrelated" profile by exclusion; in the current DB that profile has been wired as a collaborator by another test run, so it now sees `family_team` and `student_team` events. The RLS policy on `calendar_events` is correct (`can_access_student` gate verified). Either reset accumulated `student_collaborators` rows for the picked profile or harden the actor-selection query to exclude existing collaborator memberships.
3. **Auth rate-limiting in batched runs** — Supabase Auth throttles when 18 suites sign in back-to-back. Workaround: run suites sequentially with a short delay (already the recommended pattern). No product impact.

### Test-suite hygiene fixed in this run
- `tests/persistence-smoke.test.mjs` referenced columns that no longer exist (`goals.area`, `action_items.created_by`, `calendar_events.created_by`, `calendar_events.starts_at`). Updated to current schema (`category`, `created_by_user_id`, `owner_user_id`, `event_date`). All 5 persistence checks now pass.

## Per-role pass/fail summary

| Role | Account+Onboarding | Correct dashboard | Nav scoping | RLS / PII | Persistence | Role-specific journey | Verdict |
|---|---|---|---|---|---|---|---|
| Student | ✅ | ✅ | ✅ (role-guard matrix) | ✅ | ✅ | manual — pending operator pass | PASS (automated) |
| Parent / Guardian | ✅ | ✅ | ✅ | ✅ | ✅ | manual | PASS (automated) |
| Educator / Case Manager | ✅ | ✅ | ✅ | ✅ (collaborator + edit matrix) | ✅ | manual | PASS (automated) |
| School Administrator | ✅ | ✅ | ✅ | ✅ (org-scoped) | ✅ | manual | PASS (automated) |
| District Administrator | ✅ | ✅ | ✅ | ✅ (cross-district isolated) | ✅ | manual | PASS (automated) |
| Partner Organization | ✅ | ✅ | ✅ | ✅ (no student doc access) | ✅ | manual | PASS (automated) |
| Platform Admin | ✅ | ✅ | ✅ | ✅ (no escalation via user_roles) | ✅ | manual | PASS (automated) |

Header breakpoint issue (MEDIUM #1) affects every role equally at 1024–1279 px and is the only blocker before sign-off.
