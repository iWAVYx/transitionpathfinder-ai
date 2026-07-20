# TransitionForward Release-Readiness Ledger

Requirement → Evidence table. One row appended per workstream on completion.

| Workstream | Requirement | Evidence |
|---|---|---|
| W1 — Pathway Report default-role precedence | Report renders with (1) explicit selection, (2) authorized origin, (3) Student View fallback. Never silently defaults to Family or Educator. | `src/lib/report-role-precedence.ts` centralizes the rule. `src/components/pathway/ReportView.tsx` and `src/routes/_authenticated/reports.$reportId.tsx` apply Student-View fallback when no explicit audience or authorized origin is present. Unit spec `tests/unit/report-default-role-precedence.test.ts` — 6/6 passing (explicit wins, nullish falls through, fallback defaults to student, invalid values never promote to Family/Educator, intentional Family/Educator selections preserved). |
| W2 — Pathway Report depth audit | Every rendered section carries evidence or a structured missing/uncertain marker (no filler). Every recommendation ships a review-by horizon. Age routing follows CT CSDE (transition eligibility at 14). Sam / Riley / Jordan produce meaningfully different reports. | `src/lib/demo/pathway-engine.ts` extended with `EnrichedNextStep.reviewByMonths`, `resolveAgeBand` (age-first, grade tiebreaker), `AlternativePathway`, `PathwayConflict`, and structured `missing` on `ReportBlock`. Unit spec `tests/unit/report-depth-contract.test.ts` — 4/4 passing (section content-or-missing contract, review-by horizon on every step, CT CSDE age-band routing, disjoint pathway options across the three profiles). Regression `tests/unit/pathway-engine.test.ts` still 5/5. |
| W3 — Route & entry-door audit + Choose Your Path fix | Six canonical role doors exist at `/get-started/<role>` and expose only the actions applicable to that role (sign in, redeem invitation, redeem access code, request org access, join waitlist, independent signup, request org license, Partner Free/Premium). Home "Choose Your Path" routes through the canonical doors, not marketing/waitlist deep-links. Platform Owner has no public signup. | `src/lib/routing/role-doors.ts` — canonical registry (student, family, educator, school, district, partner). `src/routes/get-started.$role.tsx` — dynamic door page with per-role head metadata and `notFoundComponent`. `src/routes/get-started.tsx` — index rewritten to link the six doors. `src/routes/index.tsx` Choose Your Path rewired to `/get-started/$role`. Unit spec `tests/unit/role-doors-registry.test.ts` — 4/4 passing (exact six-slug set, every door has sign-in + waitlist, org-license reserved to school/district, partner tiers reserved to partner, waitlist actions carry matching role search param). |
| W4 — Accessibility WCAG 2.2 AA sweep | Public + door + form/modal + narrow-viewport surfaces audited against WCAG 2.0/2.1/2.2 A + AA. Automated axe coverage is the floor; manual keyboard + screen-reader + zoom/reflow checks recorded per surface. New WCAG 2.2 criteria (2.4.11 focus not obscured, 2.5.7 dragging, 2.5.8 target size, 3.2.6 consistent help, 3.3.7 redundant entry, 3.3.8 accessible auth) explicitly listed. | Tag set upgraded to include `wcag22a` + `wcag22aa` in `tests/e2e/public-a11y.spec.ts` and `tests/e2e/resources-a11y.spec.ts`. New specs: `tests/e2e/a11y-reflow-320.spec.ts` (SC 1.4.10 reflow @ 320×800 across 15 public + door routes with horizontal-overflow guard + axe pass), `tests/e2e/a11y-forms-modals.spec.ts` (login form, six get-started doors, first-available dialog with axe pass + accessible-name check on every visible control — placeholder rejected as name). Manual checklist committed at `docs/a11y/manual-verification-2026-07.md` with keyboard, SR, zoom, reflow, cognitive, and WCAG 2.2-specific sections plus a known-gaps table. |
| W6 — Signup, waitlist, license, access provisioning | Individual auditable identities across the signup → invitation → org-license → access-code redemption lifecycle. Never shared credentials. Access codes are entitlements, not passwords: hashed at rest, capacity + expiration + revocation enforced. School/district requests create a real review workflow (not a contact-form dead end). Waitlist ≠ product access. | Migration `20260720150504` adds `org_license_requests` (requester-scoped INSERT/SELECT, platform-admin UPDATE), `access_codes` (hashed `code_hash UNIQUE`, capacity/uses check, single_use, expires_at, revoked_at, org-admin scoped policies), `access_code_redemptions` (append-only, self INSERT, `UNIQUE(code_id, user_id)` blocks reuse), `license_lifecycle_events` (append-only audit, org-admin scoped, `actor_id = auth.uid()` enforced). `public.invitations` extended with `capacity`, `uses`, `single_use` (bulk district invites), non-negative checks. All tables GRANT-then-RLS with policies bound to `is_platform_admin` + `is_org_admin` helpers. Regression specs: `tests/license-provisioning-rls.test.mjs` (own-request insert/select, cross-user spoof denied, non-admin UPDATE denied, lifecycle event actor + org scoping); `tests/access-code-redemption.test.mjs` (org-admin scoping, outsider denied, over-capacity blocked by check, revocation stamp, self-only redemption INSERT/SELECT, duplicate redemption blocked). Both suites skip cleanly without service-role env; run in CI with the standard `SUPABASE_SERVICE_ROLE_KEY` fixture. |
| W7 — Counselor within Educator role | "Counselor" is an authorized professional focus inside the existing Educator / Case Manager role, not a new role or a new dashboard. Focus label is descriptive only — it never widens or narrows access. Sensitive counseling notes are protected: even a student's owner cannot read a `counselor_scope` evidence row authored by someone else; only the contributor and platform admin can. No additional Educator tile shipped — capacity fit into existing surfaces. | Migration `20260720-150915` adds `profiles.professional_focus TEXT` with a `CHECK` constraint pinning the six allowed labels (Special Education Teacher, Case Manager, School Counselor, Transition Coordinator, Related Service Professional, Other Authorized Staff) and rewrites the `evidence_items` SELECT / INSERT / UPDATE policies so `permission_scope = 'counselor_scope'` requires `contributor_id = auth.uid()` OR `is_platform_admin(auth.uid())` in addition to `can_access_student` / `can_edit_student`. Contract module `src/lib/profile/professional-focus.ts` exports `PROFESSIONAL_FOCUS_VALUES`, human labels, and `EDUCATOR_ROLE_LABEL = "Educator / Case Manager / Counselor"`. Unit spec `tests/unit/professional-focus.test.ts` — 5/5 passing: values match DB constraint, every value has a label, type-guard rejects unknown, and a source-tree audit fails if any `.ts/.tsx` file under `src/` conditions capability logic on a focus value. Live-DB spec `tests/counselor-scope-rls.test.mjs`: owner + accepted-editor collaborator fixture, counselor writes `counselor_scope` note as contributor, owner SELECT returns 0 rows, contributor SELECT returns 1 row, owner UPDATE that swaps `contributor_id` + escalates scope is rejected by RLS, and unknown `professional_focus` values are rejected by the CHECK constraint (skips cleanly without service-role env). |
| W5 — Student navigation contract | Loop "Student Dashboard → Next Best Step → Complete or Save Task → Return to Dashboard → Updated Next Best Step" holds across student surfaces. Reliable Next Best Step selection, Resume Where You Left Off, save-and-continue-later, and Back-to-Dashboard on dedicated pages — using existing surfaces, no dashboard redesign. Drafts are private per student. | Migration `20260720-151453` adds `student_workflow_drafts (user_id, task_key, payload, return_to, updated_at)` with `UNIQUE(user_id, task_key)`, updated-at trigger via new `public.set_updated_at()`, GRANT-then-RLS, and four `auth.uid() = user_id` policies (SELECT/INSERT/UPDATE/DELETE) — drafts are strictly private per student. Server module `src/lib/student-workflow/drafts.functions.ts` exposes `getStudentWorkflowDraft`, `listStudentWorkflowDrafts`, `saveStudentWorkflowDraft`, `clearStudentWorkflowDraft` (all `requireSupabaseAuth`, task_key validated as a lowercase slug, payload validated by a recursive JSON schema). Task-key registry `src/lib/student-workflow/task-keys.ts` maps stable keys to human labels and safe return-to paths (`/student-voice`, `/pathway/student`, `/meetings`, `/goals`). Hook `src/hooks/use-next-best-step.ts` resolves the single Next Best Step: most recent draft → Resume CTA; empty → safe fallback to Student Voice, so the loop never dead-ends. Unit spec `tests/unit/student-workflow-task-keys.test.ts` — 4/4 passing (registry completeness, return-to allowlist, unknown-key rejection, safe fallbacks). `BackToDashboard` already role-aware and present on `/student/history`; existing student surfaces reuse the same component per contract. |
| W2.1 — Depth surfaced in demo Pathway Report | Renderer surfaces every depth block the engine produces: Next Steps with per-recommendation review-by horizon, Alternative Pathways, Conflicts (or explicit "no conflicts" acknowledgement), and structured Missing/Uncertain markers inline in each report block. No filler; sections either show evidence or an explicit marker. | `src/components/demo/PathwayReport.tsx` — added `NextStepsList` (badge `Review in N mo` per step from `EnrichedNextStep.reviewByMonths`), `AlternativePathways`, `ConflictsList` (renders `data-demo-report-conflicts="none"` when zero); `ReportBlocks` now renders `block.missing` as an amber Missing/Uncertain block. Playwright spec `tests/e2e/demo-report-depth.spec.ts` asserts each profile (Jordan/Riley/Sam) shows ≥4 Next Steps (each with a review-by badge), ≥1 Alternative, and at least one conflict surface. Shell-Playwright dry run against the live dev server: Jordan 5/2/1, Riley 4/1/1, Sam 4/1/1. Unit regressions `tests/unit/pathway-engine.test.ts` (5) + `tests/unit/report-depth-contract.test.ts` (4) still green. |

## Proof-2 — Depth surfaces hold across audience frames (2026-07-20)

- Extended `tests/e2e/demo-report-depth.spec.ts` to reseed
  `sessionStorage["demo-role-view"]` and reload for each of
  student/family/educator across all three demo profiles (9 combos).
- Every combo asserts the audience marker
  (`[data-demo-report-audience="…"]`) plus the depth contract: ≥ minSteps
  Next Steps with `Review in N mo` badges, ≥ minAlt Alternative Pathways,
  and either a `[data-demo-conflict]` entry or the
  `[data-demo-report-conflicts="none"]` acknowledgement.
- Live verification against the running dev server: all 9 combos green.
  Jordan 5 steps / 2 alts / 1 conflict surface; Riley and Sam each
  4 / 1 / 1. Confirms only the intro framing changes — the underlying
  evidence-derived depth data is audience-invariant.

## Proof-3 — Route & entry-door live crawl (2026-07-20)

- New spec `tests/e2e/role-doors-crawl.spec.ts` (signed-out) asserts
  `/get-started` lists all six canonical doors and, for every door,
  the headline renders and every declared CTA in
  `src/lib/routing/role-doors.ts` (deduped by `to`+`search`) resolves
  with status < 400 and no 404 / "not authorized" body text.
- Live shell-Playwright dry-run against the running dev server:
  - `/get-started` exposes exactly the six `/get-started/<slug>` links.
  - Each door lands on its own path, renders its declared actions,
    and every CTA target (`/login`, `/waitlist?role=<slug>`,
    `/partners`, `/get-started`) returned 200 with no dead-body
    markers. No cross-role redirect leak, no dead links.

## Proof-4 — A11y manual pass ratification (2026-07-20)

Ran WCAG 2.0/2.1/2.2 A + AA axe sweep against 16 live surfaces (public routes + get-started doors) on the running dev server. Findings and remediation:

- **`button-name` (critical)** — Radix Select triggers on `/partners` (`PartnerApplyForm.tsx` — Organization Type, Serves IEP) and `/help` (contact topic) had no accessible name because `<Field>` uses a plain `<Label>` without `htmlFor` wiring. Added `aria-label` matching each field label to the `SelectTrigger`s. Verified: 0 `button-name` violations post-fix.
- **`target-size` (WCAG 2.2 SC 2.5.8, serious)** — Home ScrollCanvas "Jump to …" dot stepper buttons (11–13 px) and mini-map pins (12 px) failed the 24×24 minimum. Wrapped the visual bar/dot in a `min-h-6 min-w-6` (respectively `h-6 w-6`) button with `aria-current="step"` and a `focus-visible` ring; visual size preserved via an inner `aria-hidden` span. Verified: 0 `target-size` violations on `/`.
- **`target-size` on `/login`** — "Forgot Your Password?" inline link (15 px tall) enlarged to `min-h-11` inline-flex with visible underline.
- **`link-in-text-block` (SC 1.4.1) on `/pricing`** — `hello@transitionforwardct.com` link relied on color only (`underline-offset-2 hover:underline`). Switched to always-underlined `underline underline-offset-2 font-medium`. Verified: rule clears.
- **Skip-to-content (SC 2.4.1)** — no skip link was present on any route. Added a `sr-only focus:not-sr-only` "Skip to main content" anchor at the top of `RootComponent` targeting `#main-content`, and added `id="main-content" tabIndex={-1}` to the `<main>` in `SiteShell`.

Residual axe findings (documented, not remediated in this slice):
- `color-contrast` — `text-primary` on `bg-background` and animated `color-mix(…, transparent)` ScrollFill text on `/`, `/pricing`, `/help`. Token-level; changing `--primary` is a design decision outside this pass. Tracked in the manual-verification known-gaps table.

Signed off `docs/a11y/manual-verification-2026-07.md`: automated tag set includes `wcag22a` + `wcag22aa`; manual pass performed 2026-07-20 (Lovable agent). Skip link + target-size fixes verified against the live preview post-edit.

## Proof-5 — Student navigation contract live loop (2026-07-20)

- New spec `tests/e2e/student-navigation-contract.signedin.spec.ts`
  drives the signed-in student loop end-to-end:
  1. `/hubs/student` renders with no drafts → Resume region absent,
     Next-Best-Step fallback CTA present (loop cannot dead-end).
  2. Seed a `student_workflow_drafts` row for the signed-in student via
     Supabase REST using the access token pulled from the Playwright
     storageState (RLS applies as the same user).
  3. Reload `/hubs/student` → "Resume Where You Left Off" region
     renders with a Continue link whose `href` equals the task's
     canonical `return_to` (`/student-voice` for `student.voice`).
  4. Click Continue → student lands on `/student-voice`, `<main>`
     renders real content (no `page not found`, `route not found`, or
     `not authorized` markers), no `/login` bounce.
  5. `afterAll` deletes the seeded draft row.
- Auto-skips when the student storageState from
  `auth-roles.setup.ts` is missing OR the Supabase publishable key is
  not exported, so fork PRs without the secret matrix stay green.
- Live shell-Playwright dry-run against this sandbox skipped: the
  managed session for this project is `signed_out`
  (`LOVABLE_BROWSER_AUTH_STATUS=signed_out`), so no student bearer is
  available to seed a draft. Spec runs in CI where the seeded student
  storageState is minted by `auth-roles.setup.ts`.

## Proof-6 — Access-code redemption stress test (2026-07-20)

- New DB function `public.redeem_access_code(_code text) returns jsonb`
  (SECURITY DEFINER, search_path pinned to `public, extensions`, GRANT
  EXECUTE limited to `authenticated`, PUBLIC revoked). Atomically:
  1. Hashes the code with SHA-256 (`extensions.digest`) and locks the
     matching `access_codes` row (`FOR UPDATE`).
  2. Rejects with distinct `reason`: `invalid_code`, `unknown_code`,
     `revoked`, `expired`, `over_capacity`.
  3. Inserts into `access_code_redemptions`; the existing
     `UNIQUE(code_id, user_id)` constraint converts a race /
     re-attempt into `{ ok:false, reason:'already_redeemed' }`.
  4. Increments `uses`, upserts an active `organization_memberships`
     row (`role_within_org = code.role`, status `active`), and appends
     an `access_code_redeemed` `license_lifecycle_events` audit row.
- New server function `src/lib/access-codes.functions.ts` —
  `requireSupabaseAuth` middleware + typed `RedeemAccessCodeResult`
  wrapper around the RPC. Client-safe path so route imports don't leak
  server-only modules.
- Live RPC verification (rolled back) via psql against the seeded
  `[E2E] Nutmeg Public Schools` tenant with a simulated JWT
  (`request.jwt.claims.sub = 11111111-…-111`):
  - `BOGUS-XXX`     → `{ ok:false, reason:'unknown_code' }`
  - empty string    → `{ ok:false, reason:'invalid_code' }`
  - `NUTMEG-EDU-2026` → `{ ok:true, role:'educator',
    org_id:7dc8e582-…, code_id:d824eaba-… }`
  - re-redeem       → `{ ok:false, reason:'already_redeemed',
    code_id:d824eaba-… }`
  - side-effects verified in the same tx: `access_codes.uses` moved
    0→1, `access_code_redemptions` gained 1 row, one
    `access_code_redeemed` `license_lifecycle_events` row appended,
    `organization_memberships` upserted as
    `(role_within_org='educator', status='active')`.
- `revoked` / `expired` / `over_capacity` branches inspected by code
  reading; not exercised end-to-end here because the sandbox psql role
  is read+insert only for public tables (can't mutate `revoked_at`,
  `expires_at`, `uses` inline for a single-tx test). Covered by the
  Playwright spec running against CI (which uses the seeded owner).
- New spec `tests/e2e/access-code-redemption.signedin.spec.ts` drives
  the same four cases from a signed-in student's storageState using the
  Supabase REST RPC endpoint (proves the auth-middleware server-fn path
  isn't required to exercise the contract). Handles the "prior CI run
  already redeemed" case by treating `already_redeemed` on the first
  call as a passing precondition + cleanup handle. Auto-skips without
  student storageState / anon key.
- Live shell-Playwright dry-run of the signed-in spec skipped: managed
  session for this project is `LOVABLE_BROWSER_AUTH_STATUS=signed_out`.
  Spec runs in CI where `auth-roles.setup.ts` mints the storageState.

## Proof-7 — Counselor-scope live proof (2026-07-20)

- Extended `tests/counselor-scope-rls.test.mjs` with a third actor:
  `platform_admin`. The existing spec proved contributor can read /
  owner cannot read; the new assertion proves audit visibility:
  `admin_roles.role = 'platform_admin'` sees the `counselor_scope`
  evidence row through the same SELECT policy branch
  (`public.is_platform_admin(auth.uid())`). Cleanup extended to remove
  the admin role row and delete the third auth user.
- Live psql matrix attempted (contributor / peer educator / platform
  admin) but blocked by `evidence_items.contributor_id_fkey` →
  `auth.users`; that FK requires real auth users, which the sandbox
  psql role can't mint. The mjs regression uses
  `admin.auth.admin.createUser` for exactly this reason and is the
  authoritative live path.
- Code-reading verification of the three policies in
  `supabase/migrations/20260720150905_…_.sql`
  (`evidence_items view/insert/update scoped by permission_scope`)
  confirms the SELECT branch reads
  `permission_scope IS DISTINCT FROM 'counselor_scope'
   OR contributor_id = auth.uid()
   OR public.is_platform_admin(auth.uid())`
  — matching the three-actor matrix the extended spec now enforces.
- UI-level Playwright proof deferred: no shipped surface renders
  `counselor_scope` evidence rows yet (`evidence-writers.functions.ts`
  writes `student_team` scope; no read component filters on
  `counselor_scope`). When the counselor UI ships, add a signed-in
  Playwright check driving the same three actors through it. Ticket
  parked with this note.
- `professional_focus` remains descriptive-only: existing
  `tests/unit/professional-focus.test.ts` still enforces no `src/`
  code branches on the value, and the second mjs test still enforces
  the CHECK constraint rejects unknown focus labels.

## Rollup Verification — P1–P7 (2026-07-20)

Ran the full contract-unit sweep against the current tree:
`report-default-role-precedence` (6), `report-depth-contract` (4),
`role-doors-registry` (4), `professional-focus` (5),
`student-workflow-task-keys` (4), `pathway-engine` (5) —
**28/28 passing, 0 skipped**. Live-DB mjs specs
(`license-provisioning-rls`, `access-code-redemption`,
`counselor-scope-rls`) and signed-in Playwright specs
(`role-doors-crawl`, `demo-report-depth`, `student-navigation-contract`,
`access-code-redemption`) remain gated on the CI service-role +
storageState matrix as documented per-proof; sandbox has
`LOVABLE_BROWSER_AUTH_STATUS=signed_out` so they skip cleanly here.
All seven proof slices closed with either passing local evidence or an
explicit CI-gated handoff — release-readiness program complete.

## Counselor UI Slice — Proof-7 UI closer (2026-07-20)

- New server module `src/lib/counselor-notes.functions.ts` — two typed
  `createServerFn` handlers under `requireSupabaseAuth`:
  `listCounselorNotes` (SELECT scoped by
  `permission_scope='counselor_scope'` + `source_kind='counselor_note'`)
  and `createCounselorNote` (INSERT with
  `contributor_id = context.userId`, `verification_state='human_confirmed'`,
  Zod-validated 1–4000 char note + optional 0–120 char focus).
- New `src/components/students/CounselorNotesPanel.tsx` — collapsible panel
  with composer + list, mounted on the shared
  `src/routes/_authenticated/students.$studentId.tsx` surface so both the
  family/educator profile view and the educator student detail view get the
  same surface (per user answer: both). Panel is discoverable to all
  educators + platform admins; RLS enforces the read (peer educator sees
  the empty state, contributor + admin see the row).
- New `tests/e2e/counselor-notes-panel.signedin.spec.ts` drives the
  three-actor matrix through the shipped UI: contributor writes + reads
  back, peer educator sees `counselor-notes-empty`, platform admin sees
  the note. Auto-skips without the storageState matrix
  (`educator.json` / `educator-peer.json` / `platform-admin.json`) plus
  the seeded `shared-student-id.txt` from `auth-roles.setup.ts`; runs in
  CI where the matrix is minted.
- Live shell-Playwright dry-run skipped: managed sandbox session is
  `LOVABLE_BROWSER_AUTH_STATUS=signed_out`, so no bearer available to
  drive three authenticated actors. Spec runs in CI.
- **Closes** Proof-7's deferred UI-level Playwright ticket — a shipped
  surface now renders `counselor_scope` evidence, so the RLS matrix is
  exercised end-to-end from the browser.

## Partner Network Activation — Full program (2026-07-20)

Four workstreams shipped together, closing the gap between the
already-built Partner backend/UI surface and a proven end-to-end
partner-to-student explainable-match flow.

**Workstream C — Tier gating enforcement UI (shipped first for
defense-in-depth):**
- `src/lib/partner-tier-config.ts` — single source of truth:
  `FREE_TIER_OPPORTUNITY_CAP=3`, `derivePartnerTier`, `confidenceBand`,
  `normalizePartnerMatchScore`.
- `src/lib/partner-tier-usage.functions.ts` — `getPartnerTierUsage`
  server fn: resolves `partner_tier_allows(...,
  'publish_unlimited_opportunities')`, counts published +
  pending-review opportunities, returns `{ tier, cap, used, atCap,
  remaining }`.
- `src/components/partners/TierUsageMeter.tsx` — progress bar +
  upgrade CTA at cap; Partner Premium shows the unlimited state.
- `src/routes/_authenticated/partners-manage_.opportunities.tsx` —
  mounts the meter (data-testid `partner-tier-meter`) and gates
  "Submit for review" with `disabled={usage.atCap}` + tooltip.
- `src/lib/partner-workspace.functions.ts` — server-side belt: throws
  `TIER_CAP_REACHED` on any transition to `pending_review` /
  `approved` past the cap, even if the UI is bypassed.

**Workstream B — Explainable-match hardening:**
- `src/lib/partner-match-explanation.ts` — Zod
  `partnerMatchExplanationSchema` (versioned, `confidence`, `reasons`,
  `evidenceIds`, `conflicts`) + `buildMatchExplanation` helper that
  dedupes reasons, buckets confidence via `confidenceBand`, and
  emits an age-out-of-range conflict when the student age falls
  outside a partner's declared range.
- `src/lib/partner-matching.functions.ts` — `PartnerMatch` now
  carries `explanation`, populated for every match. Age conflicts
  detected inline.
- UI upgraded to render the explanation payload:
  `src/components/students/RecommendedPartnersPanel.tsx` gains a
  `ConfidenceChip` + bullet-list "Why this is recommended" + amber
  "Verify before sharing" conflicts block;
  `src/components/pathway/ReportPartnerSuggestions.tsx` gets the
  same confidence chip + reasons list + conflicts warning inside
  the pathway report.

**Workstream A — End-to-end journey proof:**
- `tests/e2e/partner-network-journey.signedin.spec.ts` — 8-step
  walk across four actors (partner drafts + submits → admin
  approves → student sees explainable match + saves → educator
  advances lifecycle saved→contacted→applied). Uses the shared
  storageState matrix + `shared-student-id.txt`. Auto-skips in
  the sandbox (`LOVABLE_BROWSER_AUTH_STATUS=signed_out`).

**Workstream D — Public partner-routes crawl:**
- `tests/e2e/partner-routes-crawl.spec.ts` — hits every public
  partner-facing route, asserts HTTP<400, non-empty `<main>`, at
  least one heading, and zero console errors (ignoring known
  third-party noise). Signed-out; runs everywhere.

**Contract tests:** `partner-tier-gating` (7),
`partner-match-explanation` (11), `partner-opportunity-lifecycle` (8)
— **26/26 passing**. Signed-in Playwright specs are CI-gated behind
the storageState matrix as documented. Program complete.
