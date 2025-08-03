"use server";
import { IItineraryCard } from "@/components/cards/itineraryCard";
import { createClient } from "@/utils/supabase/server";

/*
  INSERT
*/
export async function insertTableData(tableName: string, tableData: any) {
  const supabase = createClient();

  const { data, error } = await supabase.from(tableName).insert(tableData).select();

  if (error) {
    console.log(error);
    return { success: false, message: "Insert failed", error };
  }

  return { success: true, message: "Insert successful", data: data };
}

export async function createNewItinerary(
  destination: string,
  dateRange: { from: Date; to: Date },
  adultsCount: number,
  kidsCount: number
) {
  const supabase = createClient();

  try {
    // Get the current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      throw new Error("User not authenticated");
    }

    // Insert itinerary data
    const { data: itineraryData, error: itineraryError } = await supabase
      .from("itinerary")
      .insert([
        {
          user_id: user.id,
          adults: adultsCount,
          kids: kidsCount,
        },
      ])
      .select("itinerary_id")
      .single();

    if (itineraryError) throw itineraryError;

    const selectedLocation = destination.split(", ");
    const city = selectedLocation[0];
    const country = selectedLocation[1];

    // Insert destination data
    const { error: destinationError } = await supabase.from("itinerary_destination").insert([
      {
        itinerary_id: itineraryData.itinerary_id,
        city: city,
        country: country,
        order_number: 1,
        from_date: dateRange.from.toISOString().split('T')[0], // Convert to YYYY-MM-DD
        to_date: dateRange.to.toISOString().split('T')[0], // Convert to YYYY-MM-DD
      },
    ]);

    if (destinationError) throw destinationError;

    return { success: true };
  } catch (error) {
    console.error("Error creating itinerary:", error);
    return { success: false, error };
  }
}

/*
  SET
*/
export async function setTableData(tableName: string, tableData: any, uniqueColumns: string[]) {
  const supabase = createClient();

  const { data, error } = await supabase
    .from(tableName)
    .upsert(tableData, {
      onConflict: uniqueColumns.join(","),
      ignoreDuplicates: false,
    })
    .select();

  if (error) {
    console.log(error);
    return { success: false, message: "Upsert failed", error };
  }

  return { success: true, message: "Upsert successful", data: data };
}

export async function setTableDataWithCheck(tableName: string, tableData: any, uniqueColumns: string[]) {
  const supabase = createClient();

  const identifyingData = {};
  const updateData = {};
  for (const key in tableData) {
    if (uniqueColumns.includes(key)) {
      (identifyingData as any)[key] = tableData[key];
    } else {
      (updateData as any)[key] = tableData[key];
    }
  }

  const { data: existingData, error: selectError } = await supabase
    .from(tableName)
    .select()
    .match(identifyingData)
    .maybeSingle();

  if (selectError) {
    console.error("Error checking existing data:", selectError);
    return { success: false, message: "Check failed", error: selectError };
  }

  let result;
  if (existingData) {
    result = await supabase.from(tableName).update(updateData).match(identifyingData).select();
  } else {
    result = await supabase
      .from(tableName)
      .insert({ ...identifyingData, ...updateData })
      .select();
  }

  if (result.error) {
    console.error("Operation failed:", result.error);
    return { success: false, message: "Operation failed", error: result.error };
  }

  return { success: true, message: "Operation successful", data: result.data };
}

export async function setItineraryDestinationDateRange(
  itineraryId: string,
  destinationId: string,
  dateRange: { from: Date; to: Date }
) {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("itinerary_destination")
    .update({
      from_date: dateRange.from,
      to_date: dateRange.to,
    })
    .eq("itinerary_id", itineraryId)
    .eq("itinerary_destination_id", destinationId);

  if (error) {
    console.error("Error setting date range:", error);
    return { success: false, message: "Set date range failed", error };
  }

  return { success: true, message: "Set date range successful", data };
}

export async function setItineraryActivityDateTimes(
  itineraryActivityId: string,
  date: string,
  startTime: string,
  endTime: string
) {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("itinerary_activity")
    .update({
      date: date,
      start_time: startTime,
      end_time: endTime,
    })
    .eq("itinerary_activity_id", itineraryActivityId);

  if (error) {
    console.error("Error setting date range:", error);
    return { success: false, message: "Set date range failed", error };
  }

  return { success: true, message: "Set date range successful", data };
}

export async function setItineraryActivityTimes(itineraryActivityId: string, startTime: string, endTime: string) {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("itinerary_activity")
    .update({
      start_time: startTime,
      end_time: endTime,
    })
    .eq("itinerary_activity_id", itineraryActivityId);

  if (error) {
    console.error("Error setting date range:", error);
    return { success: false, message: "Set date range failed", error };
  }

  return { success: true, message: "Set date range successful", data };
}

/*
  DELETE
*/
export async function deleteTableData(tableName: string, matchConditions: Record<string, any>) {
  const supabase = createClient();

  const { data, error } = await supabase.from(tableName).delete().match(matchConditions);

  if (error) {
    console.error("Delete failed:", error);
    return { success: false, message: "Delete failed", error };
  }

  return { success: true, message: "Delete successful", data };
}

export async function softDeleteTableData(tableName: string, matchConditions: Record<string, any>) {
  const supabase = createClient();

  const { data, error } = await supabase
    .from(tableName)
    .update({
      deleted_at: new Date().toISOString(),
    })
    .match(matchConditions);

  if (error) {
    console.error("Soft delete failed:", error);
    return { success: false, message: "Soft delete failed", error };
  }

  return { success: true, message: "Soft delete successful", data };
}

export async function softDeleteTableData2(tableName: string, matchConditions: Record<string, any>) {
  const supabase = createClient();

  const { data, error } = await supabase
    .from(tableName)
    .update({
      deleted_at: new Date().toISOString(),
      date: null,
      start_time: null,
      end_time: null,
    })
    .match(matchConditions);

  if (error) {
    console.error("Soft delete failed:", error);
    return { success: false, message: "Soft delete failed", error };
  }

  return { success: true, message: "Soft delete successful", data };
}

export const softDeleteItinerary = async (itineraryId: number) => {
  const supabase = createClient();

  try {
    const { data, error } = await supabase
      .from("itinerary")
      .update({ deleted_at: new Date().toISOString() })
      .eq("itinerary_id", itineraryId)
      .select();

    if (error) throw error;

    return { success: true, data };
  } catch (error) {
    console.error("Error soft deleting itinerary:", error);
    return { success: false, error };
  }
};

export const permanentlyDeleteUser = async (userId: string) => {
  const supabase = createClient();

  try {
    // Delete user's data from all related tables
    await supabase.from("itinerary").delete().eq("user_id", userId);
    // Add other table deletions as needed

    // Finally delete the user account
    const { error } = await supabase.auth.admin.deleteUser(userId);
    if (error) throw error;

    return { success: true };
  } catch (error) {
    console.error("Error permanently deleting user:", error);
    return { success: false, error };
  }
};

export const deleteItinerarySearchHistory = async (itineraryId: string, itineraryDestinationId: string) => {
  const supabase = createClient();

  try {
    await supabase
      .from("itinerary_search_history")
      .delete()
      .eq("itinerary_id", itineraryId)
      .eq("itinerary_destination_id", itineraryDestinationId);

    return { success: true };
  } catch (error) {
    console.error("Error deleting search history:", error);
    return { success: false, error };
  }
};

/*
  FETCH
*/
export async function fetchTableData(
  tableName: string,
  columns: string = "*",
  filterColumn?: string,
  filterValue?: string[],
  additionalFilter?: string
) {
  const supabase = createClient();

  let query = supabase.from(tableName).select(columns);

  if (filterColumn && filterValue) {
    query = query.in(filterColumn, filterValue);
  }

  if (additionalFilter) {
    query = query.or(additionalFilter);
  }

  const { data, error } = await query;

  if (error) {
    console.error(`Error fetching ${tableName} data:`, error);
    return { error };
  }

  return { data };
}

export async function fetchFilteredTableData(
  tableName: string,
  columnNames: string,
  columnFilterName: string,
  filterValues: string[]
): Promise<{ success: boolean; message: string; data?: any[]; error?: any }> {
  const supabase = createClient();

  const { data, error } = await supabase.from(tableName).select(columnNames).in(columnFilterName, filterValues);

  if (error) {
    console.log(error);
    return { success: false, message: "Fetch failed", error };
  }

  return { success: true, message: "Fetch successful", data: data };
}

export async function fetchFilteredTableData2(
  tableName: string,
  columnNames: string,
  filterConditions: Record<string, any>
): Promise<{ success: boolean; message: string; data?: any[]; error?: any }> {
  const supabase = createClient();

  let query = supabase.from(tableName).select(columnNames);

  for (const [key, value] of Object.entries(filterConditions)) {
    query = query.eq(key, value);
  }

  const { data, error } = await query;

  if (error) {
    console.error("Fetch failed:", error);
    return { success: false, message: "Fetch failed", error };
  }

  return { success: true, message: "Fetch successful", data: data };
}

export const fetchCityDetails = async (itineraryId: any) => {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("itinerary_destination")
    .select(
      `
      destination_city_id,
      cities!itinerary_destination_destination_city_id_fkey (
        city_name,
        city_description,
        broadband_speed,
        mobile_speed,
        plugs,
        voltage,
        power_standard,
        frequency,
        emergency_fire,
        emergency_police,
        emergency_ambulance,
        country_id,
        countries!cities_country_id_fkey (
          country_name
        )
      )
    `
    )
    .eq("itinerary_id", itineraryId);

  if (error) {
    console.error("Error fetching city data:", error);
    return { error };
  }

  return { data };
};

export const fetchItineraryDestination = async (itineraryId: string) => {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("itinerary_destination")
    .select(
      `
      itinerary_destination_id,
      city,
      country,
      from_date,
      to_date
    `
    )
    .eq("itinerary_id", itineraryId)
    .single();

  if (error) {
    console.error("Error fetching itinerary destination:", error);
    return { error };
  }

  return { data };
};

export async function fetchItineraryDestinationDateRange(itineraryId: string, destinationId: string) {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("itinerary_destination")
    .select("from_date, to_date")
    .eq("itinerary_id", itineraryId)
    .eq("itinerary_destination_id", destinationId)
    .single();

  if (error) {
    console.error("Error fetching date range:", error);
    return { success: false, message: "Fetch date range failed", error };
  }

  return {
    success: true,
    data: {
      from: new Date(data.from_date),
      to: new Date(data.to_date),
    },
  };
}

export async function fetchActivityIdByPlaceId(placeId: string) {
  const supabase = createClient();

  const { data, error } = await supabase.from("activity").select("activity_id").eq("place_id", placeId).single();

  if (error) {
    console.error("Error fetching activity_id:", error);
    return { success: false, message: "Fetch failed", error };
  }

  return { success: true, message: "Fetch successful", data };
}

export async function fetchItineraryActivities(itineraryId: string, destinationId: string) {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("itinerary_activity")
    .select("*")
    .eq("itinerary_id", itineraryId)
    .eq("itinerary_destination_id", destinationId);

  if (error) {
    console.error("Error fetching activity_id:", error);
    return { success: false, message: "Fetch failed", error };
  }

  return { success: true, message: "Fetch successful", data };
}

/*
  CHECK
*/
export const checkEntryExists = async (tableName: string, filterParams: Record<string, any>) => {
  const supabase = createClient();

  let query = supabase.from(tableName).select("*");

  for (const [key, value] of Object.entries(filterParams)) {
    query = query.eq(key, value);
  }

  const { data, error } = await query.limit(1);

  if (error) {
    console.error("Error fetching data:", error);
    return { exists: false, error };
  }

  return { exists: data && data.length > 0 };
};

export async function addSearchHistoryItem(itineraryId: string, itineraryDestinationId: string, placeId: string) {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("itinerary_search_history")
    .insert({
      itinerary_id: itineraryId,
      itinerary_destination_id: itineraryDestinationId,
      place_id: placeId,
      searched_at: new Date().toISOString(),
    })
    .select();

  if (error) {
    console.error("Error adding search history item:", error);
    return null;
  }

  return data;
}

export const fetchSearchHistoryActivities = async (itineraryId: string, destinationId: string) => {
  const supabase = createClient();

  const { data: searchHistory, error: searchError } = await supabase
    .from("itinerary_search_history")
    .select("place_id")
    .eq("itinerary_id", itineraryId)
    .eq("itinerary_destination_id", destinationId);

  if (searchError) {
    console.error("Error fetching search history:", searchError);
    return { error: searchError };
  }

  const formattedPlaceIds = searchHistory.map((item) => item.place_id.split("/").pop());

  const { data: activities, error: activitiesError } = await supabase
    .from("activity")
    .select(
      `
      *,
      review (*),
      open_hours (*)
    `
    )
    .in("place_id", formattedPlaceIds);

  if (activitiesError) {
    console.error("Error fetching activities:", activitiesError);
    return { error: activitiesError };
  }

  const mappedActivities = activities.map((activity) => {
    const { review, ...activityWithoutReview } = activity;
    return {
      ...activityWithoutReview,
      reviews: review || [],
      open_hours: activity.open_hours || [],
    };
  });

  const existingPlaceIds = mappedActivities.map((activity) => activity.place_id);
  const missingPlaceIds = formattedPlaceIds.filter((placeId) => !existingPlaceIds.includes(placeId));

  return { activities: mappedActivities, missingPlaceIds };
};

export async function fetchUserItineraries(userId: string): Promise<{ data: IItineraryCard[] | null; error: any }> {
  const supabase = createClient();

  try {
    const { data, error } = await supabase
      .from("itinerary_destination")
      .select(
        `
        itinerary_destination_id,
        itinerary_id,
        city,
        country,
        from_date,
        to_date,
        itinerary!inner (
          deleted_at,
          user_id
        )
      `
      )
      .eq("itinerary.user_id", userId)
      .is("itinerary.deleted_at", null);

    if (error) throw error;

    const mappedData = data.map((item) => ({
      itinerary_destination_id: item.itinerary_destination_id,
      itinerary_id: item.itinerary_id,
      city: item.city,
      country: item.country,
      from_date: new Date(item.from_date),
      to_date: new Date(item.to_date),
      deleted_at: null,
    }));

    return { data: mappedData, error: null };
  } catch (error) {
    console.error("Error fetching itineraries:", error);
    return { data: null, error };
  }
}

export const insertActivity = async (placeDetails: any): Promise<any> => {
  const supabase = createClient();

  try {
    // Check if activity exists by place_id
    const { data: existingActivity, error: checkError } = await supabase
      .from("activity")
      .select("*")
      .eq("place_id", placeDetails.place_id)
      .single();

    if (checkError && checkError.code !== "PGRST116") {
      // PGRST116 is "not found" error
      throw checkError;
    }

    // If activity exists, return it
    if (existingActivity) {
      return {
        ...existingActivity,
        reviews: placeDetails.reviews || [],
        open_hours: placeDetails.open_hours || [],
      };
    }

    // If activity doesn't exist, insert it
    const { data: activity, error: activityError } = await supabase
      .from("activity")
      .insert({
        place_id: placeDetails.place_id,
        name: placeDetails.name,
        coordinates: placeDetails.coordinates,
        types: placeDetails.types || [],
        price_level: placeDetails.price_level || "",
        address: placeDetails.address,
        rating: placeDetails.rating || null,
        description: placeDetails.description || "",
        google_maps_url: placeDetails.google_maps_url || "",
        website_url: placeDetails.website_url || "",
        photo_names: placeDetails.photo_names || [],
        duration: placeDetails.duration || null,
        phone_number: placeDetails.phone_number || "",
      })
      .select()
      .single();

    if (activityError) throw activityError;

    // Insert reviews if they exist
    let reviews: any[] = [];
    if (placeDetails.reviews && placeDetails.reviews.length > 0) {
      const { data: reviewsData, error: reviewError } = await supabase
        .from("review")
        .insert(
          placeDetails.reviews.map((review: any) => ({
            activity_id: activity.activity_id,
            description: review.description,
            rating: review.rating,
            author: review.author,
            uri: review.uri,
            publish_date_time: review.publish_date_time,
          }))
        )
        .select();

      if (!reviewError) {
        reviews = reviewsData;
      }
    }

    // Insert open hours if they exist
    let openHours: any[] = [];
    if (placeDetails.open_hours && placeDetails.open_hours.length > 0) {
      const { data: openHoursData, error: openHoursError } = await supabase
        .from("open_hours")
        .insert(
          placeDetails.open_hours.map((hours: any) => ({
            activity_id: activity.activity_id,
            day: hours.day,
            open_hour: hours.open_hour,
            open_minute: hours.open_minute,
            close_hour: hours.close_hour,
            close_minute: hours.close_minute,
          }))
        )
        .select();

      if (!openHoursError) {
        openHours = openHoursData;
      }
    }

    // Return complete activity object with reviews and open_hours
    return {
      ...activity,
      reviews,
      open_hours: openHours,
    };
  } catch (error) {
    console.error("Error in insertActivity:", error);
    throw error;
  }
};
