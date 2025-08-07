"use client";

import { useEffect, useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useWishlistStore } from "@/store/wishlistStore";
import { getUserWishlist } from "@/actions/supabase/userWishlist";
import type { UserWishlistItemWithActivity } from "@/types/userWishlist";

/**
 * Simplified hook to manage user wishlist data synchronization
 * Only call this once in the app to prevent conflicts
 */
export function useWishlist() {
  const queryClient = useQueryClient();

  // Simple query without effects that modify store
  const {
    data: wishlistData,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ["userWishlist"],
    queryFn: async () => {
      const result = await getUserWishlist();
      if (!result.success) {
        throw new Error(result.error?.message || "Failed to fetch wishlist");
      }
      return result.data;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    retry: 1,
  });

  // Helper function to invalidate and refetch wishlist
  const invalidateWishlist = () => {
    queryClient.invalidateQueries({
      queryKey: ["userWishlist"],
    });
  };

  return {
    data: wishlistData,
    isLoading,
    error,
    refetch,
    invalidate: invalidateWishlist,
  };
}

/**
 * Hook to initialize wishlist store with data from server
 * Should only be called once in the app root
 */
export function useWishlistInitializer() {
  const { setWishlistItems, setIsLoading } = useWishlistStore();
  const { data: wishlistData, isLoading } = useWishlist();

  // Memoize the setter to prevent infinite loops
  const updateWishlistItems = useCallback((data: UserWishlistItemWithActivity[]) => {
    const storeItems = data.map((item: UserWishlistItemWithActivity) => ({
      searchHistoryId: item.wishlist_id,
      placeId: item.place_id,
      activity: item.activity,
      savedAt: new Date(item.saved_at),
      notes: item.notes,
      priority:
        item.priority === 1
          ? ("high" as const)
          : item.priority === 2
          ? ("medium" as const)
          : item.priority >= 4
          ? ("low" as const)
          : ("medium" as const),
      categories: item.categories || [],
      tags: item.tags || [],
      visitStatus: item.visit_status as "want_to_go" | "been_there" | "not_interested",
    }));

    setWishlistItems(storeItems);
  }, [setWishlistItems]);

  // Sync server data to store - only when wishlistData changes
  useEffect(() => {
    if (wishlistData && Array.isArray(wishlistData)) {
      updateWishlistItems(wishlistData);
    }
  }, [wishlistData, updateWishlistItems]);

  useEffect(() => {
    setIsLoading(isLoading);
  }, [isLoading, setIsLoading]);
}
