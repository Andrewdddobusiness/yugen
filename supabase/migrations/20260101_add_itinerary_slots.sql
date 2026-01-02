-- Itinerary slots (alternative options grouped into the same time block)
-- Created: 2026-01-01

create table if not exists public.itinerary_slot (
  itinerary_slot_id serial primary key,
  itinerary_id integer references public.itinerary(itinerary_id) on delete cascade not null,
  itinerary_destination_id integer references public.itinerary_destination(itinerary_destination_id) on delete cascade not null,
  date date not null,
  start_time time not null,
  end_time time not null,
  primary_itinerary_activity_id integer references public.itinerary_activity(itinerary_activity_id) on delete set null,
  created_by uuid references auth.users(id) on delete set null,
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  deleted_at timestamp with time zone,
  unique (itinerary_id, itinerary_destination_id, date, start_time, end_time)
);
create index if not exists idx_itinerary_slot_itinerary_destination_date
  on public.itinerary_slot(itinerary_id, itinerary_destination_id, date);
create index if not exists idx_itinerary_slot_primary_activity
  on public.itinerary_slot(primary_itinerary_activity_id);
create table if not exists public.itinerary_slot_option (
  itinerary_slot_option_id serial primary key,
  itinerary_slot_id integer references public.itinerary_slot(itinerary_slot_id) on delete cascade not null,
  itinerary_activity_id integer references public.itinerary_activity(itinerary_activity_id) on delete cascade not null,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique (itinerary_slot_id, itinerary_activity_id),
  unique (itinerary_activity_id)
);
create index if not exists idx_itinerary_slot_option_slot_id
  on public.itinerary_slot_option(itinerary_slot_id);
create index if not exists idx_itinerary_slot_option_activity_id
  on public.itinerary_slot_option(itinerary_activity_id);
-- Actor helpers
create or replace function public.set_itinerary_slot_actor()
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
drop trigger if exists set_itinerary_slot_actor on public.itinerary_slot;
create trigger set_itinerary_slot_actor
  before insert or update on public.itinerary_slot
  for each row execute function public.set_itinerary_slot_actor();
create or replace function public.set_itinerary_slot_option_actor()
returns trigger as $$
begin
  if auth.uid() is null then
    return new;
  end if;

  if new.created_by is null then
    new.created_by := auth.uid();
  end if;

  return new;
end;
$$ language plpgsql;
drop trigger if exists set_itinerary_slot_option_actor on public.itinerary_slot_option;
create trigger set_itinerary_slot_option_actor
  before insert on public.itinerary_slot_option
  for each row execute function public.set_itinerary_slot_option_actor();
-- updated_at timestamp trigger
drop trigger if exists set_timestamp_itinerary_slot on public.itinerary_slot;
create trigger set_timestamp_itinerary_slot
  before update on public.itinerary_slot
  for each row execute function public.handle_updated_at();
-- Enable RLS
alter table public.itinerary_slot enable row level security;
alter table public.itinerary_slot_option enable row level security;
-- RLS policies - Slots
drop policy if exists "Users can view itinerary slots" on public.itinerary_slot;
create policy "Users can view itinerary slots" on public.itinerary_slot
  for select using (
    exists (
      select 1
      from public.itinerary i
      where i.itinerary_id = itinerary_slot.itinerary_id
        and i.deleted_at is null
        and (
          i.user_id = auth.uid()
          or i.is_public = true
          or public.is_itinerary_collaborator(i.itinerary_id)
        )
    )
  );
drop policy if exists "Users can insert itinerary slots" on public.itinerary_slot;
create policy "Users can insert itinerary slots" on public.itinerary_slot
  for insert with check (
    exists (
      select 1
      from public.itinerary i
      where i.itinerary_id = itinerary_slot.itinerary_id
        and i.deleted_at is null
        and (
          i.user_id = auth.uid()
          or public.is_itinerary_editor(i.itinerary_id)
        )
    )
  );
drop policy if exists "Users can update itinerary slots" on public.itinerary_slot;
create policy "Users can update itinerary slots" on public.itinerary_slot
  for update using (
    exists (
      select 1
      from public.itinerary i
      where i.itinerary_id = itinerary_slot.itinerary_id
        and i.deleted_at is null
        and (
          i.user_id = auth.uid()
          or public.is_itinerary_editor(i.itinerary_id)
        )
    )
  );
drop policy if exists "Users can delete itinerary slots" on public.itinerary_slot;
create policy "Users can delete itinerary slots" on public.itinerary_slot
  for delete using (
    exists (
      select 1
      from public.itinerary i
      where i.itinerary_id = itinerary_slot.itinerary_id
        and i.deleted_at is null
        and (
          i.user_id = auth.uid()
          or public.is_itinerary_editor(i.itinerary_id)
        )
    )
  );
-- RLS policies - Slot options
drop policy if exists "Users can view itinerary slot options" on public.itinerary_slot_option;
create policy "Users can view itinerary slot options" on public.itinerary_slot_option
  for select using (
    exists (
      select 1
      from public.itinerary_slot s
      join public.itinerary i on i.itinerary_id = s.itinerary_id
      where s.itinerary_slot_id = itinerary_slot_option.itinerary_slot_id
        and i.deleted_at is null
        and (
          i.user_id = auth.uid()
          or i.is_public = true
          or public.is_itinerary_collaborator(i.itinerary_id)
        )
    )
  );
drop policy if exists "Users can insert itinerary slot options" on public.itinerary_slot_option;
create policy "Users can insert itinerary slot options" on public.itinerary_slot_option
  for insert with check (
    exists (
      select 1
      from public.itinerary_slot s
      join public.itinerary i on i.itinerary_id = s.itinerary_id
      where s.itinerary_slot_id = itinerary_slot_option.itinerary_slot_id
        and i.deleted_at is null
        and (
          i.user_id = auth.uid()
          or public.is_itinerary_editor(i.itinerary_id)
        )
    )
  );
drop policy if exists "Users can update itinerary slot options" on public.itinerary_slot_option;
create policy "Users can update itinerary slot options" on public.itinerary_slot_option
  for update using (
    exists (
      select 1
      from public.itinerary_slot s
      join public.itinerary i on i.itinerary_id = s.itinerary_id
      where s.itinerary_slot_id = itinerary_slot_option.itinerary_slot_id
        and i.deleted_at is null
        and (
          i.user_id = auth.uid()
          or public.is_itinerary_editor(i.itinerary_id)
        )
    )
  );
drop policy if exists "Users can delete itinerary slot options" on public.itinerary_slot_option;
create policy "Users can delete itinerary slot options" on public.itinerary_slot_option
  for delete using (
    exists (
      select 1
      from public.itinerary_slot s
      join public.itinerary i on i.itinerary_id = s.itinerary_id
      where s.itinerary_slot_id = itinerary_slot_option.itinerary_slot_id
        and i.deleted_at is null
        and (
          i.user_id = auth.uid()
          or public.is_itinerary_editor(i.itinerary_id)
        )
    )
  );
-- =====================================================
-- Backfill: create slots only for exact-time overlaps (>= 2 activities sharing the same day/time).
-- =====================================================

with grouped as (
  select
    ia.itinerary_id,
    ia.itinerary_destination_id,
    ia.date,
    ia.start_time,
    ia.end_time,
    min(ia.itinerary_activity_id) as primary_itinerary_activity_id,
    coalesce(min(ia.created_by::text)::uuid, i.user_id) as created_by,
    coalesce(min(ia.updated_by::text)::uuid, min(ia.created_by::text)::uuid, i.user_id) as updated_by,
    count(*) as option_count
  from public.itinerary_activity ia
  join public.itinerary i on i.itinerary_id = ia.itinerary_id
  where ia.deleted_at is null
    and ia.date is not null
    and ia.start_time is not null
    and ia.end_time is not null
  group by
    ia.itinerary_id,
    ia.itinerary_destination_id,
    ia.date,
    ia.start_time,
    ia.end_time,
    i.user_id
  having count(*) >= 2
),
inserted as (
  insert into public.itinerary_slot (
    itinerary_id,
    itinerary_destination_id,
    date,
    start_time,
    end_time,
    primary_itinerary_activity_id,
    created_by,
    updated_by
  )
  select
    g.itinerary_id,
    g.itinerary_destination_id,
    g.date,
    g.start_time,
    g.end_time,
    g.primary_itinerary_activity_id,
    g.created_by,
    g.updated_by
  from grouped g
  on conflict (itinerary_id, itinerary_destination_id, date, start_time, end_time) do nothing
  returning itinerary_slot_id, itinerary_id, itinerary_destination_id, date, start_time, end_time
)
insert into public.itinerary_slot_option (
  itinerary_slot_id,
  itinerary_activity_id,
  created_by
)
select
  s.itinerary_slot_id,
  ia.itinerary_activity_id,
  ia.created_by
from public.itinerary_activity ia
join public.itinerary_slot s
  on s.itinerary_id = ia.itinerary_id
  and s.itinerary_destination_id = ia.itinerary_destination_id
  and s.date = ia.date
  and s.start_time = ia.start_time
  and s.end_time = ia.end_time
where ia.deleted_at is null
  and ia.date is not null
  and ia.start_time is not null
  and ia.end_time is not null
  and exists (
    select 1
    from grouped g
    where g.itinerary_id = ia.itinerary_id
      and g.itinerary_destination_id = ia.itinerary_destination_id
      and g.date = ia.date
      and g.start_time = ia.start_time
      and g.end_time = ia.end_time
  )
on conflict do nothing;
-- =====================================================
-- Builder bootstrap RPC: include slots + slot options.
-- =====================================================

create or replace function public.get_itinerary_builder_bootstrap(
  _itinerary_id integer,
  _itinerary_destination_id integer
)
returns jsonb
language sql
stable
as $$
  select jsonb_build_object(
    'itinerary',
      (
        select to_jsonb(i)
        from public.itinerary i
        where i.itinerary_id = _itinerary_id
          and i.deleted_at is null
        limit 1
      ),
    'destination',
      (
        select to_jsonb(d)
        from public.itinerary_destination d
        where d.itinerary_id = _itinerary_id
          and d.itinerary_destination_id = _itinerary_destination_id
        limit 1
      ),
    'activities',
      (
        select coalesce(
          jsonb_agg(to_jsonb(x) order by x.itinerary_activity_id),
          '[]'::jsonb
        )
        from (
          select
            ia.itinerary_id,
            ia.itinerary_activity_id,
            ia.itinerary_destination_id,
            ia.activity_id,
            ia.date,
            ia.start_time,
            ia.end_time,
            ia.notes,
            ia.deleted_at,
            ia.created_by,
            ia.updated_by,
            jsonb_build_object(
              'activity_id', a.activity_id,
              'place_id', a.place_id,
              'name', a.name,
              'duration', a.duration,
              'price_level', a.price_level,
              'rating', a.rating,
              'types', a.types,
              'address', a.address
            ) as activity
          from public.itinerary_activity ia
          join public.activity a on a.activity_id = ia.activity_id
          where ia.itinerary_id = _itinerary_id
            and ia.itinerary_destination_id = _itinerary_destination_id
            and ia.deleted_at is null
          limit 2000
        ) x
      ),
    'slots',
      (
        select coalesce(
          jsonb_agg(to_jsonb(s) order by s.date, s.start_time),
          '[]'::jsonb
        )
        from (
          select
            islot.itinerary_slot_id,
            islot.itinerary_id,
            islot.itinerary_destination_id,
            islot.date,
            islot.start_time,
            islot.end_time,
            islot.primary_itinerary_activity_id,
            islot.created_by,
            islot.updated_by,
            islot.created_at,
            islot.updated_at,
            islot.deleted_at
          from public.itinerary_slot islot
          where islot.itinerary_id = _itinerary_id
            and islot.itinerary_destination_id = _itinerary_destination_id
            and islot.deleted_at is null
        ) s
      ),
    'slot_options',
      (
        select coalesce(
          jsonb_agg(to_jsonb(o) order by o.itinerary_slot_id, o.itinerary_slot_option_id),
          '[]'::jsonb
        )
        from (
          select
            opt.itinerary_slot_option_id,
            opt.itinerary_slot_id,
            opt.itinerary_activity_id,
            opt.created_by,
            opt.created_at
          from public.itinerary_slot_option opt
          join public.itinerary_slot islot on islot.itinerary_slot_id = opt.itinerary_slot_id
          where islot.itinerary_id = _itinerary_id
            and islot.itinerary_destination_id = _itinerary_destination_id
            and islot.deleted_at is null
        ) o
      ),
    'collaborators',
      (
        select coalesce(
          jsonb_agg(to_jsonb(x) order by x.user_id),
          '[]'::jsonb
        )
        from (
          select
            ic.itinerary_id,
            ic.user_id,
            ic.role,
            ic.invited_by,
            ic.created_at,
            ic.updated_at,
            to_jsonb(p) as profile
          from public.itinerary_collaborator ic
          left join public.profiles p on p.user_id = ic.user_id
          where ic.itinerary_id = _itinerary_id
            and ic.removed_at is null
        ) x
      ),
    'history',
      (
        select coalesce(
          jsonb_agg(to_jsonb(x) order by x.created_at desc),
          '[]'::jsonb
        )
        from (
          select
            l.itinerary_change_log_id,
            l.itinerary_id,
            l.itinerary_destination_id,
            l.actor_user_id,
            l.entity_type,
            l.entity_id,
            l.action,
            l.created_at
          from public.itinerary_change_log l
          where l.itinerary_id = _itinerary_id
          order by l.created_at desc
          limit 25
        ) x
      )
  );
$$;
