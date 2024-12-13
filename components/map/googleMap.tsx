import { APIProvider, Map } from "@vis.gl/react-google-maps";
import { motion, AnimatePresence } from "framer-motion";

import { useMapStore } from "@/store/mapStore";
import { useActivitiesStore } from "@/store/activityStore";

import { getRadiusForZoom } from "./zoomRadiusMap";
import GoogleMarkers from "./googleMarkers";
import GoogleMarker from "./googleMarker";
import SearchField from "../search/searchField";
import Circle from "./circle";
import GoogleMapController from "./googleMapController";

import { colors, TColor } from "@/lib/colors/colors";
import { ActivityOverlay } from "./activityOverlay";

export default function GoogleMapComponent() {
  const { centerCoordinates, initialZoom, setRadius, tempMarker, setCenterCoordinates } = useMapStore();
  const { selectedActivity, setSelectedActivity } = useActivitiesStore();

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

  const handleCenterChanged = (e: google.maps.MapMouseEvent) => {
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
