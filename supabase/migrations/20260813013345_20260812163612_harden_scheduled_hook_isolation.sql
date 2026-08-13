-- Disable every legacy privileged HTTP job before replacing its public-key
-- authentication. This migration deliberately does not reschedule anything:
-- each environment must first receive its own Vault values and runtime secret.
DO $migration$
DECLARE
  job_name text;
BEGIN
  FOREACH job_name IN ARRAY ARRAY[
    'transition-channel-digest-tick',
    'obs-alert-check',
    'obs-events-purge'
  ]
  LOOP
    IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = job_name) THEN
      PERFORM cron.unschedule(job_name);
    END IF;
  END LOOP;
END
$migration$;

CREATE SCHEMA IF NOT EXISTS transitionforward_private;
REVOKE ALL ON SCHEMA transitionforward_private FROM PUBLIC;

-- Called manually by a database operator only after both named Vault secrets
-- have been provisioned for the current environment. The scheduled commands
-- resolve the secret at execution time, so decrypted values are never stored
-- in cron.job.command or in this migration.
CREATE OR REPLACE FUNCTION transitionforward_private.schedule_privileged_http_jobs()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog
AS $function$
DECLARE
  base_url text;
  webhook_secret text;
  base_url_count bigint;
  secret_count bigint;
  digest_job_id bigint;
  alert_job_id bigint;
  purge_job_id bigint;
  job_name text;
BEGIN
  PERFORM pg_advisory_xact_lock(
    hashtextextended('transitionforward.schedule_privileged_http_jobs', 0)
  );

  SELECT count(*), max(decrypted_secret)
  INTO base_url_count, base_url
  FROM vault.decrypted_secrets
  WHERE name = 'transitionforward_cron_base_url';

  SELECT count(*), max(decrypted_secret)
  INTO secret_count, webhook_secret
  FROM vault.decrypted_secrets
  WHERE name = 'transitionforward_cron_webhook_secret';

  IF base_url_count <> 1 OR base_url IS NULL THEN
    RAISE EXCEPTION
      'Exactly one transitionforward_cron_base_url Vault secret is required';
  END IF;
  IF secret_count <> 1 OR webhook_secret IS NULL THEN
    RAISE EXCEPTION
      'Exactly one transitionforward_cron_webhook_secret Vault secret is required';
  END IF;
  IF base_url <> btrim(base_url)
     OR base_url !~ '^https://[A-Za-z0-9.-]+(:[0-9]+)?$' THEN
    RAISE EXCEPTION
      'transitionforward_cron_base_url must be an exact HTTPS origin without a path';
  END IF;
  IF webhook_secret <> btrim(webhook_secret)
     OR length(webhook_secret) < 32 THEN
    RAISE EXCEPTION
      'transitionforward_cron_webhook_secret must contain at least 32 characters';
  END IF;

  FOREACH job_name IN ARRAY ARRAY[
    'transition-channel-digest-tick',
    'obs-alert-check',
    'obs-events-purge'
  ]
  LOOP
    IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = job_name) THEN
      PERFORM cron.unschedule(job_name);
    END IF;
  END LOOP;

  SELECT cron.schedule(
    'transition-channel-digest-tick',
    '*/15 * * * *',
    $job$
      SELECT net.http_post(
        url := rtrim(
          (SELECT decrypted_secret
           FROM vault.decrypted_secrets
           WHERE name = 'transitionforward_cron_base_url'),
          '/'
        ) || '/api/public/channel-digest-tick',
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer ' || (
            SELECT decrypted_secret
            FROM vault.decrypted_secrets
            WHERE name = 'transitionforward_cron_webhook_secret'
          )
        ),
        body := jsonb_build_object('source', 'pg_cron')
      );
    $job$
  ) INTO digest_job_id;

  SELECT cron.schedule(
    'obs-alert-check',
    '*/5 * * * *',
    $job$
      SELECT net.http_post(
        url := rtrim(
          (SELECT decrypted_secret
           FROM vault.decrypted_secrets
           WHERE name = 'transitionforward_cron_base_url'),
          '/'
        ) || '/api/public/hooks/obs-alert-check',
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer ' || (
            SELECT decrypted_secret
            FROM vault.decrypted_secrets
            WHERE name = 'transitionforward_cron_webhook_secret'
          )
        ),
        body := jsonb_build_object('source', 'pg_cron')
      );
    $job$
  ) INTO alert_job_id;

  SELECT cron.schedule(
    'obs-events-purge',
    '15 3 * * *',
    $job$
      SELECT net.http_post(
        url := rtrim(
          (SELECT decrypted_secret
           FROM vault.decrypted_secrets
           WHERE name = 'transitionforward_cron_base_url'),
          '/'
        ) || '/api/public/hooks/obs-events-purge',
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer ' || (
            SELECT decrypted_secret
            FROM vault.decrypted_secrets
            WHERE name = 'transitionforward_cron_webhook_secret'
          )
        ),
        body := jsonb_build_object('source', 'pg_cron')
      );
    $job$
  ) INTO purge_job_id;

  RETURN jsonb_build_object(
    'transition-channel-digest-tick', digest_job_id,
    'obs-alert-check', alert_job_id,
    'obs-events-purge', purge_job_id
  );
END
$function$;

REVOKE ALL ON FUNCTION transitionforward_private.schedule_privileged_http_jobs()
  FROM PUBLIC, anon, authenticated, service_role;

COMMENT ON FUNCTION transitionforward_private.schedule_privileged_http_jobs() IS
  'Operator-only: schedules environment-isolated privileged HTTP cron jobs using Vault-backed credentials.';
