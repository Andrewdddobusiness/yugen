-- AI token usage tracking + monthly quota support.
-- Stores per-user monthly aggregates plus an event log for transparency/debugging.

create table if not exists public.ai_token_usage (
  ai_token_usage_id bigserial primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  period_start date not null,
  prompt_tokens bigint not null default 0,
  completion_tokens bigint not null default 0,
  total_tokens bigint not null default 0,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique (user_id, period_start)
);

create index if not exists idx_ai_token_usage_user_period
  on public.ai_token_usage(user_id, period_start desc);

create table if not exists public.ai_token_event (
  ai_token_event_id bigserial primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  feature text not null,
  model text not null,
  kind text not null check (kind in ('chat','embedding')),
  prompt_tokens integer not null default 0,
  completion_tokens integer not null default 0,
  total_tokens integer not null default 0,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create index if not exists idx_ai_token_event_user_recent
  on public.ai_token_event(user_id, created_at desc);

alter table public.ai_token_usage enable row level security;
alter table public.ai_token_event enable row level security;

drop policy if exists "Users can view own ai token usage" on public.ai_token_usage;
create policy "Users can view own ai token usage" on public.ai_token_usage
  for select using (auth.uid() = user_id);

drop policy if exists "Users can view own ai token events" on public.ai_token_event;
create policy "Users can view own ai token events" on public.ai_token_event
  for select using (auth.uid() = user_id);

drop trigger if exists set_timestamp_ai_token_usage on public.ai_token_usage;
create trigger set_timestamp_ai_token_usage
  before update on public.ai_token_usage
  for each row execute function public.handle_updated_at();

create or replace function public.record_ai_token_usage(
  user_uuid uuid,
  feature text,
  model text,
  kind text,
  prompt_tokens integer,
  completion_tokens integer,
  total_tokens integer,
  occurred_at timestamp with time zone default timezone('utc'::text, now())
)
returns void
language plpgsql
security definer
set search_path = public
set row_security = off
as $$
declare
  period date;
  safe_prompt integer;
  safe_completion integer;
  safe_total integer;
  safe_model text;
  safe_feature text;
  safe_kind text;
begin
  period := date_trunc('month', occurred_at at time zone 'utc')::date;
  safe_prompt := greatest(coalesce(prompt_tokens, 0), 0);
  safe_completion := greatest(coalesce(completion_tokens, 0), 0);
  safe_total := greatest(coalesce(total_tokens, 0), 0);
  safe_model := left(coalesce(model, 'unknown'), 120);
  safe_feature := left(coalesce(feature, 'unknown'), 120);
  safe_kind := case when kind in ('chat','embedding') then kind else 'chat' end;

  insert into public.ai_token_event (
    user_id,
    feature,
    model,
    kind,
    prompt_tokens,
    completion_tokens,
    total_tokens,
    created_at
  )
  values (
    user_uuid,
    safe_feature,
    safe_model,
    safe_kind,
    safe_prompt,
    safe_completion,
    safe_total,
    occurred_at
  );

  insert into public.ai_token_usage (
    user_id,
    period_start,
    prompt_tokens,
    completion_tokens,
    total_tokens
  )
  values (
    user_uuid,
    period,
    safe_prompt,
    safe_completion,
    safe_total
  )
  on conflict (user_id, period_start)
  do update set
    prompt_tokens = public.ai_token_usage.prompt_tokens + excluded.prompt_tokens,
    completion_tokens = public.ai_token_usage.completion_tokens + excluded.completion_tokens,
    total_tokens = public.ai_token_usage.total_tokens + excluded.total_tokens,
    updated_at = timezone('utc'::text, now());
end;
$$;

-- Only the server (service role) should be allowed to record usage.
revoke execute on function public.record_ai_token_usage(
  uuid,
  text,
  text,
  text,
  integer,
  integer,
  integer,
  timestamp with time zone
) from public;
grant execute on function public.record_ai_token_usage(
  uuid,
  text,
  text,
  text,
  integer,
  integer,
  integer,
  timestamp with time zone
) to service_role;

