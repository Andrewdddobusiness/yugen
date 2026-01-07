-- AI Itinerary chat: per-user threads, messages, embeddings, and basic run telemetry
-- Created: 2026-01-07

create schema if not exists extensions;
create extension if not exists "uuid-ossp" with schema extensions;
create extension if not exists vector with schema extensions;

set search_path = public, extensions;

-- =====================================================
-- THREADS + MESSAGES
-- =====================================================

create table if not exists public.ai_itinerary_thread (
  ai_itinerary_thread_id uuid primary key default uuid_generate_v4(),
  itinerary_id integer references public.itinerary(itinerary_id) on delete cascade not null,
  itinerary_destination_id integer references public.itinerary_destination(itinerary_destination_id) on delete cascade not null,
  user_id uuid references auth.users(id) on delete cascade not null,
  summary text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique (itinerary_id, itinerary_destination_id, user_id)
);

create index if not exists idx_ai_itinerary_thread_lookup
  on public.ai_itinerary_thread(itinerary_id, itinerary_destination_id, user_id);

drop trigger if exists set_timestamp_ai_itinerary_thread on public.ai_itinerary_thread;
create trigger set_timestamp_ai_itinerary_thread
  before update on public.ai_itinerary_thread
  for each row execute function public.handle_updated_at();

create table if not exists public.ai_itinerary_message (
  ai_itinerary_message_id bigserial primary key,
  thread_id uuid references public.ai_itinerary_thread(ai_itinerary_thread_id) on delete cascade not null,
  role text not null check (role in ('user','assistant','system','tool')),
  content text not null,
  metadata jsonb default '{}'::jsonb not null,
  embedding vector(1536),
  embedding_model text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create index if not exists idx_ai_itinerary_message_thread_recent
  on public.ai_itinerary_message(thread_id, ai_itinerary_message_id desc);

-- Vector index for semantic retrieval (cosine distance)
create index if not exists idx_ai_itinerary_message_embedding_ivfflat
  on public.ai_itinerary_message using ivfflat (embedding vector_cosine_ops)
  with (lists = 50);

-- =====================================================
-- BASIC RUN TELEMETRY
-- =====================================================

create table if not exists public.ai_itinerary_run (
  ai_itinerary_run_id uuid primary key default uuid_generate_v4(),
  thread_id uuid references public.ai_itinerary_thread(ai_itinerary_thread_id) on delete cascade not null,
  mode text not null check (mode in ('plan','apply','history')),
  status text not null check (status in ('running','succeeded','failed')),
  error jsonb,
  started_at timestamp with time zone default timezone('utc'::text, now()) not null,
  finished_at timestamp with time zone
);

create index if not exists idx_ai_itinerary_run_thread_recent
  on public.ai_itinerary_run(thread_id, started_at desc);

create table if not exists public.ai_itinerary_run_step (
  ai_itinerary_run_step_id bigserial primary key,
  run_id uuid references public.ai_itinerary_run(ai_itinerary_run_id) on delete cascade not null,
  kind text not null,
  status text not null check (status in ('started','succeeded','failed')),
  input jsonb,
  output jsonb,
  error jsonb,
  started_at timestamp with time zone default timezone('utc'::text, now()) not null,
  finished_at timestamp with time zone
);

create index if not exists idx_ai_itinerary_run_step_run
  on public.ai_itinerary_run_step(run_id, ai_itinerary_run_step_id);

create table if not exists public.ai_itinerary_tool_invocation (
  ai_itinerary_tool_invocation_id bigserial primary key,
  run_step_id bigint references public.ai_itinerary_run_step(ai_itinerary_run_step_id) on delete cascade not null,
  tool_name text not null,
  args jsonb,
  result jsonb,
  status text not null check (status in ('started','succeeded','failed')),
  started_at timestamp with time zone default timezone('utc'::text, now()) not null,
  finished_at timestamp with time zone
);

create index if not exists idx_ai_itinerary_tool_invocation_step
  on public.ai_itinerary_tool_invocation(run_step_id, ai_itinerary_tool_invocation_id);

-- =====================================================
-- VECTOR MATCH RPC (HYBRID SEARCH HOOK)
-- =====================================================

create or replace function public.match_ai_itinerary_messages(
  _thread_id uuid,
  _query_embedding vector(1536),
  _match_count int default 8
)
returns table (
  ai_itinerary_message_id bigint,
  role text,
  content text,
  similarity float
)
language sql
stable
as $$
  select
    m.ai_itinerary_message_id,
    m.role,
    m.content,
    1 - (m.embedding <=> _query_embedding) as similarity
  from public.ai_itinerary_message m
  where m.thread_id = _thread_id
    and m.embedding is not null
  order by m.embedding <=> _query_embedding
  limit greatest(_match_count, 0);
$$;

-- =====================================================
-- RLS
-- =====================================================

alter table public.ai_itinerary_thread enable row level security;
alter table public.ai_itinerary_message enable row level security;
alter table public.ai_itinerary_run enable row level security;
alter table public.ai_itinerary_run_step enable row level security;
alter table public.ai_itinerary_tool_invocation enable row level security;

-- Threads: per-user + must have itinerary access
drop policy if exists "Users can view own ai itinerary threads" on public.ai_itinerary_thread;
create policy "Users can view own ai itinerary threads" on public.ai_itinerary_thread
  for select using (
    user_id = auth.uid()
    and public.is_itinerary_collaborator(itinerary_id)
  );

drop policy if exists "Users can insert own ai itinerary threads" on public.ai_itinerary_thread;
create policy "Users can insert own ai itinerary threads" on public.ai_itinerary_thread
  for insert with check (
    user_id = auth.uid()
    and public.is_itinerary_collaborator(itinerary_id)
  );

drop policy if exists "Users can update own ai itinerary threads" on public.ai_itinerary_thread;
create policy "Users can update own ai itinerary threads" on public.ai_itinerary_thread
  for update using (
    user_id = auth.uid()
    and public.is_itinerary_collaborator(itinerary_id)
  );

-- Messages: only via owning thread
drop policy if exists "Users can view own ai itinerary messages" on public.ai_itinerary_message;
create policy "Users can view own ai itinerary messages" on public.ai_itinerary_message
  for select using (
    exists (
      select 1
      from public.ai_itinerary_thread t
      where t.ai_itinerary_thread_id = ai_itinerary_message.thread_id
        and t.user_id = auth.uid()
        and public.is_itinerary_collaborator(t.itinerary_id)
    )
  );

drop policy if exists "Users can insert own ai itinerary messages" on public.ai_itinerary_message;
create policy "Users can insert own ai itinerary messages" on public.ai_itinerary_message
  for insert with check (
    exists (
      select 1
      from public.ai_itinerary_thread t
      where t.ai_itinerary_thread_id = ai_itinerary_message.thread_id
        and t.user_id = auth.uid()
        and public.is_itinerary_collaborator(t.itinerary_id)
    )
  );

drop policy if exists "Users can update own ai itinerary messages" on public.ai_itinerary_message;
create policy "Users can update own ai itinerary messages" on public.ai_itinerary_message
  for update using (
    exists (
      select 1
      from public.ai_itinerary_thread t
      where t.ai_itinerary_thread_id = ai_itinerary_message.thread_id
        and t.user_id = auth.uid()
        and public.is_itinerary_collaborator(t.itinerary_id)
    )
  );

-- Runs: only via owning thread
drop policy if exists "Users can view own ai itinerary runs" on public.ai_itinerary_run;
create policy "Users can view own ai itinerary runs" on public.ai_itinerary_run
  for select using (
    exists (
      select 1
      from public.ai_itinerary_thread t
      where t.ai_itinerary_thread_id = ai_itinerary_run.thread_id
        and t.user_id = auth.uid()
        and public.is_itinerary_collaborator(t.itinerary_id)
    )
  );

drop policy if exists "Users can insert own ai itinerary runs" on public.ai_itinerary_run;
create policy "Users can insert own ai itinerary runs" on public.ai_itinerary_run
  for insert with check (
    exists (
      select 1
      from public.ai_itinerary_thread t
      where t.ai_itinerary_thread_id = ai_itinerary_run.thread_id
        and t.user_id = auth.uid()
        and public.is_itinerary_collaborator(t.itinerary_id)
    )
  );

drop policy if exists "Users can update own ai itinerary runs" on public.ai_itinerary_run;
create policy "Users can update own ai itinerary runs" on public.ai_itinerary_run
  for update using (
    exists (
      select 1
      from public.ai_itinerary_thread t
      where t.ai_itinerary_thread_id = ai_itinerary_run.thread_id
        and t.user_id = auth.uid()
        and public.is_itinerary_collaborator(t.itinerary_id)
    )
  );

-- Steps: only via owning run/thread
drop policy if exists "Users can view own ai itinerary run steps" on public.ai_itinerary_run_step;
create policy "Users can view own ai itinerary run steps" on public.ai_itinerary_run_step
  for select using (
    exists (
      select 1
      from public.ai_itinerary_run r
      join public.ai_itinerary_thread t on t.ai_itinerary_thread_id = r.thread_id
      where r.ai_itinerary_run_id = ai_itinerary_run_step.run_id
        and t.user_id = auth.uid()
        and public.is_itinerary_collaborator(t.itinerary_id)
    )
  );

drop policy if exists "Users can insert own ai itinerary run steps" on public.ai_itinerary_run_step;
create policy "Users can insert own ai itinerary run steps" on public.ai_itinerary_run_step
  for insert with check (
    exists (
      select 1
      from public.ai_itinerary_run r
      join public.ai_itinerary_thread t on t.ai_itinerary_thread_id = r.thread_id
      where r.ai_itinerary_run_id = ai_itinerary_run_step.run_id
        and t.user_id = auth.uid()
        and public.is_itinerary_collaborator(t.itinerary_id)
    )
  );

drop policy if exists "Users can update own ai itinerary run steps" on public.ai_itinerary_run_step;
create policy "Users can update own ai itinerary run steps" on public.ai_itinerary_run_step
  for update using (
    exists (
      select 1
      from public.ai_itinerary_run r
      join public.ai_itinerary_thread t on t.ai_itinerary_thread_id = r.thread_id
      where r.ai_itinerary_run_id = ai_itinerary_run_step.run_id
        and t.user_id = auth.uid()
        and public.is_itinerary_collaborator(t.itinerary_id)
    )
  );

-- Tool invocations: only via owning step/run/thread
drop policy if exists "Users can view own ai itinerary tool invocations" on public.ai_itinerary_tool_invocation;
create policy "Users can view own ai itinerary tool invocations" on public.ai_itinerary_tool_invocation
  for select using (
    exists (
      select 1
      from public.ai_itinerary_run_step s
      join public.ai_itinerary_run r on r.ai_itinerary_run_id = s.run_id
      join public.ai_itinerary_thread t on t.ai_itinerary_thread_id = r.thread_id
      where s.ai_itinerary_run_step_id = ai_itinerary_tool_invocation.run_step_id
        and t.user_id = auth.uid()
        and public.is_itinerary_collaborator(t.itinerary_id)
    )
  );

drop policy if exists "Users can insert own ai itinerary tool invocations" on public.ai_itinerary_tool_invocation;
create policy "Users can insert own ai itinerary tool invocations" on public.ai_itinerary_tool_invocation
  for insert with check (
    exists (
      select 1
      from public.ai_itinerary_run_step s
      join public.ai_itinerary_run r on r.ai_itinerary_run_id = s.run_id
      join public.ai_itinerary_thread t on t.ai_itinerary_thread_id = r.thread_id
      where s.ai_itinerary_run_step_id = ai_itinerary_tool_invocation.run_step_id
        and t.user_id = auth.uid()
        and public.is_itinerary_collaborator(t.itinerary_id)
    )
  );

drop policy if exists "Users can update own ai itinerary tool invocations" on public.ai_itinerary_tool_invocation;
create policy "Users can update own ai itinerary tool invocations" on public.ai_itinerary_tool_invocation
  for update using (
    exists (
      select 1
      from public.ai_itinerary_run_step s
      join public.ai_itinerary_run r on r.ai_itinerary_run_id = s.run_id
      join public.ai_itinerary_thread t on t.ai_itinerary_thread_id = r.thread_id
      where s.ai_itinerary_run_step_id = ai_itinerary_tool_invocation.run_step_id
        and t.user_id = auth.uid()
        and public.is_itinerary_collaborator(t.itinerary_id)
    )
  );
