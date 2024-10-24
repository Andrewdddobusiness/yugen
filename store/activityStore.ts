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
  coordinates: [number, number];
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
  is_top_place?: boolean;
}

export interface IActivityWithLocation extends IActivity {
  country_name: string;
  city_name: string;
  destination_id: string;
}

interface IActivityStore {
  activities: IActivity[];
  topPlacesActivities: IActivity[];
  selectedActivity: IActivity | null;
  fetchActivities: (itineraryId: string) => Promise<any[]>;
  setActivities: (activities: IActivity[]) => void;
  insertActivity: (activity: any) => void;
  removeActivity: (activityId: string) => void;
  setSelectedActivity: (activity: IActivity | null) => void;
  setTopPlacesActivities: (topPlaces: IActivity[]) => void;
}

export const useActivitiesStore = create<IActivityStore>((set, get) => ({
  activities: [],
  topPlacesActivities: [],
  selectedActivity: null,
  fetchActivities: async (itineraryId: string): Promise<any[]> => {
    try {
      const response = await fetch(`/api/itineraries/${itineraryId}/activities`);
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
  setActivities: (activities: IActivity[]) => set({ activities }),
  insertActivity: (activity: any) => set((state) => ({ activities: [...state.activities, activity] })),
  removeActivity: (activityId: string) =>
    set((state) => ({
      activities: state.activities.filter((a) => a.place_id !== activityId),
    })),
  setSelectedActivity: (activity: IActivity | null) => set({ selectedActivity: activity }),
  setTopPlacesActivities: (topPlaces: IActivity[]) => set({ topPlacesActivities: topPlaces }),
}));
