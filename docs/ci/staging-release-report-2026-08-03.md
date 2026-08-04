# Staging Environment — Release Report (2026-08-03)

Target staging Supabase project: `qgrertkqbwanerqqemph`
Production project (never touched by this work): `lrqcntqyekucamifpffs`

## Phase 1 — Migration source control ✅

| Item | Result |
| --- | --- |
| Canonical migration count | **173** files in `supabase/migrations/` |
| Migration #173 | `20260803161500_forward_only_defect_fixes_and_grant_hygiene.sql` moved from `docs/migrations-pending/` into `supabase/migrations/` |
| SHA-256 of #173 | `7cf4336301c89ca1926dca1f4a121bcb386c29466a04dc45ce7e5d6e05506533` (unchanged by the move — byte-identical to the file applied to staging) |
| Duplicate executable copy | Removed. `docs/migrations-pending/README.md` now only points at the canonical path |
| Staging history | `supabase_migrations.schema_migrations` = **173** rows, newest `20260803161500` |
| Promoted to production? | **No.** Production remains at 172. |

Note: Supabase records the migration `version` but stores a NULL `statements`
array for this project, so remote-vs-local byte comparison is not possible from
the database. Equivalence is established by (a) the file hash being unchanged
since the apply and (b) the post-apply behavioural suites below.

## Phase 2 — Isolated staging deployment ⛔ BLOCKED

**Blocker:** a Lovable project has exactly one deployment pipeline and one set
of runtime secrets. Both the preview host
(`project--a4a5068b-…-dev.lovable.app`) and the published host resolve
`SUPABASE_URL` to the **production** project `lrqcntqyekucamifpffs`. There is no
supported way, from inside this project, to stand up a second front-end
deployment bound to `qgrertkqbwanerqqemph`.

Per the stop condition in the request, no Stripe sandbox event was sent to any
deployment while its `SUPABASE_URL` points at production.

What has been built so the staging deployment is a drop-in once it exists:

- `src/lib/env-identity.ts` — `assertStagingIsolation()` throws if a build
  labelled `staging` resolves to the production project ref, a production
  hostname, or a Stripe key in livemode.
- `src/routes/api/public/env-health.ts` — `GET /api/public/env-health` returns
  `app_env`, `hostname`, `supabase_project_ref`, `stripe_livemode`,
  `git_commit_sha`, and the isolation verdict. Returns **503** when a staging
  build fails isolation. It returns no keys, secrets, DB URLs, or webhook
  secrets.

To unblock, one of these is required (outside this project's control):

1. A second Lovable project used purely as staging, with
   `SUPABASE_URL`/`VITE_SUPABASE_*` bound to `qgrertkqbwanerqqemph`,
   `APP_ENV=staging`, and sandbox Stripe keys; or
2. Self-hosting the built app (Cloudflare Worker / Netlify / Vercel) with the
   staging env vars, on a hostname such as `staging.transitionforwardct.com`.

## Phase 3 — Staging test identities ✅

`scripts/seed-staging-identities.mjs` (idempotent; refuses to run against the
production ref). All fixtures are synthetic — no production user, student, IEP,
or document was copied. Every email uses the reserved
`@staging.transitionforwardct.test` domain.

| Role | Email | User id |
| --- | --- | --- |
| student | `e2e.student@staging.transitionforwardct.test` | `c8f2e5d4-90c8-4199-ad35-9275a8b47388` |
| parent | `e2e.parent@staging.transitionforwardct.test` | `fee1b881-8d46-4375-949a-db15487af9dc` |
| educator / case manager | `e2e.educator@staging.transitionforwardct.test` | `d606bc69-8605-4e84-904d-dcc7632fa595` |
| school admin | `e2e.schooladmin@staging.transitionforwardct.test` | `64822122-c792-4605-9956-ac6001b312b4` |
| district admin | `e2e.districtadmin@staging.transitionforwardct.test` | `8b788152-554e-40e3-84eb-94324184a7bb` |
| partner | `e2e.partner@staging.transitionforwardct.test` | `b8370360-f0ec-422c-a019-ac0d63f3e4fa` |
| owner / platform admin | `e2e.owner@staging.transitionforwardct.test` | `2bffeca7-c3fa-4ccd-88f6-40af5ccd6bf5` |

Supporting fixtures: district `fa62a928-e06a-4ab1-a26e-9d151b030eeb`, school
`743ca10e-cac4-44f6-bab5-883bbd28aebf` (child of the district), synthetic
student `7eb1ac14-0e05-4951-948b-c436a87713b2` (owned by the parent, linked to
the student account, scoped to the school).

Password comes from `STAGING_E2E_PASSWORD` (falls back to a documented
non-production default). Re-running the script is a no-op.

## Phase 4 / 5 — Stripe sandbox destination and signed webhook events ⛔ BLOCKED

Both phases require a webhook URL whose handler writes to
`qgrertkqbwanerqqemph`. No such URL exists yet (Phase 2). Sending signed
sandbox events to the current dev host would write subscription rows into the
**production** database, so this was not done.

Already proven in the previous run and still true:

- Unsigned and forged-signature POSTs to
  `…-dev.lovable.app/api/public/payments/webhook?env=sandbox` return **400** and
  write nothing.
- The handler rejects timestamps older than 300s and requires a matching `v1`
  HMAC.

Remaining, to run the moment a staging host exists: destination creation,
`customer.subscription.created/updated/deleted` and
`checkout.session.completed` delivery, replay/idempotency via
`processed_payment_events`, and the licence/entitlement audit trail assertions.

## Phase 6 — Clean replay ✅ (CI) / ⚠️ (local)

Local replay is impossible in this sandbox: `initdb` refuses to run as root, so
there is no disposable Postgres here.

`.github/workflows/migration-replay.yml` now replays **all 173** canonical
migrations, in order, against a throwaway `supabase/postgres` service container
running as superuser. Because it is superuser, the three `realtime.messages`
policy statements that had to be skipped during the staging apply now execute;
the workflow asserts at least one `realtime.messages` policy exists, so that
skip can never silently become drift. It also re-asserts grant hygiene: `anon`
has no `SELECT` on `license_allocations` or `entitlement_audit_events`.

## Suite status (staging, post-#173)

| Suite | Result |
| --- | --- |
| pgTAP `tests/staging/pgtap/billing_capacity.sql` | 14 / 14 pass |
| `tests/staging/*.test.mjs` (preflight, catalog, capacity) | 17 / 17 pass |
| Unit suite (`vitest`) | 56 / 56 files pass |

## Open blockers

1. **No isolated staging front-end.** Blocks Phases 2, 4, 5. Needs a second
   deployment target (separate Lovable project or self-host).
2. **Migration #173 is not in production.** Intentional — forward-only promotion
   is a separate, approved step.
