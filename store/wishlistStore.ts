import { create } from "zustand";
import { devtools, persist } from "zustand/middleware";
import type { ActivityWithDetails } from "@/types/database";

export interface WishlistItem {
  searchHistoryId: number; // This is actually wishlist_id from user_wishlist table
  placeId: string;
  activity?: ActivityWithDetails;
  savedAt: Date;
  // Enhanced fields from user_wishlist table
  notes?: string;
  priority?: 'high' | 'medium' | 'low';
  categories?: string[];
  tags?: string[];
  visitStatus?: 'want_to_go' | 'been_there' | 'not_interested';
}

export interface WishlistStore {
  // State
  wishlistItems: WishlistItem[];
  selectedCategory: string;
  selectedPriority: string;
  searchQuery: string;
  isLoading: boolean;
  
  // Actions
  setWishlistItems: (items: WishlistItem[]) => void;
  addWishlistItem: (item: WishlistItem) => void;
  removeWishlistItem: (searchHistoryId: number) => void;
  updateWishlistItem: (searchHistoryId: number, updates: Partial<WishlistItem>) => void;
  clearWishlist: () => void;
  
  // Filters
  setSelectedCategory: (category: string) => void;
  setSelectedPriority: (priority: string) => void;
  setSearchQuery: (query: string) => void;
  
  // Utils
  setIsLoading: (loading: boolean) => void;
  getFilteredItems: () => WishlistItem[];
  getItemByPlaceId: (placeId: string) => WishlistItem | undefined;
  isInWishlist: (placeId: string) => boolean;
  getWishlistCount: () => number;
  getCategoryCounts: () => Record<string, number>;
}

export const useWishlistStore = create<WishlistStore>()(
  devtools(
    persist(
      (set, get) => ({
        // Initial state
        wishlistItems: [],
        selectedCategory: '',
        selectedPriority: '',
        searchQuery: '',
        isLoading: false,

        // Actions
        setWishlistItems: (items) => 
          set({ wishlistItems: items }, false, "setWishlistItems"),

        addWishlistItem: (item) =>
          set((state) => {
            const exists = state.wishlistItems.some(w => w.placeId === item.placeId);
            if (exists) {
              console.log('Item already exists in wishlist:', item.placeId);
              return state;
            }
            
            return {
              wishlistItems: [...state.wishlistItems, item]
            };
          }, false, "addWishlistItem"),

        removeWishlistItem: (searchHistoryId) =>
          set((state) => ({
            wishlistItems: state.wishlistItems.filter(
              item => item.searchHistoryId !== searchHistoryId
            )
          }), false, "removeWishlistItem"),

        updateWishlistItem: (searchHistoryId, updates) =>
          set((state) => ({
            wishlistItems: state.wishlistItems.map(item =>
              item.searchHistoryId === searchHistoryId
                ? { ...item, ...updates }
                : item
            )
          }), false, "updateWishlistItem"),

        clearWishlist: () =>
          set({ wishlistItems: [] }, false, "clearWishlist"),

        // Filters
        setSelectedCategory: (category) =>
          set({ selectedCategory: category }, false, "setSelectedCategory"),

        setSelectedPriority: (priority) =>
          set({ selectedPriority: priority }, false, "setSelectedPriority"),

        setSearchQuery: (query) =>
          set({ searchQuery: query }, false, "setSearchQuery"),

        // Utils
        setIsLoading: (loading) =>
          set({ isLoading: loading }, false, "setIsLoading"),

        getFilteredItems: () => {
          const { wishlistItems, selectedCategory, selectedPriority, searchQuery } = get();
          
          return wishlistItems.filter(item => {
            // Category filter
            if (selectedCategory) {
              const activityTypes = item.activity?.types || [];
              const categories = item.categories || [];
              if (!activityTypes.includes(selectedCategory) && !categories.includes(selectedCategory)) {
                return false;
              }
            }

            // Priority filter
            if (selectedPriority && item.priority !== selectedPriority) {
              return false;
            }

            // Search query filter
            if (searchQuery) {
              const query = searchQuery.toLowerCase();
              const name = item.activity?.name?.toLowerCase() || '';
              const address = item.activity?.address?.toLowerCase() || '';
              const notes = item.notes?.toLowerCase() || '';
              
              if (!name.includes(query) && !address.includes(query) && !notes.includes(query)) {
                return false;
              }
            }

            return true;
          });
        },

        getItemByPlaceId: (placeId) => {
          const { wishlistItems } = get();
          return wishlistItems.find(item => item.placeId === placeId);
        },

        isInWishlist: (placeId) => {
          const { wishlistItems } = get();
          return wishlistItems.some(item => item.placeId === placeId);
        },

        getWishlistCount: () => {
          const { wishlistItems } = get();
          return wishlistItems.length;
        },

        getCategoryCounts: () => {
          const { wishlistItems } = get();
          const counts: Record<string, number> = {};
          
          wishlistItems.forEach(item => {
            const types = item.activity?.types || [];
            const categories = item.categories || [];
            
            [...types, ...categories].forEach(category => {
              counts[category] = (counts[category] || 0) + 1;
            });
          });
          
          return counts;
        },
      }),
      {
        name: "wishlist-storage",
        partialize: (state) => ({
          // Only persist these fields
          wishlistItems: state.wishlistItems,
          selectedCategory: state.selectedCategory,
          selectedPriority: state.selectedPriority,
        }),
      }
    ),
    { name: "WishlistStore" }
  )
);