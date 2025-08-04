import { create } from "zustand";
import { DateRange } from "react-day-picker";

interface Destination {
  id: string;
  name: string;
  country: string;
  city: string;
  formatted_address: string;
  place_id: string;
  coordinates: {
    lat: number;
    lng: number;
  };
  timezone: string;
  photos?: string[];
  description?: string;
}

interface CreateItineraryStore {
  destination: string | undefined; // Legacy support
  destinationData: Destination | undefined;
  dateRange: DateRange | undefined;
  setDestination: (destination: string) => void;
  setDestinationData: (destination: Destination) => void;
  setDateRange: (dateRange: DateRange | undefined) => void;
  resetStore: () => void;
}

export const useCreateItineraryStore = create<CreateItineraryStore>((set) => ({
  destination: undefined,
  destinationData: undefined,
  dateRange: undefined,
  setDestination: (destination) => set({ destination }),
  setDestinationData: (destinationData) => set({ 
    destinationData, 
    destination: destinationData.formatted_address // Keep legacy compatibility
  }),
  setDateRange: (dateRange) => set({ dateRange }),
  resetStore: () => set({ 
    destination: undefined, 
    destinationData: undefined, 
    dateRange: undefined 
  }),
}));
