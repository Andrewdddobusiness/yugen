import { create } from "zustand";
import {
  checkEntryExists,
  fetchFilteredTableData,
  fetchFilteredTableData2,
  insertTableData,
  fetchActivityIdByPlaceId,
  setTableDataWithCheck,
  softDeleteTableData2,
  setActivityName,
} from "@/actions/supabase/actions";
import { IActivity, IActivityWithLocation } from "./activityStore";
import type { TravelMode } from "@/actions/google/travelTime";

const ITINERARY_ACTIVITY_SELECT_BASE = `
  itinerary_id,
  itinerary_activity_id,
  itinerary_destination_id,
  activity_id,
  date,
  start_time,
  end_time,
  notes,
  travel_mode_to_next,
  deleted_at,
  activity:activity(*)
`;

const ITINERARY_ACTIVITY_SELECT_WITH_ACTORS = `
  itinerary_id,
  itinerary_activity_id,
  itinerary_destination_id,
  activity_id,
  date,
  start_time,
  end_time,
  notes,
  travel_mode_to_next,
  deleted_at,
  created_by,
  updated_by,
  activity:activity(*)
`;

const shouldRetryWithoutActorColumns = (error: any) => {
  if (!error) return false;
  const message = String(error.message ?? "");
  return error.code === "42703" && /(created_by|updated_by)/.test(message);
};

let itineraryActivityActorColumnsSupported: boolean | null = null;

export interface IItineraryActivity {
  itinerary_activity_id: string;
  itinerary_id?: string;
  itinerary_destination_id: string;
  activity_id: string;
  date: string | null; // Allow null for unscheduled activities
  start_time: string | null; // Allow null for unscheduled activities
  end_time: string | null; // Allow null for unscheduled activities
  notes?: string;
  travel_mode_to_next?: TravelMode | null;
  deleted_at: string | null;
  created_by?: string | null;
  updated_by?: string | null;
  activity?: IActivity;
}

export type ItineraryActivityPatch = Partial<Omit<IItineraryActivity, "activity">> & {
  activity?: Partial<IActivity>;
};

interface IItineraryStore {
  itineraryActivities: IItineraryActivity[];
  isActivityAdded: (placeId: string) => boolean;
  fetchItineraryActivities: (itineraryId: string, destinationId: string) => Promise<IItineraryActivity[]>;
  updateItineraryActivity: (activity: Partial<IItineraryActivity>) => Promise<void>;
  optimisticUpdateItineraryActivity: (
    itineraryActivityId: string,
    patch: ItineraryActivityPatch
  ) => Promise<{ success: boolean; error?: string }>;
  setItineraryActivities: (activities: IItineraryActivity[]) => void;
  reorderItineraryActivities: (activities: IItineraryActivity[]) => void;
  insertItineraryActivity: (
    activity: IActivityWithLocation,
    itineraryId: string,
    destinationId: string
  ) => Promise<{ success: boolean; error?: string }>;
  addItineraryActivityInstance: (
    activity: IActivityWithLocation,
    itineraryId: string,
    destinationId: string
  ) => Promise<{ success: boolean; error?: string }>;
  duplicateItineraryActivity: (
    itineraryActivityId: string,
    itineraryId: string,
    destinationId: string
  ) => Promise<{ success: boolean; error?: string }>;
  unscheduleItineraryActivityInstance: (
    itineraryActivityId: string
  ) => Promise<{ success: boolean; error?: string }>;
  deleteItineraryActivityInstance: (
    itineraryActivityId: string
  ) => Promise<{ success: boolean; error?: string }>;
  removeItineraryActivity: (activityId: string, itineraryId: string) => Promise<{ success: boolean; error?: any }>;
}

export const useItineraryActivityStore = create<IItineraryStore>((set, get) => ({
  itineraryActivities: [],
  isActivityAdded: (placeId: string) => {
    return get().itineraryActivities.some(
      (activity) => activity.activity?.place_id === placeId && activity.deleted_at === null
    );
  },
  fetchItineraryActivities: async (itineraryId: string, destinationId: string) => {
    if (!itineraryId || !destinationId) return [];

    try {
      const baseFilters = {
        itinerary_id: itineraryId,
        itinerary_destination_id: destinationId,
      };

      let result =
        itineraryActivityActorColumnsSupported === false
          ? await fetchFilteredTableData2(
              "itinerary_activity",
              ITINERARY_ACTIVITY_SELECT_BASE,
              baseFilters
            )
          : await fetchFilteredTableData2(
              "itinerary_activity",
              ITINERARY_ACTIVITY_SELECT_WITH_ACTORS,
              baseFilters
            );

      if (!result.success && shouldRetryWithoutActorColumns(result.error)) {
        itineraryActivityActorColumnsSupported = false;
        result = await fetchFilteredTableData2(
          "itinerary_activity",
          ITINERARY_ACTIVITY_SELECT_BASE,
          baseFilters
        );
      } else if (result.success && itineraryActivityActorColumnsSupported == null) {
        itineraryActivityActorColumnsSupported = true;
      }

      if (result.success && result.data) {
        // Filter out soft-deleted activities
        const activeActivities = (result.data as unknown as IItineraryActivity[])
          .filter(activity => activity.deleted_at === null);
        return activeActivities;
      }
      return [];
    } catch (error) {
      console.error("Error fetching itinerary data:", error);
      return [];
    }
  },
  updateItineraryActivity: async (activity: Partial<IItineraryActivity>) => {
    try {
      const result = await setTableDataWithCheck("itinerary_activity", activity, ["itinerary_activity_id"]);
      if (result.success) {
        set((state) => ({
          itineraryActivities: state.itineraryActivities.map((a) =>
            a.itinerary_activity_id === activity.itinerary_activity_id ? { ...a, ...activity } : a
          ),
        }));
      }
    } catch (error) {
      console.error("Error updating activity:", error);
    }
  },
  optimisticUpdateItineraryActivity: async (itineraryActivityId, patch) => {
    const id = String(itineraryActivityId);
    const current = get().itineraryActivities;
    const existing = current.find((a) => String(a.itinerary_activity_id) === id);
    if (!existing) {
      return { success: false, error: "Activity not found" };
    }

    const previousSnapshot: IItineraryActivity = {
      ...existing,
      activity: existing.activity ? { ...(existing.activity as IActivity) } : existing.activity,
    };

    const mergePatch = (activity: IItineraryActivity): IItineraryActivity => {
      const { activity: activityPatch, ...itineraryPatch } = patch;
      const merged: IItineraryActivity = { ...activity, ...itineraryPatch };
      if (activityPatch && activity.activity) {
        merged.activity = { ...(activity.activity as IActivity), ...activityPatch };
      }
      return merged;
    };

    // Optimistic UI: update local store immediately.
    set((state) => ({
      itineraryActivities: state.itineraryActivities.map((a) =>
        String(a.itinerary_activity_id) === id ? mergePatch(a) : a
      ),
    }));

    try {
      const { activity: activityPatch, ...itineraryPatch } = patch;
      const patchKeys = Object.keys(itineraryPatch || {});
      if (patchKeys.length > 0) {
        const result = await setTableDataWithCheck(
          "itinerary_activity",
          {
            itinerary_activity_id: id,
            ...itineraryPatch,
          },
          ["itinerary_activity_id"]
        );
        if (!result.success) {
          const code = String((result as any)?.error?.code ?? "");
          const message = String((result as any)?.error?.message ?? result.message ?? "");
          const isTravelModeSchemaCacheIssue =
            code === "PGRST204" && message.toLowerCase().includes("travel_mode_to_next");

          if (isTravelModeSchemaCacheIssue) {
            throw new Error(
              "Missing `travel_mode_to_next` on Supabase API. Apply the migration and refresh the PostgREST schema cache (restart Supabase / reload schema)."
            );
          }

          throw new Error(message || "Failed to update activity");
        }
      }

      if (activityPatch?.name && existing.activity_id) {
        const result = await setActivityName(existing.activity_id, activityPatch.name);
        if (!result.success) {
          throw new Error(result.message || "Failed to update activity name");
        }
      }

      return { success: true };
    } catch (error) {
      console.error("Error updating activity (optimistic):", error);

      // Revert on error.
      set((state) => ({
        itineraryActivities: state.itineraryActivities.map((a) =>
          String(a.itinerary_activity_id) === id ? previousSnapshot : a
        ),
      }));

      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to update activity",
      };
    }
  },
  setItineraryActivities: (activities: IItineraryActivity[]) => set({ itineraryActivities: activities }),
  reorderItineraryActivities: (activities: IItineraryActivity[]) => set({ itineraryActivities: activities }),
  insertItineraryActivity: async (activity: IActivityWithLocation, itineraryId: string, destinationId: string) => {
    if (!activity || !itineraryId) return { success: false, error: undefined };

    // Check if the activity has been added before
    const isActivityAdded = get().isActivityAdded(activity.place_id);

    console.log("isActivityAdded: ", isActivityAdded);

    if (isActivityAdded) {
      try {
        const activityResult = await fetchActivityIdByPlaceId(activity.place_id);
        console.log("activityResult: ", activityResult);
        if (!activityResult.success || !activityResult.data) {
          throw new Error(activityResult.message || "Activity not found");
        }
        const activityId = activityResult.data.activity_id;
        console.log("activityId: ", activityId);

        await setTableDataWithCheck(
          "itinerary_activity",
          {
            itinerary_id: itineraryId,
            itinerary_destination_id: destinationId,
            activity_id: activityId,
            deleted_at: null,
          },
          ["itinerary_id", "itinerary_destination_id", "activity_id"]
        );

        // Since we now remove activities from the array, we need to re-add it
        const reactivatedFilters = {
          itinerary_id: itineraryId,
          activity_id: activityId,
        };

        let reactivated =
          itineraryActivityActorColumnsSupported === false
            ? await fetchFilteredTableData2(
                "itinerary_activity",
                ITINERARY_ACTIVITY_SELECT_BASE,
                reactivatedFilters
              )
            : await fetchFilteredTableData2(
                "itinerary_activity",
                ITINERARY_ACTIVITY_SELECT_WITH_ACTORS,
                reactivatedFilters
              );

        if (!reactivated.success && shouldRetryWithoutActorColumns(reactivated.error)) {
          itineraryActivityActorColumnsSupported = false;
          reactivated = await fetchFilteredTableData2(
            "itinerary_activity",
            ITINERARY_ACTIVITY_SELECT_BASE,
            reactivatedFilters
          );
        } else if (reactivated.success && itineraryActivityActorColumnsSupported == null) {
          itineraryActivityActorColumnsSupported = true;
        }

        const reactivatedActivity = reactivated.success ? reactivated.data : null;
        
        if (reactivatedActivity && reactivatedActivity[0]) {
          set((state) => ({
            itineraryActivities: [...state.itineraryActivities, reactivatedActivity[0] as IItineraryActivity],
          }));
        }

        return { success: true, error: undefined };
      } catch (error) {
        console.error("Error reactivating itinerary activity:", error);
        return { success: false, error: "Failed to reactivate activity" };
      }
    }

    // Activities don't need country/city references - they're location-agnostic
    // Location association happens through itinerary_destination when scheduled

    // INSERT ACTIVITY IF IT DOESN'T EXIST
    let activityId: string | undefined; // Allow activityId to be undefined
    try {
      const { exists: activityExists } = await checkEntryExists("activity", {
        place_id: activity.place_id,
      });
      console.log("activityExists: ", activityExists);
      if (!activityExists) {
        const activityDataToInsert = {
          place_id: activity.place_id,
          name: activity.name,
          types: activity.types,
          price_level: activity.price_level,
          address: activity.address,
          rating: activity.rating,
          description: activity.description,
          google_maps_url: activity.google_maps_url,
          website_url: activity.website_url,
          photo_names: activity.photo_names,
          duration: activity.duration,
          phone_number: activity.phone_number,
          coordinates: `(${Number(activity.coordinates[1].toFixed(9))}, ${Number(activity.coordinates[0].toFixed(9))})`,
        };

        await insertTableData("activity", activityDataToInsert);
      }
    } catch (error) {
      console.error("Error handling activity:", error);
    }

    // FETCH ISN'T SPECIFIC ENOUGH
    const { data: activityDataResponse }: any = await fetchFilteredTableData("activity", "activity_id", "place_id", [
      activity.place_id,
    ]);
    console.log("activityDataResponse: ", activityDataResponse);

    if (Array.isArray(activityDataResponse) && activityDataResponse.length > 0) {
      activityId = activityDataResponse[0]?.activity_id;
    }

    // Reviews and opening hours are handled separately when needed
    // The activity creation focuses only on core activity data

    try {
      const { exists: itineraryActivityExists } = await checkEntryExists("itinerary_activity", {
        itinerary_id: itineraryId,
        activity_id: activityId,
      });
	      console.log("itineraryActivityExists: ", itineraryActivityExists);
	      if (!itineraryActivityExists && activityId) {
	        const insertResult = await insertTableData("itinerary_activity", {
	          itinerary_id: itineraryId,
	          activity_id: activityId,
	          itinerary_destination_id: destinationId,
	          date: null,  // Leave unscheduled for user to assign later
	          start_time: null, // Leave unscheduled for user to assign later
	          end_time: null, // Leave unscheduled for user to assign later
	          deleted_at: null,
	        });

	        const insertedRow = Array.isArray(insertResult.data) ? insertResult.data[0] : null;
	        const insertedId = insertedRow?.itinerary_activity_id;
	        if (!insertResult.success || insertedId == null) {
	          throw new Error(insertResult.message || "Failed to insert itinerary activity");
	        }

	        set((state) => ({
	          itineraryActivities: [
	            ...state.itineraryActivities,
	            {
	              itinerary_activity_id: String(insertedId),
	              itinerary_destination_id: String(insertedRow?.itinerary_destination_id ?? destinationId),
	              activity_id: String(insertedRow?.activity_id ?? activityId),
	              date: null, // Unscheduled
	              start_time: null, // Unscheduled
	              end_time: null, // Unscheduled
	              created_by: insertedRow?.created_by ?? null,
	              updated_by: insertedRow?.updated_by ?? null,
	              activity: activity,
	              deleted_at: insertedRow?.deleted_at ?? null,
	            },
	          ],
	        }));
	      } else {
	        await setTableDataWithCheck(
          "itinerary_activity",
          {
            itinerary_id: itineraryId,
            itinerary_destination_id: destinationId,
            activity_id: activityId,
            deleted_at: null,
          },
          ["itinerary_id", "itinerary_destination_id", "activity_id"]
        );
        set((state) => ({
          itineraryActivities: state.itineraryActivities.map((a) =>
            a.activity?.place_id === activity.place_id ? { ...a, deleted_at: null } : a
          ),
        }));
      }
    } catch (error) {
      console.error("Error inserting itinerary activity:", error);
    }
    return { success: true, error: undefined };
  },
  addItineraryActivityInstance: async (activity: IActivityWithLocation, itineraryId: string, destinationId: string) => {
    if (!activity || !itineraryId || !destinationId) return { success: false, error: undefined };

    // Ensure activity exists and we have an activity_id.
    let activityId: string | undefined;
    try {
      const { exists: activityExists } = await checkEntryExists("activity", {
        place_id: activity.place_id,
      });
      if (!activityExists) {
        const activityDataToInsert = {
          place_id: activity.place_id,
          name: activity.name,
          types: activity.types,
          price_level: activity.price_level,
          address: activity.address,
          rating: activity.rating,
          description: activity.description,
          google_maps_url: activity.google_maps_url,
          website_url: activity.website_url,
          photo_names: activity.photo_names,
          duration: activity.duration,
          phone_number: activity.phone_number,
          coordinates: `(${Number(activity.coordinates[1].toFixed(9))}, ${Number(activity.coordinates[0].toFixed(9))})`,
        };
        await insertTableData("activity", activityDataToInsert);
      }

      const { data: activityDataResponse }: any = await fetchFilteredTableData(
        "activity",
        "activity_id",
        "place_id",
        [activity.place_id]
      );

      if (Array.isArray(activityDataResponse) && activityDataResponse.length > 0) {
        activityId = activityDataResponse[0]?.activity_id;
      }
    } catch (error) {
      console.error("Error ensuring activity exists:", error);
      return { success: false, error: "Failed to create activity instance" };
    }

    if (!activityId) {
      return { success: false, error: "Activity id not found" };
    }

    try {
      const insertResult = await insertTableData("itinerary_activity", {
        itinerary_id: itineraryId,
        itinerary_destination_id: destinationId,
        activity_id: activityId,
        date: null,
        start_time: null,
        end_time: null,
        deleted_at: null,
      });

      const insertedRow = Array.isArray(insertResult.data) ? insertResult.data[0] : null;
      const insertedId = insertedRow?.itinerary_activity_id;
      if (!insertResult.success || insertedId == null) {
        throw new Error(insertResult.message || "Failed to insert itinerary activity instance");
      }

      set((state) => ({
        itineraryActivities: [
          ...state.itineraryActivities,
          {
            itinerary_activity_id: String(insertedId),
            itinerary_id: String(insertedRow?.itinerary_id ?? itineraryId),
            itinerary_destination_id: String(insertedRow?.itinerary_destination_id ?? destinationId),
            activity_id: String(insertedRow?.activity_id ?? activityId),
            date: insertedRow?.date ?? null,
            start_time: insertedRow?.start_time ?? null,
            end_time: insertedRow?.end_time ?? null,
            notes: insertedRow?.notes ?? null,
            created_by: insertedRow?.created_by ?? null,
            updated_by: insertedRow?.updated_by ?? null,
            activity: activity,
            deleted_at: insertedRow?.deleted_at ?? null,
          } as IItineraryActivity,
        ],
      }));

      return { success: true };
    } catch (error) {
      console.error("Error inserting itinerary activity instance:", error);
      return { success: false, error: "Failed to add another instance" };
    }
  },
  duplicateItineraryActivity: async (itineraryActivityId: string, itineraryId: string, destinationId: string) => {
    const existing = get().itineraryActivities.find(
      (a) => String(a.itinerary_activity_id) === String(itineraryActivityId)
    );
    if (!existing) return { success: false, error: "Activity not found" };
    if (!itineraryId || !destinationId) return { success: false, error: "Missing itinerary context" };

    try {
      const insertResult = await insertTableData("itinerary_activity", {
        itinerary_id: itineraryId,
        itinerary_destination_id: destinationId,
        activity_id: existing.activity_id,
        date: existing.date,
        start_time: existing.start_time,
        end_time: existing.end_time,
        notes: existing.notes ?? null,
        deleted_at: null,
      });

      const insertedRow = Array.isArray(insertResult.data) ? insertResult.data[0] : null;
      const insertedId = insertedRow?.itinerary_activity_id;
      if (!insertResult.success || insertedId == null) {
        throw new Error(insertResult.message || "Failed to duplicate itinerary activity");
      }

      set((state) => ({
        itineraryActivities: [
          ...state.itineraryActivities,
          {
            ...existing,
            itinerary_activity_id: String(insertedId),
            itinerary_id: String(insertedRow?.itinerary_id ?? itineraryId),
            itinerary_destination_id: String(insertedRow?.itinerary_destination_id ?? destinationId),
            deleted_at: insertedRow?.deleted_at ?? null,
            created_by: insertedRow?.created_by ?? null,
            updated_by: insertedRow?.updated_by ?? null,
          },
        ],
      }));

      return { success: true };
    } catch (error) {
      console.error("Error duplicating itinerary activity:", error);
      return { success: false, error: "Failed to duplicate activity" };
    }
  },
  unscheduleItineraryActivityInstance: async (itineraryActivityId: string) => {
    const id = String(itineraryActivityId ?? "").trim();
    if (!id) return { success: false, error: "Missing activity id" };
    return get().optimisticUpdateItineraryActivity(id, {
      date: null,
      start_time: null,
      end_time: null,
    });
  },
  deleteItineraryActivityInstance: async (itineraryActivityId: string) => {
    const id = String(itineraryActivityId ?? "").trim();
    if (!/^\d+$/.test(id)) {
      return { success: false, error: "Invalid activity id" };
    }

    const current = get().itineraryActivities;
    const existing = current.find((a) => String(a.itinerary_activity_id) === id);
    if (!existing) return { success: false, error: "Activity not found" };

    // Optimistic UI: remove immediately.
    set((state) => ({
      itineraryActivities: state.itineraryActivities.filter(
        (activity) => String(activity.itinerary_activity_id) !== id
      ),
    }));

    try {
      const result = await softDeleteTableData2("itinerary_activity", {
        itinerary_activity_id: id,
      });

      if (!result.success) {
        throw new Error(result.message || "Failed to delete activity");
      }

      return { success: true };
    } catch (error) {
      console.error("Error deleting itinerary activity:", error);
      // Revert on error.
      set({ itineraryActivities: current });
      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to delete activity",
      };
    }
  },
  removeItineraryActivity: async (placeId: string, itineraryId: string) => {
    try {
      // First, find the activity_id using the place_id
      const activityResult = await fetchActivityIdByPlaceId(placeId);

      if (!activityResult.success || !activityResult.data) {
        throw new Error(activityResult.message || "Activity not found");
      }

      const activityId = activityResult.data.activity_id;

      // Now use the activity_id to soft delete the itinerary activity
      const result = await softDeleteTableData2("itinerary_activity", {
        activity_id: activityId,
        itinerary_id: itineraryId,
      });

      if (!result.success) throw result.error;

      set((state) => ({
        // Remove the activity from the array instead of just marking it as deleted
        itineraryActivities: state.itineraryActivities.filter(
          (activity) => activity.activity?.place_id !== placeId
        ),
      }));

      return { success: true };
    } catch (error) {
      console.error("Error removing itinerary activity:", error);
      return { success: false, error };
    }
  },
}));
