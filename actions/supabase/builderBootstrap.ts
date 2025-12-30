"use server";

import { createClient } from "@/utils/supabase/server";
import { fetchItineraryDestination } from "@/actions/supabase/actions";

type BootstrapResult = {
  itinerary: any | null;
  destination: any | null;
  activities: any[];
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
        collaborators: Array.isArray(data.collaborators) ? data.collaborators : [],
        history: Array.isArray(data.history) ? data.history : [],
      },
    };
  }

  // Fallback for environments that haven't applied the migration yet.
  // Keep this fast: fetch only what the builder needs to render.
  if (String(error?.code ?? "") === "42883") {
    const destinationResult = await fetchItineraryDestination(itin);
    const destination = destinationResult?.data ?? null;

    const { data: activitiesData, error: activitiesError } = await supabase
      .from("itinerary_activity")
      .select(
        "itinerary_id,itinerary_activity_id,itinerary_destination_id,activity_id,date,start_time,end_time,notes,deleted_at,created_by,updated_by,activity:activity(activity_id,place_id,name,duration,price_level,rating,types,address)"
      )
      .eq("itinerary_id", itin)
      .eq("itinerary_destination_id", dest);

    if (activitiesError) {
      return { success: false, message: "Failed to load activities", error: activitiesError };
    }

    return {
      success: true,
      data: {
        itinerary: null,
        destination,
        activities: Array.isArray(activitiesData) ? activitiesData : [],
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
