-- Custom calendar events/notes for itinerary scheduling.
-- Allows users to add arbitrary timed blocks (e.g., "Hotel check-in", "Get SIM card")
-- that appear in calendar + table views and can be dragged/resized.

create table if not exists public.itinerary_custom_event (
  itinerary_custom_event_id bigserial primary key,
  itinerary_id integer references public.itinerary(itinerary_id) on delete cascade not null,
  itinerary_destination_id integer references public.itinerary_destination(itinerary_destination_id) on delete set null,
  title text not null,
  notes text,
  date date,
  start_time time,
  end_time time,
  color_hex text,
  created_by uuid references auth.users(id) on delete set null,
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  deleted_at timestamp with time zone
);

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'itinerary_custom_event_time_order_check'
  ) then
    alter table public.itinerary_custom_event
      add constraint itinerary_custom_event_time_order_check
      check (
        start_time is null
        or end_time is null
        or end_time > start_time
      );
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'itinerary_custom_event_color_hex_check'
  ) then
    alter table public.itinerary_custom_event
      add constraint itinerary_custom_event_color_hex_check
      check (
        color_hex is null
        or color_hex ~ '^#[0-9a-fA-F]{6}$'
      );
  end if;
end $$;

create index if not exists idx_itinerary_custom_event_itinerary_id
  on public.itinerary_custom_event(itinerary_id);
create index if not exists idx_itinerary_custom_event_date
  on public.itinerary_custom_event(date);
create index if not exists idx_itinerary_custom_event_deleted_at
  on public.itinerary_custom_event(deleted_at);

-- updated_at helper trigger
drop trigger if exists set_timestamp_itinerary_custom_event on public.itinerary_custom_event;
create trigger set_timestamp_itinerary_custom_event
  before update on public.itinerary_custom_event
  for each row execute function public.handle_updated_at();

-- actor columns helper trigger (reuses the itinerary activity actor function)
drop trigger if exists set_itinerary_custom_event_actor on public.itinerary_custom_event;
create trigger set_itinerary_custom_event_actor
  before insert or update on public.itinerary_custom_event
  for each row execute function public.set_itinerary_activity_actor();

-- RLS
alter table public.itinerary_custom_event enable row level security;

drop policy if exists "Users can view itinerary custom events" on public.itinerary_custom_event;
create policy "Users can view itinerary custom events" on public.itinerary_custom_event
  for select using (
    exists (
      select 1
      from public.itinerary i
      where i.itinerary_id = itinerary_custom_event.itinerary_id
        and i.deleted_at is null
        and (
          i.user_id = auth.uid()
          or i.is_public = true
          or public.is_itinerary_collaborator(i.itinerary_id)
        )
    )
  );

drop policy if exists "Users can insert itinerary custom events" on public.itinerary_custom_event;
create policy "Users can insert itinerary custom events" on public.itinerary_custom_event
  for insert with check (
    exists (
      select 1
      from public.itinerary i
      where i.itinerary_id = itinerary_custom_event.itinerary_id
        and i.deleted_at is null
        and (
          i.user_id = auth.uid()
          or public.is_itinerary_editor(i.itinerary_id)
        )
    )
  );

drop policy if exists "Users can update itinerary custom events" on public.itinerary_custom_event;
create policy "Users can update itinerary custom events" on public.itinerary_custom_event
  for update using (
    exists (
      select 1
      from public.itinerary i
      where i.itinerary_id = itinerary_custom_event.itinerary_id
        and i.deleted_at is null
        and (
          i.user_id = auth.uid()
          or public.is_itinerary_editor(i.itinerary_id)
        )
    )
  );

drop policy if exists "Users can delete itinerary custom events" on public.itinerary_custom_event;
create policy "Users can delete itinerary custom events" on public.itinerary_custom_event
  for delete using (
    exists (
      select 1
      from public.itinerary i
      where i.itinerary_id = itinerary_custom_event.itinerary_id
        and i.deleted_at is null
        and (
          i.user_id = auth.uid()
          or public.is_itinerary_editor(i.itinerary_id)
        )
    )
  );

