-- 010_whatsapp_cron_jobs.sql
-- Schedule Edge Functions via pg_cron + pg_net.
--
-- BEFORE running: replace __CRON_SECRET__ with the same value you set in
-- Supabase Edge Function secrets:
--   supabase secrets set CRON_SECRET=your-random-secret
--
-- Cron times are UTC. Israel (IDT, UTC+3):
--   07:00 IDT = 04:00 UTC
--   09:00 IDT = 06:00 UTC
--   19:00 IDT = 16:00 UTC

create extension if not exists pg_cron with schema extensions;
create extension if not exists pg_net with schema extensions;

-- Remove old jobs if re-running this migration.
select cron.unschedule(jobid)
from cron.job
where jobname in (
  'whatsapp-morning-07',
  'whatsapp-reminder-09',
  'whatsapp-evening-19'
);

select cron.schedule(
  'whatsapp-morning-07',
  '0 4 * * *',
  $$
  select net.http_post(
    url := 'https://itfgrbisglwxheaxnosw.supabase.co/functions/v1/send-morning-workout',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer __CRON_SECRET__'
    ),
    body := '{}'::jsonb
  ) as request_id;
  $$
);

select cron.schedule(
  'whatsapp-reminder-09',
  '0 6 * * *',
  $$
  select net.http_post(
    url := 'https://itfgrbisglwxheaxnosw.supabase.co/functions/v1/send-morning-reminder',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer __CRON_SECRET__'
    ),
    body := '{}'::jsonb
  ) as request_id;
  $$
);

select cron.schedule(
  'whatsapp-evening-19',
  '0 16 * * *',
  $$
  select net.http_post(
    url := 'https://itfgrbisglwxheaxnosw.supabase.co/functions/v1/send-evening-reminder',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer __CRON_SECRET__'
    ),
    body := '{}'::jsonb
  ) as request_id;
  $$
);
