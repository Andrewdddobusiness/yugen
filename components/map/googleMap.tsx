import { APIProvider, Map, MapCameraChangedEvent } from "@vis.gl/react-google-maps";
import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect } from "react";
import { GeoJSON } from "geojson";

import { useMapStore } from "@/store/mapStore";
import { useActivitiesStore } from "@/store/activityStore";
import { useActivityTabStore } from "@/store/activityTabStore";

import { getRadiusForZoom } from "./zoomRadiusMap";
import GoogleMarkers from "./googleMarkers";
import GoogleMarker from "./googleMarker";
import SearchField from "../search/searchField";
import Circle from "./circle";
import GoogleMapController from "./googleMapController";

import { colors, TColor } from "@/lib/colors/colors";
import { ActivityOverlay } from "./activityOverlay";
import { DeckGLOverlay } from "./areaOverlay";
import { fetchAreaActivities } from "@/actions/google/actions";

export default function GoogleMapComponent() {
  const { centerCoordinates, initialZoom, setRadius, tempMarker, setCenterCoordinates } = useMapStore();
  const { selectedActivity, setSelectedActivity, setAreaSearchActivities } = useActivitiesStore();
  const { selectedTab } = useActivityTabStore();

  // Add Bondi Beach area GeoJSON data
  const sydneySuburbGeoJson: GeoJSON.FeatureCollection = {
    type: "FeatureCollection",
    features: [
      {
        type: "Feature",
        properties: {
          name: "Bondi Beach",
          city: "Sydney",
        },
        geometry: {
          type: "Polygon",
          coordinates: [
            [
              [151.2744, -33.8915], // Bondi Beach coordinates
              [151.2845, -33.8915],
              [151.2845, -33.8965],
              [151.2744, -33.8965],
              [151.2744, -33.8915],
            ],
          ],
        },
      },
      {
        type: "Feature",
        properties: {
          name: "Surry Hills",
          city: "Sydney",
        },
        geometry: {
          type: "Polygon",
          coordinates: [
            [
              [151.207, -33.8845],
              [151.217, -33.8845],
              [151.217, -33.89],
              [151.207, -33.89],
              [151.207, -33.8845],
            ],
          ],
        },
      },
    ],
  };

  const [geoJsonData, setGeoJsonData] = useState<GeoJSON.FeatureCollection | null>(null);

  // Set the GeoJSON data when component mounts
  useEffect(() => {
    setGeoJsonData(sydneySuburbGeoJson);
  }, []);

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

  const handleAreaClick = async (properties: any) => {
    try {
      const feature = geoJsonData?.features.find(
        (f: any) => f.properties?.name === properties.name && f.properties?.city === properties.city
      );

      if (feature && feature.geometry.type === "Polygon") {
        const activities = await fetchAreaActivities(properties.name, properties.city, feature.geometry.coordinates[0]);
        setAreaSearchActivities(activities); // Store the activities in the global store
      }
    } catch (error) {
      console.error(`Error fetching activities for ${properties.name}:`, error);
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
          {selectedTab === "area-search" && geoJsonData && (
            <DeckGLOverlay data={geoJsonData} onAreaClick={handleAreaClick} />
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
