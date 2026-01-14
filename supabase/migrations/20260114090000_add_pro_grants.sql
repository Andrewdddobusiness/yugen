-- Pro access overrides (manual grants).
-- Allows specific users to access Pro features without a paid Stripe subscription.

create table if not exists public.pro_grants (
  user_id uuid primary key references auth.users(id) on delete cascade,
  enabled boolean not null default true,
  note text,
  expires_at timestamp with time zone,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create index if not exists idx_pro_grants_enabled_expires
  on public.pro_grants(enabled, expires_at);

alter table public.pro_grants enable row level security;

drop policy if exists "Users can view own pro grants" on public.pro_grants;
create policy "Users can view own pro grants" on public.pro_grants
  for select using (auth.uid() = user_id);

drop trigger if exists set_timestamp_pro_grants on public.pro_grants;
create trigger set_timestamp_pro_grants
  before update on public.pro_grants
  for each row execute function public.handle_updated_at();

