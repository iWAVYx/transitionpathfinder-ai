SELECT cron.schedule(
  'transition-channel-digest-tick',
  '0 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://project--a4a5068b-10df-4e31-8d22-73186657d452.lovable.app/api/public/channel-digest-tick',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'apikey', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxycWNudHF5ZWt1Y2FtaWZwZmZzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk4NTc1MzQsImV4cCI6MjA5NTQzMzUzNH0.7yhrJS4CZvcN8OOZtmoWPaZ2mMYQVVwRx-hgUVr0kZA'
    ),
    body := '{}'::jsonb
  );
  $$
);