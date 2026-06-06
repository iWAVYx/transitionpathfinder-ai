# Add 2FA + Playwright 2FA-gated report-a11y test

## 1. Backend / auth flow

- Use Supabase Auth's built-in MFA (TOTP). No schema changes — factors live in `auth.mfa_factors`.
- Add a small `profiles.mfa_required` boolean (default `false`) so we can require 2FA per user; RLS: user can read own row, only service role can flip the flag. (Skippable — we can also just require 2FA for anyone with a verified factor.)

## 2. Frontend: enrollment

- New route `src/routes/_authenticated/security.tsx`: "Two-factor authentication" panel.
  - `supabase.auth.mfa.enroll({ factorType: 'totp' })` → show QR + secret.
  - User enters 6-digit code → `mfa.challenge` + `mfa.verify` to activate factor.
  - List existing factors + "Remove" (`mfa.unenroll`).

## 3. Frontend: challenge during sign-in

- After successful password sign-in, call `supabase.auth.mfa.getAuthenticatorAssuranceLevel()`.
  - If `currentLevel === 'aal1' && nextLevel === 'aal2'`, push user to new `/login/2fa` route.
- `src/routes/login.2fa.tsx`:
  - Reads the first verified TOTP factor, calls `mfa.challenge`, renders the existing `input-otp` 6-digit input, submits via `mfa.verify`.
  - On success, `navigate({ to: search.redirect ?? '/reports' })`.
  - "Sign out" escape hatch.
- Same `aal2` check in the integration-managed `_authenticated` gate (extend via a thin wrapper route only if needed — otherwise add a `beforeLoad` check on the report subtree that redirects to `/login/2fa` when `nextLevel === 'aal2'`).

## 4. Wire Google OAuth path

- After OAuth callback lands on `/auth/callback`, run the same AAL check and route to `/login/2fa` when needed.

## 5. Playwright

- `tests/e2e/auth.setup.ts`: when `E2E_TOTP_SECRET` is set, after password sign-in detect the `/login/2fa` redirect, generate a code with `otplib.authenticator.generate(E2E_TOTP_SECRET)`, submit, then persist storage state as today.
- New spec `tests/e2e/reports-2fa-challenge.signedin.spec.ts` (runs in `authed` Playwright project) at 390×844 and 768×1024:
  1. Start from a clean context (no storage state). Sign in with password.
  2. Assert URL is `/login/2fa`, OTP input is focused, `aria-live` announces the challenge.
  3. Assert `/reports/$E2E_REPORT_ID` redirects back to `/login/2fa` (proving aal2 gate).
  4. Submit wrong code → inline error, still on `/login/2fa`, no session upgrade.
  5. Submit correct code (otplib) → lands on `/reports/$E2E_REPORT_ID`.
  6. Re-run the existing report-a11y key-flow assertions (axe scan, landmark uniqueness, audience tablist arrow keys, collapsible `aria-expanded`) — imported from a shared helper so this spec and `reports-signed-in-a11y.signedin.spec.ts` stay in sync.
- Extract the shared a11y assertions into `tests/e2e/helpers/report-a11y-checks.ts` and have both signed-in specs call it.

## 6. CI

- Add `E2E_TOTP_SECRET` to the secrets passed through in `.github/workflows/report-a11y.yml`.
- The whole 2FA spec auto-skips when `E2E_TOTP_SECRET` or `E2E_REPORT_ID` is missing, so the workflow stays green until the secret is set.

## Technical notes

- `bun add otplib` (dev) for deterministic TOTP in tests.
- Seed: in setup, enroll a TOTP factor for the test user once via a tiny `tests/e2e/scripts/enroll-totp.ts` that uses the service-role key locally to call `auth.admin` + insert a known secret. Documented as a one-time manual step; the secret is then stored as `E2E_TOTP_SECRET`.
- `_authenticated` layout stays integration-managed. The aal2 enforcement lives in a child `beforeLoad` on `/reports` (and any other sensitive subtrees) — not by rewriting the managed layout.
- No changes to `src/integrations/supabase/client.ts`, `auth-middleware.ts`, `auth-attacher.ts`, or `types.ts`.

## Files

- New: `src/routes/login.2fa.tsx`, `src/routes/_authenticated/security.tsx`, `tests/e2e/helpers/report-a11y-checks.ts`, `tests/e2e/reports-2fa-challenge.signedin.spec.ts`, `tests/e2e/scripts/enroll-totp.ts`.
- Edited: `src/routes/login.tsx` (post-signin AAL check), `src/routes/_authenticated/reports.$reportId.tsx` (aal2 `beforeLoad`), `tests/e2e/auth.setup.ts` (TOTP step), `tests/e2e/reports-signed-in-a11y.signedin.spec.ts` (use shared helper), `.github/workflows/report-a11y.yml` (pass `E2E_TOTP_SECRET`), `package.json` (add `otplib`).
- Migration: add `profiles.mfa_required` (optional — confirm before including).
