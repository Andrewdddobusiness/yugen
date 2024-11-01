import { create } from "zustand";
import { DateRange } from "react-day-picker";

interface CreateItineraryStore {
  destination: string | undefined;
  dateRange: DateRange | undefined;
  setDestination: (destination: string) => void;
  setDateRange: (dateRange: DateRange | undefined) => void;
  resetStore: () => void;
}

export const useCreateItineraryStore = create<CreateItineraryStore>((set) => ({
  destination: undefined,
  dateRange: undefined,
  setDestination: (destination) => set({ destination }),
  setDateRange: (dateRange) => set({ dateRange }),
  resetStore: () => set({ destination: undefined, dateRange: undefined }),
}));
