# TransitionForward Release-Readiness Program

Formal release gate, not a polish pass. Approved visual system is frozen: no dashboard redesigns, no new sections, no new nav. At most **one** existing-style tile on the Educator surface if — and only if — the Counselor functionality cannot land in an existing tile. Every workstream ends with a requirement→evidence row appended to `docs/release-readiness-ledger.md` and locked-in tests before the next workstream starts.

## Ground rules (apply to all seven)

- UI freeze: no changes to public/demo/dashboard/workspace/report layouts, tile counts, semantic landmarks, or test IDs. Only loading/empty/error/status regions may reflect improved backend state.
- Migrations: additive + idempotent. GRANTs before RLS before policies.
- Feature flags: risky wiring ships behind an off-by-default flag first, then rolls forward with a rollback path recorded.
- Verification: browser + backend. UI existing ≠ feature working. Every acceptance line proves persistent state + correct authorization.
- Accessibility: WCAG 2.2 AA target; automated axe + manual keyboard + screen-reader spot checks. No "AA conformant" claim from automated scans alone.
- Tests never weakened, no hidden test-only links, no bypassing auth to make a suite pass.

---

## Workstream 1 — Pathway Report default-role precedence

**Current**: report opens with whatever role the caller passed; unauthorized/absent role can silently fall through to Family or Educator lens.

**Intended**: single precedence rule everywhere the report renders:
1. Valid role explicitly selected in the current demo/workflow.
2. Role preserved from an authorized dashboard or Transition Workspace origin.
3. Student View when no valid role context exists.

Never overrides an intentional Family/Educator selection. One canonical report id + version; role changes the authorized presentation lens only.

**Files/routes**: `src/lib/demo/role-context.ts`, `src/hooks/use-role-context.ts`, `src/routes/demo_.report.tsx`, `src/routes/share.$token.tsx`, `src/routes/_authenticated/workspace.*`, `src/components/report/*`.

**Backend**: none. Presentation layer + role resolver only. Canonical id/version already lives on `pathway_reports`.

**Permissions**: authorized-role check runs before lens is applied (Family/Educator lens requires proven origin; anonymous/public path collapses to Student).

**Tests**: `tests/unit/report-default-role-precedence.test.ts` covering all four examples in the spec + regression on existing Family/Educator dashboard-origin openings; Playwright spec `tests/e2e/report-default-role.spec.ts` for the public/demo path.

**Evidence**: role-resolution matrix, links to test runs.

---

## Workstream 2 — Pathway Report depth audit

**Current**: report shape covers most sections but skips several evidence disclosures (conflicting info, missing info/questions, alternative pathways, per-rec review-by date) and can drift toward generic filler for sparse profiles.

**Intended**: every section in the spec is either populated when evidence supports it or replaced with a structured "missing/uncertain" block — never filler. Every recommendation ships `why`, `evidence`, `uncertainty`, `next`, `owner`, `review_by`. Age + grade routing per CT CSDE (transition services by first IEP in effect when the student turns 14).

**Files/routes**: `src/lib/pathway-recommendation-v1.ts` (extend contract), `src/lib/pathway-engine-shadow.ts`, `src/components/report/*`, `src/lib/demo/pathway-engine.ts` (age-not-just-grade routing), demo fixtures for Sam (G7), Riley (G9), Jordan (G11).

**Backend**: additive `pathway_reports` columns already exist for provenance; add optional `missing_information`, `conflicts`, `alternative_pathways` sub-blobs to the `content` JSON — no schema break.

**Tests**: extend `tests/unit/pathway-engine.test.ts` for three profiles; `tests/unit/report-depth-contract.test.ts` asserts every section rendered has evidence or explicit missing/uncertain state; snapshot tests for Sam/Riley/Jordan differ meaningfully.

**Evidence**: three side-by-side report snapshots + coverage report of the section matrix.

---

## Workstream 3 — Route & entry-door audit + Choose Your Path fix

**Current**: `/get-started/*` doors partly exist; Choose Your Path routes some roles to marketing pages and Student to an access door — inconsistent.

**Intended**: crawl every public + signed-in route, produce a list of dead / duplicate / mis-role / broken-back / redirect-loop / demo-into-live / signed-in-to-login findings. Canonical role doors reused (audit before creating):
- `/get-started/student`
- `/get-started/family`
- `/get-started/educator`
- `/get-started/school`
- `/get-started/district`
- `/get-started/partner`

Each door supports the applicable subset of: sign in · redeem invitation · redeem access code · request school/district access · join waitlist · begin independent signup · request org license · begin Partner Free/Premium. Platform Owner has no public signup.

**Files/routes**: `src/routes/get-started.*`, `src/routes/index.tsx` (Choose Your Path), `src/lib/routing/role-doors.ts` (new registry), redirect stubs for retired routes.

**Backend**: none (routing + waitlist/invitation server fns already present).

**Tests**: `tests/unit/route-crawl.test.ts` (link graph audit), `tests/e2e/role-doors.spec.ts` (each door renders + supports its declared paths), regression on existing role-leak-nav suite.

**Evidence**: pre/post route inventory diff, Choose Your Path destination map, retired-route redirect list.

---

## Workstream 4 — Accessibility WCAG 2.2 AA sweep

**Current**: mixed. Public shell passes axe on most pages; several forms, modals, tables, and charts have manual gaps (focus restoration, error-summary, chart summaries, zoom reflow at 320px).

**Intended**: automated + manual coverage per surface. Automated tooling is a floor, not a certification. Cognitive-accessibility overlays: predictable nav, plain language, error recovery.

**Files/routes**: all public + demo + authenticated pages; primary fixes concentrate in `src/components/{forms,modals,tables,charts}` and route shells.

**Backend**: none.

**Tests**: extend `tests/e2e/public-a11y.spec.ts`, `tests/e2e/resources-a11y.spec.ts`, `tests/e2e/reports-signed-in-a11y.signedin.spec.ts`; add `tests/e2e/a11y-forms-modals.spec.ts` and `tests/e2e/a11y-reflow-320.spec.ts`. Manual pass checklist committed to `docs/a11y/manual-verification-2026-07.md`.

**Evidence**: axe run per route, manual keyboard/screen-reader log, list of remaining known gaps.

---

## Workstream 5 — Student navigation contract (IEP-supportive, not IEP-generic)

**Current**: student dashboard + next-actions exist; several feature pages lack a Back-to-Dashboard, some destructive actions lack confirmation, session recovery inconsistent.

**Intended**: enforce the contract
```text
Student Dashboard → Next Best Step → Complete or Save Task → Return to Dashboard → Updated Next Best Step
```
Reuse existing surfaces. Add: reliable Next Best Step selection, Resume Where You Left Off, save-and-continue-later, destructive-action confirm, Back to Dashboard on dedicated pages, draft preservation.

**Files/routes**: `src/routes/_authenticated/student.*`, `src/hooks/use-next-best-step.ts`, `src/lib/student-workflow/*`, `src/components/student/*`.

**Backend**: additive `student_workflow_drafts(user_id, task_key, payload, updated_at)` for draft preservation; RLS scoped to `auth.uid()`.

**Tests**: `tests/e2e/student-navigation-contract.signedin.spec.ts` covers keyboard, zoom, reduced motion, mobile, interrupted session, incomplete forms, errors.

**Evidence**: end-to-end recording of the contract loop for each student profile.

---

## Workstream 6 — Signup, waitlist, license, access provisioning

**Current**: invitations, waitlist, org memberships, entitlements shipped; district license provisioning + bulk invitation management + code redemption tracking not fully wired.

**Intended**: full identity + licensing lifecycle. Individual accounts always — no shared credentials. Access codes grant entitlement on redemption but are never a password. Waitlist ≠ product access. School/district requests create an operational review workflow, not a contact-form dead-end.

Sequence: role → door → individual auth → redeem/request → backend validates (org, role, scope, expiration, capacity) → membership + entitlement created → relationship/consent → onboarding → correct dashboard.

**Files/routes**: `src/routes/get-started.*`, `src/routes/invite.$token.tsx`, `src/routes/admin-invite.$token.tsx`, `src/lib/licensing/*` (new), `src/routes/_authenticated/owner/licenses.tsx` (existing tile — extend).

**Backend** (migration): additive
- `org_license_requests(id, org_type, requester_user_id, org_name, contact, status, review_notes, ...)`
- `access_codes(id, code_hash, org_id, role, scope, capacity, uses, expires_at, single_use, revoked_at, ...)`
- `access_code_redemptions(id, code_id, user_id, redeemed_at)`
- extend `invitations` with `capacity`, `uses`, `single_use` if missing
- `license_lifecycle_events(id, license_id, event, actor_id, occurred_at, payload)`

All with GRANTs, RLS scoped to org admins + platform admins, rate limiting via existing helpers, token hashing, expiration + single-use enforcement, audit rows.

**Tests**: `tests/license-provisioning-rls.test.mjs`, `tests/access-code-redemption.test.mjs` (expired/reused/invalid/over-capacity), `tests/e2e/district-license-flow.signedin.spec.ts`, extend `tests/parent-onboarding-rls.test.mjs`, `tests/authorize-rpc.test.mjs`.

**Evidence**: lifecycle diagram + row-level proof (audit rows) for each transition.

---

## Workstream 7 — Counselor within Educator role

**Intended**: extend label to "Educator / Case Manager / Counselor" everywhere; add `professional_focus` on profile (Special Education Teacher, Case Manager, School Counselor, Transition Coordinator, Related Service Professional, Other Authorized Staff). Label is descriptive only — capabilities + assignments drive access.

Sensitive counseling notes protected: new `evidence_items.subject_type = 'counseling_note'` with `visibility = 'counselor_scope'` policy so they never surface through the general educator record. Existing Case Management / Students / Planning / Meetings / Next Actions / Resources tiles extended first; only if a counselor-specific surface cannot fit, add exactly one tile: **Counselor And Case Coordination**.

**Files/routes**: `src/lib/profile/professional-focus.ts`, `src/routes/_authenticated/educator.*`, `src/components/educator/*`, demo copy in `src/lib/demo/*`.

**Backend** (migration): additive `profiles.professional_focus TEXT`; `evidence_items` visibility scope extension; policy update to gate counseling-note reads to the contributor + platform admin + explicit consent chain — never bulk-visible.

**Tests**: `tests/counselor-scope-rls.test.mjs`, extend `tests/role-guard-matrix.test.mjs` with counselor focus tuples, unit test on professional-focus-does-not-widen-access.

**Evidence**: capability matrix showing focus label doesn't change scope; screenshot of extended-tile outcome (and, if the one new tile ships, the audit line justifying it).

---

## Testing & acceptance (rolled up)

Every workstream ends with:
1. Focused unit/integration tests green.
2. Focused Playwright spec green (headless in CI).
3. Regression suites green: `tests/e2e/dashboard-regression.signedin.spec.ts`, `role-access-rules.signedin.spec.ts`, `role-leak-nav.signedin.spec.ts`, `demo-roles.signedin.spec.ts`, `release-readiness/*`.
4. Ledger row appended.

## Completion report

`docs/release-readiness-ledger.md` will hold the requirement→evidence table with:
- Routes created / consolidated / redirected / removed
- Final role access-door map
- Report-depth evaluation (Sam/Riley/Jordan)
- Accessibility findings fixed + remaining manual risks
- Student-navigation contract results
- License + invitation lifecycle proof
- Counselor capabilities + any authorized tile justification
- Permission/RLS results
- Regression totals

## Sequencing

```text
W1 (report default role)  ─► W2 (report depth)  ─► W4 (a11y)
      │                          │
      ├─► W3 (routes+doors)  ────┤
      │                          │
      └─► W6 (license/access) ─► W7 (counselor)  ─► W5 (student nav)
```

Slice size target: one workstream, one migration if any, one test suite, one ledger row, then stop and report.

## Immediate next step

On approval: **Workstream 1** — implement + verify the role-precedence resolver, ship the unit + Playwright specs, append ledger row, then pause for the Workstream 2 go-ahead.
