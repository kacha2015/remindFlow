-- ============================================================
-- pg_cron job: run every minute to process pending reminders
-- Run this in Supabase SQL editor AFTER enabling pg_cron extension
-- ============================================================

-- 1. Enable pg_cron extension (run as superuser in Supabase dashboard)
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- 2. Schedule the edge function to run every minute
SELECT cron.schedule(
  'send-reminder-notifications',
  '* * * * *',
  $$
    SELECT net.http_post(
      url := 'https://ncrndlpejlwzzzmmhejj.supabase.co/functions/v1/send-reminder-notifications',
      headers := '{"Authorization": "Bearer sb_publishable_Xxv-uRnVHQbSxgPFNtHoUQ_i8nw3VSA", "Content-Type": "application/json"}'::jsonb,
      body := '{}'::jsonb
    );
  $$
);

-- To view scheduled jobs:
-- SELECT * FROM cron.job;

-- To view job run history:
-- SELECT * FROM cron.job_run_details ORDER BY start_time DESC LIMIT 10;

-- To remove the job:
-- SELECT cron.unschedule('send-reminder-notifications');
