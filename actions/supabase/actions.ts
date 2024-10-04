import { createClient } from "@/utils/supabase/client";

export async function insertTableData(tableName: string, tableData: any) {
  const supabase = createClient();

  const { data, error } = await supabase
    .from(tableName)
    .insert(tableData)
    .select();

  if (error) {
    console.log(error);
    return { success: false, message: "Insert failed", error };
  }

  return { success: true, message: "Insert successful", data: data };
}

export async function setTableData(
  tableName: string,
  tableData: any,
  uniqueColumns: string[]
) {
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

export async function fetchTableData(tableName: string, columnNames: string) {
  const supabase = createClient();

  const { data, error } = await supabase.from(tableName).select(columnNames);

  if (error) {
    console.log(error);
    return { success: false, message: "Fetch failed", error };
  }

  return { success: true, message: "Fetch successful", data: data };
}

export async function fetchFilteredTableData(
  tableName: string,
  columnNames: string,
  columnFilterName: string,
  filterValues: string[]
) {
  const supabase = createClient();

  const { data, error } = await supabase
    .from(tableName)
    .select(columnNames)
    .in(columnFilterName, filterValues);

  if (error) {
    console.log(error);
    return { success: false, message: "Fetch failed", error };
  }

  return { success: true, message: "Fetch successful", data: data };
}

export const fetchItineraryWithCities = async () => {
  const supabase = createClient();

  const { data, error } = await supabase.from("itinerary_destinations").select(`
    itinerary_id, 
    destination_id,
    origin_city_id,
    destination_city_id,
    from_date,
    to_date,
    cities!itinerary_destinations_destination_city_id_fkey (city_name)
    `);

  if (error) {
    console.error("Error fetching itinerary data:", error);
    return { error };
  }

  return { data };
};

export const fetchCityDetails = async (itineraryId: any) => {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("itinerary_destinations")
    .select(
      `
      destination_city_id,
      cities!itinerary_destinations_destination_city_id_fkey (
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

export const fetchActivityDetails = async (itineraryId: any) => {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("itinerary_destinations")
    .select(
      `
    destination_city_id,
    cities:destination_city_id (
      city_name,
      activities (
        activity_id,
        activity_name,
        address,
        rating,
        description,
        google_maps_url,
        activity_type,
        activity_price,
        website_url,
        image_url,
        coordinates,
        duration,
        reviews
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

export const fetchItineraryActivityDetails = async (itineraryId: any) => {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("itinerary_activities")
    .select(
      `
    itinerary_activity_id,
    activity_id,
    itinerary_id,
    destination_id,
    activity_date,
    activity_start_time,
    activity_end_time,
    activities: activity_id (
      activity_id,
          activity_name,
          address,
          rating,
          description,
          google_maps_url,
          activity_type,
          activity_price,
          website_url,
          image_url,
          coordinates,
          duration,
          reviews
        )
      )
    )
  `
    )
    .eq("itinerary_id", itineraryId);

  if (error) {
    console.error("Error fetching data:", error);
    return { error };
  }

  return { data };
};

export const checkEntryExists = async (
  tableName: string,
  filterParams: { itineraryId: any; activityId?: any }
) => {
  const supabase = createClient();

  // Start the query from the dynamic table name
  let query = supabase
    .from(tableName)
    .select("*")
    .eq("itinerary_id", filterParams.itineraryId);

  // Conditionally add activity ID filter if provided
  if (filterParams.activityId) {
    query = query.eq("activity_id", filterParams.activityId);
  }

  const { data, error } = await query.limit(1); // Limit the result to 1 as we're only checking existence

  if (error) {
    console.error("Error fetching data:", error);
    return { exists: false, error };
  }

  // Check if any data is returned
  return { exists: data && data.length > 0 };
};
