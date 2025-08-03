"use server";

import { createClient } from "@/utils/supabase/server";
import { 
  createDestinationSchema,
  updateDestinationSchema,
  type CreateDestinationData,
  type UpdateDestinationData
} from "@/schemas/itinerarySchema";
import type { 
  Country,
  City,
  ItineraryDestination,
  DatabaseResponse 
} from "@/types/database";

/**
 * Creates a new destination for an itinerary
 * Note: This is typically handled by createItinerary, but provided for direct destination creation
 */
export async function createDestination(data: CreateDestinationData & { itinerary_id: number }): Promise<DatabaseResponse<ItineraryDestination>> {
  const supabase = createClient();

  try {
    // Validate input data
    const validatedData = createDestinationSchema.parse(data);

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
      .eq("itinerary_id", data.itinerary_id)
      .single();

    if (checkError || itinerary?.user_id !== user.id) {
      return {
        success: false,
        error: { message: "Itinerary not found or access denied" }
      };
    }

    const { data: destination, error } = await supabase
      .from("itinerary_destination")
      .insert({
        itinerary_id: data.itinerary_id,
        ...validatedData,
      })
      .select()
      .single();

    if (error) {
      return {
        success: false,
        error: { 
          message: "Failed to create destination",
          code: error.code,
          details: error
        }
      };
    }

    return {
      success: true,
      data: destination
    };

  } catch (error: any) {
    console.error("Error in createDestination:", error);
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
 * Gets a destination by its ID
 */
export async function getDestination(id: string): Promise<DatabaseResponse<ItineraryDestination>> {
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
      .from("itinerary_destination")
      .select(`
        *,
        itinerary!inner(user_id)
      `)
      .eq("itinerary_destination_id", id)
      .single();

    if (error) {
      return {
        success: false,
        error: { 
          message: error.code === "PGRST116" ? "Destination not found" : "Failed to fetch destination",
          code: error.code,
          details: error
        }
      };
    }

    // Verify user owns the itinerary
    if (data?.itinerary?.user_id !== user.id) {
      return {
        success: false,
        error: { message: "Access denied" }
      };
    }

    return {
      success: true,
      data: data
    };

  } catch (error: any) {
    console.error("Error in getDestination:", error);
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
 * Searches for destinations (cities and countries) for destination selection
 * This is for geographic search when creating new destinations
 */
export async function searchDestinations(query: string): Promise<DatabaseResponse<{
  countries: Country[];
  cities: (City & { country?: Country })[];
}>> {
  const supabase = createClient();

  try {
    if (!query || query.trim().length < 2) {
      return {
        success: true,
        data: { countries: [], cities: [] }
      };
    }

    // Search countries
    const { data: countries, error: countriesError } = await supabase
      .from("country")
      .select("*")
      .ilike("country_name", `%${query.trim()}%`)
      .order("country_name")
      .limit(10);

    if (countriesError) {
      return {
        success: false,
        error: { 
          message: "Failed to search countries",
          code: countriesError.code,
          details: countriesError
        }
      };
    }

    // Search cities
    const { data: cities, error: citiesError } = await supabase
      .from("city")
      .select(`
        *,
        country:country_id(country_name, country_code)
      `)
      .ilike("city_name", `%${query.trim()}%`)
      .order("city_name")
      .limit(20);

    if (citiesError) {
      return {
        success: false,
        error: { 
          message: "Failed to search cities",
          code: citiesError.code,
          details: citiesError
        }
      };
    }

    return {
      success: true,
      data: {
        countries: countries || [],
        cities: cities || []
      }
    };

  } catch (error: any) {
    console.error("Error in searchDestinations:", error);
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
 * Updates a destination
 */
export async function updateDestination(
  destinationId: string, 
  data: UpdateDestinationData
): Promise<DatabaseResponse<ItineraryDestination>> {
  const supabase = createClient();

  try {
    // Validate input data
    const validatedData = updateDestinationSchema.parse(data);

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      return {
        success: false,
        error: { message: "User not authenticated" }
      };
    }

    // Check if user owns the itinerary
    const { data: destination, error: checkError } = await supabase
      .from("itinerary_destination")
      .select(`
        *,
        itinerary!inner(user_id)
      `)
      .eq("itinerary_destination_id", destinationId)
      .single();

    if (checkError || destination?.itinerary?.user_id !== user.id) {
      return {
        success: false,
        error: { message: "Destination not found or access denied" }
      };
    }

    const { data: updatedData, error } = await supabase
      .from("itinerary_destination")
      .update(validatedData)
      .eq("itinerary_destination_id", destinationId)
      .select()
      .single();

    if (error) {
      return {
        success: false,
        error: { 
          message: "Failed to update destination",
          code: error.code,
          details: error
        }
      };
    }

    return {
      success: true,
      data: updatedData
    };

  } catch (error: any) {
    console.error("Error in updateDestination:", error);
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
 * Deletes a destination (soft delete)
 */
export async function deleteDestination(destinationId: string): Promise<DatabaseResponse<null>> {
  const supabase = createClient();

  try {
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      return {
        success: false,
        error: { message: "User not authenticated" }
      };
    }

    // Check if user owns the itinerary
    const { data: destination, error: checkError } = await supabase
      .from("itinerary_destination")
      .select(`
        *,
        itinerary!inner(user_id)
      `)
      .eq("itinerary_destination_id", destinationId)
      .single();

    if (checkError || destination?.itinerary?.user_id !== user.id) {
      return {
        success: false,
        error: { message: "Destination not found or access denied" }
      };
    }

    const { error } = await supabase
      .from("itinerary_destination")
      .delete()
      .eq("itinerary_destination_id", destinationId);

    if (error) {
      return {
        success: false,
        error: { 
          message: "Failed to delete destination",
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
    console.error("Error in deleteDestination:", error);
    return {
      success: false,
      error: { 
        message: error.message || "An unexpected error occurred",
        details: error
      }
    };
  }
}

// Geographic data management functions (for reference and backwards compatibility)

/**
 * Searches for countries by name
 */
export async function searchCountries(query: string): Promise<DatabaseResponse<Country[]>> {
  const supabase = createClient();

  try {
    if (!query || query.trim().length < 2) {
      return {
        success: true,
        data: []
      };
    }

    const { data, error } = await supabase
      .from("country")
      .select("*")
      .ilike("country_name", `%${query.trim()}%`)
      .order("country_name")
      .limit(10);

    if (error) {
      return {
        success: false,
        error: { 
          message: "Failed to search countries",
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
    console.error("Error in searchCountries:", error);
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
 * Searches for cities by name and optionally by country
 */
export async function searchCities(
  query: string, 
  countryId?: number
): Promise<DatabaseResponse<City[]>> {
  const supabase = createClient();

  try {
    if (!query || query.trim().length < 2) {
      return {
        success: true,
        data: []
      };
    }

    let cityQuery = supabase
      .from("city")
      .select(`
        *,
        country:country_id(country_name, country_code)
      `)
      .ilike("city_name", `%${query.trim()}%`);

    if (countryId) {
      cityQuery = cityQuery.eq("country_id", countryId);
    }

    const { data, error } = await cityQuery
      .order("city_name")
      .limit(20);

    if (error) {
      return {
        success: false,
        error: { 
          message: "Failed to search cities",
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
    console.error("Error in searchCities:", error);
    return {
      success: false,
      error: { 
        message: error.message || "An unexpected error occurred",
        details: error
      }
    };
  }
}