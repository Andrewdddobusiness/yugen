-- Itinerary invite links (shareable link that grants collaborator access)
-- Created: 2025-12-30

create extension if not exists "uuid-ossp";

-- =====================================================
-- TABLES
-- =====================================================

create table if not exists public.itinerary_invite_link (
  itinerary_invite_link_id uuid primary key default uuid_generate_v4(),
  itinerary_id integer references public.itinerary(itinerary_id) on delete cascade not null,
  role text not null check (role in ('viewer', 'editor')) default 'editor',
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  revoked_at timestamp with time zone,
  expires_at timestamp with time zone
);

create index if not exists idx_itinerary_invite_link_itinerary_id on public.itinerary_invite_link(itinerary_id);
create unique index if not exists idx_itinerary_invite_link_active_unique
  on public.itinerary_invite_link(itinerary_id)
  where revoked_at is null;

-- =====================================================
-- ROW LEVEL SECURITY
-- =====================================================

alter table public.itinerary_invite_link enable row level security;

drop policy if exists "Owners can manage invite links" on public.itinerary_invite_link;
create policy "Owners can manage invite links" on public.itinerary_invite_link
  for all
  using (
    exists (
      select 1
      from public.itinerary i
      where i.itinerary_id = itinerary_invite_link.itinerary_id
        and i.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1
      from public.itinerary i
      where i.itinerary_id = itinerary_invite_link.itinerary_id
        and i.user_id = auth.uid()
    )
  );

-- =====================================================
-- UPDATED_AT TRIGGER (REUSE handle_updated_at)
-- =====================================================

drop trigger if exists set_timestamp_itinerary_invite_link on public.itinerary_invite_link;
create trigger set_timestamp_itinerary_invite_link
  before update on public.itinerary_invite_link
  for each row execute function public.handle_updated_at();

-- =====================================================
-- INVITE ACCEPTANCE RPC
-- =====================================================

create or replace function public.accept_itinerary_invite_link(p_link_id uuid)
returns table (itinerary_id integer, itinerary_destination_id integer)
language plpgsql
security definer
set search_path = public
set row_security = off
as $$
declare
  v_link public.itinerary_invite_link;
  v_destination_id integer;
begin
  select *
  into v_link
  from public.itinerary_invite_link
  where itinerary_invite_link_id = p_link_id
  for update;

  if not found then
    raise exception 'Invite link not found';
  end if;

  if v_link.revoked_at is not null then
    raise exception 'Invite link has been revoked';
  end if;

  if v_link.expires_at is not null and v_link.expires_at < now() then
    raise exception 'Invite link has expired';
  end if;

  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  insert into public.itinerary_collaborator (itinerary_id, user_id, role, invited_by, removed_at)
  values (v_link.itinerary_id, auth.uid(), v_link.role, v_link.created_by, null)
  on conflict (itinerary_id, user_id) do update
    set role = excluded.role,
        removed_at = null,
        updated_at = now();

  select itinerary_destination_id
  into v_destination_id
  from public.itinerary_destination
  where itinerary_id = v_link.itinerary_id
  order by order_number asc, itinerary_destination_id asc
  limit 1;

  itinerary_id := v_link.itinerary_id;
  itinerary_destination_id := v_destination_id;
  return next;
end;
$$;

grant execute on function public.accept_itinerary_invite_link(uuid) to authenticated;

-- Defensive; Supabase may already set default privileges.
grant select, insert, update, delete on table public.itinerary_invite_link to authenticated;

