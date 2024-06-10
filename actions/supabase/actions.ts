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

export const fetchItineraryWithCities = async (userId: any) => {
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
