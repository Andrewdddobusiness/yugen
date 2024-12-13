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
  mapRadius: 75000,
  tempMarker: null,
  setCenterCoordinates: (coordinates) => set({ centerCoordinates: coordinates }),
  setItineraryCoordinates: (coordinates: [number, number]) => set({ itineraryCoordinates: coordinates }),
  setRadius: (mapRadius: number) => set({ mapRadius }),
  setTempMarker: (marker) => set({ tempMarker: marker }),
  isMapView: false,
  setIsMapView: (isMapView) => set({ isMapView }),
}));
