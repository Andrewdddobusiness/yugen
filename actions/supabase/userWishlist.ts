"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/utils/supabase/server";
import type { DatabaseResponse, ActivityWithDetails } from "@/types/database";
import { 
  addToUserWishlistSchema,
  updateUserWishlistSchema,
  type AddToUserWishlistData,
  type UpdateUserWishlistData,
  type UserWishlistItem,
  type UserWishlistItemWithActivity
} from "@/types/userWishlist";
import { createOrUpdateActivity } from "@/actions/supabase/activities";
import type { CreateActivityData } from "@/schemas/activitySchema";

/**
 * Enhanced wishlist add function that saves activity details first
 */
export async function addToUserWishlistWithActivity(
  wishlistData: AddToUserWishlistData,
  activityData?: CreateActivityData
): Promise<DatabaseResponse<UserWishlistItem>> {
  const supabase = createClient();

  try {
    // First, save activity details if provided
    if (activityData) {
      const activityResult = await createOrUpdateActivity(activityData);
      if (!activityResult.success) {
        console.warn("Failed to save activity details:", activityResult.error);
        // Continue anyway - we can still save to wishlist without activity details
      }
    }

    // Then add to wishlist using the existing function
    return await addToUserWishlist(wishlistData);
  } catch (error: any) {
    console.error("Error in addToUserWishlistWithActivity:", error);
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
 * Adds a place to the user's global wishlist
 */
export async function addToUserWishlist(data: AddToUserWishlistData): Promise<DatabaseResponse<UserWishlistItem>> {
  const supabase = createClient();

  try {
    // Validate input data
    const validatedData = addToUserWishlistSchema.parse(data);

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      return {
        success: false,
        error: { message: "User not authenticated" }
      };
    }

    // Check if already in wishlist
    const { data: existing, error: existingError } = await supabase
      .from("wishlist")
      .select("wishlist_id")
      .eq("user_id", user.id)
      .eq("place_id", validatedData.place_id)
      .single();

    if (!existingError && existing) {
      return {
        success: false,
        error: { message: "Place already in wishlist" }
      };
    }

    // Add to wishlist
    const { data: wishlistItem, error } = await supabase
      .from("wishlist")
      .insert({
        user_id: user.id,
        place_id: validatedData.place_id,
        notes: validatedData.notes,
        priority: validatedData.priority,
        categories: validatedData.categories,
        tags: validatedData.tags,
        visit_status: validatedData.visit_status,
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

    // Revalidate pages that might show wishlist data
    revalidatePath("/");

    return {
      success: true,
      data: wishlistItem
    };

  } catch (error: any) {
    console.error("Error in addToUserWishlist:", error);
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
 * Removes a place from the user's wishlist
 */
export async function removeFromUserWishlist(placeId: string): Promise<DatabaseResponse<null>> {
  const supabase = createClient();

  try {
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      return {
        success: false,
        error: { message: "User not authenticated" }
      };
    }

    const { error } = await supabase
      .from("wishlist")
      .delete()
      .eq("user_id", user.id)
      .eq("place_id", placeId);

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

    // Revalidate pages that might show wishlist data
    revalidatePath("/");

    return {
      success: true,
      data: null
    };

  } catch (error: any) {
    console.error("Error in removeFromUserWishlist:", error);
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
 * Gets the user's complete wishlist with activity details
 */
export async function getUserWishlist(): Promise<DatabaseResponse<UserWishlistItemWithActivity[]>> {
  const supabase = createClient();

  try {
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      return {
        success: false,
        error: { message: "User not authenticated" }
      };
    }

    // Get wishlist items
    const { data: wishlistItems, error: wishlistError } = await supabase
      .from("wishlist")
      .select("*")
      .eq("user_id", user.id)
      .order("saved_at", { ascending: false });

    if (wishlistError) {
      return {
        success: false,
        error: { 
          message: "Failed to fetch wishlist",
          code: wishlistError.code,
          details: wishlistError
        }
      };
    }

    if (!wishlistItems || wishlistItems.length === 0) {
      return {
        success: true,
        data: []
      };
    }

    // Get activity details for wishlist items
    const placeIds = wishlistItems.map(item => item.place_id);
    const { data: activities, error: activitiesError } = await supabase
      .from("activity")
      .select(`
        *,
        reviews:review(*),
        open_hours:open_hours(*)
      `)
      .in("place_id", placeIds);

    if (activitiesError) {
      console.warn("Failed to fetch activity details:", activitiesError);
      // Still return wishlist items without activity details
    }

    // Combine wishlist data with activity details
    const wishlistWithActivities: UserWishlistItemWithActivity[] = wishlistItems.map(item => {
      const activity = activities?.find(act => act.place_id === item.place_id);
      return {
        ...item,
        activity: activity as ActivityWithDetails | undefined
      };
    });

    return {
      success: true,
      data: wishlistWithActivities
    };

  } catch (error: any) {
    console.error("Error in getUserWishlist:", error);
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
export async function updateUserWishlistItem(
  placeId: string, 
  data: UpdateUserWishlistData
): Promise<DatabaseResponse<UserWishlistItem>> {
  const supabase = createClient();

  try {
    // Validate input data
    const validatedData = updateUserWishlistSchema.parse(data);

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      return {
        success: false,
        error: { message: "User not authenticated" }
      };
    }

    // Check if item exists
    const { data: existing, error: checkError } = await supabase
      .from("wishlist")
      .select("wishlist_id")
      .eq("user_id", user.id)
      .eq("place_id", placeId)
      .single();

    if (checkError || !existing) {
      return {
        success: false,
        error: { message: "Wishlist item not found" }
      };
    }

    const { data: updatedItem, error } = await supabase
      .from("wishlist")
      .update(validatedData)
      .eq("user_id", user.id)
      .eq("place_id", placeId)
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

    // Revalidate pages that might show wishlist data
    revalidatePath("/");

    return {
      success: true,
      data: updatedItem
    };

  } catch (error: any) {
    console.error("Error in updateUserWishlistItem:", error);
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
 * Clears the user's entire wishlist
 */
export async function clearUserWishlist(): Promise<DatabaseResponse<null>> {
  const supabase = createClient();

  try {
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      return {
        success: false,
        error: { message: "User not authenticated" }
      };
    }

    const { error } = await supabase
      .from("wishlist")
      .delete()
      .eq("user_id", user.id);

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

    // Revalidate pages that might show wishlist data
    revalidatePath("/");

    return {
      success: true,
      data: null
    };

  } catch (error: any) {
    console.error("Error in clearUserWishlist:", error);
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
 * Checks if a place is in the user's wishlist
 */
export async function isPlaceInUserWishlist(placeId: string): Promise<DatabaseResponse<boolean>> {
  const supabase = createClient();

  try {
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      return {
        success: false,
        error: { message: "User not authenticated" }
      };
    }

    const { data, error } = await supabase
      .from("wishlist")
      .select("wishlist_id")
      .eq("user_id", user.id)
      .eq("place_id", placeId)
      .single();

    if (error && error.code !== "PGRST116") { // PGRST116 = not found
      return {
        success: false,
        error: { 
          message: "Failed to check wishlist status",
          code: error.code,
          details: error
        }
      };
    }

    return {
      success: true,
      data: !!data
    };

  } catch (error: any) {
    console.error("Error in isPlaceInUserWishlist:", error);
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
 * Gets wishlist statistics for the user
 */
export async function getUserWishlistStats(): Promise<DatabaseResponse<{
  total: number;
  byPriority: Record<number, number>;
  byVisitStatus: Record<string, number>;
  byCategory: Record<string, number>;
}>> {
  const supabase = createClient();

  try {
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      return {
        success: false,
        error: { message: "User not authenticated" }
      };
    }

    const { data: items, error } = await supabase
      .from("wishlist")
      .select("priority, visit_status, categories")
      .eq("user_id", user.id);

    if (error) {
      return {
        success: false,
        error: { 
          message: "Failed to fetch wishlist statistics",
          code: error.code,
          details: error
        }
      };
    }

    const stats = {
      total: items?.length || 0,
      byPriority: {} as Record<number, number>,
      byVisitStatus: {} as Record<string, number>,
      byCategory: {} as Record<string, number>
    };

    items?.forEach(item => {
      // Priority stats
      stats.byPriority[item.priority] = (stats.byPriority[item.priority] || 0) + 1;
      
      // Visit status stats
      stats.byVisitStatus[item.visit_status] = (stats.byVisitStatus[item.visit_status] || 0) + 1;
      
      // Category stats
      item.categories?.forEach((category: string) => {
        stats.byCategory[category] = (stats.byCategory[category] || 0) + 1;
      });
    });

    return {
      success: true,
      data: stats
    };

  } catch (error: any) {
    console.error("Error in getUserWishlistStats:", error);
    return {
      success: false,
      error: { 
        message: error.message || "An unexpected error occurred",
        details: error
      }
    };
  }
}