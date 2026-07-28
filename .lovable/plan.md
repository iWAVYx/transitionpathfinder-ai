# TransitionForward Signed-In Beta Readiness Pass

This is a large verification + remediation program. Below is the sequenced plan, scoped to preserve the existing UI, routes, and dashboard layouts. Each slice ends with concrete evidence (commands run, output captured, defects logged, fixes committed) written into `docs/release-readiness/beta-signin-acceptance.md`.

## Slice 1 — Inventory & Configuration Audit (read-only)
- Enumerate current auth config via Supabase Management API (`configure_auth` state, Site URL, redirect allowlist, rate limits, CAPTCHA, custom SMTP status).
- Confirm Lovable Emails vs Resend/SMTP: this project uses Lovable-managed email on `updates.transitionforwardct.com`. Document that "Supabase custom SMTP" is not applicable — the auth hook routes through `/lovable/email/auth/webhook`.
- Enumerate published routes, RLS coverage (`supabase--linter`), storage buckets, edge functions.
- Deliverable: `docs/release-readiness/beta-signin-acceptance.md` §1 with findings and any required *external* actions listed as a checklist for the user (dashboard path + setting + expected value + verification step).

## Slice 2 — Sentry Integration
- Add `@sentry/react` (frontend) and `@sentry/node` compatible init for TanStack server functions/routes.
- Two envs via `VITE_SENTRY_DSN_STAGING` / `VITE_SENTRY_DSN_PROD` + `SENTRY_DSN_*` server; environment derived from `import.meta.env.MODE` / hostname.
- Config: `sendDefaultPii: false`, `replaysSessionSampleRate: 0`, `replaysOnErrorSampleRate: 0`, `integrations` exclude Replay.
- Add `beforeSend`/`beforeSendTransaction` redactor: strips `email`, `full_name`, `student_id`, `document_id`, `title`, `content`, `message`, `token`, `authorization`, `body`, and any key matching `/name|email|student|doc|report|token|body|content|message/i`. URL paths with UUIDs replaced by `:id`.
- Instrument `src/lib/obs/instrument.server.ts` to also emit Sentry captures for `status !== 'ok'` in auth, uploads, email queue, pathway engine, and server routes.
- Alerts: document the exact Sentry project alert rules (auth failures >5/5m, upload errors >3/5m, email queue DLQ >0, pathway engine errors >1/5m, edge/server route 5xx >5/5m) in the acceptance doc as external setup.
- Unit tests for the redactor: `tests/unit/sentry-redact.test.ts` — asserts email/name/UUID/token stripping.

## Slice 3 — RLS, Storage, Tenant Isolation Audit
- Run `supabase--linter` and capture full output.
- Cross-check every public-schema table for RLS enabled + policies; verify no broad `TO anon` on PII.
- Storage: confirm `student-documents` and `channel-attachments` are private and policies gate by `storage_can_read_student_doc` / `is_channel_member`.
- Run existing RLS test suites: `bun run test:rls` (or equivalent — see `package.json`). Capture pass/fail per test.
- Fix any P0/P1 policy gaps by migration; never loosen policies to satisfy tests.

## Slice 4 — Malware Scan Lifecycle Verification
- Read `src/lib/document-av-scan.server.ts` + `documents.functions.ts` and confirm: pending files are not downloadable, not passed to the extract pipeline, not returned by any listing marked accessible, and hard-deleted on infected.
- Add missing tests to `tests/unit/document-av-scan.test.ts` covering: clean → AI enqueued; infected → row deleted; timeout → `scan_status='failed'`, no AI, no download; API unavailable (no key) → fail closed.
- Add server-side guard in signed-URL issuance & the downloader so a row with `scan_status != 'clean'` returns 403.

## Slice 5 — Role Matrix & Collaboration Flows
- For each of the 7 roles (`student, parent, educator, case_manager/counselor, school_admin, district_admin, partner`) run the existing signed-in Playwright suites: `tests/e2e/release-readiness/*.signedin.spec.ts`, `role-access-rules.signedin.spec.ts`, `role-leak-nav.signedin.spec.ts`, `dashboard-regression.signedin.spec.ts`, `owner-hub-subnav-permissions.signedin.spec.ts`.
- Any `test.skip` due to missing storageState is a hard fail — the run must re-seed roles via `scripts/seed-roles.mjs` first.
- Cross-role collaboration: seed a district→school→educator→student→parent→partner chain and walk invite → accept → shared channel message → shared document view → partner opportunity match → revoke → verify immediate access loss.
- Record every route × role result in the acceptance matrix in the doc.

## Slice 6 — Boundary & Direct-URL Tests
- Run existing boundary suites (`cross-district-rls`, `district-school-hijack-rls`, `role-district-access-rls`, `iep-signed-url-*`, `student-relationships-consent-rls`, `collaboration-notes-edit-rls`, `role-revocation-propagation`).
- Add missing tests where a boundary is exercised only via UI: direct `/students/:otherId`, direct signed-URL reuse after revocation, direct partner-manage POST from a family role, direct Transition Channel message POST to a channel the user was removed from.

## Slice 7 — Full Verification Run
- Commands, in order, with captured output stored under `docs/release-readiness/logs/`:
  - `bun run lint`
  - `bun run typecheck` (tsgo)
  - `bun run test` (unit + node integration)
  - `bun run test:e2e:signedin` (or existing script)
  - `bun run build`
  - `bunx playwright test tests/e2e/dashboard-regression.signedin.spec.ts tests/e2e/role-access-rules.signedin.spec.ts tests/e2e/release-readiness`
- Any failure = P0 and gets a fix in Slice 8.

## Slice 8 — Defect Remediation
- Fix every P0/P1 uncovered without altering established UI or route structure.
- Log each fix as `- [P0/P1] <symptom> → <root cause> → <fix commit summary>` in the acceptance doc.

## Slice 9 — Final Acceptance Doc
`docs/release-readiness/beta-signin-acceptance.md` sections:
1. Commands executed & result summary
2. Route × role matrix (dashboard tile / preview / dedicated page / persistence / permissions / loading / empty / error / mobile / tablet / desktop / back nav)
3. Defects fixed
4. Remaining external actions (DNS, Sentry alert rules, Supabase Site URL, CAPTCHA, Legal review, etc.) with exact click-paths
5. Security Advisor status (`supabase--linter` snapshot)
6. RLS & storage policy status
7. Email delivery evidence (test send message IDs, `email_send_log` rows)
8. Sentry sanitization evidence (redactor tests + sample scrubbed event JSON)
9. Malware quarantine evidence (test outputs)
10. Go / No-Go recommendation

## Ground rules
- No UI redesign, no route renames, no new dashboard tiles.
- Never weaken RLS to make a test pass.
- Every external action goes into the acceptance doc — I do not silently mark them done.
- If any required role, boundary, email, upload, or recovery workflow is unverified, the final recommendation is **No-Go** with the specific gap named.

## Confirmation needed before I start
This is a multi-hour, multi-turn program that will touch many files and run the full test suite. Two quick confirmations:
1. **Sentry DSNs** — do you already have staging + prod Sentry projects, or should I stand up the code paths behind env vars and list "create Sentry projects + paste DSNs" as an external action?
2. **Test execution scope** — run the full Playwright signed-in matrix in-loop (slow, ~15–30 min per pass), or start with unit + RLS + one representative signed-in suite and expand once green?

Reply with answers (or "go with defaults": env-var stubs + staged test execution) and I'll begin Slice 1.
