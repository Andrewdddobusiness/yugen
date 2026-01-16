-- Fix legacy unique constraint name truncation so multiple threads per destination are allowed.
-- Created: 2026-01-16

-- Postgres may truncate long constraint names; drop both the original and the truncated variant.
alter table public.ai_itinerary_thread
  drop constraint if exists ai_itinerary_thread_itinerary_id_itinerary_destination_id_user_id_key;

alter table public.ai_itinerary_thread
  drop constraint if exists ai_itinerary_thread_itinerary_id_itinerary_destination_id_u_key;

-- Ensure the thread_key-scoped unique constraint exists.
do $$
begin
  if not exists (
    select 1
    from pg_constraint c
    join pg_class t on t.oid = c.conrelid
    join pg_namespace n on n.oid = t.relnamespace
    where n.nspname = 'public'
      and t.relname = 'ai_itinerary_thread'
      and c.contype = 'u'
      and c.conname = 'ai_itinerary_thread_unique_user_destination_thread_key'
  ) then
    alter table public.ai_itinerary_thread
      add constraint ai_itinerary_thread_unique_user_destination_thread_key
      unique (itinerary_id, itinerary_destination_id, user_id, thread_key);
  end if;
end
$$;
