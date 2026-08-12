# Scheduled Jobs, Cron, and Public-API Ticks

## pg_cron jobs (defined in migrations)

| Name                       | Cadence            | Target                                                                                        | Auth path                              |
| -------------------------- | ------------------ | --------------------------------------------------------------------------------------------- | -------------------------------------- |
| `process-email-queue`      | every 5 seconds while queued messages exist; disarmed when both queues drain (see `email_queue_dispatch` / `email_queue_wake`) | `POST project--<id>.lovable.app/lovable/email/queue/process` | Service-role bearer from vault (`email_queue_service_role_key`) |
| `transition-channel-digest-tick` | every 15 min | `POST <environment-origin>/api/public/channel-digest-tick`                                    | Dedicated bearer secret from Vault     |
| `channel-retention-purge`  | daily              | `SELECT public.channel_retention_purge()` (PL/pgSQL)                                          | In-DB                                  |
| `obs-events-purge`         | daily at 03:15 UTC | `POST <environment-origin>/api/public/hooks/obs-events-purge`                                 | Dedicated bearer secret from Vault     |
| `obs-alert-check`          | every 5 min        | `POST <environment-origin>/api/public/hooks/obs-alert-check`                                  | Dedicated bearer secret from Vault     |

Migration `20260812163612_harden_scheduled_hook_isolation` first disables all
three legacy HTTP jobs. It does not silently recreate them. An operator must
provision a distinct Vault URL and webhook secret in each environment, then
call the private scheduler. See `docs/ci/privileged-http-cron.md`.

## GitHub Actions workflows

| Workflow                          | Purpose                                                                 |
| --------------------------------- | ----------------------------------------------------------------------- |
| `build-ssr-verify.yml`            | Build the SSR bundle; guards against `client.server` leaks              |
| `calendar-rls-qa.yml`             | Node-based RLS matrix for `calendar_events`                             |
| `cross-district-rls-qa.yml`       | Node-based RLS proof: districts cannot read each other's data           |
| `ct-seed-v2-audit.yml`            | Public CT high-school seed sanity                                       |
| `dashboard-regression.yml`        | Playwright dashboard regression per role                                |
| `permission-regression-qa.yml`    | Node-based role/permission matrix                                       |
| `release-readiness.yml`           | Aggregates release-readiness Playwright suites                          |
| `report-a11y.yml`                 | axe scans against the report surfaces                                   |
| `role-guard-qa.yml`               | Node-based `RoleGuard` matrix + Playwright role-door crawl              |

## Follow-ups for later slices

- Slice 10 will run every workflow above and archive pass/fail per readiness level.
- `/api/public/hooks/obs-*` and the digest tick share the dedicated bearer and strict environment-identity guard.
- Slice 6 will confirm the digest tick respects quiet hours (existing `user_in_quiet_hours` helper is already wired per `channel-activity-digest` template).
