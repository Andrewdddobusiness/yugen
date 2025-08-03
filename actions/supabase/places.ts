"use server";

import { createClient } from "@/utils/supabase/server";
import { 
  createActivitySchema,
  type CreateActivityData
} from "@/schemas/activitySchema";
import type { 
  Activity,
  ActivityWithDetails,
  DatabaseResponse,
  Coordinates
} from "@/types/database";

// Type definitions for place operations
type CreatePlaceData = CreateActivityData;
type UpdatePlaceData = Partial<CreateActivityData>;

/**
 * Creates a new place in the database
 */
export async function createPlace(data: CreatePlaceData): Promise<DatabaseResponse<Activity>> {
  const supabase = createClient();

  try {
    // Validate input data
    const validatedData = createActivitySchema.parse(data);

    // Convert coordinates if provided
    const placeData = {
      ...validatedData,
      coordinates: validatedData.coordinates 
        ? `(${validatedData.coordinates.lat},${validatedData.coordinates.lng})`
        : null,
      duration: validatedData.duration ? `${validatedData.duration} minutes` : null,
    };

    const { data: place, error } = await supabase
      .from("activity")
      .insert(placeData)
      .select()
      .single();

    if (error) {
      return {
        success: false,
        error: { 
          message: "Failed to create place",
          code: error.code,
          details: error
        }
      };
    }

    return {
      success: true,
      data: place
    };

  } catch (error: any) {
    console.error("Error in createPlace:", error);
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
 * Gets a place by its ID (place_id)
 */
export async function getPlace(id: string): Promise<DatabaseResponse<ActivityWithDetails>> {
  const supabase = createClient();

  try {
    const { data, error } = await supabase
      .from("activity")
      .select(`
        *,
        reviews:review(*),
        open_hours:open_hours(*)
      `)
      .eq("place_id", id)
      .single();

    if (error) {
      return {
        success: false,
        error: { 
          message: error.code === "PGRST116" ? "Place not found" : "Failed to fetch place",
          code: error.code,
          details: error
        }
      };
    }

    return {
      success: true,
      data: data as ActivityWithDetails
    };

  } catch (error: any) {
    console.error("Error in getPlace:", error);
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
 * Updates a place by its ID
 */
export async function updatePlace(id: string, data: UpdatePlaceData): Promise<DatabaseResponse<Activity>> {
  const supabase = createClient();

  try {
    // Convert coordinates if provided
    const updateData = {
      ...data,
      coordinates: data.coordinates 
        ? `(${data.coordinates.lat},${data.coordinates.lng})`
        : undefined,
      duration: data.duration ? `${data.duration} minutes` : undefined,
    };

    // Remove undefined values
    const cleanData = Object.fromEntries(
      Object.entries(updateData).filter(([_, value]) => value !== undefined)
    );

    const { data: place, error } = await supabase
      .from("activity")
      .update(cleanData)
      .eq("place_id", id)
      .select()
      .single();

    if (error) {
      return {
        success: false,
        error: { 
          message: error.code === "PGRST116" ? "Place not found" : "Failed to update place",
          code: error.code,
          details: error
        }
      };
    }

    return {
      success: true,
      data: place
    };

  } catch (error: any) {
    console.error("Error in updatePlace:", error);
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
 * Searches for places using query and optional location
 * Note: This is a placeholder for Google Places API integration
 */
export async function searchPlaces(
  query: string,
  location?: Coordinates
): Promise<DatabaseResponse<any[]>> {
  try {
    // This is a placeholder - in a real implementation, you would:
    // 1. Call Google Places API with the search parameters
    // 2. Transform the results to match your activity schema
    // 3. Return the formatted results
    
    // For now, search existing places in database
    const supabase = createClient();
    
    let searchQuery = supabase
      .from("activity")
      .select(`
        *,
        reviews:review(*),
        open_hours:open_hours(*)
      `)
      .ilike("name", `%${query}%`);

    // TODO: Add location-based filtering when coordinates are available
    // This would require PostGIS extensions for geographic queries

    const { data, error } = await searchQuery
      .limit(20);

    if (error) {
      return {
        success: false,
        error: { 
          message: "Failed to search places",
          code: error.code,
          details: error
        }
      };
    }

    return {
      success: true,
      data: data || []
    };

  } catch (error: any) {
    console.error("Error in searchPlaces:", error);
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
 * Gets places by destination ID
 */
export async function getPlacesByDestination(destinationId: string): Promise<DatabaseResponse<ActivityWithDetails[]>> {
  const supabase = createClient();

  try {
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      return {
        success: false,
        error: { message: "User not authenticated" }
      };
    }

    // Verify user owns the destination
    const { data: destination, error: destError } = await supabase
      .from("itinerary_destination")
      .select(`
        itinerary!inner(user_id)
      `)
      .eq("itinerary_destination_id", destinationId)
      .single();

    if (destError || destination?.itinerary?.user_id !== user.id) {
      return {
        success: false,
        error: { message: "Destination not found or access denied" }
      };
    }

    // Get all places associated with this destination through search history
    const { data: searchHistory, error: searchError } = await supabase
      .from("itinerary_search_history")
      .select("place_id")
      .eq("itinerary_destination_id", destinationId);

    if (searchError) {
      return {
        success: false,
        error: { 
          message: "Failed to fetch destination places",
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

    // Get the actual place details
    const placeIds = searchHistory.map(item => item.place_id);
    const { data: places, error: placesError } = await supabase
      .from("activity")
      .select(`
        *,
        reviews:review(*),
        open_hours:open_hours(*)
      `)
      .in("place_id", placeIds);

    if (placesError) {
      return {
        success: false,
        error: { 
          message: "Failed to fetch place details",
          code: placesError.code,
          details: placesError
        }
      };
    }

    return {
      success: true,
      data: (places || []) as ActivityWithDetails[]
    };

  } catch (error: any) {
    console.error("Error in getPlacesByDestination:", error);
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
 * Gets place details from Google Places API by place ID
 * Note: This is a placeholder for Google Places API integration
 */
export async function getPlaceDetails(placeId: string): Promise<DatabaseResponse<any>> {
  try {
    // This is a placeholder - in a real implementation, you would:
    // 1. Call Google Places API Details endpoint
    // 2. Transform the result to match your activity schema
    // 3. Return the formatted result
    
    // For now, return database place if it exists
    return await getPlace(placeId);

  } catch (error: any) {
    console.error("Error in getPlaceDetails:", error);
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
 * Saves a place from Google Places API to our database
 * This is an alias for createPlace for backwards compatibility
 */
export async function savePlaceToDatabase(
  placeData: CreatePlaceData
): Promise<DatabaseResponse<Activity>> {
  return createPlace(placeData);
}

/**
 * Gets all places with optional filtering
 */
export async function getAllPlaces(
  types?: string[],
  location?: Coordinates,
  radius?: number
): Promise<DatabaseResponse<ActivityWithDetails[]>> {
  const supabase = createClient();

  try {
    let query = supabase
      .from("activity")
      .select(`
        *,
        reviews:review(*),
        open_hours:open_hours(*)
      `);

    // Filter by types if provided
    if (types && types.length > 0) {
      query = query.overlaps("types", types);
    }

    // TODO: Add location-based filtering when coordinates are available
    // This would require PostGIS extensions for geographic queries

    const { data, error } = await query
      .order("created_at", { ascending: false });

    if (error) {
      return {
        success: false,
        error: { 
          message: "Failed to fetch places",
          code: error.code,
          details: error
        }
      };
    }

    return {
      success: true,
      data: data as ActivityWithDetails[]
    };

  } catch (error: any) {
    console.error("Error in getAllPlaces:", error);
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
 * Gets places by multiple place IDs
 */
export async function getPlacesByIds(placeIds: string[]): Promise<DatabaseResponse<ActivityWithDetails[]>> {
  const supabase = createClient();

  try {
    if (placeIds.length === 0) {
      return {
        success: true,
        data: []
      };
    }

    const { data, error } = await supabase
      .from("activity")
      .select(`
        *,
        reviews:review(*),
        open_hours:open_hours(*)
      `)
      .in("place_id", placeIds);

    if (error) {
      return {
        success: false,
        error: { 
          message: "Failed to fetch places",
          code: error.code,
          details: error
        }
      };
    }

    return {
      success: true,
      data: data as ActivityWithDetails[]
    };

  } catch (error: any) {
    console.error("Error in getPlacesByIds:", error);
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
 * Deletes a place from the database
 */
export async function deletePlace(placeId: string): Promise<DatabaseResponse<null>> {
  const supabase = createClient();

  try {
    const { error } = await supabase
      .from("activity")
      .delete()
      .eq("place_id", placeId);

    if (error) {
      return {
        success: false,
        error: { 
          message: "Failed to delete place",
          code: error.code,
          details: error
        }
      };
    }

    return {
      success: true,
      data: null
    };

  } catch (error: any) {
    console.error("Error in deletePlace:", error);
    return {
      success: false,
      error: { 
        message: error.message || "An unexpected error occurred",
        details: error
      }
    };
  }
}