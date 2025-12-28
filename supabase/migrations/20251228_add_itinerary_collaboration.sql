-- Itinerary collaboration (collaborators, invitations, presence helpers, audit log)
-- Created: 2025-12-28

create extension if not exists "uuid-ossp";

-- =====================================================
-- TABLES
-- =====================================================

create table if not exists public.itinerary_collaborator (
  itinerary_collaborator_id serial primary key,
  itinerary_id integer references public.itinerary(itinerary_id) on delete cascade not null,
  user_id uuid references auth.users(id) on delete cascade not null,
  role text not null check (role in ('viewer', 'editor')),
  invited_by uuid references auth.users(id) on delete set null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  removed_at timestamp with time zone,
  unique (itinerary_id, user_id)
);

create index if not exists idx_itinerary_collaborator_itinerary_id on public.itinerary_collaborator(itinerary_id);
create index if not exists idx_itinerary_collaborator_user_id on public.itinerary_collaborator(user_id);

create table if not exists public.itinerary_invitation (
  itinerary_invitation_id uuid primary key default uuid_generate_v4(),
  itinerary_id integer references public.itinerary(itinerary_id) on delete cascade not null,
  email text not null,
  role text not null check (role in ('viewer', 'editor')),
  invited_by uuid references auth.users(id) on delete set null,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'revoked', 'expired')),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  accepted_at timestamp with time zone,
  accepted_by uuid references auth.users(id) on delete set null,
  revoked_at timestamp with time zone,
  expires_at timestamp with time zone
);

create index if not exists idx_itinerary_invitation_itinerary_id on public.itinerary_invitation(itinerary_id);
create index if not exists idx_itinerary_invitation_email on public.itinerary_invitation(lower(email));
create unique index if not exists idx_itinerary_invitation_pending_unique
  on public.itinerary_invitation(itinerary_id, lower(email))
  where status = 'pending';

create table if not exists public.itinerary_change_log (
  itinerary_change_log_id bigserial primary key,
  itinerary_id integer references public.itinerary(itinerary_id) on delete cascade not null,
  itinerary_destination_id integer references public.itinerary_destination(itinerary_destination_id) on delete set null,
  actor_user_id uuid references auth.users(id) on delete set null,
  entity_type text not null,
  entity_id text not null,
  action text not null check (action in ('INSERT', 'UPDATE', 'DELETE')),
  before jsonb,
  after jsonb,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create index if not exists idx_itinerary_change_log_itinerary_id
  on public.itinerary_change_log(itinerary_id, created_at desc);

-- =====================================================
-- ITINERARY ACTIVITY ACTOR COLUMNS
-- =====================================================

alter table public.itinerary_activity
  add column if not exists created_by uuid references auth.users(id) on delete set null;

alter table public.itinerary_activity
  add column if not exists updated_by uuid references auth.users(id) on delete set null;

update public.itinerary_activity ia
set created_by = i.user_id
from public.itinerary i
where ia.created_by is null
  and i.itinerary_id = ia.itinerary_id;

update public.itinerary_activity ia
set updated_by = coalesce(ia.updated_by, ia.created_by)
where ia.updated_by is null;

create or replace function public.set_itinerary_activity_actor()
returns trigger as $$
begin
  if auth.uid() is null then
    return new;
  end if;

  if tg_op = 'INSERT' then
    if new.created_by is null then
      new.created_by := auth.uid();
    end if;
    new.updated_by := auth.uid();
  elsif tg_op = 'UPDATE' then
    new.updated_by := auth.uid();
  end if;

  return new;
end;
$$ language plpgsql;

drop trigger if exists set_itinerary_activity_actor on public.itinerary_activity;
create trigger set_itinerary_activity_actor
  before insert or update on public.itinerary_activity
  for each row execute function public.set_itinerary_activity_actor();

-- =====================================================
-- AUDIT LOGGING (ITINERARY ACTIVITY)
-- =====================================================

create or replace function public.log_itinerary_activity_change()
returns trigger
language plpgsql
security definer
set search_path = public
set row_security = off
as $$
declare
  v_itinerary_id integer;
  v_destination_id integer;
  v_actor uuid;
  v_entity_id text;
  v_action text;
  v_before jsonb;
  v_after jsonb;
begin
  if tg_op = 'INSERT' then
    v_itinerary_id := new.itinerary_id;
    v_destination_id := new.itinerary_destination_id;
    v_actor := coalesce(auth.uid(), new.updated_by, new.created_by);
    v_entity_id := new.itinerary_activity_id::text;
    v_action := 'INSERT';
    v_before := null;
    v_after := to_jsonb(new);
  elsif tg_op = 'UPDATE' then
    v_itinerary_id := new.itinerary_id;
    v_destination_id := new.itinerary_destination_id;
    v_actor := coalesce(auth.uid(), new.updated_by, new.created_by, old.updated_by, old.created_by);
    v_entity_id := new.itinerary_activity_id::text;
    v_action := 'UPDATE';
    v_before := to_jsonb(old);
    v_after := to_jsonb(new);
  elsif tg_op = 'DELETE' then
    v_itinerary_id := old.itinerary_id;
    v_destination_id := old.itinerary_destination_id;
    v_actor := coalesce(auth.uid(), old.updated_by, old.created_by);
    v_entity_id := old.itinerary_activity_id::text;
    v_action := 'DELETE';
    v_before := to_jsonb(old);
    v_after := null;
  end if;

  insert into public.itinerary_change_log (
    itinerary_id,
    itinerary_destination_id,
    actor_user_id,
    entity_type,
    entity_id,
    action,
    before,
    after
  ) values (
    v_itinerary_id,
    v_destination_id,
    v_actor,
    'itinerary_activity',
    v_entity_id,
    v_action,
    v_before,
    v_after
  );

  return null;
end;
$$;

drop trigger if exists log_itinerary_activity_change on public.itinerary_activity;
create trigger log_itinerary_activity_change
  after insert or update or delete on public.itinerary_activity
  for each row execute function public.log_itinerary_activity_change();

-- =====================================================
-- RLS HELPERS
-- =====================================================

create or replace function public.is_itinerary_collaborator(_itinerary_id integer)
returns boolean
language sql
security definer
set search_path = public
set row_security = off
stable
as $$
  select exists (
    select 1
    from public.itinerary_collaborator ic
    where ic.itinerary_id = _itinerary_id
      and ic.user_id = auth.uid()
      and ic.removed_at is null
  );
$$;

create or replace function public.is_itinerary_editor(_itinerary_id integer)
returns boolean
language sql
security definer
set search_path = public
set row_security = off
stable
as $$
  select exists (
    select 1
    from public.itinerary_collaborator ic
    where ic.itinerary_id = _itinerary_id
      and ic.user_id = auth.uid()
      and ic.role = 'editor'
      and ic.removed_at is null
  );
$$;

-- =====================================================
-- ENABLE RLS
-- =====================================================

alter table public.itinerary_collaborator enable row level security;
alter table public.itinerary_invitation enable row level security;
alter table public.itinerary_change_log enable row level security;

-- =====================================================
-- UPDATED RLS POLICIES (ALLOW COLLABORATORS)
-- =====================================================

-- Itinerary
drop policy if exists "Users can view own itineraries" on public.itinerary;
create policy "Users can view own itineraries" on public.itinerary
  for select using (
    deleted_at is null
    and (
      auth.uid() = user_id
      or is_public = true
      or public.is_itinerary_collaborator(itinerary_id)
    )
  );

drop policy if exists "Users can insert own itineraries" on public.itinerary;
create policy "Users can insert own itineraries" on public.itinerary
  for insert with check (auth.uid() = user_id);

drop policy if exists "Users can update own itineraries" on public.itinerary;
create policy "Users can update own itineraries" on public.itinerary
  for update using (auth.uid() = user_id);

drop policy if exists "Users can delete own itineraries" on public.itinerary;
create policy "Users can delete own itineraries" on public.itinerary
  for delete using (auth.uid() = user_id);

-- Itinerary destinations
drop policy if exists "Users can view own itinerary destinations" on public.itinerary_destination;
create policy "Users can view own itinerary destinations" on public.itinerary_destination
  for select using (
    exists (
      select 1
      from public.itinerary i
      where i.itinerary_id = itinerary_destination.itinerary_id
        and i.deleted_at is null
        and (
          i.user_id = auth.uid()
          or i.is_public = true
          or public.is_itinerary_collaborator(i.itinerary_id)
        )
    )
  );

drop policy if exists "Users can insert own itinerary destinations" on public.itinerary_destination;
create policy "Users can insert own itinerary destinations" on public.itinerary_destination
  for insert with check (
    exists (
      select 1
      from public.itinerary i
      where i.itinerary_id = itinerary_destination.itinerary_id
        and i.deleted_at is null
        and (
          i.user_id = auth.uid()
          or public.is_itinerary_editor(i.itinerary_id)
        )
    )
  );

drop policy if exists "Users can update own itinerary destinations" on public.itinerary_destination;
create policy "Users can update own itinerary destinations" on public.itinerary_destination
  for update using (
    exists (
      select 1
      from public.itinerary i
      where i.itinerary_id = itinerary_destination.itinerary_id
        and i.deleted_at is null
        and (
          i.user_id = auth.uid()
          or public.is_itinerary_editor(i.itinerary_id)
        )
    )
  );

drop policy if exists "Users can delete own itinerary destinations" on public.itinerary_destination;
create policy "Users can delete own itinerary destinations" on public.itinerary_destination
  for delete using (
    exists (
      select 1
      from public.itinerary i
      where i.itinerary_id = itinerary_destination.itinerary_id
        and i.deleted_at is null
        and (
          i.user_id = auth.uid()
          or public.is_itinerary_editor(i.itinerary_id)
        )
    )
  );

-- Itinerary activities
drop policy if exists "Users can view own itinerary activities" on public.itinerary_activity;
create policy "Users can view own itinerary activities" on public.itinerary_activity
  for select using (
    exists (
      select 1
      from public.itinerary i
      where i.itinerary_id = itinerary_activity.itinerary_id
        and i.deleted_at is null
        and (
          i.user_id = auth.uid()
          or i.is_public = true
          or public.is_itinerary_collaborator(i.itinerary_id)
        )
    )
  );

drop policy if exists "Users can insert own itinerary activities" on public.itinerary_activity;
create policy "Users can insert own itinerary activities" on public.itinerary_activity
  for insert with check (
    exists (
      select 1
      from public.itinerary i
      where i.itinerary_id = itinerary_activity.itinerary_id
        and i.deleted_at is null
        and (
          i.user_id = auth.uid()
          or public.is_itinerary_editor(i.itinerary_id)
        )
    )
  );

drop policy if exists "Users can update own itinerary activities" on public.itinerary_activity;
create policy "Users can update own itinerary activities" on public.itinerary_activity
  for update using (
    exists (
      select 1
      from public.itinerary i
      where i.itinerary_id = itinerary_activity.itinerary_id
        and i.deleted_at is null
        and (
          i.user_id = auth.uid()
          or public.is_itinerary_editor(i.itinerary_id)
        )
    )
  );

drop policy if exists "Users can delete own itinerary activities" on public.itinerary_activity;
create policy "Users can delete own itinerary activities" on public.itinerary_activity
  for delete using (
    exists (
      select 1
      from public.itinerary i
      where i.itinerary_id = itinerary_activity.itinerary_id
        and i.deleted_at is null
        and (
          i.user_id = auth.uid()
          or public.is_itinerary_editor(i.itinerary_id)
        )
    )
  );

-- Search history
drop policy if exists "Users can view own search history" on public.itinerary_search_history;
create policy "Users can view own search history" on public.itinerary_search_history
  for select using (
    exists (
      select 1
      from public.itinerary i
      where i.itinerary_id = itinerary_search_history.itinerary_id
        and i.deleted_at is null
        and (
          i.user_id = auth.uid()
          or public.is_itinerary_editor(i.itinerary_id)
          or public.is_itinerary_collaborator(i.itinerary_id)
        )
    )
  );

drop policy if exists "Users can insert own search history" on public.itinerary_search_history;
create policy "Users can insert own search history" on public.itinerary_search_history
  for insert with check (
    exists (
      select 1
      from public.itinerary i
      where i.itinerary_id = itinerary_search_history.itinerary_id
        and i.deleted_at is null
        and (
          i.user_id = auth.uid()
          or public.is_itinerary_editor(i.itinerary_id)
        )
    )
  );

drop policy if exists "Users can delete own search history" on public.itinerary_search_history;
create policy "Users can delete own search history" on public.itinerary_search_history
  for delete using (
    exists (
      select 1
      from public.itinerary i
      where i.itinerary_id = itinerary_search_history.itinerary_id
        and i.deleted_at is null
        and (
          i.user_id = auth.uid()
          or public.is_itinerary_editor(i.itinerary_id)
        )
    )
  );

-- Collaborators: members can view; owners can manage
drop policy if exists "Users can view collaborators" on public.itinerary_collaborator;
create policy "Users can view collaborators" on public.itinerary_collaborator
  for select using (
    exists (
      select 1
      from public.itinerary i
      where i.itinerary_id = itinerary_collaborator.itinerary_id
        and i.deleted_at is null
        and (
          i.user_id = auth.uid()
          or i.is_public = true
          or public.is_itinerary_collaborator(i.itinerary_id)
        )
    )
  );

drop policy if exists "Owners can manage collaborators" on public.itinerary_collaborator;
create policy "Owners can manage collaborators" on public.itinerary_collaborator
  for all
  using (
    exists (
      select 1
      from public.itinerary i
      where i.itinerary_id = itinerary_collaborator.itinerary_id
        and i.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1
      from public.itinerary i
      where i.itinerary_id = itinerary_collaborator.itinerary_id
        and i.user_id = auth.uid()
    )
  );

-- Invitations: owners can manage; invitees can view after login (by email match)
drop policy if exists "Owners can manage invitations" on public.itinerary_invitation;
create policy "Owners can manage invitations" on public.itinerary_invitation
  for all
  using (
    exists (
      select 1
      from public.itinerary i
      where i.itinerary_id = itinerary_invitation.itinerary_id
        and i.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1
      from public.itinerary i
      where i.itinerary_id = itinerary_invitation.itinerary_id
        and i.user_id = auth.uid()
    )
  );

drop policy if exists "Invitees can view invitations" on public.itinerary_invitation;
create policy "Invitees can view invitations" on public.itinerary_invitation
  for select using (lower(email) = lower(coalesce(auth.jwt() ->> 'email', '')));

-- Change log: members can view
drop policy if exists "Members can view change log" on public.itinerary_change_log;
create policy "Members can view change log" on public.itinerary_change_log
  for select using (
    exists (
      select 1
      from public.itinerary i
      where i.itinerary_id = itinerary_change_log.itinerary_id
        and i.deleted_at is null
        and (
          i.user_id = auth.uid()
          or i.is_public = true
          or public.is_itinerary_collaborator(i.itinerary_id)
        )
    )
  );

-- Profiles: allow viewing other users' profiles when they share an itinerary
drop policy if exists "Users can view collaborator profiles" on public.profiles;
create policy "Users can view collaborator profiles" on public.profiles
  for select using (
    auth.uid() = user_id
    or exists (
      select 1
      from public.itinerary i
      where i.deleted_at is null
        and (
          i.user_id = auth.uid()
          or i.is_public = true
          or public.is_itinerary_collaborator(i.itinerary_id)
        )
        and (
          i.user_id = profiles.user_id
          or exists (
            select 1
            from public.itinerary_collaborator ic
            where ic.itinerary_id = i.itinerary_id
              and ic.removed_at is null
              and ic.user_id = profiles.user_id
          )
        )
    )
  );

-- =====================================================
-- UPDATED_AT TRIGGERS FOR NEW TABLES
-- =====================================================

drop trigger if exists set_timestamp_itinerary_collaborator on public.itinerary_collaborator;
create trigger set_timestamp_itinerary_collaborator
  before update on public.itinerary_collaborator
  for each row execute function public.handle_updated_at();

drop trigger if exists set_timestamp_itinerary_invitation on public.itinerary_invitation;
create trigger set_timestamp_itinerary_invitation
  before update on public.itinerary_invitation
  for each row execute function public.handle_updated_at();

-- =====================================================
-- INVITE ACCEPTANCE RPC
-- =====================================================

create or replace function public.accept_itinerary_invitation(p_invite_id uuid)
returns table (itinerary_id integer, itinerary_destination_id integer)
language plpgsql
security definer
set search_path = public
set row_security = off
as $$
declare
  v_invite public.itinerary_invitation;
  v_email text;
  v_destination_id integer;
begin
  select *
  into v_invite
  from public.itinerary_invitation
  where itinerary_invitation_id = p_invite_id
  for update;

  if not found then
    raise exception 'Invitation not found';
  end if;

  if v_invite.status <> 'pending' then
    raise exception 'Invitation is not pending';
  end if;

  if v_invite.expires_at is not null and v_invite.expires_at < now() then
    update public.itinerary_invitation
      set status = 'expired',
          updated_at = now()
    where itinerary_invitation_id = p_invite_id;
    raise exception 'Invitation has expired';
  end if;

  v_email := lower(coalesce(auth.jwt() ->> 'email', ''));
  if v_email = '' then
    raise exception 'User email not available';
  end if;

  if lower(v_invite.email) <> v_email then
    raise exception 'Invitation email mismatch';
  end if;

  insert into public.itinerary_collaborator (itinerary_id, user_id, role, invited_by, removed_at)
  values (v_invite.itinerary_id, auth.uid(), v_invite.role, v_invite.invited_by, null)
  on conflict (itinerary_id, user_id) do update
    set role = excluded.role,
        removed_at = null,
        updated_at = now();

  update public.itinerary_invitation
    set status = 'accepted',
        accepted_at = now(),
        accepted_by = auth.uid(),
        updated_at = now()
  where itinerary_invitation_id = p_invite_id;

  select itinerary_destination_id
  into v_destination_id
  from public.itinerary_destination
  where itinerary_id = v_invite.itinerary_id
  order by order_number asc, itinerary_destination_id asc
  limit 1;

  itinerary_id := v_invite.itinerary_id;
  itinerary_destination_id := v_destination_id;
  return next;
end;
$$;

grant execute on function public.accept_itinerary_invitation(uuid) to authenticated;

-- =====================================================
-- GRANTS (DEFENSIVE; SUPABASE MAY ALREADY SET DEFAULT PRIVILEGES)
-- =====================================================

grant select, insert, update, delete on table public.itinerary_collaborator to authenticated;
grant select, insert, update, delete on table public.itinerary_invitation to authenticated;
grant select on table public.itinerary_change_log to authenticated;
