"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/utils/supabase/server";
import { 
  addToWishlistSchema,
  type AddToWishlistData
} from "@/schemas/activitySchema";
import type { 
  ItinerarySearchHistory,
  ActivityWithDetails,
  DatabaseResponse 
} from "@/types/database";

/**
 * Adds a place to the user's wishlist for a specific itinerary
 */
export async function addToWishlist(data: AddToWishlistData): Promise<DatabaseResponse<ItinerarySearchHistory>> {
  const supabase = createClient();

  try {
    // Validate input data
    const validatedData = addToWishlistSchema.parse(data);

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      return {
        success: false,
        error: { message: "User not authenticated" }
      };
    }

    if (validatedData.itinerary_id) {
      // Verify user owns the itinerary
      const { data: itinerary, error: checkError } = await supabase
        .from("itinerary")
        .select("user_id")
        .eq("itinerary_id", validatedData.itinerary_id)
        .single();

      if (checkError || itinerary?.user_id !== user.id) {
        return {
          success: false,
          error: { message: "Itinerary not found or access denied" }
        };
      }

      // Get the first destination for this itinerary
      const { data: destination, error: destError } = await supabase
        .from("itinerary_destination")
        .select("itinerary_destination_id")
        .eq("itinerary_id", validatedData.itinerary_id)
        .order("order_number")
        .limit(1)
        .single();

      if (destError || !destination) {
        return {
          success: false,
          error: { message: "No destination found for this itinerary" }
        };
      }

      // Check if already in wishlist
      const { data: existing, error: existingError } = await supabase
        .from("itinerary_search_history")
        .select("search_history_id, is_saved_to_wishlist")
        .eq("itinerary_id", validatedData.itinerary_id)
        .eq("itinerary_destination_id", destination.itinerary_destination_id)
        .eq("place_id", validatedData.place_id)
        .single();

      if (!existingError && existing) {
        if (existing.is_saved_to_wishlist) {
          return {
            success: false,
            error: { message: "Place already in wishlist" }
          };
        } else {
          // Update existing record to mark as saved to wishlist
          const { data: updatedItem, error: updateError } = await supabase
            .from("itinerary_search_history")
            .update({ 
              is_saved_to_wishlist: true,
              priority: validatedData.priority || 3,
              notes: validatedData.notes || null
            })
            .eq("search_history_id", existing.search_history_id)
            .select()
            .single();

          if (updateError) {
            return {
              success: false,
              error: { 
                message: "Failed to add to wishlist",
                code: updateError.code,
                details: updateError
              }
            };
          }

          revalidatePath(`/itinerary/${validatedData.itinerary_id}`);

          return {
            success: true,
            data: updatedItem
          };
        }
      }

      // Add to wishlist
      const { data: wishlistItem, error } = await supabase
        .from("itinerary_search_history")
        .insert({
          itinerary_id: validatedData.itinerary_id,
          itinerary_destination_id: destination.itinerary_destination_id,
          place_id: validatedData.place_id,
          is_saved_to_wishlist: true,
          priority: validatedData.priority || 3,
          notes: validatedData.notes || null,
        })
        .select()
        .single();

      if (error) {
        return {
          success: false,
          error: { 
            message: "Failed to add to wishlist",
            code: error.code,
            details: error
          }
        };
      }

      revalidatePath(`/itinerary/${validatedData.itinerary_id}`);

      return {
        success: true,
        data: wishlistItem
      };
    } else {
      // For now, we'll use the search history table even without a specific itinerary
      // This could be extended to have a separate user wishlist table
      return {
        success: false,
        error: { message: "Itinerary ID is required for wishlist functionality" }
      };
    }

  } catch (error: any) {
    console.error("Error in addToWishlist:", error);
    return {
      success: false,
      error: { 
        message: error.message || "An unexpected error occurred",
        details: error
      }
    };
  }
}

/**
 * Removes a place from the wishlist
 */
export async function removeFromWishlist(searchHistoryId: number): Promise<DatabaseResponse<null>> {
  const supabase = createClient();

  try {
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      return {
        success: false,
        error: { message: "User not authenticated" }
      };
    }

    // Verify user owns the itinerary
    const { data: wishlistItem, error: checkError } = await supabase
      .from("itinerary_search_history")
      .select(`
        itinerary_id,
        itinerary!inner(user_id)
      `)
      .eq("search_history_id", searchHistoryId)
      .single();

    if (checkError || wishlistItem?.itinerary?.user_id !== user.id) {
      return {
        success: false,
        error: { message: "Wishlist item not found or access denied" }
      };
    }

    // Instead of deleting, mark as not saved to wishlist (soft delete for wishlist)
    const { error } = await supabase
      .from("itinerary_search_history")
      .update({ 
        is_saved_to_wishlist: false,
        notes: null,
        priority: 3
      })
      .eq("search_history_id", searchHistoryId);

    if (error) {
      return {
        success: false,
        error: { 
          message: "Failed to remove from wishlist",
          code: error.code,
          details: error
        }
      };
    }

    revalidatePath(`/itinerary/${wishlistItem.itinerary_id}`);

    return {
      success: true,
      data: null
    };

  } catch (error: any) {
    console.error("Error in removeFromWishlist:", error);
    return {
      success: false,
      error: { 
        message: error.message || "An unexpected error occurred",
        details: error
      }
    };
  }
}

export interface WishlistItemWithActivity {
  search_history_id: number;
  place_id: string;
  notes?: string;
  priority: number;
  categories: string[];
  tags: string[];
  visit_status: string;
  searched_at: string;
  activity?: ActivityWithDetails;
}

/**
 * Gets the wishlist for a user's itinerary
 */
export async function getWishlist(itineraryId: number, destinationId?: number): Promise<DatabaseResponse<WishlistItemWithActivity[]>> {
  const supabase = createClient();

  try {
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      return {
        success: false,
        error: { message: "User not authenticated" }
      };
    }

    // Verify user owns the itinerary
    const { data: itinerary, error: checkError } = await supabase
      .from("itinerary")
      .select("user_id")
      .eq("itinerary_id", itineraryId)
      .single();

    if (checkError || itinerary?.user_id !== user.id) {
      return {
        success: false,
        error: { message: "Itinerary not found or access denied" }
      };
    }

    // Get search history (wishlist) items - only those marked as saved to wishlist
    let searchQuery = supabase
      .from("itinerary_search_history")
      .select("place_id, search_history_id, notes, priority, categories, tags, visit_status, searched_at")
      .eq("itinerary_id", itineraryId)
      .eq("is_saved_to_wishlist", true);

    if (destinationId) {
      searchQuery = searchQuery.eq("itinerary_destination_id", destinationId);
    }

    const { data: searchHistory, error: searchError } = await searchQuery;

    if (searchError) {
      return {
        success: false,
        error: { 
          message: "Failed to fetch wishlist",
          code: searchError.code,
          details: searchError
        }
      };
    }

    if (!searchHistory || searchHistory.length === 0) {
      return {
        success: true,
        data: []
      };
    }

    // Get activity details for wishlist items
    const placeIds = searchHistory.map(item => item.place_id);
    const { data: activities, error: activitiesError } = await supabase
      .from("activity")
      .select(`
        *,
        reviews:review(*),
        open_hours:open_hours(*)
      `)
      .in("place_id", placeIds);

    if (activitiesError) {
      return {
        success: false,
        error: { 
          message: "Failed to fetch activity details",
          code: activitiesError.code,
          details: activitiesError
        }
      };
    }

    // Combine search history data with activity details
    const wishlistItems: WishlistItemWithActivity[] = searchHistory.map(historyItem => {
      const activity = activities?.find(act => act.place_id === historyItem.place_id);
      return {
        search_history_id: historyItem.search_history_id,
        place_id: historyItem.place_id,
        notes: historyItem.notes,
        priority: historyItem.priority,
        categories: historyItem.categories || [],
        tags: historyItem.tags || [],
        visit_status: historyItem.visit_status,
        searched_at: historyItem.searched_at,
        activity: activity
      };
    });

    return {
      success: true,
      data: wishlistItems
    };

  } catch (error: any) {
    console.error("Error in getWishlist:", error);
    return {
      success: false,
      error: { 
        message: error.message || "An unexpected error occurred",
        details: error
      }
    };
  }
}

/**
 * Clears all wishlist items for an itinerary
 */
export async function clearWishlist(itineraryId: number, destinationId?: number): Promise<DatabaseResponse<null>> {
  const supabase = createClient();

  try {
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      return {
        success: false,
        error: { message: "User not authenticated" }
      };
    }

    // Verify user owns the itinerary
    const { data: itinerary, error: checkError } = await supabase
      .from("itinerary")
      .select("user_id")
      .eq("itinerary_id", itineraryId)
      .single();

    if (checkError || itinerary?.user_id !== user.id) {
      return {
        success: false,
        error: { message: "Itinerary not found or access denied" }
      };
    }

    // Clear wishlist by marking items as not saved to wishlist
    let deleteQuery = supabase
      .from("itinerary_search_history")
      .update({ 
        is_saved_to_wishlist: false,
        notes: null,
        priority: 3
      })
      .eq("itinerary_id", itineraryId)
      .eq("is_saved_to_wishlist", true);

    if (destinationId) {
      deleteQuery = deleteQuery.eq("itinerary_destination_id", destinationId);
    }

    const { error } = await deleteQuery;

    if (error) {
      return {
        success: false,
        error: { 
          message: "Failed to clear wishlist",
          code: error.code,
          details: error
        }
      };
    }

    revalidatePath(`/itinerary/${itineraryId}`);

    return {
      success: true,
      data: null
    };

  } catch (error: any) {
    console.error("Error in clearWishlist:", error);
    return {
      success: false,
      error: { 
        message: error.message || "An unexpected error occurred",
        details: error
      }
    };
  }
}

/**
 * Updates a wishlist item
 */
export async function updateWishlistItem(
  searchHistoryId: number, 
  data: { notes?: string; priority?: number }
): Promise<DatabaseResponse<ItinerarySearchHistory>> {
  const supabase = createClient();

  try {
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      return {
        success: false,
        error: { message: "User not authenticated" }
      };
    }

    // Verify user owns the itinerary
    const { data: wishlistItem, error: checkError } = await supabase
      .from("itinerary_search_history")
      .select(`
        itinerary_id,
        itinerary!inner(user_id)
      `)
      .eq("search_history_id", searchHistoryId)
      .single();

    if (checkError || wishlistItem?.itinerary?.user_id !== user.id) {
      return {
        success: false,
        error: { message: "Wishlist item not found or access denied" }
      };
    }

    // Update wishlist item with new notes/priority
    const updateData: any = {};
    if (data.notes !== undefined) updateData.notes = data.notes;
    if (data.priority !== undefined) updateData.priority = data.priority;

    if (Object.keys(updateData).length === 0) {
      return {
        success: false,
        error: { message: "No valid fields to update" }
      };
    }

    const { data: updatedItem, error } = await supabase
      .from("itinerary_search_history")
      .update(updateData)
      .eq("search_history_id", searchHistoryId)
      .select()
      .single();

    if (error) {
      return {
        success: false,
        error: { 
          message: "Failed to update wishlist item",
          code: error.code,
          details: error
        }
      };
    }

    revalidatePath(`/itinerary/${wishlistItem.itinerary_id}`);

    return {
      success: true,
      data: updatedItem
    };

  } catch (error: any) {
    console.error("Error in updateWishlistItem:", error);
    return {
      success: false,
      error: { 
        message: error.message || "An unexpected error occurred",
        details: error
      }
    };
  }
}

/**
 * Gets places that might be missing from activities table but are in search history
 */
export async function getMissingPlaces(itineraryId: number, destinationId?: number): Promise<DatabaseResponse<string[]>> {
  const supabase = createClient();

  try {
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      return {
        success: false,
        error: { message: "User not authenticated" }
      };
    }

    // Verify user owns the itinerary
    const { data: itinerary, error: checkError } = await supabase
      .from("itinerary")
      .select("user_id")
      .eq("itinerary_id", itineraryId)
      .single();

    if (checkError || itinerary?.user_id !== user.id) {
      return {
        success: false,
        error: { message: "Itinerary not found or access denied" }
      };
    }

    // Get all place IDs from search history
    let searchQuery = supabase
      .from("itinerary_search_history")
      .select("place_id")
      .eq("itinerary_id", itineraryId);

    if (destinationId) {
      searchQuery = searchQuery.eq("itinerary_destination_id", destinationId);
    }

    const { data: searchHistory, error: searchError } = await searchQuery;

    if (searchError || !searchHistory) {
      return {
        success: false,
        error: { 
          message: "Failed to fetch search history",
          code: searchError?.code,
          details: searchError
        }
      };
    }

    const searchPlaceIds = searchHistory.map(item => item.place_id);

    if (searchPlaceIds.length === 0) {
      return {
        success: true,
        data: []
      };
    }

    // Get existing activities
    const { data: existingActivities, error: activitiesError } = await supabase
      .from("activity")
      .select("place_id")
      .in("place_id", searchPlaceIds);

    if (activitiesError) {
      return {
        success: false,
        error: { 
          message: "Failed to fetch existing activities",
          code: activitiesError.code,
          details: activitiesError
        }
      };
    }

    const existingPlaceIds = (existingActivities || []).map(activity => activity.place_id);
    const missingPlaceIds = searchPlaceIds.filter(placeId => !existingPlaceIds.includes(placeId));

    return {
      success: true,
      data: missingPlaceIds
    };

  } catch (error: any) {
    console.error("Error in getMissingPlaces:", error);
    return {
      success: false,
      error: { 
        message: error.message || "An unexpected error occurred",
        details: error
      }
    };
  }
}