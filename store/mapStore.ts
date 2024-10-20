import { create } from "zustand";

interface IMapStore {
  itineraryCoordinates: [number, number] | null; // [latitude, longitude]
  centerCoordinates: [number, number] | null; // [latitude, longitude]
  initialZoom: number;
  smallRadiusInMeters: number;
  largeRadiusInMeters: number;
  mapRadius: number;
  setCenterCoordinates: (coordinates: [number, number]) => void;
  setItineraryCoordinates: (coordinates: [number, number]) => void;
  getItineraryCoordinates: () => [number, number];
  setRadius: (radius: number) => void;
}

export const useMapStore = create<IMapStore>((set, get) => ({
  itineraryCoordinates: null,
  centerCoordinates: null,
  initialZoom: 10,
  smallRadiusInMeters: 3000,
  largeRadiusInMeters: 10000,
  mapRadius: 3000,
  setCenterCoordinates: (coordinates) =>
    set({ centerCoordinates: coordinates }),
  getCenterCoordinates: () => get().centerCoordinates as [number, number],
  setItineraryCoordinates: (coordinates: [number, number]) =>
    set({ itineraryCoordinates: coordinates }),
  getItineraryCoordinates: () => get().itineraryCoordinates as [number, number],
  setRadius: (mapRadius: number) => set({ mapRadius }),
}));
