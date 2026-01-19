-- Add a structured kind for common trip blocks (flight / hotel check-in/out).
-- Enables consistent UI rendering and assistant context without parsing titles.

alter table public.itinerary_custom_event
  add column if not exists kind text not null default 'custom';

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'itinerary_custom_event_kind_check'
  ) then
    alter table public.itinerary_custom_event
      add constraint itinerary_custom_event_kind_check
      check (kind in ('custom','flight','hotel_check_in','hotel_check_out'));
  end if;
end $$;

