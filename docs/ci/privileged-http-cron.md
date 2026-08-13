# Privileged HTTP cron isolation

The digest and observability HTTP jobs use service-role capabilities after the
request reaches the application. They therefore require a credential that is
not public and must never be able to cross from staging into production.

Migration `20260813013345_20260812163612_harden_scheduled_hook_isolation` is intentionally
fail-closed: it unschedules the legacy jobs and defines an operator-only
scheduler, but does not activate any job by itself.

## Required values per environment

Create distinct values in staging and production. Never copy either value
between environments.

| Location                     | Name                                    | Value                                                          |
| ---------------------------- | --------------------------------------- | -------------------------------------------------------------- |
| Application runtime secret   | `CRON_WEBHOOK_SECRET`                   | Random, environment-only value with at least 32 characters     |
| Application runtime variable | `CRON_EXPECTED_ORIGIN`                  | Exact HTTPS application origin, with no trailing slash or path |
| Supabase Vault               | `transitionforward_cron_webhook_secret` | Exactly the same value as that environment's runtime secret    |
| Supabase Vault               | `transitionforward_cron_base_url`       | Exactly the same origin as `CRON_EXPECTED_ORIGIN`              |

For staging, the origin is:

```text
https://transitionforward-staging.caysi101.workers.dev
```

Use the direct Worker origin because the custom-zone bot controls can
challenge non-browser traffic. Production must use its own approved production
origin and production-only secret.

## Safe activation order

Perform these steps separately for each environment:

1. Deploy the application with `APP_ENV`, `VITE_APP_ENV`, `SUPABASE_URL`,
   `CRON_EXPECTED_ORIGIN`, and `CRON_WEBHOOK_SECRET` set for that environment.
2. Apply the forward migration. At this point the legacy jobs are disabled.
3. Add the two named values through the Supabase Vault dashboard. Do not paste
   real values into a migration, repository file, ticket, or command output.
4. As the database owner, activate the jobs:

```sql
select transitionforward_private.schedule_privileged_http_jobs();
```

The function validates both Vault values, replaces existing jobs atomically,
and revokes execution from `PUBLIC`, `anon`, `authenticated`, and
`service_role`. The stored commands read Vault at execution time; they do not
contain decrypted credentials.

## Read-only verification

This query reports job identity without printing the command or any secret:

```sql
select
  jobname,
  schedule,
  active,
  command like '%vault.decrypted_secrets%' as vault_backed,
  command not ilike '%apikey%' as public_key_auth_absent
from cron.job
where jobname in (
  'transition-channel-digest-tick',
  'obs-alert-check',
  'obs-events-purge'
)
order by jobname;
```

All three rows must be active, `vault_backed` must be true, and
`public_key_auth_absent` must be true. Then verify recent execution status
without selecting request headers or job command text:

```sql
select jobid, status, start_time, end_time, return_message
from cron.job_run_details
where jobid in (
  select jobid
  from cron.job
  where jobname in (
    'transition-channel-digest-tick',
    'obs-alert-check',
    'obs-events-purge'
  )
)
order by start_time desc
limit 20;
```

Do not activate production during an audit. Production deployment, migration,
Vault provisioning, and job activation each require explicit authorization.
