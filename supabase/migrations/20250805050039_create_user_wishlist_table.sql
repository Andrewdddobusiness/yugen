-- Create proper user wishlist table
-- This replaces the flawed approach of using itinerary_search_history for wishlist
-- Creates a user-centric wishlist system as per UX-004 requirements

-- Create the user wishlist table
CREATE TABLE IF NOT EXISTS public.user_wishlist (
  wishlist_id serial PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  place_id text NOT NULL, -- Google Places ID
  notes text,
  priority integer DEFAULT 3 CHECK (priority >= 1 AND priority <= 5),
  categories text[] DEFAULT '{}',
  tags text[] DEFAULT '{}',
  visit_status text DEFAULT 'want_to_go' CHECK (visit_status IN ('want_to_go', 'been_there', 'not_interested')),
  saved_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  
  -- Prevent duplicate saves per user
  UNIQUE(user_id, place_id)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_user_wishlist_user_id ON public.user_wishlist(user_id);
CREATE INDEX IF NOT EXISTS idx_user_wishlist_place_id ON public.user_wishlist(place_id);
CREATE INDEX IF NOT EXISTS idx_user_wishlist_priority ON public.user_wishlist(priority);
CREATE INDEX IF NOT EXISTS idx_user_wishlist_visit_status ON public.user_wishlist(visit_status);
CREATE INDEX IF NOT EXISTS idx_user_wishlist_saved_at ON public.user_wishlist(saved_at DESC);

-- Enable Row Level Security (RLS)
ALTER TABLE public.user_wishlist ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Users can only see and modify their own wishlist items
CREATE POLICY "Users can view own wishlist items" ON public.user_wishlist
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own wishlist items" ON public.user_wishlist
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own wishlist items" ON public.user_wishlist
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own wishlist items" ON public.user_wishlist
  FOR DELETE USING (auth.uid() = user_id);

-- Create function to automatically update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_user_wishlist_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = timezone('utc'::text, now());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update updated_at
DROP TRIGGER IF EXISTS trigger_update_user_wishlist_updated_at ON public.user_wishlist;
CREATE TRIGGER trigger_update_user_wishlist_updated_at
  BEFORE UPDATE ON public.user_wishlist
  FOR EACH ROW
  EXECUTE FUNCTION update_user_wishlist_updated_at();;
