-- Enable the pg_cron extension first
create extension if not exists pg_cron schema public;

-- Create the CRON job
select cron.schedule(
  'cleanup-deleted-accounts',
  '0 0 * * *',
  $$
  select net.http_post(
    url := 'https://<your-project-ref>.functions.supabase.co/cleanup-deleted-accounts',
    headers := '{"Authorization": "Bearer ' || current_setting('supabase.service_role_key') || '"}'::jsonb
  ) as request_id;
  $$
);