"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/utils/supabase/server";
import { 
  createActivitySchema,
  scheduleActivitySchema,
  updateActivityScheduleSchema,
  type CreateActivityData,
  type ScheduleActivityData,
  type UpdateActivityScheduleData
} from "@/schemas/activitySchema";
import type { 
  Activity,
  ActivityWithDetails,
  ItineraryActivity,
  ItineraryActivityWithActivity,
  DatabaseResponse 
} from "@/types/database";

/**
 * Creates or updates an activity (place) in the database
 */
export async function createOrUpdateActivity(data: CreateActivityData): Promise<DatabaseResponse<Activity>> {
  const supabase = createClient();

  try {
    // Validate input data
    const validatedData = createActivitySchema.parse(data);

    // Convert coordinates if provided
    const activityData = {
      ...validatedData,
      coordinates: validatedData.coordinates 
        ? `(${validatedData.coordinates.lat},${validatedData.coordinates.lng})`
        : null,
      duration: validatedData.duration ? `${validatedData.duration} minutes` : null,
    };

    // Use upsert to create or update based on place_id
    const { data: activity, error } = await supabase
      .from("activity")
      .upsert(activityData, {
        onConflict: "place_id",
        ignoreDuplicates: false
      })
      .select()
      .single();

    if (error) {
      return {
        success: false,
        error: { 
          message: "Failed to create/update activity",
          code: error.code,
          details: error
        }
      };
    }

    return {
      success: true,
      data: activity
    };

  } catch (error: any) {
    console.error("Error in createOrUpdateActivity:", error);
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
 * Gets an activity by place ID with reviews and opening hours
 */
export async function getActivity(placeId: string): Promise<DatabaseResponse<ActivityWithDetails>> {
  const supabase = createClient();

  try {
    const { data, error } = await supabase
      .from("activity")
      .select(`
        *,
        reviews:review(*),
        open_hours:open_hours(*)
      `)
      .eq("place_id", placeId)
      .single();

    if (error) {
      return {
        success: false,
        error: { 
          message: error.code === "PGRST116" ? "Activity not found" : "Failed to fetch activity",
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
    console.error("Error in getActivity:", error);
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
 * Schedules an activity for a specific itinerary
 */
export async function scheduleActivity(data: ScheduleActivityData): Promise<DatabaseResponse<ItineraryActivity>> {
  const supabase = createClient();

  try {
    // Validate input data
    const validatedData = scheduleActivitySchema.parse(data);

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
      .eq("itinerary_id", validatedData.itinerary_id)
      .single();

    if (checkError || itinerary?.user_id !== user.id) {
      return {
        success: false,
        error: { message: "Itinerary not found or access denied" }
      };
    }

    // Convert date and times to proper format
    const scheduleData = {
      ...validatedData,
      date: validatedData.date.toISOString().split('T')[0], // Convert to YYYY-MM-DD
    };

    const { data: scheduledActivity, error } = await supabase
      .from("itinerary_activity")
      .insert(scheduleData)
      .select()
      .single();

    if (error) {
      return {
        success: false,
        error: { 
          message: "Failed to schedule activity",
          code: error.code,
          details: error
        }
      };
    }

    revalidatePath(`/itinerary/${validatedData.itinerary_id}`);

    return {
      success: true,
      data: scheduledActivity
    };

  } catch (error: any) {
    console.error("Error in scheduleActivity:", error);
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
 * Updates a scheduled activity
 */
export async function updateActivitySchedule(
  activityId: number, 
  data: UpdateActivityScheduleData
): Promise<DatabaseResponse<ItineraryActivity>> {
  const supabase = createClient();

  try {
    // Validate input data
    const validatedData = updateActivityScheduleSchema.parse(data);

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      return {
        success: false,
        error: { message: "User not authenticated" }
      };
    }

    // Verify user owns the itinerary
    const { data: activity, error: checkError } = await supabase
      .from("itinerary_activity")
      .select(`
        *,
        itinerary!inner(user_id)
      `)
      .eq("itinerary_activity_id", activityId)
      .is("deleted_at", null)
      .single();

    if (checkError || !activity || (activity as any)?.itinerary?.user_id !== user.id) {
      return {
        success: false,
        error: { message: "Scheduled activity not found or access denied" }
      };
    }

    // Convert date if provided
    const updateData = {
      ...validatedData,
      date: validatedData.date ? validatedData.date.toISOString().split('T')[0] : undefined,
    };

    const { data: updatedActivity, error } = await supabase
      .from("itinerary_activity")
      .update(updateData)
      .eq("itinerary_activity_id", activityId)
      .select()
      .single();

    if (error) {
      return {
        success: false,
        error: { 
          message: "Failed to update scheduled activity",
          code: error.code,
          details: error
        }
      };
    }

    revalidatePath(`/itinerary/${activity.itinerary_id}`);

    return {
      success: true,
      data: updatedActivity
    };

  } catch (error: any) {
    console.error("Error in updateActivitySchedule:", error);
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
 * Removes an activity from the schedule (soft delete)
 */
export async function removeActivityFromSchedule(activityId: number): Promise<DatabaseResponse<null>> {
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
    const { data: activity, error: checkError } = await supabase
      .from("itinerary_activity")
      .select(`
        itinerary_id,
        itinerary!inner(user_id)
      `)
      .eq("itinerary_activity_id", activityId)
      .is("deleted_at", null)
      .single();

    if (checkError || !activity || (activity as any)?.itinerary?.user_id !== user.id) {
      return {
        success: false,
        error: { message: "Scheduled activity not found or access denied" }
      };
    }

    const { error } = await supabase
      .from("itinerary_activity")
      .update({ 
        deleted_at: new Date().toISOString(),
        date: null,
        start_time: null,
        end_time: null
      })
      .eq("itinerary_activity_id", activityId);

    if (error) {
      return {
        success: false,
        error: { 
          message: "Failed to remove activity from schedule",
          code: error.code,
          details: error
        }
      };
    }

    revalidatePath(`/itinerary/${activity.itinerary_id}`);

    return {
      success: true,
      data: null
    };

  } catch (error: any) {
    console.error("Error in removeActivityFromSchedule:", error);
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
 * Gets all scheduled activities for an itinerary
 */
export async function getItineraryActivities(
  itineraryId: number,
  destinationId?: number
): Promise<DatabaseResponse<ItineraryActivityWithActivity[]>> {
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

    let query = supabase
      .from("itinerary_activity")
      .select(`
        *,
        activity:activity_id(
          *,
          reviews:review(*),
          open_hours:open_hours(*)
        )
      `)
      .eq("itinerary_id", itineraryId)
      .is("deleted_at", null)
      .order("date", { ascending: true })
      .order("start_time", { ascending: true });

    if (destinationId) {
      query = query.eq("itinerary_destination_id", destinationId);
    }

    const { data, error } = await query;

    if (error) {
      return {
        success: false,
        error: { 
          message: "Failed to fetch itinerary activities",
          code: error.code,
          details: error
        }
      };
    }

    return {
      success: true,
      data: data as ItineraryActivityWithActivity[]
    };

  } catch (error: any) {
    console.error("Error in getItineraryActivities:", error);
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
 * Reorders activities within a day
 */
export async function reorderActivities(
  activityUpdates: { id: number; order_in_day: number }[]
): Promise<DatabaseResponse<null>> {
  const supabase = createClient();

  try {
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      return {
        success: false,
        error: { message: "User not authenticated" }
      };
    }

    // Verify all activities belong to user's itineraries
    const activityIds = activityUpdates.map(update => update.id);
    const { data: activities, error: checkError } = await supabase
      .from("itinerary_activity")
      .select(`
        itinerary_activity_id,
        itinerary!inner(user_id)
      `)
      .in("itinerary_activity_id", activityIds)
      .is("deleted_at", null);

    if (checkError || !activities || (activities as any[])?.some(activity => activity.itinerary?.user_id !== user.id)) {
      return {
        success: false,
        error: { message: "One or more activities not found or access denied" }
      };
    }

    // Update all activities
    const updatePromises = activityUpdates.map(update =>
      supabase
        .from("itinerary_activity")
        .update({ order_in_day: update.order_in_day })
        .eq("itinerary_activity_id", update.id)
    );

    await Promise.all(updatePromises);

    // Get itinerary ID for revalidation
    const itineraryId = (activities as any)?.[0]?.itinerary?.itinerary_id;
    if (itineraryId) {
      revalidatePath(`/itinerary/${itineraryId}`);
    }

    return {
      success: true,
      data: null
    };

  } catch (error: any) {
    console.error("Error in reorderActivities:", error);
    return {
      success: false,
      error: { 
        message: error.message || "An unexpected error occurred",
        details: error
      }
    };
  }
}