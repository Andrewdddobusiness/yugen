import { create } from "zustand";

export interface IReview {
  description: string;
  rating: number;
  author: string;
  uri: string;
  publish_date_time: string;
}

export interface IOpenHours {
  day: number;
  open_hour: number;
  open_minute: number;
  close_hour: number;
  close_minute: number;
}

export interface IActivity {
  place_id: string;
  name: string;
  types: string[];
  price_level: string;
  address: string;
  rating: number;
  description: string;
  google_maps_url: string;
  website_url: string;
  photo_names: string[];
  duration: number | null;
  phone_number: string;
  reviews: IReview[];
  open_hours: IOpenHours[];
}

export interface IActivityWithLocation extends IActivity {
  country_name: string;
  city_name: string;
  destination_id: string;
}

interface IActivityStore {
  activities: IActivity[];
  fetchActivities: (itineraryId: string) => Promise<any[]>;
  fetchActivity: (activityId: string) => Promise<any>;
  insertActivity: (activity: any) => void;
  removeActivity: (activityId: string) => void;
}

export const useActivitiesStore = create<IActivityStore>((set) => ({
  activities: [],
  fetchActivities: async (itineraryId: string): Promise<any[]> => {
    try {
      const response = await fetch(
        `/api/itineraries/${itineraryId}/activities`
      );
      if (!response.ok) {
        throw new Error("Failed to fetch activities");
      }
      const data: any[] = await response.json();
      set({ activities: data });
      return data;
    } catch (error) {
      console.error(error);
      return [];
    }
  },
  fetchActivity: async (activityId: string): Promise<any> => {},
  insertActivity: (activity: any) =>
    set((state) => ({ activities: [...state.activities, activity] })),
  removeActivity: (activityId: string) =>
    set((state) => ({
      activities: state.activities.filter((a) => a.activity_id !== activityId),
    })),
}));
