"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/utils/supabase/server";
import { 
  createItinerarySchema, 
  updateItinerarySchema,
  createDestinationSchema,
  updateDestinationSchema,
  type CreateItineraryData,
  type UpdateItineraryData,
  type CreateDestinationData,
  type UpdateDestinationData
} from "@/schemas/itinerarySchema";
import type { 
  Itinerary, 
  ItineraryWithDestinations, 
  ItineraryDestination,
  DatabaseResponse 
} from "@/types/database";

/**
 * Creates a new itinerary for the authenticated user
 */
export async function createItinerary(
  data: CreateItineraryData & { destination: CreateDestinationData }
): Promise<DatabaseResponse<{ itinerary: Itinerary; destination: ItineraryDestination }>> {
  const supabase = createClient();

  try {
    // Validate input data
    const validatedItinerary = createItinerarySchema.parse(data);
    const validatedDestination = createDestinationSchema.parse(data.destination);

    // Get the current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      return {
        success: false,
        error: { message: "User not authenticated" }
      };
    }

    // Start transaction - create itinerary first
    const { data: itineraryData, error: itineraryError } = await supabase
      .from("itinerary")
      .insert({
        user_id: user.id,
        ...validatedItinerary,
      })
      .select()
      .single();

    if (itineraryError) {
      return {
        success: false,
        error: { 
          message: "Failed to create itinerary",
          code: itineraryError.code,
          details: itineraryError
        }
      };
    }

    // Create destination
    const { data: destinationData, error: destinationError } = await supabase
      .from("itinerary_destination")
      .insert({
        itinerary_id: itineraryData.itinerary_id,
        ...validatedDestination,
      })
      .select()
      .single();

    if (destinationError) {
      // Rollback: delete the itinerary if destination creation fails
      await supabase
        .from("itinerary")
        .delete()
        .eq("itinerary_id", itineraryData.itinerary_id);

      return {
        success: false,
        error: { 
          message: "Failed to create destination",
          code: destinationError.code,
          details: destinationError
        }
      };
    }

    revalidatePath("/itineraries");

    return {
      success: true,
      data: {
        itinerary: itineraryData,
        destination: destinationData
      }
    };

  } catch (error: any) {
    console.error("Error in createItinerary:", error);
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
 * Gets all itineraries for the authenticated user
 */
export async function getItineraries(): Promise<DatabaseResponse<ItineraryWithDestinations[]>> {
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
      .from("itinerary")
      .select(`
        *,
        destinations:itinerary_destination(*)
      `)
      .eq("user_id", user.id)
      .is("deleted_at", null)
      .order("created_at", { ascending: false });

    if (error) {
      return {
        success: false,
        error: { 
          message: "Failed to fetch itineraries",
          code: error.code,
          details: error
        }
      };
    }

    return {
      success: true,
      data: data as ItineraryWithDestinations[]
    };

  } catch (error: any) {
    console.error("Error in getItineraries:", error);
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
 * Gets a specific itinerary by ID
 */
export async function getItinerary(id: number): Promise<DatabaseResponse<ItineraryWithDestinations>> {
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
      .from("itinerary")
      .select(`
        *,
        destinations:itinerary_destination(*)
      `)
      .eq("itinerary_id", id)
      .eq("user_id", user.id)
      .is("deleted_at", null)
      .single();

    if (error) {
      return {
        success: false,
        error: { 
          message: error.code === "PGRST116" ? "Itinerary not found" : "Failed to fetch itinerary",
          code: error.code,
          details: error
        }
      };
    }

    return {
      success: true,
      data: data as ItineraryWithDestinations
    };

  } catch (error: any) {
    console.error("Error in getItinerary:", error);
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
 * Updates an existing itinerary
 */
export async function updateItinerary(
  id: number, 
  data: UpdateItineraryData
): Promise<DatabaseResponse<Itinerary>> {
  const supabase = createClient();

  try {
    // Validate input data
    const validatedData = updateItinerarySchema.parse(data);

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      return {
        success: false,
        error: { message: "User not authenticated" }
      };
    }

    const { data: updatedData, error } = await supabase
      .from("itinerary")
      .update(validatedData)
      .eq("itinerary_id", id)
      .eq("user_id", user.id)
      .is("deleted_at", null)
      .select()
      .single();

    if (error) {
      return {
        success: false,
        error: { 
          message: error.code === "PGRST116" ? "Itinerary not found" : "Failed to update itinerary",
          code: error.code,
          details: error
        }
      };
    }

    revalidatePath("/itineraries");
    revalidatePath(`/itinerary/${id}`);

    return {
      success: true,
      data: updatedData
    };

  } catch (error: any) {
    console.error("Error in updateItinerary:", error);
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
 * Soft deletes an itinerary
 */
export async function deleteItinerary(id: number): Promise<DatabaseResponse<null>> {
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
      .from("itinerary")
      .update({ deleted_at: new Date().toISOString() })
      .eq("itinerary_id", id)
      .eq("user_id", user.id);

    if (error) {
      return {
        success: false,
        error: { 
          message: "Failed to delete itinerary",
          code: error.code,
          details: error
        }
      };
    }

    revalidatePath("/itineraries");

    return {
      success: true,
      data: null
    };

  } catch (error: any) {
    console.error("Error in deleteItinerary:", error);
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
 * Duplicates an existing itinerary
 */
export async function duplicateItinerary(id: number): Promise<DatabaseResponse<ItineraryWithDestinations>> {
  const supabase = createClient();

  try {
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      return {
        success: false,
        error: { message: "User not authenticated" }
      };
    }

    // Get the original itinerary with destinations
    const originalResult = await getItinerary(id);
    if (!originalResult.success || !originalResult.data) {
      return originalResult as DatabaseResponse<ItineraryWithDestinations>;
    }

    const original = originalResult.data;

    // Create a copy of the itinerary
    const { data: newItinerary, error: itineraryError } = await supabase
      .from("itinerary")
      .insert({
        user_id: user.id,
        title: `${original.title || "Untitled"} (Copy)`,
        description: original.description,
        adults: original.adults,
        kids: original.kids,
        budget: original.budget,
        currency: original.currency,
        is_public: false, // Copies are private by default
      })
      .select()
      .single();

    if (itineraryError) {
      return {
        success: false,
        error: { 
          message: "Failed to duplicate itinerary",
          code: itineraryError.code,
          details: itineraryError
        }
      };
    }

    // Copy destinations
    const destinationCopies = original.destinations.map(dest => ({
      itinerary_id: newItinerary.itinerary_id,
      city: dest.city,
      country: dest.country,
      from_date: dest.from_date,
      to_date: dest.to_date,
      order_number: dest.order_number,
      accommodation_notes: dest.accommodation_notes,
      transportation_notes: dest.transportation_notes,
    }));

    const { data: newDestinations, error: destinationError } = await supabase
      .from("itinerary_destination")
      .insert(destinationCopies)
      .select();

    if (destinationError) {
      // Rollback: delete the itinerary if destination copying fails
      await supabase
        .from("itinerary")
        .delete()
        .eq("itinerary_id", newItinerary.itinerary_id);

      return {
        success: false,
        error: { 
          message: "Failed to copy destinations",
          code: destinationError.code,
          details: destinationError
        }
      };
    }

    revalidatePath("/itineraries");

    return {
      success: true,
      data: {
        ...newItinerary,
        destinations: newDestinations
      } as ItineraryWithDestinations
    };

  } catch (error: any) {
    console.error("Error in duplicateItinerary:", error);
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
 * Updates an itinerary destination
 */
export async function updateDestination(
  destinationId: number, 
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

    revalidatePath("/itineraries");
    revalidatePath(`/itinerary/${destination.itinerary_id}`);

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