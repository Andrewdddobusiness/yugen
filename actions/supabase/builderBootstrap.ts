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

const parsePointToLngLat = (value: unknown): [number, number] | null => {
  if (!value) return null;

  // Already normalized: [lng, lat]
  if (Array.isArray(value) && value.length === 2) {
    const lng = Number(value[0]);
    const lat = Number(value[1]);
    if (Number.isFinite(lat) && Number.isFinite(lng)) return [lng, lat];
    return null;
  }

  // Supabase may return Postgres point as "(lat,lng)"
  if (typeof value === "string") {
    const match = value.trim().match(/^\(?\s*(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)\s*\)?$/);
    if (!match) return null;
    const lat = Number(match[1]);
    const lng = Number(match[2]);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
    return [lng, lat];
  }

  // Sometimes returned as { x: lat, y: lng }
  if (typeof value === "object") {
    const x = (value as any).x;
    const y = (value as any).y;
    const lat = Number(x);
    const lng = Number(y);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
    return [lng, lat];
  }

  return null;
};

const normalizeBootstrapActivities = (activities: any[]) => {
  return activities.map((row) => {
    const activity = row?.activity;
    if (!activity || typeof activity !== "object") return row;

    const normalized = parsePointToLngLat((activity as any).coordinates);
    if (!normalized) return row;

    return {
      ...row,
      activity: {
        ...activity,
        coordinates: normalized,
      },
    };
  });
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
    const rawActivities = Array.isArray(data.activities) ? data.activities : [];
    let normalizedActivities = normalizeBootstrapActivities(rawActivities);

    // Backwards-compat: older versions of the RPC did not include `activity.coordinates`.
    // If coordinates are missing, fetch them in one extra query and merge in.
    const missingActivityIds = Array.from(
      new Set(
        normalizedActivities.flatMap((row) => {
          const activity = row?.activity;
          const activityId = activity?.activity_id;
          if (activityId == null) return [];
          const coords = activity?.coordinates;
          if (Array.isArray(coords) && coords.length === 2) return [];
          return [activityId];
        })
      )
    );

    if (missingActivityIds.length > 0) {
      const { data: coordsRows } = await supabase
        .from("activity")
        .select("activity_id,coordinates")
        .in("activity_id", missingActivityIds);

      const coordsById = new Map<string, [number, number]>();
      for (const row of coordsRows ?? []) {
        const parsed = parsePointToLngLat((row as any).coordinates);
        if (!parsed) continue;
        coordsById.set(String((row as any).activity_id), parsed);
      }

      if (coordsById.size > 0) {
        normalizedActivities = normalizedActivities.map((row) => {
          const activity = row?.activity;
          if (!activity) return row;
          const activityId = String((activity as any).activity_id ?? "");
          const coords = coordsById.get(activityId);
          if (!coords) return row;
          return {
            ...row,
            activity: {
              ...activity,
              coordinates: coords,
            },
          };
        });
      }
    }

    return {
      success: true,
      data: {
        itinerary: data.itinerary ?? null,
        destination: data.destination ?? null,
        activities: normalizedActivities,
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
  // handle missing columns (created_by/updated_by/travel_mode_to_next) and missing tables (collaboration/slots).
  if (errorCode === "42883" || errorCode === "42703" || errorCode === "42P01") {
    const { data: destinationRow } = await supabase
      .from("itinerary_destination")
      .select("itinerary_destination_id,city,country,from_date,to_date,order_number")
      .eq("itinerary_id", itin)
      .eq("itinerary_destination_id", dest)
      .maybeSingle();

    const isMissingColumn = (err: any, column: string) => {
      if (!err) return false;
      const code = String(err.code ?? "");
      if (code !== "42703") return false;
      const message = String(err.message ?? "").toLowerCase();
      return message.includes(column.toLowerCase());
    };

    const selectWithActorsWithMode =
      "itinerary_id,itinerary_activity_id,itinerary_destination_id,activity_id,date,start_time,end_time,notes,travel_mode_to_next,deleted_at,created_by,updated_by,activity:activity(activity_id,place_id,name,coordinates,duration,price_level,rating,types,address)";
    const selectWithActorsWithoutMode =
      "itinerary_id,itinerary_activity_id,itinerary_destination_id,activity_id,date,start_time,end_time,notes,deleted_at,created_by,updated_by,activity:activity(activity_id,place_id,name,coordinates,duration,price_level,rating,types,address)";
    const selectWithoutActorsWithMode =
      "itinerary_id,itinerary_activity_id,itinerary_destination_id,activity_id,date,start_time,end_time,notes,travel_mode_to_next,deleted_at,activity:activity(activity_id,place_id,name,coordinates,duration,price_level,rating,types,address)";
    const selectWithoutActorsWithoutMode =
      "itinerary_id,itinerary_activity_id,itinerary_destination_id,activity_id,date,start_time,end_time,notes,deleted_at,activity:activity(activity_id,place_id,name,coordinates,duration,price_level,rating,types,address)";

    const { data: activitiesWithActors, error: activitiesWithActorsError } = await supabase
      .from("itinerary_activity")
      .select(selectWithActorsWithMode)
      .eq("itinerary_id", itin)
      .eq("itinerary_destination_id", dest)
      .limit(2000);

    if (activitiesWithActorsError) {
      const missingActors =
        isMissingColumn(activitiesWithActorsError, "created_by") ||
        isMissingColumn(activitiesWithActorsError, "updated_by");
      const missingMode = isMissingColumn(activitiesWithActorsError, "travel_mode_to_next");

      const retrySelect =
        missingActors && missingMode
          ? selectWithoutActorsWithoutMode
          : missingActors
            ? selectWithoutActorsWithMode
            : missingMode
              ? selectWithActorsWithoutMode
              : null;

      if (!retrySelect) {
        return { success: false, message: "Failed to load activities", error: activitiesWithActorsError };
      }

      const { data: activitiesFallback, error: activitiesFallbackError } = await supabase
        .from("itinerary_activity")
        .select(retrySelect)
        .eq("itinerary_id", itin)
        .eq("itinerary_destination_id", dest)
        .limit(2000);

      if (activitiesFallbackError) {
        return { success: false, message: "Failed to load activities", error: activitiesFallbackError };
      }

      return {
        success: true,
        data: {
          itinerary: null,
          destination: destinationRow ?? null,
          activities: Array.isArray(activitiesFallback)
            ? normalizeBootstrapActivities(activitiesFallback)
            : [],
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
        activities: Array.isArray(activitiesWithActors)
          ? normalizeBootstrapActivities(activitiesWithActors)
          : [],
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
