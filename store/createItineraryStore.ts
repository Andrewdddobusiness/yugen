import { create } from "zustand";
import type { DateRange } from "react-day-picker";

export interface Destination {
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

export interface CreateItineraryLeg {
  id: string;
  destination?: Destination;
  dateRange?: DateRange;
}

const createLegId = () => {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return (crypto as any).randomUUID() as string;
  }
  return `leg_${Date.now()}_${Math.random().toString(16).slice(2)}`;
};

const createEmptyLeg = (): CreateItineraryLeg => ({
  id: createLegId(),
});

interface CreateItineraryStore {
  legs: CreateItineraryLeg[];

  addLeg: () => string;
  removeLeg: (legId: string) => void;
  setLegDestination: (legId: string, destination: Destination | undefined) => void;
  setLegDateRange: (legId: string, dateRange: DateRange | undefined) => void;
  resetStore: () => void;
}

export const useCreateItineraryStore = create<CreateItineraryStore>((set, get) => ({
  legs: [createEmptyLeg()],

  addLeg: () => {
    const next = createEmptyLeg();
    set((state) => ({ legs: [...state.legs, next] }));
    return next.id;
  },

  removeLeg: (legId) => {
    set((state) => {
      const remaining = state.legs.filter((leg) => leg.id !== legId);
      return { legs: remaining.length > 0 ? remaining : [createEmptyLeg()] };
    });
  },

  setLegDestination: (legId, destination) => {
    set((state) => ({
      legs: state.legs.map((leg) => (leg.id === legId ? { ...leg, destination } : leg)),
    }));
  },

  setLegDateRange: (legId, dateRange) => {
    set((state) => ({
      legs: state.legs.map((leg) => (leg.id === legId ? { ...leg, dateRange } : leg)),
    }));
  },

  resetStore: () => {
    // Reset to a single empty leg.
    set({ legs: [createEmptyLeg()] });
  },
}));

