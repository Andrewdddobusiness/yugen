-- Fix AI itinerary chat RLS: allow itinerary owners (not only collaborators) to create/read chat threads.

create or replace function public.has_itinerary_access(_itinerary_id integer)
returns boolean
language sql
security definer
set search_path = public
set row_security = off
stable
as $$
  select
    exists (
      select 1
      from public.itinerary i
      where i.itinerary_id = _itinerary_id
        and i.user_id = auth.uid()
        and i.deleted_at is null
    )
    or public.is_itinerary_collaborator(_itinerary_id);
$$;

-- Threads
drop policy if exists "Users can view own ai itinerary threads" on public.ai_itinerary_thread;
create policy "Users can view own ai itinerary threads" on public.ai_itinerary_thread
  for select using (
    user_id = auth.uid()
    and public.has_itinerary_access(itinerary_id)
  );

drop policy if exists "Users can insert own ai itinerary threads" on public.ai_itinerary_thread;
create policy "Users can insert own ai itinerary threads" on public.ai_itinerary_thread
  for insert with check (
    user_id = auth.uid()
    and public.has_itinerary_access(itinerary_id)
  );

drop policy if exists "Users can update own ai itinerary threads" on public.ai_itinerary_thread;
create policy "Users can update own ai itinerary threads" on public.ai_itinerary_thread
  for update using (
    user_id = auth.uid()
    and public.has_itinerary_access(itinerary_id)
  );

-- Messages
drop policy if exists "Users can view own ai itinerary messages" on public.ai_itinerary_message;
create policy "Users can view own ai itinerary messages" on public.ai_itinerary_message
  for select using (
    exists (
      select 1
      from public.ai_itinerary_thread t
      where t.ai_itinerary_thread_id = ai_itinerary_message.thread_id
        and t.user_id = auth.uid()
        and public.has_itinerary_access(t.itinerary_id)
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
        and public.has_itinerary_access(t.itinerary_id)
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
        and public.has_itinerary_access(t.itinerary_id)
    )
  );

-- Runs
drop policy if exists "Users can view own ai itinerary runs" on public.ai_itinerary_run;
create policy "Users can view own ai itinerary runs" on public.ai_itinerary_run
  for select using (
    exists (
      select 1
      from public.ai_itinerary_thread t
      where t.ai_itinerary_thread_id = ai_itinerary_run.thread_id
        and t.user_id = auth.uid()
        and public.has_itinerary_access(t.itinerary_id)
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
        and public.has_itinerary_access(t.itinerary_id)
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
        and public.has_itinerary_access(t.itinerary_id)
    )
  );

-- Run steps
drop policy if exists "Users can view own ai itinerary run steps" on public.ai_itinerary_run_step;
create policy "Users can view own ai itinerary run steps" on public.ai_itinerary_run_step
  for select using (
    exists (
      select 1
      from public.ai_itinerary_run r
      join public.ai_itinerary_thread t on t.ai_itinerary_thread_id = r.thread_id
      where r.ai_itinerary_run_id = ai_itinerary_run_step.run_id
        and t.user_id = auth.uid()
        and public.has_itinerary_access(t.itinerary_id)
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
        and public.has_itinerary_access(t.itinerary_id)
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
        and public.has_itinerary_access(t.itinerary_id)
    )
  );

-- Tool invocations
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
        and public.has_itinerary_access(t.itinerary_id)
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
        and public.has_itinerary_access(t.itinerary_id)
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
        and public.has_itinerary_access(t.itinerary_id)
    )
  );

