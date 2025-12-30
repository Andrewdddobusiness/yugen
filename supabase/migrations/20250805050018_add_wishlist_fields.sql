-- Add wishlist-specific fields to search history table
-- Migration version: 20250805050018
-- This migration enhances the search history table to properly support wishlist functionality

-- Add new columns for wishlist functionality
ALTER TABLE public.itinerary_search_history 
ADD COLUMN IF NOT EXISTS is_saved_to_wishlist boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS notes text,
ADD COLUMN IF NOT EXISTS priority integer DEFAULT 3 CHECK (priority >= 1 AND priority <= 5),
ADD COLUMN IF NOT EXISTS categories text[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS tags text[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS visit_status text DEFAULT 'want_to_go' CHECK (visit_status IN ('want_to_go', 'been_there', 'not_interested')),
ADD COLUMN IF NOT EXISTS updated_at timestamp with time zone DEFAULT timezone('utc'::text, now());

-- Create index for better wishlist query performance
CREATE INDEX IF NOT EXISTS idx_search_history_wishlist 
ON public.itinerary_search_history(is_saved_to_wishlist) 
WHERE is_saved_to_wishlist = true;

-- Create index for priority filtering
CREATE INDEX IF NOT EXISTS idx_search_history_priority 
ON public.itinerary_search_history(priority) 
WHERE is_saved_to_wishlist = true;

-- Update existing records to have is_saved_to_wishlist = true (assuming existing records are wishlist items)
UPDATE public.itinerary_search_history 
SET is_saved_to_wishlist = true 
WHERE is_saved_to_wishlist IS NULL OR is_saved_to_wishlist = false;

-- Create function to automatically update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_search_history_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = timezone('utc'::text, now());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update updated_at
DROP TRIGGER IF EXISTS trigger_update_search_history_updated_at ON public.itinerary_search_history;
CREATE TRIGGER trigger_update_search_history_updated_at
  BEFORE UPDATE ON public.itinerary_search_history
  FOR EACH ROW
  EXECUTE FUNCTION update_search_history_updated_at();
