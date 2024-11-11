import { create } from "zustand";
import { IActivity } from "./activityStore";

interface ITempMarker {
  latitude: number;
  longitude: number;
  activity: IActivity;
}

interface IMapStore {
  itineraryCoordinates: [number, number] | null; // [latitude, longitude]
  centerCoordinates: [number, number] | null; // [latitude, longitude]
  initialZoom: number;
  smallRadiusInMeters: number;
  largeRadiusInMeters: number;
  mapRadius: number;
  tempMarker: ITempMarker | null;
  setCenterCoordinates: (coordinates: [number, number]) => void;
  setItineraryCoordinates: (coordinates: [number, number]) => void;
  getItineraryCoordinates: () => [number, number];
  setRadius: (radius: number) => void;
  setTempMarker: (marker: ITempMarker | null) => void;
}

export const useMapStore = create<IMapStore>((set, get) => ({
  itineraryCoordinates: null,
  centerCoordinates: null,
  initialZoom: 10,
  smallRadiusInMeters: 3000,
  largeRadiusInMeters: 10000,
  mapRadius: 75000,
  tempMarker: null,
  setCenterCoordinates: (coordinates) => set({ centerCoordinates: coordinates }),
  getCenterCoordinates: () => get().centerCoordinates as [number, number],
  setItineraryCoordinates: (coordinates: [number, number]) => set({ itineraryCoordinates: coordinates }),
  getItineraryCoordinates: () => get().itineraryCoordinates as [number, number],
  setRadius: (mapRadius: number) => set({ mapRadius }),
  setTempMarker: (marker) => set({ tempMarker: marker }),
}));
