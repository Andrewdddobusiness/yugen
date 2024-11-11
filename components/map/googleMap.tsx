import { useState, useEffect, useRef } from "react";
import { APIProvider, Map, useMap } from "@vis.gl/react-google-maps";
import { motion, AnimatePresence } from "framer-motion";

import { useMapStore } from "@/store/mapStore";
import { useActivitiesStore, IActivity } from "@/store/activityStore";
import { useSidebarStore } from "@/store/sidebarStore";

import { useSidebar } from "../ui/sidebar";

import { getRadiusForZoom } from "./zoomRadiusMap";
import GoogleMarkers from "./googleMarkers";
import GoogleMarker from "./googleMarker";
import SearchField from "../search/searchField";
import Circle from "./circle";
import GoogleMapController from "./googleMapController";

import { colors, TColor } from "@/lib/colors/colors";

import { fetchPlaceDetails } from "@/actions/google/actions";

export default function GoogleMapComponent() {
  const { centerCoordinates, initialZoom, mapRadius, setRadius, tempMarker } = useMapStore();
  const { setSelectedActivity, setActivities } = useActivitiesStore();
  const { setIsSidebarRightOpen } = useSidebarStore();
  const { openSidebar } = useSidebar();

  const center = centerCoordinates
    ? { lat: centerCoordinates[0], lng: centerCoordinates[1] }
    : { lat: 51.5074, lng: -0.1278 }; // Default to London

  const handleZoomChanged = (e: google.maps.MapMouseEvent) => {
    if (e.detail) {
      const zoom = e.detail.zoom;
      const radius = getRadiusForZoom(zoom);

      requestAnimationFrame(() => {
        setRadius(radius);
      });
    }
  };

  return (
    <div className="relative w-full h-full shadow-md">
      <APIProvider apiKey={process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY!}>
        <Map
          id="map-instance"
          mapId={process.env.NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID}
          defaultCenter={center}
          defaultZoom={initialZoom}
          gestureHandling="greedy"
          disableDefaultUI={true}
          onZoomChanged={handleZoomChanged}
          options={{
            mapTypeControl: false,
            fullscreenControl: false,
            minZoom: 10,
            maxZoom: 17,
            restriction: {
              latLngBounds: {
                north: 85,
                south: -85,
                west: -180,
                east: 180,
              },
            },
            clickableIcons: true,
          }}
        >
          <GoogleMapController />
          <GoogleMarkers />
          {tempMarker && (
            <GoogleMarker
              latitude={tempMarker.latitude}
              longitude={tempMarker.longitude}
              activity={tempMarker.activity}
              color={colors.Red as TColor}
              size="lg"
            />
          )}
          {/* {centerCoordinates && (
            <Circle center={{ lat: centerCoordinates[0], lng: centerCoordinates[1] }} radius={mapRadius} />
          )} */}
        </Map>
      </APIProvider>

      {/* Search Controls */}
      <AnimatePresence>
        {/* Search Field */}
        <motion.div
          key="search-field"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.5 }}
          className="absolute left-1/2 top-4 -translate-x-1/2 z-10 w-full max-w-md"
        >
          <div className="w-full flex justify-center">
            <SearchField />
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

interface MapControllerProps {
  setTempMarker: React.Dispatch<
    React.SetStateAction<{
      latitude: number;
      longitude: number;
      activity: IActivity;
    } | null>
  >;
}

function MapController({ setTempMarker }: MapControllerProps) {
  const map = useMap("map-instance");
  const { setSelectedActivity } = useActivitiesStore();
  const { setIsSidebarRightOpen } = useSidebarStore();
  const { openSidebar } = useSidebar();

  useEffect(() => {
    if (!map) return;

    const listener = map.addListener("click", async (e: google.maps.MapMouseEvent & { placeId?: string }) => {
      if (e.placeId) {
        e.stop?.();
        try {
          const activity = await fetchPlaceDetails(e.placeId);
          if (!activity.coordinates || activity.coordinates.length !== 2) return;

          map.panTo({
            lat: activity.coordinates[0],
            lng: activity.coordinates[1],
          });

          setTempMarker({
            latitude: activity.coordinates[0],
            longitude: activity.coordinates[1],
            activity: activity,
          });

          setSelectedActivity(activity);
          setIsSidebarRightOpen(true);
          openSidebar();
        } catch (error) {
          console.error("Error fetching place details:", error);
        }
      }
    });

    return () => {
      google.maps.event.removeListener(listener);
    };
  }, [map, setTempMarker, setSelectedActivity, setIsSidebarRightOpen, openSidebar]);

  return null;
}
