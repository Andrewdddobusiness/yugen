import { createClient } from "@/utils/supabase/client";

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

/*
  FETCH
*/
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

export async function fetchActivityIdByPlaceId(placeId: string) {
  const supabase = createClient();

  const { data, error } = await supabase.from("activity").select("activity_id").eq("place_id", placeId).single();

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
