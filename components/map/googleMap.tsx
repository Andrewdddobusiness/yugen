import { APIProvider, Map, MapCameraChangedEvent } from "@vis.gl/react-google-maps";
import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect } from "react";

import { useMapStore } from "@/store/mapStore";
import { useActivitiesStore } from "@/store/activityStore";
import { useActivityTabStore } from "@/store/activityTabStore";

import { getRadiusForZoom } from "./zoomRadiusMap";
import GoogleMarkers from "./GoogleMarkers";
import GoogleMarker from "./GoogleMarker";
import SearchField from "../search/SearchField";
import Circle from "./Circle";
import GoogleMapController from "./GoogleMapController";

import { colors, TColor } from "@/lib/colors/colors";
import { ActivityOverlay } from "./ActivityOverlay";

export default function GoogleMapComponent() {
  const { centerCoordinates, initialZoom, setRadius, tempMarker, setCenterCoordinates, mapRadius } = useMapStore();
  const { selectedActivity, setSelectedActivity, isActivitiesLoading } = useActivitiesStore();
  const { selectedTab } = useActivityTabStore();

  const center = centerCoordinates
    ? { lat: centerCoordinates[0], lng: centerCoordinates[1] }
    : { lat: 51.5074, lng: -0.1278 };

  const handleZoomChanged = (e: MapCameraChangedEvent) => {
    if (e.detail) {
      const zoom = e.detail.zoom;
      const radius = getRadiusForZoom(zoom);

      requestAnimationFrame(() => {
        setRadius(radius);
      });
    }
  };

  const handleCenterChanged = (e: MapCameraChangedEvent) => {
    if (e.detail) {
      const newCenter = e.detail.center;
      if (newCenter) {
        setCenterCoordinates([newCenter.lat, newCenter.lng]);
      }
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
          onCenterChanged={handleCenterChanged}
          mapTypeControl={false}
          fullscreenControl={false}
          minZoom={10}
          maxZoom={17}
          restriction={{
            latLngBounds: {
              north: 85,
              south: -85,
              west: -180,
              east: 180,
            },
          }}
          clickableIcons={true}
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

      {/* Activity Overlay with AnimatePresence for smooth transitions */}
      <AnimatePresence>
        {selectedActivity && (
          <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
          >
            <ActivityOverlay
              onClose={() => {
                setSelectedActivity(null);
              }}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
