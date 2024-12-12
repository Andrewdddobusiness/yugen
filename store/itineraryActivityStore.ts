import { create } from "zustand";
import {
  checkEntryExists,
  fetchFilteredTableData,
  fetchFilteredTableData2,
  fetchTableData,
  insertTableData,
  fetchActivityIdByPlaceId,
  softDeleteTableData,
  setTableDataWithCheck,
  softDeleteTableData2,
} from "@/actions/supabase/actions";
import { IActivity, IActivityWithLocation } from "./activityStore";

export interface IItineraryActivity {
  itinerary_activity_id: string;
  itinerary_destination_id: string;
  activity_id: string;
  date: string;
  start_time: string;
  end_time: string;
  deleted_at: string | null;
  activity?: IActivity & { place_id: string };
}

interface IItineraryStore {
  itineraryActivities: IItineraryActivity[];
  isActivityAdded: (placeId: string) => boolean;
  fetchItineraryActivities: (itineraryId: string, destinationId: string) => Promise<IItineraryActivity[]>;
  updateItineraryActivity: (activity: Partial<IItineraryActivity>) => Promise<void>;
  setItineraryActivities: (activities: IItineraryActivity[]) => void;
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
        return result.data as unknown as IItineraryActivity[];
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

        set((state) => ({
          itineraryActivities: state.itineraryActivities.map((a) =>
            a.activity?.place_id === activity.place_id ? { ...a } : a
          ),
        }));

        return { success: true, error: undefined };
      } catch (error) {
        console.error("Error reactivating itinerary activity:", error);
        return { success: false, error: "Failed to reactivate activity" };
      }
    }

    // If the activity hasn't been added before, continue with the existing logic
    // INSERT COUNTRY IF IT DOESN'T EXIST
    let countryId: string | undefined; // Allow countryId to be undefined
    try {
      const { exists: countryExists } = await checkEntryExists("country", {
        country_name: activity.country_name,
      });

      if (!countryExists) {
        await insertTableData("country", {
          country_name: activity.country_name,
        });
      }

      const { data: countryDataResponse }: any = await fetchTableData("country", "country_id");
      if (Array.isArray(countryDataResponse) && countryDataResponse.length > 0) {
        countryId = countryDataResponse[0]?.country_id;
      }
    } catch (error) {
      console.error("Error handling country:", error);
    }
    console.log("countryId: ", countryId);

    // INSERT CITY IF IT DOESN'T EXIST
    let cityId: string | undefined;
    try {
      const { exists: cityExists } = await checkEntryExists("city", {
        city_name: activity.city_name,
      });

      if (!cityExists && countryId) {
        await insertTableData("city", {
          city_name: activity.city_name,
          country_id: countryId,
        });
      }

      const { data: cityDataResponse }: any = await fetchTableData("city", "city_id");
      if (Array.isArray(cityDataResponse) && cityDataResponse.length > 0) {
        cityId = cityDataResponse[0]?.city_id;
      }
    } catch (error) {
      console.error("Error handling city:", error);
    }
    console.log("cityId: ", cityId);

    // INSERT ACTIVITY IF IT DOESN'T EXIST
    let activityId: string | undefined; // Allow activityId to be undefined
    try {
      const { exists: activityExists } = await checkEntryExists("activity", {
        name: activity.name,
        city_id: cityId,
      });
      console.log("activityExists: ", activityExists);
      if (!activityExists) {
        const activityDataToInsert = {
          place_id: activity.place_id,
          name: activity.name,
          city_id: cityId,
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
          coordinates: [Number(activity.coordinates[0].toFixed(9)), Number(activity.coordinates[1].toFixed(9))],
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

    // INSERT REVIEW IF IT DOESN'T EXIST
    try {
      if (activityId) {
        const { exists: reviewExists } = await checkEntryExists("review", {
          activity_id: activityId,
        });
        console.log("reviewExists: ", reviewExists);

        if (!reviewExists) {
          await insertTableData("review", {
            activity_id: activityId,
            description: activity.description,
            rating: activity.rating,
            author: activity.reviews[0]?.author,
            uri: activity.google_maps_url,
            publish_date_time: activity.reviews[0]?.publish_date_time,
          });
        }
      }
    } catch (error) {
      console.error("Error handling review:", error);
    }

    // INSERT OPEN HOURS IF IT DOESN'T EXIST
    try {
      if (activityId) {
        const { exists: openHoursExists } = await checkEntryExists("open_hours", {
          activity_id: activityId,
        });
        console.log("openHoursExists: ", openHoursExists);

        if (!openHoursExists && activity.open_hours && activity.open_hours.length > 0) {
          await insertTableData("open_hours", {
            activity_id: activityId,
            day: activity.open_hours[0].day,
            open_hour: activity.open_hours[0].open_hour,
            open_minute: activity.open_hours[0].open_minute,
            close_hour: activity.open_hours[0].close_hour,
            close_minute: activity.open_hours[0].close_minute,
          });
        }
      }
    } catch (error) {
      console.error("Error handling open hours:", error);
    }

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
          deleted_at: null,
        });
        set((state) => ({
          itineraryActivities: [
            ...state.itineraryActivities,
            {
              itinerary_activity_id: "",
              itinerary_destination_id: activity.itinerary_destination_id,
              activity_id: activityId,
              date: "",
              start_time: "",
              end_time: "",
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
        itineraryActivities: state.itineraryActivities.map((activity) =>
          activity.activity?.place_id === placeId ? { ...activity, deleted_at: new Date().toISOString() } : activity
        ),
      }));

      return { success: true };
    } catch (error) {
      console.error("Error removing itinerary activity:", error);
      return { success: false, error };
    }
  },
}));
