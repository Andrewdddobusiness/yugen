"use server";

import { createClient } from "@/utils/supabase/server";
import { isValid, parseISO } from "date-fns";
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

export type ItineraryDestinationSummary = Pick<
  ItineraryDestination,
  "itinerary_destination_id" | "city" | "country" | "from_date" | "to_date" | "order_number"
>;

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

    // Keep destinations in chronological order (by from_date) by inserting into the correct
    // order_number slot and shifting existing destinations when needed.
    const { data: existingDestinations, error: existingError } = await supabase
      .from("itinerary_destination")
      .select("itinerary_destination_id, from_date, order_number")
      .eq("itinerary_id", data.itinerary_id)
      .order("order_number", { ascending: true });

    if (existingError) {
      return {
        success: false,
        error: {
          message: "Failed to fetch existing destinations",
          code: existingError.code,
          details: existingError,
        },
      };
    }

    const newFromParsed = parseISO(validatedData.from_date);
    const newFromTime = isValid(newFromParsed) ? newFromParsed.getTime() : Number.NaN;
    const normalizedExisting = (existingDestinations ?? [])
      .map((dest: any) => ({
        itinerary_destination_id: Number(dest.itinerary_destination_id),
        order_number: Number(dest.order_number ?? 0),
        from_time: (() => {
          const parsed = parseISO(String(dest.from_date ?? ""));
          return isValid(parsed) ? parsed.getTime() : Number.NaN;
        })(),
      }))
      .filter((dest) => Number.isFinite(dest.itinerary_destination_id) && Number.isFinite(dest.order_number));

    const maxOrder = Math.max(0, ...normalizedExisting.map((dest) => dest.order_number));
    const insertBefore = normalizedExisting.find((dest) => {
      if (!Number.isFinite(dest.from_time) || !Number.isFinite(newFromTime)) return false;
      return dest.from_time > newFromTime;
    });

    const insertOrderNumber = insertBefore ? Math.max(1, insertBefore.order_number) : maxOrder + 1;

    if (insertOrderNumber <= maxOrder) {
      // Shift existing destinations down to make room.
      const toShift = normalizedExisting
        .filter((dest) => dest.order_number >= insertOrderNumber)
        .sort((a, b) => b.order_number - a.order_number);

      for (const dest of toShift) {
        const { error: shiftError } = await supabase
          .from("itinerary_destination")
          .update({ order_number: dest.order_number + 1 })
          .eq("itinerary_destination_id", dest.itinerary_destination_id)
          .eq("itinerary_id", data.itinerary_id);

        if (shiftError) {
          return {
            success: false,
            error: {
              message: "Failed to reorder destinations",
              code: shiftError.code,
              details: shiftError,
            },
          };
        }
      }
    }

    const { data: destination, error } = await supabase
      .from("itinerary_destination")
      .insert({
        itinerary_id: data.itinerary_id,
        ...validatedData,
        order_number: insertOrderNumber,
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

    // Keep destinations ordered by travel dates when dates change.
    if (validatedData.from_date || validatedData.to_date) {
      try {
        const itineraryId = Number(destination.itinerary_id);
        if (Number.isFinite(itineraryId)) {
          const { data: allDestinations, error: listError } = await supabase
            .from("itinerary_destination")
            .select("itinerary_destination_id, from_date, to_date, order_number")
            .eq("itinerary_id", itineraryId);

          if (!listError && Array.isArray(allDestinations)) {
            const sorted = [...allDestinations].sort((a: any, b: any) => {
              const aFromParsed = parseISO(String(a.from_date ?? ""));
              const bFromParsed = parseISO(String(b.from_date ?? ""));
              const aFrom = isValid(aFromParsed) ? aFromParsed.getTime() : Number.NaN;
              const bFrom = isValid(bFromParsed) ? bFromParsed.getTime() : Number.NaN;
              if (aFrom !== bFrom) return aFrom - bFrom;

              const aToParsed = parseISO(String(a.to_date ?? ""));
              const bToParsed = parseISO(String(b.to_date ?? ""));
              const aTo = isValid(aToParsed) ? aToParsed.getTime() : Number.NaN;
              const bTo = isValid(bToParsed) ? bToParsed.getTime() : Number.NaN;
              if (aTo !== bTo) return aTo - bTo;

              const aOrder = Number(a.order_number ?? 0);
              const bOrder = Number(b.order_number ?? 0);
              if (aOrder !== bOrder) return aOrder - bOrder;

              return Number(a.itinerary_destination_id) - Number(b.itinerary_destination_id);
            });

            for (let i = 0; i < sorted.length; i += 1) {
              const destRow = sorted[i] as any;
              const desiredOrder = i + 1;
              const currentOrder = Number(destRow.order_number ?? 0);
              const rowId = String(destRow.itinerary_destination_id ?? "");
              if (!rowId) continue;
              if (currentOrder === desiredOrder) continue;

              await supabase
                .from("itinerary_destination")
                .update({ order_number: desiredOrder })
                .eq("itinerary_destination_id", rowId)
                .eq("itinerary_id", itineraryId);
            }
          }
        }
      } catch (reorderError) {
        console.error("Failed to reorder destinations after update:", reorderError);
      }
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

/**
 * Lists all destinations for an itinerary (lightweight summary).
 * Used for timeline UIs like calendar city labels.
 */
export async function listItineraryDestinationsSummary(
  itineraryId: string
): Promise<DatabaseResponse<ItineraryDestinationSummary[]>> {
  const supabase = createClient();

  const normalizedItineraryId = String(itineraryId ?? "").trim();
  if (!/^\d+$/.test(normalizedItineraryId)) {
    return {
      success: false,
      error: { message: "Invalid itinerary id" },
    };
  }

  try {
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      return {
        success: false,
        error: { message: "User not authenticated" },
      };
    }

    const { data, error } = await supabase
      .from("itinerary_destination")
      .select("itinerary_destination_id,city,country,from_date,to_date,order_number")
      .eq("itinerary_id", Number(normalizedItineraryId))
      .order("order_number", { ascending: true });

    if (error) {
      return {
        success: false,
        error: {
          message: "Failed to fetch itinerary destinations",
          code: error.code,
          details: error,
        },
      };
    }

    return {
      success: true,
      data: (data ?? []) as ItineraryDestinationSummary[],
    };
  } catch (error: any) {
    console.error("Error in listItineraryDestinationsSummary:", error);
    return {
      success: false,
      error: {
        message: error.message || "An unexpected error occurred",
        details: error,
      },
    };
  }
}
