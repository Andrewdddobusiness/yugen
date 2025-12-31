"use server";

import { createClient } from "@/utils/supabase/server";

type BootstrapResult = {
  itinerary: any | null;
  destination: any | null;
  activities: any[];
  slots: any[];
  slotOptions: any[];
  collaborators: any[];
  history: any[];
};

export async function fetchBuilderBootstrap(
  itineraryId: string,
  destinationId: string
): Promise<{ success: boolean; data?: BootstrapResult; message?: string; error?: any }> {
  const itin = String(itineraryId ?? "").trim();
  const dest = String(destinationId ?? "").trim();
  if (!/^\d+$/.test(itin) || !/^\d+$/.test(dest)) {
    return { success: false, message: "Invalid itinerary or destination id" };
  }

  const supabase = createClient();

  const { data, error } = await supabase.rpc("get_itinerary_builder_bootstrap", {
    _itinerary_id: Number(itin),
    _itinerary_destination_id: Number(dest),
  });

  if (!error && data) {
    return {
      success: true,
      data: {
        itinerary: data.itinerary ?? null,
        destination: data.destination ?? null,
        activities: Array.isArray(data.activities) ? data.activities : [],
        slots: Array.isArray(data.slots) ? data.slots : [],
        slotOptions: Array.isArray(data.slot_options) ? data.slot_options : [],
        collaborators: Array.isArray(data.collaborators) ? data.collaborators : [],
        history: Array.isArray(data.history) ? data.history : [],
      },
    };
  }

  const errorCode = String(error?.code ?? "");

  // Fallback for environments that haven't applied newer migrations yet.
  // Keep this fast: fetch only what the builder needs to render, and gracefully
  // handle missing columns (created_by/updated_by) and missing tables (collaboration/slots).
  if (errorCode === "42883" || errorCode === "42703" || errorCode === "42P01") {
    const { data: destinationRow } = await supabase
      .from("itinerary_destination")
      .select("itinerary_destination_id,city,country,from_date,to_date,order_number")
      .eq("itinerary_id", itin)
      .eq("itinerary_destination_id", dest)
      .maybeSingle();

    const selectWithActors =
      "itinerary_id,itinerary_activity_id,itinerary_destination_id,activity_id,date,start_time,end_time,notes,deleted_at,created_by,updated_by,activity:activity(activity_id,place_id,name,duration,price_level,rating,types,address)";
    const selectWithoutActors =
      "itinerary_id,itinerary_activity_id,itinerary_destination_id,activity_id,date,start_time,end_time,notes,deleted_at,activity:activity(activity_id,place_id,name,duration,price_level,rating,types,address)";

    const { data: activitiesWithActors, error: activitiesWithActorsError } = await supabase
      .from("itinerary_activity")
      .select(selectWithActors)
      .eq("itinerary_id", itin)
      .eq("itinerary_destination_id", dest)
      .limit(2000);

    if (activitiesWithActorsError) {
      const activitiesErrorCode = String(activitiesWithActorsError.code ?? "");
      const activitiesMessage = String(activitiesWithActorsError.message ?? "").toLowerCase();
      const missingActors =
        activitiesErrorCode === "42703" ||
        activitiesMessage.includes("created_by") ||
        activitiesMessage.includes("updated_by");

      if (!missingActors) {
        return { success: false, message: "Failed to load activities", error: activitiesWithActorsError };
      }

      const { data: activitiesWithoutActors, error: activitiesWithoutActorsError } = await supabase
        .from("itinerary_activity")
        .select(selectWithoutActors)
        .eq("itinerary_id", itin)
        .eq("itinerary_destination_id", dest)
        .limit(2000);

      if (activitiesWithoutActorsError) {
        return { success: false, message: "Failed to load activities", error: activitiesWithoutActorsError };
      }

      return {
        success: true,
        data: {
          itinerary: null,
          destination: destinationRow ?? null,
          activities: Array.isArray(activitiesWithoutActors) ? activitiesWithoutActors : [],
          slots: [],
          slotOptions: [],
          collaborators: [],
          history: [],
        },
      };
    }

    return {
      success: true,
      data: {
        itinerary: null,
        destination: destinationRow ?? null,
        activities: Array.isArray(activitiesWithActors) ? activitiesWithActors : [],
        slots: [],
        slotOptions: [],
        collaborators: [],
        history: [],
      },
    };
  }

  return {
    success: false,
    message: "Failed to load builder data",
    error,
  };
}
