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
  mapRadius: number;
  tempMarker: ITempMarker | null;
  setCenterCoordinates: (coordinates: [number, number]) => void;
  setItineraryCoordinates: (coordinates: [number, number]) => void;

  setRadius: (radius: number) => void;
  setTempMarker: (marker: ITempMarker | null) => void;
  isMapView: boolean;
  setIsMapView: (isMapView: boolean) => void;
}

export const useMapStore = create<IMapStore>((set, get) => ({
  itineraryCoordinates: null,
  centerCoordinates: null,
  initialZoom: 10,
  mapRadius: 25000, // 25km - within Google Places API limit of 50km
  tempMarker: null,
  setCenterCoordinates: (coordinates) => set({ centerCoordinates: coordinates }),
  setItineraryCoordinates: (coordinates: [number, number]) => set({ itineraryCoordinates: coordinates }),
  setRadius: (radius: number) => {
    // Clamp radius to Google Places API limits (0 to 50,000 meters)
    const validRadius = Math.max(0, Math.min(50000, radius));
    set({ mapRadius: validRadius });
  },
  setTempMarker: (marker) => set({ tempMarker: marker }),
  isMapView: false,
  setIsMapView: (isMapView) => set({ isMapView }),
}));
