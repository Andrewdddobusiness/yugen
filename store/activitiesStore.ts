import { create } from "zustand";

interface ActivitiesStore {
  activities: any[];
  fetchActivities: (itineraryId: string) => Promise<any[]>;
}

export const useActivitiesStore = create<ActivitiesStore>((set) => ({
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
}));
