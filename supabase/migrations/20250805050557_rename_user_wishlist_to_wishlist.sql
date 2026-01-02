-- Rename user_wishlist table to wishlist
ALTER TABLE public.user_wishlist RENAME TO wishlist;

-- Update sequence name
ALTER SEQUENCE public.user_wishlist_wishlist_id_seq RENAME TO wishlist_wishlist_id_seq;

-- Update indexes
ALTER INDEX IF EXISTS idx_user_wishlist_user_id RENAME TO idx_wishlist_user_id;
ALTER INDEX IF EXISTS idx_user_wishlist_place_id RENAME TO idx_wishlist_place_id;
ALTER INDEX IF EXISTS idx_user_wishlist_priority RENAME TO idx_wishlist_priority;
ALTER INDEX IF EXISTS idx_user_wishlist_visit_status RENAME TO idx_wishlist_visit_status;
ALTER INDEX IF EXISTS idx_user_wishlist_saved_at RENAME TO idx_wishlist_saved_at;

-- Update RLS policies
DROP POLICY IF EXISTS "Users can view own wishlist items" ON public.wishlist;
DROP POLICY IF EXISTS "Users can insert own wishlist items" ON public.wishlist;
DROP POLICY IF EXISTS "Users can update own wishlist items" ON public.wishlist;
DROP POLICY IF EXISTS "Users can delete own wishlist items" ON public.wishlist;

CREATE POLICY "Users can view own wishlist items" ON public.wishlist
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own wishlist items" ON public.wishlist
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own wishlist items" ON public.wishlist
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own wishlist items" ON public.wishlist
  FOR DELETE USING (auth.uid() = user_id);

-- Update trigger function and trigger names
DROP TRIGGER IF EXISTS trigger_update_user_wishlist_updated_at ON public.wishlist;
DROP FUNCTION IF EXISTS update_user_wishlist_updated_at();

CREATE OR REPLACE FUNCTION update_wishlist_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = timezone('utc'::text, now());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_wishlist_updated_at
  BEFORE UPDATE ON public.wishlist
  FOR EACH ROW
  EXECUTE FUNCTION update_wishlist_updated_at();;
