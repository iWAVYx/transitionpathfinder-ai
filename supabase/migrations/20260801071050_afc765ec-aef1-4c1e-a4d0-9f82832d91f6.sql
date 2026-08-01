SELECT cron.unschedule('release-expired-license-allocations')
WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'release-expired-license-allocations');

SELECT cron.schedule(
  'release-expired-license-allocations',
  '17 * * * *',
  $$ SELECT public.release_expired_license_allocations(); $$
);