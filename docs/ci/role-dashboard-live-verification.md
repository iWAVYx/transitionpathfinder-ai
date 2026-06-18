# Role Dashboard — Live Verification in CI

This guide explains how to run the signed-in role dashboard verification
suite against real seeded accounts.

## What runs

Two GitHub Actions workflows execute the role suite:

| Workflow                                  | What it runs                                                                                   |
| ----------------------------------------- | ---------------------------------------------------------------------------------------------- |
| `.github/workflows/dashboard-regression.yml` | Static dashboard checks + per-role browser regression + role-leak nav + role-access rules     |
| `.github/workflows/role-guard-qa.yml`        | Static route-audience snapshot + role-leak nav + role-access rules                            |

Both workflows trigger on `pull_request`, `push` to `main`, and
`workflow_dispatch` (manual) with two inputs:

- `live` — when `true`, the readiness check fails the run if **zero** role
  credentials are configured (prevents silently-green runs).
- `require_all_roles` (dashboard-regression only) — when `true`, the
  readiness check fails the run if **any** of the seven roles is missing
  credentials.

## Test surfaces

| Spec file                                                  | Asserts                                                                                                                        |
| ---------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| `tests/e2e/dashboard-regression.signedin.spec.ts`          | Each role's dashboard renders, no overflow, no duplicate links, no dead buttons, state survives refresh, errors don't blank screen |
| `tests/e2e/role-leak-nav.signedin.spec.ts`                 | No anchors to forbidden routes exist in the rendered DOM per role                                                              |
| `tests/e2e/role-access-rules.signedin.spec.ts`             | `mustSee` / `mustNotSee` text per role, every forbidden route redirects on direct URL, PartnerForward only Partner+Owner, grade-band tools (BridgeForward 6–8, TransitionForward 9–12) |

Role-specific access rules enforced today:

- **Partner** cannot reach `/caseload`, `/goals`, `/documents`, `/students`,
  `/pathway`, `/reports`, `/ppt-prep`, `/meetings`, `/insights`,
  `/analytics`, `/admin`, `/school/overview`, `/district/overview`,
  `/bridgeforward/intake`.
- **School Admin** and **District Admin** cannot reach `/admin` (Platform
  Admin owner controls) or `/partners-manage`.
- **District Admin** cannot reach `/caseload`.
- **Platform Admin** (`owner`) is the only role permitted everywhere.
- **PartnerForward** (`/partners-manage`) is visible only to Partner and
  Platform Admin.
- **BridgeForward** tile appears only for student dashboards in the 6–8
  grade band; **TransitionForward** opportunities for 9–10 / 11–12.

## Add the secrets

In the GitHub repository (or organization), go to
**Settings → Secrets and variables → Actions → New repository secret** and
add the following. Email + password are required per role; TOTP is only
required when that account has 2FA enrolled.

| Required                                                    | Optional (only if 2FA enrolled)        |
| ----------------------------------------------------------- | --------------------------------------- |
| `E2E_BASE_URL` — deployed preview URL Playwright should hit |                                         |
| `E2E_STUDENT_EMAIL`, `E2E_STUDENT_PASSWORD`                 | `E2E_STUDENT_TOTP_SECRET`               |
| `E2E_PARENT_EMAIL`, `E2E_PARENT_PASSWORD`                   | `E2E_PARENT_TOTP_SECRET`                |
| `E2E_EDUCATOR_EMAIL`, `E2E_EDUCATOR_PASSWORD`               | `E2E_EDUCATOR_TOTP_SECRET`              |
| `E2E_SCHOOL_ADMIN_EMAIL`, `E2E_SCHOOL_ADMIN_PASSWORD`       | `E2E_SCHOOL_ADMIN_TOTP_SECRET`          |
| `E2E_DISTRICT_ADMIN_EMAIL`, `E2E_DISTRICT_ADMIN_PASSWORD`   | `E2E_DISTRICT_ADMIN_TOTP_SECRET`        |
| `E2E_PARTNER_EMAIL`, `E2E_PARTNER_PASSWORD`                 | `E2E_PARTNER_TOTP_SECRET`               |
| `E2E_OWNER_EMAIL`, `E2E_OWNER_PASSWORD`                     | `E2E_OWNER_TOTP_SECRET` *(recommended — Platform Admin should have 2FA)* |

The TOTP secret is the base32 string shown when you enroll the authenticator
app (NOT the 6-digit code). `tests/e2e/auth-roles.setup.ts` generates a code
on demand with `otplib`.

Never commit credentials to the repo — there is no `.env` fallback for these.

## Trigger a live verification

1. Push the changes (workflows must be on the default branch).
2. Open **Actions → Dashboard regression** (or **Role-guard QA**).
3. Click **Run workflow** and set:
   - `live` = `true` (fails the run if no credentials are configured)
   - `require_all_roles` = `true` to require all seven roles
4. Watch the **Role credential readiness check** step — it prints
   `✓ ROLE` / `✗ ROLE — missing: …` for every role.
5. After auth-roles.setup, the second readiness step
   (`CHECK_STORAGE_STATES=1`) verifies each configured role actually
   produced a `tests/e2e/.auth/<role>.json` file — catches wrong passwords
   or unhandled 2FA prompts.

## Reading results

- **Pass** — every spec for every role with credentials executed and
  succeeded. Roles without credentials show as Playwright "skipped".
- **Skipped (non-live)** — credential missing for that role; expected on
  PRs from forks. Live verification (`live=true`) fails when no role has
  credentials so this can never silently look green.
- **Fail** — open the **playwright-report** artifact at the bottom of the
  workflow summary. It contains:
  - `playwright-report/index.html` — HTML report with test timing and
    failure messages
  - `test-results/<spec>/trace.zip` — Playwright trace (drag into
    https://trace.playwright.dev) with DOM snapshots, network, console
  - Per-failure screenshot and video next to each trace

Artifacts are retained for 14 days.

## What "passed" means

A live verification PASS means, for every role with credentials supplied:

1. Sign-in (and 2FA challenge if required) succeeded.
2. The expected dashboard rendered the role's `mustSee` content and none of
   its `mustNotSee` content.
3. No anchor in the rendered DOM links to any route forbidden for that role.
4. Direct navigation to every forbidden route was blocked by RoleGuard.
5. PartnerForward and BridgeForward / TransitionForward visibility match
   the role and (where seeded) the student's grade band.

A role with no credentials is **not** verified — it is skipped, and the
audit record in `/owner/role-audit` must reflect that.
