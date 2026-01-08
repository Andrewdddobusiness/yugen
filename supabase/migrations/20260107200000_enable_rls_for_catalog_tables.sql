-- Enable RLS for global catalog/cache tables that previously relied on default grants.
-- These tables contain public place/location data; writes should be performed server-side (service role).

alter table if exists public.countries enable row level security;
alter table if exists public.cities enable row level security;
alter table if exists public.activity enable row level security;
alter table if exists public.review enable row level security;
alter table if exists public.open_hours enable row level security;

-- Countries
drop policy if exists "Public read countries" on public.countries;
create policy "Public read countries" on public.countries
  for select using (true);

-- Cities
drop policy if exists "Public read cities" on public.cities;
create policy "Public read cities" on public.cities
  for select using (true);

-- Activities
drop policy if exists "Public read activities" on public.activity;
create policy "Public read activities" on public.activity
  for select using (true);

-- Reviews
drop policy if exists "Public read reviews" on public.review;
create policy "Public read reviews" on public.review
  for select using (true);

-- Open hours
drop policy if exists "Public read open hours" on public.open_hours;
create policy "Public read open hours" on public.open_hours
  for select using (true);

