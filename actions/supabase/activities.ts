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
import { fetchPlaceDetails } from "@/actions/google/actions";

type AddPlaceToItineraryInput = {
  itineraryId: string;
  destinationId: string;
  placeId: string;
  date?: string | null;
  startTime?: string | null;
  endTime?: string | null;
  notes?: string | null;
};

type AddPlaceToItineraryResult = {
  activity: Activity;
  itineraryActivity: ItineraryActivity;
};

const normalizeTimeToHHmmss = (value: string | null | undefined): string | null => {
  if (value == null) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;

  const match = trimmed.match(/^(\d{2}):(\d{2})(?::(\d{2}))?$/);
  if (!match) return null;

  const hh = Number(match[1]);
  const mm = Number(match[2]);
  const ss = Number(match[3] ?? 0);

  if (hh < 0 || hh > 23) return null;
  if (mm < 0 || mm > 59) return null;
  if (ss < 0 || ss > 59) return null;

  return `${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}:${String(ss).padStart(2, "0")}`;
};

const normalizePlaceId = (value: string) => {
  const trimmed = value.trim();
  return trimmed.startsWith("places/") ? trimmed.slice("places/".length) : trimmed;
};

/**
 * Adds a Google place to an itinerary (creates/updates activity + creates/updates itinerary_activity).
 * This is the server-side equivalent of the client store insert logic, for AI/tooling workflows.
 */
export async function addPlaceToItinerary(
  input: AddPlaceToItineraryInput
): Promise<DatabaseResponse<AddPlaceToItineraryResult>> {
  const supabase = createClient();

  try {
    const itineraryIdValue = String(input.itineraryId ?? "").trim();
    const destinationIdValue = String(input.destinationId ?? "").trim();
    if (!/^\d+$/.test(itineraryIdValue) || !/^\d+$/.test(destinationIdValue)) {
      return {
        success: false,
        error: { message: "Invalid itinerary or destination id" },
      };
    }

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return {
        success: false,
        error: { message: "User not authenticated" },
      };
    }

    const placeId = normalizePlaceId(String(input.placeId ?? ""));
    if (!placeId) {
      return { success: false, error: { message: "Place id is required" } };
    }

    const place = await fetchPlaceDetails(placeId);
    const [lng, lat] = Array.isArray((place as any).coordinates) ? (place as any).coordinates : [null, null];

    const activityPayload: CreateActivityData = createActivitySchema.parse({
      place_id: (place as any).place_id ?? placeId,
      name: (place as any).name ?? "",
      coordinates: Number.isFinite(lat) && Number.isFinite(lng) ? { lat, lng } : undefined,
      types: Array.isArray((place as any).types) ? (place as any).types : [],
      price_level: (place as any).price_level || undefined,
      address: (place as any).address || undefined,
      rating: (place as any).rating ?? undefined,
      description: (place as any).description || undefined,
      google_maps_url: (place as any).google_maps_url || undefined,
      website_url: (place as any).website_url || undefined,
      photo_names: Array.isArray((place as any).photo_names) ? (place as any).photo_names : [],
      duration: typeof (place as any).duration === "number" ? (place as any).duration : undefined,
      phone_number: (place as any).phone_number || undefined,
    });

    const upserted = await createOrUpdateActivity(activityPayload);
    if (!upserted.success || !upserted.data) {
      return {
        success: false,
        error: upserted.error ?? { message: "Failed to create activity" },
      };
    }

    const activity = upserted.data;
    const itineraryId = Number(itineraryIdValue);
    const destinationId = Number(destinationIdValue);

    const normalizedStart = input.startTime === undefined ? undefined : normalizeTimeToHHmmss(input.startTime);
    const normalizedEnd = input.endTime === undefined ? undefined : normalizeTimeToHHmmss(input.endTime);
    const touchesTime = input.startTime !== undefined || input.endTime !== undefined;
    if (touchesTime && (input.startTime === undefined || input.endTime === undefined)) {
      return {
        success: false,
        error: { message: "When setting time, provide both startTime and endTime (or set both to null)." },
      };
    }
    if (input.startTime != null && normalizedStart == null) {
      return { success: false, error: { message: "Invalid start time format" } };
    }
    if (input.endTime != null && normalizedEnd == null) {
      return { success: false, error: { message: "Invalid end time format" } };
    }
    if (typeof normalizedStart === "string" && typeof normalizedEnd === "string" && normalizedStart >= normalizedEnd) {
      return { success: false, error: { message: "Start time must be before end time" } };
    }

    const desiredDate = input.date === undefined ? undefined : input.date;
    const desiredNotes = input.notes === undefined ? undefined : input.notes;

    const { data: existingRows, error: existingError } = await supabase
      .from("itinerary_activity")
      .select("*")
      .eq("itinerary_id", itineraryId)
      .eq("activity_id", activity.activity_id)
      .order("itinerary_activity_id", { ascending: false })
      .limit(1);

    if (existingError) {
      return {
        success: false,
        error: { message: "Failed to check existing itinerary activity", code: existingError.code, details: existingError },
      };
    }

    const existing = Array.isArray(existingRows) ? (existingRows[0] as any) : null;

    const buildUpdate = () => {
      const effectiveDate = desiredDate !== undefined ? desiredDate : (existing?.date ?? null);
      const update: Record<string, any> = {
        deleted_at: null,
        itinerary_destination_id: destinationId,
      };

      if (desiredDate !== undefined) {
        update.date = desiredDate;
        if (desiredDate === null) {
          update.start_time = null;
          update.end_time = null;
        }
      }

      const allowTimes = effectiveDate !== null && desiredDate !== null;
      if (allowTimes) {
        if (normalizedStart !== undefined) update.start_time = normalizedStart;
        if (normalizedEnd !== undefined) update.end_time = normalizedEnd;
      }

      if (desiredNotes !== undefined) update.notes = desiredNotes;

      return update;
    };

    let itineraryActivity: ItineraryActivity;

    if (existing?.itinerary_activity_id != null) {
      const update = buildUpdate();
      const { data: updated, error: updateError } = await supabase
        .from("itinerary_activity")
        .update(update)
        .eq("itinerary_activity_id", existing.itinerary_activity_id)
        .select()
        .single();

      if (updateError || !updated) {
        return {
          success: false,
          error: { message: "Failed to update itinerary activity", code: updateError?.code, details: updateError },
        };
      }

      itineraryActivity = updated as ItineraryActivity;
    } else {
      const insert: Record<string, any> = {
        itinerary_id: itineraryId,
        itinerary_destination_id: destinationId,
        activity_id: activity.activity_id,
        deleted_at: null,
        date: desiredDate ?? null,
        start_time: null,
        end_time: null,
        notes: desiredNotes ?? null,
      };

      if (insert.date !== null) {
        if (normalizedStart !== undefined) insert.start_time = normalizedStart;
        if (normalizedEnd !== undefined) insert.end_time = normalizedEnd;
      }

      const { data: inserted, error: insertError } = await supabase
        .from("itinerary_activity")
        .insert(insert)
        .select()
        .single();

      if (insertError || !inserted) {
        return {
          success: false,
          error: { message: "Failed to create itinerary activity", code: insertError?.code, details: insertError },
        };
      }

      itineraryActivity = inserted as ItineraryActivity;
    }

    revalidatePath(`/itinerary/${itineraryId}`);

    return {
      success: true,
      data: {
        activity,
        itineraryActivity,
      },
    };
  } catch (error: any) {
    console.error("Error in addPlaceToItinerary:", error);
    const isZodError = error?.name === "ZodError";
    return {
      success: false,
      error: {
        message: isZodError ? "Failed to add place. Please try again." : error.message || "An unexpected error occurred",
        details: error,
      },
    };
  }
}

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
    const isZodError = error?.name === "ZodError";
    return {
      success: false,
      error: { 
        message: isZodError ? "Invalid activity data" : error.message || "An unexpected error occurred",
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
