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
import { SearchCache, searchCache, cachedSearch } from "@/lib/cache/searchCache";

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
 * Searches for places using Google Places API with autocomplete (with caching)
 */
export async function searchPlaces(
  query: string,
  location?: Coordinates
): Promise<DatabaseResponse<any[]>> {
  try {
    if (!query || query.trim().length < 2) {
      return {
        success: true,
        data: []
      };
    }

    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
    if (!apiKey || apiKey === 'your-google-maps-api-key-here') {
      // Fallback to database search if no API key
      return await searchPlacesInDatabase(query);
    }

    // Generate cache key
    const cacheKey = SearchCache.generateSearchKey(query, location, 50000);
    
    // Try to get from cache first
    const cached = searchCache.get<DatabaseResponse<any[]>>(cacheKey);
    if (cached) {
      return cached;
    }

    const baseUrl = "https://places.googleapis.com/v1/places:autocomplete";
    
    const requestBody: any = {
      input: query.trim(),
    };

    // Add location bias if coordinates provided
    if (location) {
      requestBody.locationBias = {
        circle: {
          center: {
            latitude: location.lat,
            longitude: location.lng,
          },
          radius: 50000, // 50km radius
        },
      };
    }

    const response = await fetch(baseUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": apiKey,
        "X-Goog-FieldMask": [
          "suggestions.placePrediction.place",
          "suggestions.placePrediction.structuredFormat",
          "suggestions.placePrediction.types",
        ].join(","),
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      console.error("Google Places API error:", response.status, response.statusText);
      // Fallback to database search
      return await searchPlacesInDatabase(query);
    }

    const data = await response.json();
    
    const results = data.suggestions?.map((suggestion: any) => ({
      place_id: suggestion.placePrediction.place,
      name: suggestion.placePrediction.structuredFormat.mainText.text,
      address: suggestion.placePrediction.structuredFormat.secondaryText?.text || "",
      types: suggestion.placePrediction.types || [],
      source: "google_autocomplete"
    })) || [];

    const result = {
      success: true,
      data: results
    };

    // Cache the result for 10 minutes
    searchCache.set(cacheKey, result, 10 * 60 * 1000);

    return result;

  } catch (error: any) {
    console.error("Error in searchPlaces:", error);
    // Fallback to database search on error
    return await searchPlacesInDatabase(query);
  }
}

/**
 * Fallback search in database when Google API is unavailable
 */
async function searchPlacesInDatabase(query: string): Promise<DatabaseResponse<any[]>> {
  const supabase = createClient();
  
  try {
    const { data, error } = await supabase
      .from("activity")
      .select(`
        *,
        reviews:review(*),
        open_hours:open_hours(*)
      `)
      .ilike("name", `%${query}%`)
      .limit(20);

    if (error) {
      return {
        success: false,
        error: { 
          message: "Failed to search places in database",
          code: error.code,
          details: error
        }
      };
    }

    return {
      success: true,
      data: (data || []).map(place => ({
        ...place,
        source: "database"
      }))
    };

  } catch (error: any) {
    return {
      success: false,
      error: { 
        message: error.message || "Database search failed",
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

    if (destError || (destination?.itinerary as any)?.user_id !== user.id) {
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
 * Gets detailed place information from Google Places API
 */
export async function getPlaceDetails(placeId: string): Promise<DatabaseResponse<any>> {
  try {
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
    if (!apiKey || apiKey === 'your-google-maps-api-key-here') {
      // Fallback to database if no API key
      return await getPlace(placeId);
    }

    // Use the existing fetchPlaceDetails function from google/actions.ts
    const { fetchPlaceDetails } = await import("@/actions/google/actions");
    
    const placeDetails = await fetchPlaceDetails(placeId);
    
    // Transform to match our database schema
    const transformedPlace = {
      place_id: placeDetails.place_id,
      name: placeDetails.name,
      coordinates: placeDetails.coordinates ? {
        lat: placeDetails.coordinates[0],
        lng: placeDetails.coordinates[1]
      } : null,
      types: placeDetails.types || [],
      price_level: placeDetails.price_level || null,
      address: placeDetails.address || "",
      rating: placeDetails.rating || null,
      description: placeDetails.description || "",
      google_maps_url: placeDetails.google_maps_url || "",
      website_url: placeDetails.website_url || "",
      photo_names: placeDetails.photo_names || [],
      phone_number: placeDetails.phone_number || "",
      reviews: placeDetails.reviews || [],
      open_hours: placeDetails.open_hours || [],
      source: "google_api"
    };

    return {
      success: true,
      data: transformedPlace
    };

  } catch (error: any) {
    console.error("Error in getPlaceDetails:", error);
    
    // Fallback to database search
    const dbResult = await getPlace(placeId);
    if (dbResult.success) {
      return {
        success: true,
        data: {
          ...dbResult.data,
          source: "database_fallback"
        }
      };
    }
    
    return {
      success: false,
      error: { 
        message: error.message || "Failed to fetch place details",
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