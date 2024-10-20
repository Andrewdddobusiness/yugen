import { createClient } from "@/utils/supabase/client";

export async function insertTableData(tableName: string, tableData: any) {
  const supabase = createClient();

  const { data, error } = await supabase.from(tableName).insert(tableData).select();

  if (error) {
    console.log(error);
    return { success: false, message: "Insert failed", error };
  }

  return { success: true, message: "Insert successful", data: data };
}

export async function setTableDataWithCheck(tableName: string, tableData: any, uniqueColumns: string[]) {
  const supabase = createClient();

  // Separate the data used for identifying the row and the data to be updated
  const identifyingData = {};
  const updateData = {};
  for (const key in tableData) {
    if (uniqueColumns.includes(key)) {
      (identifyingData as any)[key] = tableData[key];
    } else {
      (updateData as any)[key] = tableData[key];
    }
  }

  // First, check if the record exists
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
    // Update existing record
    result = await supabase.from(tableName).update(updateData).match(identifyingData).select();
  } else {
    // Insert new record
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
      is_active: false,
      deleted_at: new Date().toISOString(),
    })
    .match(matchConditions);

  if (error) {
    console.error("Soft delete failed:", error);
    return { success: false, message: "Soft delete failed", error };
  }

  return { success: true, message: "Soft delete successful", data };
}

////
// FETCHING TABLE DATA
////

interface IFetchOptions {
  tableName: string;
  columns: string;
  filters?: Record<string, any>;
  inFilter?: { column: string; values: any[] };
  limit?: number;
  orderBy?: { column: string; ascending?: boolean };
}

export async function fetchTableDataUniversal({
  tableName,
  columns,
  filters = {},
  inFilter,
  limit,
  orderBy,
}: IFetchOptions) {
  const supabase = createClient();

  let query = supabase.from(tableName).select(columns);

  // Apply equality filters
  for (const [key, value] of Object.entries(filters)) {
    query = query.eq(key, value);
  }

  // Apply IN filter if provided
  if (inFilter) {
    query = query.in(inFilter.column, inFilter.values);
  }

  // Apply limit if provided
  if (limit) {
    query = query.limit(limit);
  }

  // Apply ordering if provided
  if (orderBy) {
    query = query.order(orderBy.column, {
      ascending: orderBy.ascending ?? true,
    });
  }

  const { data, error } = await query;

  if (error) {
    console.error("Fetch failed:", error);
    return { success: false, message: "Fetch failed", error };
  }

  return { success: true, message: "Fetch successful", data };
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
  filterConditions: Record<string, string>
) {
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

export const fetchItineraryDestination = async (itineraryId: string) => {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("itinerary_destination")
    .select(
      `
      destination_id,
      city,
      country
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

export const fetchItineraryActivityDetails = async (itineraryId: any) => {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("itinerary_activity")
    .select(
      `
    itinerary_activity_id,
    activity_id,
    itinerary_id,
    destination_id,
    date,
    start_time,
    end_time,
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

export const checkEntryExists = async (tableName: string, filterParams: Record<string, any>) => {
  const supabase = createClient();

  // Start the query from the dynamic table name
  let query = supabase.from(tableName).select("*");

  // Dynamically add filters based on the filterParams object
  for (const [key, value] of Object.entries(filterParams)) {
    query = query.eq(key, value);
  }

  const { data, error } = await query.limit(1); // Limit the result to 1 as we're only checking existence

  if (error) {
    console.error("Error fetching data:", error);
    return { exists: false, error };
  }

  // Check if any data is returned
  return { exists: data && data.length > 0 };
};

export async function fetchActivityIdByPlaceId(placeId: string) {
  const supabase = createClient();

  const { data, error } = await supabase.from("activity").select("activity_id").eq("place_id", placeId).single();

  if (error) {
    console.error("Error fetching activity_id:", error);
    return { success: false, message: "Fetch failed", error };
  }

  return { success: true, message: "Fetch successful", data };
}

export async function upsertTableDataWithCheck(tableName: string, tableData: any, uniqueColumns: string[]) {
  const supabase = createClient();

  // Separate the data used for identifying the row and the data to be updated
  const identifyingData = {};
  const updateData = {};
  for (const key in tableData) {
    if (uniqueColumns.includes(key)) {
      (identifyingData as any)[key] = tableData[key];
    } else {
      (updateData as any)[key] = tableData[key];
    }
  }

  // First, check if the record exists
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
    // Update existing record
    result = await supabase.from(tableName).update(updateData).match(identifyingData).select();
  } else {
    // Insert new record
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
