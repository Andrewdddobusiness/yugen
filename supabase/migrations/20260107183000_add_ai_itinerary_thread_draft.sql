-- Store a per-user draft plan for the itinerary assistant (iteratively amendable until applied/dismissed).

alter table public.ai_itinerary_thread
  add column if not exists draft jsonb;

