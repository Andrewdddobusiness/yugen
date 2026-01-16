-- Add thread_key to support multiple AI chats per destination.
-- Created: 2026-01-16

alter table public.ai_itinerary_thread
  add column if not exists thread_key text;

update public.ai_itinerary_thread
set thread_key = 'default'
where thread_key is null;

alter table public.ai_itinerary_thread
  alter column thread_key set default 'default';

alter table public.ai_itinerary_thread
  alter column thread_key set not null;

-- Replace the original per-destination unique constraint with a thread_key-scoped one.
alter table public.ai_itinerary_thread
  drop constraint if exists ai_itinerary_thread_itinerary_id_itinerary_destination_id_user_id_key;

alter table public.ai_itinerary_thread
  add constraint ai_itinerary_thread_unique_user_destination_thread_key
  unique (itinerary_id, itinerary_destination_id, user_id, thread_key);

drop index if exists public.idx_ai_itinerary_thread_lookup;

create index if not exists idx_ai_itinerary_thread_lookup
  on public.ai_itinerary_thread(itinerary_id, itinerary_destination_id, user_id, thread_key);

create index if not exists idx_ai_itinerary_thread_recent
  on public.ai_itinerary_thread(user_id, itinerary_id, itinerary_destination_id, updated_at desc);

