-- Builder bootstrap RPC (batch critical-path reads into one round-trip)
-- Created: 2025-12-31

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

