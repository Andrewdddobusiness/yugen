-- Itinerary sources + attribution (link import)
-- Created: 2026-01-11

-- Supabase typically installs extensions into the `extensions` schema.
create schema if not exists extensions;
create extension if not exists "uuid-ossp" with schema extensions;

-- =====================================================
-- TABLES
-- =====================================================

create table if not exists public.itinerary_source (
  itinerary_source_id uuid primary key default extensions.uuid_generate_v4(),
  itinerary_id integer references public.itinerary(itinerary_id) on delete cascade not null,
  itinerary_destination_id integer references public.itinerary_destination(itinerary_destination_id) on delete set null,
  provider text not null check (provider in ('youtube', 'tiktok', 'instagram', 'tripadvisor', 'web')),
  url text not null,
  canonical_url text not null,
  external_id text,
  title text,
  thumbnail_url text,
  embed_url text,
  raw_metadata jsonb default '{}'::jsonb not null,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create index if not exists idx_itinerary_source_itinerary_id on public.itinerary_source(itinerary_id);
create index if not exists idx_itinerary_source_destination_id on public.itinerary_source(itinerary_destination_id);
create unique index if not exists idx_itinerary_source_itinerary_canonical_unique
  on public.itinerary_source(itinerary_id, canonical_url);

create table if not exists public.itinerary_activity_source (
  itinerary_activity_source_id bigserial primary key,
  itinerary_activity_id integer references public.itinerary_activity(itinerary_activity_id) on delete cascade not null,
  itinerary_source_id uuid references public.itinerary_source(itinerary_source_id) on delete cascade not null,
  snippet text,
  timestamp_seconds integer check (timestamp_seconds is null or timestamp_seconds >= 0),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique (itinerary_activity_id, itinerary_source_id)
);

create index if not exists idx_itinerary_activity_source_activity_id on public.itinerary_activity_source(itinerary_activity_id);
create index if not exists idx_itinerary_activity_source_source_id on public.itinerary_activity_source(itinerary_source_id);

-- =====================================================
-- IMPORT DRAFT METADATA (AI ITINERARY CHAT)
-- =====================================================

alter table public.ai_itinerary_thread
  add column if not exists draft_sources jsonb;

-- =====================================================
-- ROW LEVEL SECURITY
-- =====================================================

alter table public.itinerary_source enable row level security;
alter table public.itinerary_activity_source enable row level security;

-- Sources
drop policy if exists "Users can view itinerary sources" on public.itinerary_source;
create policy "Users can view itinerary sources" on public.itinerary_source
  for select using (
    exists (
      select 1
      from public.itinerary i
      where i.itinerary_id = itinerary_source.itinerary_id
        and i.deleted_at is null
        and (
          i.user_id = auth.uid()
          or i.is_public = true
          or public.is_itinerary_collaborator(i.itinerary_id)
        )
    )
  );

drop policy if exists "Users can insert itinerary sources" on public.itinerary_source;
create policy "Users can insert itinerary sources" on public.itinerary_source
  for insert with check (
    exists (
      select 1
      from public.itinerary i
      where i.itinerary_id = itinerary_source.itinerary_id
        and i.deleted_at is null
        and (
          i.user_id = auth.uid()
          or public.is_itinerary_editor(i.itinerary_id)
        )
    )
  );

drop policy if exists "Users can update itinerary sources" on public.itinerary_source;
create policy "Users can update itinerary sources" on public.itinerary_source
  for update using (
    exists (
      select 1
      from public.itinerary i
      where i.itinerary_id = itinerary_source.itinerary_id
        and i.deleted_at is null
        and (
          i.user_id = auth.uid()
          or public.is_itinerary_editor(i.itinerary_id)
        )
    )
  );

drop policy if exists "Users can delete itinerary sources" on public.itinerary_source;
create policy "Users can delete itinerary sources" on public.itinerary_source
  for delete using (
    exists (
      select 1
      from public.itinerary i
      where i.itinerary_id = itinerary_source.itinerary_id
        and i.deleted_at is null
        and (
          i.user_id = auth.uid()
          or public.is_itinerary_editor(i.itinerary_id)
        )
    )
  );

-- Activity sources
drop policy if exists "Users can view itinerary activity sources" on public.itinerary_activity_source;
create policy "Users can view itinerary activity sources" on public.itinerary_activity_source
  for select using (
    exists (
      select 1
      from public.itinerary_activity ia
      join public.itinerary i on i.itinerary_id = ia.itinerary_id
      where ia.itinerary_activity_id = itinerary_activity_source.itinerary_activity_id
        and i.deleted_at is null
        and (
          i.user_id = auth.uid()
          or i.is_public = true
          or public.is_itinerary_collaborator(i.itinerary_id)
        )
    )
  );

drop policy if exists "Users can insert itinerary activity sources" on public.itinerary_activity_source;
create policy "Users can insert itinerary activity sources" on public.itinerary_activity_source
  for insert with check (
    exists (
      select 1
      from public.itinerary_activity ia
      join public.itinerary i on i.itinerary_id = ia.itinerary_id
      where ia.itinerary_activity_id = itinerary_activity_source.itinerary_activity_id
        and i.deleted_at is null
        and (
          i.user_id = auth.uid()
          or public.is_itinerary_editor(i.itinerary_id)
        )
    )
  );

drop policy if exists "Users can update itinerary activity sources" on public.itinerary_activity_source;
create policy "Users can update itinerary activity sources" on public.itinerary_activity_source
  for update using (
    exists (
      select 1
      from public.itinerary_activity ia
      join public.itinerary i on i.itinerary_id = ia.itinerary_id
      where ia.itinerary_activity_id = itinerary_activity_source.itinerary_activity_id
        and i.deleted_at is null
        and (
          i.user_id = auth.uid()
          or public.is_itinerary_editor(i.itinerary_id)
        )
    )
  );

drop policy if exists "Users can delete itinerary activity sources" on public.itinerary_activity_source;
create policy "Users can delete itinerary activity sources" on public.itinerary_activity_source
  for delete using (
    exists (
      select 1
      from public.itinerary_activity ia
      join public.itinerary i on i.itinerary_id = ia.itinerary_id
      where ia.itinerary_activity_id = itinerary_activity_source.itinerary_activity_id
        and i.deleted_at is null
        and (
          i.user_id = auth.uid()
          or public.is_itinerary_editor(i.itinerary_id)
        )
    )
  );

-- =====================================================
-- UPDATED_AT TRIGGER (REUSE handle_updated_at)
-- =====================================================

drop trigger if exists set_timestamp_itinerary_source on public.itinerary_source;
create trigger set_timestamp_itinerary_source
  before update on public.itinerary_source
  for each row execute function public.handle_updated_at();

-- Defensive; Supabase may already set default privileges.
grant select, insert, update, delete on table public.itinerary_source to authenticated;
grant select, insert, update, delete on table public.itinerary_activity_source to authenticated;
