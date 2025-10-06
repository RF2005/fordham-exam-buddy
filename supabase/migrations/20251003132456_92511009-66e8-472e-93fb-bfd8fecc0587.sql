-- Enable required extensions for cron jobs and HTTP requests
create extension if not exists pg_cron with schema extensions;
create extension if not exists pg_net with schema extensions;

-- Create a configuration table for storing the cron secret securely
create table if not exists public.system_config (
  key text primary key,
  value text not null,
  created_at timestamp with time zone default now()
);

-- Enable RLS and restrict access to system_config
alter table public.system_config enable row level security;

-- Only allow service role to access system config
create policy "Service role only" on public.system_config
  for all
  using (false);

-- Schedule daily exam reminder check at 9 AM UTC
select cron.schedule(
  'send-exam-reminders-daily',
  '0 9 * * *', -- Runs daily at 9 AM UTC
  $$
  select
    net.http_post(
        url:='https://uyhnwiwbczjfzicaourj.supabase.co/functions/v1/send-exam-reminders',
        headers:=jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer ' || coalesce(
            (select value from public.system_config where key = 'cron_secret'),
            'PLACEHOLDER_PLEASE_UPDATE'
          )
        ),
        body:=jsonb_build_object('time', now())
    ) as request_id;
  $$
);