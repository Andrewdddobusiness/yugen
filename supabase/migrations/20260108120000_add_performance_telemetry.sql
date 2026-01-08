-- Basic performance telemetry tables (Web Vitals + API timings).
-- Uses RLS for read access; inserts should be performed by the server/service role.

create table if not exists public.web_vitals_event (
  web_vitals_event_id bigserial primary key,
  user_id uuid references auth.users(id) on delete set null,
  pathname text not null,
  metric_name text not null,
  metric_value double precision not null,
  rating text,
  delta double precision,
  metric_id text,
  navigation_type text,
  user_agent text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create index if not exists idx_web_vitals_event_user_recent
  on public.web_vitals_event(user_id, created_at desc);

create index if not exists idx_web_vitals_event_path_recent
  on public.web_vitals_event(pathname, created_at desc);

alter table public.web_vitals_event enable row level security;

drop policy if exists "Users can view own web vitals" on public.web_vitals_event;
create policy "Users can view own web vitals" on public.web_vitals_event
  for select using (auth.uid() = user_id);

create table if not exists public.api_request_metric (
  api_request_metric_id bigserial primary key,
  user_id uuid references auth.users(id) on delete set null,
  route text not null,
  method text not null,
  status integer not null,
  duration_ms integer not null,
  ok boolean not null default true,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create index if not exists idx_api_request_metric_route_recent
  on public.api_request_metric(route, created_at desc);

create index if not exists idx_api_request_metric_user_recent
  on public.api_request_metric(user_id, created_at desc);

alter table public.api_request_metric enable row level security;

drop policy if exists "Users can view own api request metrics" on public.api_request_metric;
create policy "Users can view own api request metrics" on public.api_request_metric
  for select using (auth.uid() = user_id);

create or replace function public.record_web_vitals_event(
  user_uuid uuid,
  pathname text,
  metric_name text,
  metric_value double precision,
  rating text default null,
  delta double precision default null,
  metric_id text default null,
  navigation_type text default null,
  user_agent text default null,
  occurred_at timestamp with time zone default timezone('utc'::text, now())
)
returns void
language plpgsql
security definer
set search_path = public
set row_security = off
as $$
declare
  safe_path text;
  safe_name text;
  safe_rating text;
  safe_metric_id text;
  safe_nav text;
  safe_agent text;
  safe_value double precision;
  safe_delta double precision;
begin
  safe_path := left(coalesce(nullif(trim(pathname), ''), '/'), 500);
  safe_name := left(coalesce(nullif(trim(metric_name), ''), 'unknown'), 40);
  safe_rating := case
    when rating in ('good','needs-improvement','poor') then rating
    else null
  end;
  safe_metric_id := left(coalesce(nullif(trim(metric_id), ''), ''), 120);
  safe_nav := left(coalesce(nullif(trim(navigation_type), ''), ''), 40);
  safe_agent := left(coalesce(nullif(trim(user_agent), ''), ''), 300);
  safe_value := greatest(coalesce(metric_value, 0), 0);
  safe_delta := greatest(coalesce(delta, 0), 0);

  insert into public.web_vitals_event (
    user_id,
    pathname,
    metric_name,
    metric_value,
    rating,
    delta,
    metric_id,
    navigation_type,
    user_agent,
    created_at
  )
  values (
    user_uuid,
    safe_path,
    safe_name,
    safe_value,
    safe_rating,
    safe_delta,
    nullif(safe_metric_id, ''),
    nullif(safe_nav, ''),
    nullif(safe_agent, ''),
    occurred_at
  );
end;
$$;

create or replace function public.record_api_request_metric(
  user_uuid uuid,
  route text,
  method text,
  status integer,
  duration_ms integer,
  occurred_at timestamp with time zone default timezone('utc'::text, now())
)
returns void
language plpgsql
security definer
set search_path = public
set row_security = off
as $$
declare
  safe_route text;
  safe_method text;
  safe_status integer;
  safe_duration integer;
  ok boolean;
begin
  safe_route := left(coalesce(nullif(trim(route), ''), 'unknown'), 200);
  safe_method := upper(left(coalesce(nullif(trim(method), ''), 'GET'), 10));
  safe_status := least(greatest(coalesce(status, 0), 0), 999);
  safe_duration := least(greatest(coalesce(duration_ms, 0), 0), 600000);
  ok := safe_status >= 200 and safe_status < 400;

  insert into public.api_request_metric (
    user_id,
    route,
    method,
    status,
    duration_ms,
    ok,
    created_at
  )
  values (
    user_uuid,
    safe_route,
    safe_method,
    safe_status,
    safe_duration,
    ok,
    occurred_at
  );
end;
$$;

revoke execute on function public.record_web_vitals_event(
  uuid,
  text,
  text,
  double precision,
  text,
  double precision,
  text,
  text,
  text,
  timestamp with time zone
) from public;
grant execute on function public.record_web_vitals_event(
  uuid,
  text,
  text,
  double precision,
  text,
  double precision,
  text,
  text,
  text,
  timestamp with time zone
) to service_role;

revoke execute on function public.record_api_request_metric(
  uuid,
  text,
  text,
  integer,
  integer,
  timestamp with time zone
) from public;
grant execute on function public.record_api_request_metric(
  uuid,
  text,
  text,
  integer,
  integer,
  timestamp with time zone
) to service_role;

