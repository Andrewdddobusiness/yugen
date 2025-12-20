import { create } from "zustand";
import {
  checkEntryExists,
  fetchFilteredTableData,
  fetchFilteredTableData2,
  insertTableData,
  fetchActivityIdByPlaceId,
  setTableDataWithCheck,
  softDeleteTableData2,
} from "@/actions/supabase/actions";
import { IActivity, IActivityWithLocation } from "./activityStore";

export interface IItineraryActivity {
  itinerary_activity_id: string;
  itinerary_destination_id: string;
  activity_id: string;
  date: string | null; // Allow null for unscheduled activities
  start_time: string | null; // Allow null for unscheduled activities
  end_time: string | null; // Allow null for unscheduled activities
  notes?: string;
  deleted_at: string | null;
  activity?: IActivity;
}

interface IItineraryStore {
  itineraryActivities: IItineraryActivity[];
  isActivityAdded: (placeId: string) => boolean;
  fetchItineraryActivities: (itineraryId: string, destinationId: string) => Promise<IItineraryActivity[]>;
  updateItineraryActivity: (activity: Partial<IItineraryActivity>) => Promise<void>;
  setItineraryActivities: (activities: IItineraryActivity[]) => void;
  reorderItineraryActivities: (activities: IItineraryActivity[]) => void;
  insertItineraryActivity: (
    activity: IActivityWithLocation,
    itineraryId: string,
    destinationId: string
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
    try {
      const result = await fetchFilteredTableData2(
        "itinerary_activity",
        `
            itinerary_activity_id, 
            itinerary_destination_id, 
            activity_id,
            date, 
            start_time, 
            end_time,
            deleted_at,
            activity:activity(*)
          `,
        {
          itinerary_id: itineraryId,
          itinerary_destination_id: destinationId,
        }
      );

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
        const { data: reactivatedActivity } = await fetchFilteredTableData2(
          "itinerary_activity",
          `
            itinerary_activity_id, 
            itinerary_destination_id, 
            activity_id,
            date, 
            start_time, 
            end_time,
            deleted_at,
            activity:activity(*)
          `,
          {
            itinerary_id: itineraryId,
            activity_id: activityId,
          }
        );
        
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
        await insertTableData("itinerary_activity", {
          itinerary_id: itineraryId,
          activity_id: activityId,
          itinerary_destination_id: destinationId,
          date: null,  // Leave unscheduled for user to assign later
          start_time: null, // Leave unscheduled for user to assign later
          end_time: null, // Leave unscheduled for user to assign later
          deleted_at: null,
        });
        set((state) => ({
          itineraryActivities: [
            ...state.itineraryActivities,
            {
              itinerary_activity_id: "",
              itinerary_destination_id: destinationId,
              activity_id: activityId,
              date: null, // Unscheduled
              start_time: null, // Unscheduled
              end_time: null, // Unscheduled
              activity: activity,
              deleted_at: null,
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
