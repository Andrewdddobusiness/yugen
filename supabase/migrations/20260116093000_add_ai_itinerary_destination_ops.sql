-- AI itinerary assistant: destination-level scheduling ops.
-- Created: 2026-01-16

-- Shifts a destination's date range and (optionally) shifts its activities/custom events/slots by the same delta.
create or replace function public.ai_shift_destination_dates(
  _itinerary_id integer,
  _itinerary_destination_id integer,
  _new_from date,
  _new_to date,
  _shift_activities boolean default true
)
returns jsonb
language plpgsql
as $$
declare
  v_old_from date;
  v_delta_days integer;
  v_destination jsonb;
  v_shifted_activities integer := 0;
  v_shifted_custom_events integer := 0;
  v_shifted_slots integer := 0;
begin
  if _new_from is null or _new_to is null then
    raise exception 'new_from and new_to are required';
  end if;
  if _new_to < _new_from then
    raise exception 'to_date must be on or after from_date';
  end if;

  select d.from_date
    into v_old_from
  from public.itinerary_destination d
  where d.itinerary_id = _itinerary_id
    and d.itinerary_destination_id = _itinerary_destination_id;

  if v_old_from is null then
    raise exception 'Destination not found';
  end if;

  v_delta_days := _new_from - v_old_from;

  update public.itinerary_destination d
  set from_date = _new_from,
      to_date = _new_to,
      updated_at = timezone('utc'::text, now())
  where d.itinerary_id = _itinerary_id
    and d.itinerary_destination_id = _itinerary_destination_id
  returning to_jsonb(d) into v_destination;

  if v_destination is null then
    raise exception 'Destination update failed';
  end if;

  if _shift_activities and v_delta_days <> 0 then
    update public.itinerary_activity ia
    set date = ia.date + v_delta_days,
        updated_at = timezone('utc'::text, now())
    where ia.itinerary_id = _itinerary_id
      and ia.itinerary_destination_id = _itinerary_destination_id
      and ia.deleted_at is null
      and ia.date is not null;
    get diagnostics v_shifted_activities = ROW_COUNT;

    if exists (
      select 1 from pg_class c
      join pg_namespace n on n.oid = c.relnamespace
      where n.nspname = 'public' and c.relname = 'itinerary_custom_event'
    ) then
      update public.itinerary_custom_event e
      set date = e.date + v_delta_days,
          updated_at = timezone('utc'::text, now())
      where e.itinerary_id = _itinerary_id
        and e.itinerary_destination_id = _itinerary_destination_id
        and e.deleted_at is null
        and e.date is not null;
      get diagnostics v_shifted_custom_events = ROW_COUNT;
    end if;

    if exists (
      select 1 from pg_class c
      join pg_namespace n on n.oid = c.relnamespace
      where n.nspname = 'public' and c.relname = 'itinerary_slot'
    ) then
      update public.itinerary_slot s
      set date = s.date + v_delta_days,
          updated_at = timezone('utc'::text, now())
      where s.itinerary_id = _itinerary_id
        and s.itinerary_destination_id = _itinerary_destination_id
        and s.deleted_at is null
        and s.date is not null;
      get diagnostics v_shifted_slots = ROW_COUNT;
    end if;
  end if;

  return jsonb_build_object(
    'destination', v_destination,
    'deltaDays', v_delta_days,
    'shiftedActivities', v_shifted_activities,
    'shiftedCustomEvents', v_shifted_custom_events,
    'shiftedSlots', v_shifted_slots
  );
end;
$$;

grant execute on function public.ai_shift_destination_dates(integer, integer, date, date, boolean) to authenticated;

-- Inserts a new destination *after* an existing destination, shifting all subsequent destinations and their scheduled items.
create or replace function public.ai_insert_destination_after(
  _itinerary_id integer,
  _after_itinerary_destination_id integer,
  _city text,
  _country text,
  _duration_days integer
)
returns jsonb
language plpgsql
as $$
declare
  v_after public.itinerary_destination%rowtype;
  v_new_from date;
  v_new_to date;
  v_inserted jsonb;
  v_shifted_destination_ids integer[];
  v_shifted_destinations integer := 0;
  v_shifted_activities integer := 0;
  v_shifted_custom_events integer := 0;
  v_shifted_slots integer := 0;
begin
  if _duration_days is null or _duration_days < 1 or _duration_days > 60 then
    raise exception 'duration_days must be between 1 and 60';
  end if;
  if trim(coalesce(_city, '')) = '' or trim(coalesce(_country, '')) = '' then
    raise exception 'city and country are required';
  end if;

  select *
    into v_after
  from public.itinerary_destination d
  where d.itinerary_id = _itinerary_id
    and d.itinerary_destination_id = _after_itinerary_destination_id;

  if not found then
    raise exception 'Anchor destination not found';
  end if;

  v_new_from := v_after.to_date + 1;
  v_new_to := v_new_from + (_duration_days - 1);

  with shifted as (
    update public.itinerary_destination d
    set from_date = d.from_date + _duration_days,
        to_date = d.to_date + _duration_days,
        order_number = d.order_number + 1,
        updated_at = timezone('utc'::text, now())
    where d.itinerary_id = _itinerary_id
      and d.order_number > v_after.order_number
    returning d.itinerary_destination_id
  )
  select array_agg(itinerary_destination_id), count(*)
    into v_shifted_destination_ids, v_shifted_destinations
  from shifted;

  insert into public.itinerary_destination (
    itinerary_id,
    city,
    country,
    from_date,
    to_date,
    order_number,
    created_at,
    updated_at
  )
  values (
    _itinerary_id,
    trim(_city),
    trim(_country),
    v_new_from,
    v_new_to,
    v_after.order_number + 1,
    timezone('utc'::text, now()),
    timezone('utc'::text, now())
  )
  returning to_jsonb(itinerary_destination) into v_inserted;

  if v_inserted is null then
    raise exception 'Failed to insert destination';
  end if;

  if v_shifted_destination_ids is not null and array_length(v_shifted_destination_ids, 1) > 0 then
    update public.itinerary_activity ia
    set date = ia.date + _duration_days,
        updated_at = timezone('utc'::text, now())
    where ia.itinerary_id = _itinerary_id
      and ia.deleted_at is null
      and ia.date is not null
      and ia.itinerary_destination_id = any(v_shifted_destination_ids);
    get diagnostics v_shifted_activities = ROW_COUNT;

    if exists (
      select 1 from pg_class c
      join pg_namespace n on n.oid = c.relnamespace
      where n.nspname = 'public' and c.relname = 'itinerary_custom_event'
    ) then
      update public.itinerary_custom_event e
      set date = e.date + _duration_days,
          updated_at = timezone('utc'::text, now())
      where e.itinerary_id = _itinerary_id
        and e.deleted_at is null
        and e.date is not null
        and e.itinerary_destination_id = any(v_shifted_destination_ids);
      get diagnostics v_shifted_custom_events = ROW_COUNT;
    end if;

    if exists (
      select 1 from pg_class c
      join pg_namespace n on n.oid = c.relnamespace
      where n.nspname = 'public' and c.relname = 'itinerary_slot'
    ) then
      update public.itinerary_slot s
      set date = s.date + _duration_days,
          updated_at = timezone('utc'::text, now())
      where s.itinerary_id = _itinerary_id
        and s.deleted_at is null
        and s.date is not null
        and s.itinerary_destination_id = any(v_shifted_destination_ids);
      get diagnostics v_shifted_slots = ROW_COUNT;
    end if;
  end if;

  return jsonb_build_object(
    'inserted', v_inserted,
    'shiftedDestinationCount', v_shifted_destinations,
    'shiftedActivities', v_shifted_activities,
    'shiftedCustomEvents', v_shifted_custom_events,
    'shiftedSlots', v_shifted_slots,
    'newFrom', v_new_from,
    'newTo', v_new_to
  );
end;
$$;

grant execute on function public.ai_insert_destination_after(integer, integer, text, text, integer) to authenticated;
