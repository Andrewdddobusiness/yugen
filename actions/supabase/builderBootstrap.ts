"use server";

import { unstable_cache } from "next/cache";
import { createClient } from "@/utils/supabase/server";
import { builderBootstrapTag } from "@/lib/cacheTags";

type BootstrapResult = {
  itinerary: any | null;
  destination: any | null;
  activities: any[];
  customEvents: any[];
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

  const { data: auth } = await supabase.auth.getUser();
  if (!auth?.user) {
    return { success: false, message: "User not authenticated" };
  }

  const userId = auth.user.id;
  const cacheKey = ["builderBootstrap", userId, itin, dest];
  const tag = builderBootstrapTag(userId, itin, dest);

  const cached = unstable_cache(
    async () => {
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

      const fetchAllActivities = async () => {
        const { data: activitiesWithActors, error: activitiesWithActorsError } = await supabase
          .from("itinerary_activity")
          .select(selectWithActorsWithMode)
          .eq("itinerary_id", itin)
          .is("deleted_at", null)
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
            throw activitiesWithActorsError;
          }

          const { data: activitiesFallback, error: activitiesFallbackError } = await supabase
            .from("itinerary_activity")
            .select(retrySelect)
            .eq("itinerary_id", itin)
            .is("deleted_at", null)
            .limit(2000);

          if (activitiesFallbackError) throw activitiesFallbackError;
          return Array.isArray(activitiesFallback) ? normalizeBootstrapActivities(activitiesFallback) : [];
        }

        return Array.isArray(activitiesWithActors) ? normalizeBootstrapActivities(activitiesWithActors) : [];
      };

      const fetchAllSlots = async () => {
        const slotSelectWithActors =
          "itinerary_slot_id,itinerary_id,itinerary_destination_id,date,start_time,end_time,primary_itinerary_activity_id,created_by,updated_by,created_at,updated_at,deleted_at";
        const slotSelectWithoutActors =
          "itinerary_slot_id,itinerary_id,itinerary_destination_id,date,start_time,end_time,primary_itinerary_activity_id,created_at,updated_at,deleted_at";

        const { data: slotsWithActors, error: slotsWithActorsError } = await supabase
          .from("itinerary_slot")
          .select(slotSelectWithActors)
          .eq("itinerary_id", itin)
          .is("deleted_at", null);

        if (slotsWithActorsError) {
          const code = String((slotsWithActorsError as any)?.code ?? "");
          if (code === "42P01") return [];

          const missingActors =
            isMissingColumn(slotsWithActorsError, "created_by") ||
            isMissingColumn(slotsWithActorsError, "updated_by");
          if (!missingActors) throw slotsWithActorsError;

          const { data: slotsFallback, error: slotsFallbackError } = await supabase
            .from("itinerary_slot")
            .select(slotSelectWithoutActors)
            .eq("itinerary_id", itin)
            .is("deleted_at", null);

          if (slotsFallbackError) throw slotsFallbackError;
          return Array.isArray(slotsFallback) ? slotsFallback : [];
        }

        return Array.isArray(slotsWithActors) ? slotsWithActors : [];
      };

      const fetchAllCustomEvents = async () => {
        const select =
          "itinerary_custom_event_id,itinerary_id,itinerary_destination_id,title,notes,date,start_time,end_time,color_hex,created_by,updated_by,created_at,updated_at,deleted_at";

        const { data: events, error: eventsError } = await supabase
          .from("itinerary_custom_event")
          .select(select)
          .eq("itinerary_id", itin)
          .is("deleted_at", null)
          .order("date", { ascending: true })
          .order("start_time", { ascending: true })
          .limit(2000);

        if (eventsError) {
          const code = String((eventsError as any)?.code ?? "");
          if (code === "42P01") return [];
          throw eventsError;
        }

        return Array.isArray(events) ? events : [];
      };

      const fetchSlotOptionsForSlots = async (slotIds: Array<string | number>) => {
        const normalizedIds = slotIds.map((id) => String(id)).filter(Boolean);
        if (normalizedIds.length === 0) return [];

        const optionSelectWithActors =
          "itinerary_slot_option_id,itinerary_slot_id,itinerary_activity_id,created_by,created_at";
        const optionSelectWithoutActors =
          "itinerary_slot_option_id,itinerary_slot_id,itinerary_activity_id,created_at";

        const { data: optionsWithActors, error: optionsWithActorsError } = await supabase
          .from("itinerary_slot_option")
          .select(optionSelectWithActors)
          .in("itinerary_slot_id", normalizedIds);

        if (optionsWithActorsError) {
          const code = String((optionsWithActorsError as any)?.code ?? "");
          if (code === "42P01") return [];

          const missingActors = isMissingColumn(optionsWithActorsError, "created_by");
          if (!missingActors) throw optionsWithActorsError;

          const { data: optionsFallback, error: optionsFallbackError } = await supabase
            .from("itinerary_slot_option")
            .select(optionSelectWithoutActors)
            .in("itinerary_slot_id", normalizedIds);

          if (optionsFallbackError) throw optionsFallbackError;
          return Array.isArray(optionsFallback) ? optionsFallback : [];
        }

        return Array.isArray(optionsWithActors) ? optionsWithActors : [];
      };

      const { data, error } = await supabase.rpc("get_itinerary_builder_bootstrap", {
        _itinerary_id: Number(itin),
        _itinerary_destination_id: Number(dest),
      });

      if (!error && data) {
        // Always return a holistic view across ALL destinations in the itinerary.
        // We keep `destination` as the selected destination (for context + map search),
        // but activities/slots are itinerary-wide.
        let normalizedActivities = await fetchAllActivities();

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

        const slotsAll = await fetchAllSlots();
        const slotOptionsAll = await fetchSlotOptionsForSlots(
          slotsAll.map((slot: any) => slot?.itinerary_slot_id).filter((id: any) => id != null)
        );
        const customEventsAll = await fetchAllCustomEvents();

        return {
          success: true,
          data: {
            itinerary: data.itinerary ?? null,
            destination: data.destination ?? null,
            activities: normalizedActivities,
            customEvents: customEventsAll,
            slots: slotsAll,
            slotOptions: slotOptionsAll,
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

        let fallbackCustomEvents: any[] = [];
        try {
          fallbackCustomEvents = await fetchAllCustomEvents();
        } catch (customEventsError) {
          const code = String((customEventsError as any)?.code ?? "");
          if (code !== "42P01") throw customEventsError;
        }

        const { data: activitiesWithActors, error: activitiesWithActorsError } = await supabase
          .from("itinerary_activity")
          .select(selectWithActorsWithMode)
          .eq("itinerary_id", itin)
          .is("deleted_at", null)
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
            .is("deleted_at", null)
            .limit(2000);

          if (activitiesFallbackError) {
            return { success: false, message: "Failed to load activities", error: activitiesFallbackError };
          }

          return {
            success: true,
            data: {
              itinerary: null,
              destination: destinationRow ?? null,
              activities: Array.isArray(activitiesFallback) ? normalizeBootstrapActivities(activitiesFallback) : [],
              customEvents: fallbackCustomEvents,
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
            activities: Array.isArray(activitiesWithActors) ? normalizeBootstrapActivities(activitiesWithActors) : [],
            customEvents: fallbackCustomEvents,
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
    },
    cacheKey,
    { revalidate: 20, tags: [tag] }
  );

  return cached();
}
