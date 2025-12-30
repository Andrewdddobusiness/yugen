-- Yugi Travel Itinerary Application - Complete Database Schema
-- Created: 2025-08-01
-- Migration version: 20250801031245
-- Description: Creates all tables, indexes, RLS policies, and triggers for the Yugi app

-- Enable necessary extensions
create extension if not exists "uuid-ossp";

-- Create tables for the Yugi travel itinerary application

-- Users table (extends Supabase auth.users)
create table if not exists public.profiles (
  user_id uuid references auth.users(id) on delete cascade primary key,
  display_name text,
  avatar_url text,
  timezone text default 'UTC',
  preferences jsonb default '{}',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Countries table for location data
create table if not exists public.countries (
  country_id serial primary key,
  country_name text not null unique,
  country_code text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Cities table for destination cities
create table if not exists public.cities (
  city_id serial primary key,
  city_name text not null,
  city_description text,
  country_id integer references public.countries(country_id) on delete cascade,
  broadband_speed text,
  mobile_speed text,
  plugs text,
  voltage text,
  power_standard text,
  frequency text,
  emergency_fire text,
  emergency_police text,
  emergency_ambulance text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique(city_name, country_id)
);

-- Main itinerary table
create table if not exists public.itinerary (
  itinerary_id serial primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  title text,
  description text,
  adults integer default 1,
  kids integer default 0,
  budget numeric(10,2),
  currency text default 'USD',
  is_public boolean default false,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  deleted_at timestamp with time zone
);

-- Itinerary destinations (supports multiple destinations per itinerary)
create table if not exists public.itinerary_destination (
  itinerary_destination_id serial primary key,
  itinerary_id integer references public.itinerary(itinerary_id) on delete cascade not null,
  destination_city_id integer references public.cities(city_id),
  city text not null,
  country text not null,
  from_date date not null,
  to_date date not null,
  order_number integer default 1,
  accommodation_notes text,
  transportation_notes text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Activities/Places table (master list of all places/activities)
create table if not exists public.activity (
  activity_id serial primary key,
  place_id text unique not null, -- Google Places ID
  name text not null,
  coordinates point, -- PostgreSQL point type for lat/lng
  types text[] default '{}', -- Array of Google Places types
  price_level text,
  address text,
  rating numeric(2,1),
  description text,
  google_maps_url text,
  website_url text,
  photo_names text[] default '{}', -- Array of photo references
  duration interval, -- Suggested visit duration
  phone_number text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Reviews for activities
create table if not exists public.review (
  review_id serial primary key,
  activity_id integer references public.activity(activity_id) on delete cascade not null,
  description text,
  rating numeric(2,1),
  author text,
  uri text,
  publish_date_time timestamp with time zone,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Opening hours for activities
create table if not exists public.open_hours (
  open_hours_id serial primary key,
  activity_id integer references public.activity(activity_id) on delete cascade not null,
  day integer not null, -- 0 = Sunday, 1 = Monday, etc.
  open_hour integer,
  open_minute integer,
  close_hour integer,
  close_minute integer,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Junction table for activities scheduled in itineraries
create table if not exists public.itinerary_activity (
  itinerary_activity_id serial primary key,
  itinerary_id integer references public.itinerary(itinerary_id) on delete cascade not null,
  itinerary_destination_id integer references public.itinerary_destination(itinerary_destination_id) on delete cascade not null,
  activity_id integer references public.activity(activity_id) on delete cascade not null,
  date date,
  start_time time,
  end_time time,
  notes text,
  is_booked boolean default false,
  booking_reference text,
  cost numeric(10,2),
  order_in_day integer,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  deleted_at timestamp with time zone
);

-- Search history to track user's place searches per itinerary
create table if not exists public.itinerary_search_history (
  search_history_id serial primary key,
  itinerary_id integer references public.itinerary(itinerary_id) on delete cascade not null,
  itinerary_destination_id integer references public.itinerary_destination(itinerary_destination_id) on delete cascade not null,
  place_id text not null, -- Google Places ID
  searched_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- =====================================================
-- INDEXES FOR PERFORMANCE
-- =====================================================

-- Create indexes for better performance
create index if not exists idx_itinerary_user_id on public.itinerary(user_id);
create index if not exists idx_itinerary_deleted_at on public.itinerary(deleted_at);
create index if not exists idx_itinerary_destination_itinerary_id on public.itinerary_destination(itinerary_id);
create index if not exists idx_activity_place_id on public.activity(place_id);
create index if not exists idx_itinerary_activity_itinerary_id on public.itinerary_activity(itinerary_id);
create index if not exists idx_itinerary_activity_date on public.itinerary_activity(date);
create index if not exists idx_itinerary_activity_deleted_at on public.itinerary_activity(deleted_at);
create index if not exists idx_search_history_itinerary_id on public.itinerary_search_history(itinerary_id);

-- =====================================================
-- ROW LEVEL SECURITY (RLS)
-- =====================================================

-- Enable Row Level Security (RLS)
alter table public.profiles enable row level security;
alter table public.itinerary enable row level security;
alter table public.itinerary_destination enable row level security;
alter table public.itinerary_activity enable row level security;
alter table public.itinerary_search_history enable row level security;

-- RLS Policies

-- Profiles: Users can only see and edit their own profile
create policy "Users can view own profile" on public.profiles
  for select using (auth.uid() = user_id);

create policy "Users can update own profile" on public.profiles
  for update using (auth.uid() = user_id);

create policy "Users can insert own profile" on public.profiles
  for insert with check (auth.uid() = user_id);

-- Itineraries: Users can only see and edit their own itineraries (or public ones for viewing)
create policy "Users can view own itineraries" on public.itinerary
  for select using (auth.uid() = user_id or is_public = true);

create policy "Users can insert own itineraries" on public.itinerary
  for insert with check (auth.uid() = user_id);

create policy "Users can update own itineraries" on public.itinerary
  for update using (auth.uid() = user_id);

create policy "Users can delete own itineraries" on public.itinerary
  for delete using (auth.uid() = user_id);

-- Itinerary destinations: Users can only access destinations for their own itineraries
create policy "Users can view own itinerary destinations" on public.itinerary_destination
  for select using (
    exists (
      select 1 from public.itinerary i 
      where i.itinerary_id = itinerary_destination.itinerary_id 
      and (i.user_id = auth.uid() or i.is_public = true)
    )
  );

create policy "Users can insert own itinerary destinations" on public.itinerary_destination
  for insert with check (
    exists (
      select 1 from public.itinerary i 
      where i.itinerary_id = itinerary_destination.itinerary_id 
      and i.user_id = auth.uid()
    )
  );

create policy "Users can update own itinerary destinations" on public.itinerary_destination
  for update using (
    exists (
      select 1 from public.itinerary i 
      where i.itinerary_id = itinerary_destination.itinerary_id 
      and i.user_id = auth.uid()
    )
  );

create policy "Users can delete own itinerary destinations" on public.itinerary_destination
  for delete using (
    exists (
      select 1 from public.itinerary i 
      where i.itinerary_id = itinerary_destination.itinerary_id 
      and i.user_id = auth.uid()
    )
  );

-- Itinerary activities: Users can only access activities for their own itineraries
create policy "Users can view own itinerary activities" on public.itinerary_activity
  for select using (
    exists (
      select 1 from public.itinerary i 
      where i.itinerary_id = itinerary_activity.itinerary_id 
      and (i.user_id = auth.uid() or i.is_public = true)
    )
  );

create policy "Users can insert own itinerary activities" on public.itinerary_activity
  for insert with check (
    exists (
      select 1 from public.itinerary i 
      where i.itinerary_id = itinerary_activity.itinerary_id 
      and i.user_id = auth.uid()
    )
  );

create policy "Users can update own itinerary activities" on public.itinerary_activity
  for update using (
    exists (
      select 1 from public.itinerary i 
      where i.itinerary_id = itinerary_activity.itinerary_id 
      and i.user_id = auth.uid()
    )
  );

create policy "Users can delete own itinerary activities" on public.itinerary_activity
  for delete using (
    exists (
      select 1 from public.itinerary i 
      where i.itinerary_id = itinerary_activity.itinerary_id 
      and i.user_id = auth.uid()
    )
  );

-- Search history: Users can only access their own search history
create policy "Users can view own search history" on public.itinerary_search_history
  for select using (
    exists (
      select 1 from public.itinerary i 
      where i.itinerary_id = itinerary_search_history.itinerary_id 
      and i.user_id = auth.uid()
    )
  );

create policy "Users can insert own search history" on public.itinerary_search_history
  for insert with check (
    exists (
      select 1 from public.itinerary i 
      where i.itinerary_id = itinerary_search_history.itinerary_id 
      and i.user_id = auth.uid()
    )
  );

create policy "Users can delete own search history" on public.itinerary_search_history
  for delete using (
    exists (
      select 1 from public.itinerary i 
      where i.itinerary_id = itinerary_search_history.itinerary_id 
      and i.user_id = auth.uid()
    )
  );

-- Activities, reviews, and open_hours are public read-only tables
-- No RLS needed as they contain public place information

-- =====================================================
-- TRIGGERS AND FUNCTIONS
-- =====================================================

-- Functions for automatic timestamp updates
create or replace function public.handle_updated_at()
returns trigger as $$
begin
  new.updated_at = timezone('utc'::text, now());
  return new;
end;
$$ language plpgsql;

-- Create triggers for updated_at columns
create trigger set_timestamp_profiles
  before update on public.profiles
  for each row execute function public.handle_updated_at();

create trigger set_timestamp_itinerary
  before update on public.itinerary
  for each row execute function public.handle_updated_at();

create trigger set_timestamp_itinerary_destination
  before update on public.itinerary_destination
  for each row execute function public.handle_updated_at();

create trigger set_timestamp_activity
  before update on public.activity
  for each row execute function public.handle_updated_at();

create trigger set_timestamp_itinerary_activity
  before update on public.itinerary_activity
  for each row execute function public.handle_updated_at();

-- =====================================================
-- COMMENTS FOR DOCUMENTATION
-- =====================================================

-- Add helpful comments to tables
comment on table public.profiles is 'User profile extensions for auth.users';
comment on table public.countries is 'Reference table for countries';
comment on table public.cities is 'Reference table for cities with travel information';
comment on table public.itinerary is 'Main itinerary table - each user can have multiple itineraries';
comment on table public.itinerary_destination is 'Destinations within an itinerary - supports multi-city trips';
comment on table public.activity is 'Master table of all activities/places from Google Places API';
comment on table public.review is 'Reviews for activities from Google Places API';
comment on table public.open_hours is 'Opening hours for activities';
comment on table public.itinerary_activity is 'Junction table - activities scheduled in specific itineraries';
comment on table public.itinerary_search_history is 'Track user searches to build a wishlist per itinerary';

-- Add comments to key columns
comment on column public.activity.place_id is 'Google Places API place_id - unique identifier';
comment on column public.activity.coordinates is 'PostgreSQL point type storing lat,lng coordinates';
comment on column public.activity.types is 'Array of Google Places types (restaurant, tourist_attraction, etc.)';
comment on column public.open_hours.day is 'Day of week: 0=Sunday, 1=Monday, ..., 6=Saturday';
comment on column public.itinerary_activity.deleted_at is 'Soft delete timestamp - null means active';
comment on column public.itinerary.is_public is 'Whether itinerary can be viewed by other users';
