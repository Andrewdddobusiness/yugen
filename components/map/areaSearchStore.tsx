import { create } from "zustand";

interface AreaSearchState {
  selectedArea: string | null;
  areaActivities: any[];
  setSelectedArea: (area: string | null) => void;
  setAreaActivities: (activities: any[]) => void;
}

export const useAreaSearchStore = create<AreaSearchState>((set) => ({
  selectedArea: null,
  areaActivities: [],
  setSelectedArea: (area) => set({ selectedArea: area }),
  setAreaActivities: (activities) => set({ areaActivities: activities }),
}));
