"use client";

import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useWishlistStore } from '@/store/wishlistStore';
import { getUserWishlist } from '@/actions/supabase/userWishlist';
import type { UserWishlistItemWithActivity } from '@/types/userWishlist';

/**
 * Hook to manage user wishlist data synchronization between server and client state
 * Automatically loads global user wishlist from database and keeps store in sync
 * This is user-centric, not itinerary-specific
 */
export function useWishlist() {
  const queryClient = useQueryClient();
  const { setWishlistItems, setIsLoading } = useWishlistStore();

  // Query to fetch user's global wishlist from database
  const {
    data: wishlistData,
    isLoading,
    error,
    refetch
  } = useQuery({
    queryKey: ['userWishlist'], // Global user wishlist, no itinerary dependency
    queryFn: async () => {
      const result = await getUserWishlist();
      
      if (!result.success) {
        throw new Error(result.error?.message || 'Failed to fetch wishlist');
      }
      
      return result.data;
    },
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false,
    refetchOnReconnect: true,
    retry: 1,
  });

  // Sync database data with local store
  useEffect(() => {
    setIsLoading(isLoading);
  }, [isLoading, setIsLoading]);

  useEffect(() => {
    if (wishlistData && Array.isArray(wishlistData)) {
      // Convert database format to store format
      const storeItems = wishlistData.map((item: UserWishlistItemWithActivity) => ({
        searchHistoryId: item.wishlist_id, // Use wishlist_id as the store ID
        placeId: item.place_id,
        activity: item.activity,
        savedAt: new Date(item.saved_at),
        notes: item.notes,
        priority: item.priority === 1 ? 'high' as const : 
                 item.priority === 2 ? 'medium' as const : 
                 item.priority >= 4 ? 'low' as const : 'medium' as const,
        categories: item.categories || [],
        tags: item.tags || [],
        visitStatus: item.visit_status as 'want_to_go' | 'been_there' | 'not_interested'
      }));

      setWishlistItems(storeItems);
    }
  }, [wishlistData, setWishlistItems]);

  // Helper function to invalidate and refetch wishlist
  const invalidateWishlist = () => {
    queryClient.invalidateQueries({ 
      queryKey: ['userWishlist'] 
    });
  };

  // Helper function to force refetch
  const refetchWishlist = () => {
    return refetch();
  };

  return {
    data: wishlistData,
    isLoading,
    error,
    refetch: refetchWishlist,
    invalidate: invalidateWishlist
  };
}