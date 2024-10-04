import { create } from "zustand";
import {
  fetchFilteredTableData,
  setTableData,
} from "@/actions/supabase/actions";

export interface IActivity {
  itinerary_activity_id: number;
  activity_date: string;
  activity_start_time: string;
  activity_end_time: string;
  activities: {
    activity_name: string;
    description: string;
    image_url: string[];
  };
}

interface ItineraryStore {
  activities: IActivity[];
  fetchActivities: (itineraryId: string) => Promise<IActivity[]>;
  updateActivity: (activity: Partial<IActivity>) => Promise<void>;
  setActivities: (activities: IActivity[]) => void;
}

export const useItineraryStore = create<ItineraryStore>((set) => ({
  activities: [],
  fetchActivities: async (itineraryId: string) => {
    try {
      const result = await fetchFilteredTableData(
        "itinerary_activities",
        "itinerary_activity_id, activity_date, activity_start_time, activity_end_time, activities(activity_name, description, image_url)",
        "itinerary_id",
        [itineraryId]
      );
      if (result.success && result.data) {
        return result.data as unknown as IActivity[];
      }
      return [];
    } catch (error) {
      console.error("Error fetching itinerary data:", error);
      return [];
    }
  },
  updateActivity: async (activity: Partial<IActivity>) => {
    try {
      const { activities, ...activityData } = activity;
      const result = await setTableData("itinerary_activities", activityData, [
        "itinerary_activity_id",
      ]);
      if (result.success) {
        set((state) => ({
          activities: state.activities.map((a) =>
            a.itinerary_activity_id === activity.itinerary_activity_id
              ? { ...a, ...activity }
              : a
          ),
        }));
      }
    } catch (error) {
      console.error("Error updating activity:", error);
    }
  },
  setActivities: (activities: IActivity[]) => set({ activities }),
}));
