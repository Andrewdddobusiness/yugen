-- Allow 'import' mode for AI itinerary telemetry runs
-- Created: 2026-01-12

alter table public.ai_itinerary_run
  drop constraint if exists ai_itinerary_run_mode_check;

alter table public.ai_itinerary_run
  add constraint ai_itinerary_run_mode_check
  check (mode in ('plan', 'import', 'apply', 'history'));

