import { APIProvider, Map } from "@vis.gl/react-google-maps";
import { motion, AnimatePresence } from "framer-motion";

import { useMapStore } from "@/store/mapStore";

import GoogleMarkers from "./googleMarkers";
import SearchField from "../search/searchField";

import Circle from "./circle";
import { getRadiusForZoom } from "./zoomRadiusMap";

export default function GoogleMapComponent() {
  // **** STORES ****

  const {
    centerCoordinates,
    setCenterCoordinates,
    initialZoom,

    setRadius,
  } = useMapStore();

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
          mapId={process.env.NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID}
          defaultCenter={center}
          defaultZoom={initialZoom}
          gestureHandling="greedy"
          disableDefaultUI={false}
          onZoomChanged={handleZoomChanged}
          onCenterChanged={(e) => {
            if (e.detail) {
              const { center } = e.detail;
              setCenterCoordinates([center.lat, center.lng]);
            }
          }}
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
          }}
        >
          <GoogleMarkers />
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
