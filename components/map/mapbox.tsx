import * as React from "react";
import { useEffect, useRef, useState } from "react";
import Map, { Layer, Source, NavigationControl, Marker } from "react-map-gl";
import type { CircleLayer, FillLayer } from "react-map-gl";
import "mapbox-gl/dist/mapbox-gl.css";

import * as turf from "@turf/turf";

import { Button } from "../ui/button";
import { CircleMinus, CirclePlus, Earth, Loader2, X } from "lucide-react";

import { useActivitiesStore } from "@/store/activityStore";
import { useMapStore } from "@/store/mapStore";
import { useSidebarStore } from "@/store/sidebarStore";

import { Skeleton } from "../ui/skeleton";
import { fetchNearbyActivities } from "@/actions/google/actions";

import { motion, AnimatePresence } from "framer-motion";
import { useActivityTabStore } from "@/store/activityTabStore";

export default function Mapbox() {
  // Define the calculateRadiusInPixels function before using it
  const calculateRadiusInPixels = (zoom: number, radiusInMeters: number) => {
    const earthCircumference = 40075017; // Earth's circumference in meters
    const metersPerPixel = earthCircumference / (256 * Math.pow(2, zoom));
    return radiusInMeters / metersPerPixel;
  };

  // **** STORES ****
  const { setSelectedTab } = useActivityTabStore();
  const { activities, setActivities } = useActivitiesStore();
  const {
    centerCoordinates,
    setCenterCoordinates,
    initialZoom,
    smallRadiusInMeters,
    largeRadiusInMeters,
    mapRadius,
    setRadius,
  } = useMapStore();
  const { isSidebarOpen } = useSidebarStore();

  const [searchOpen, setSearchOpen] = useState(false);
  const [circleRadius, setCircleRadius] = useState(() => calculateRadiusInPixels(initialZoom, smallRadiusInMeters));
  const [circleCenter, setCircleCenter] = useState<[number, number] | null>(null);
  const [markerCoordinates, setMarkerCoordinates] = useState<[number, number][] | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isGeneratingActivities, setIsGeneratingActivities] = useState(false);
  const [currentZoom, setCurrentZoom] = useState(initialZoom);

  const mapRef = useRef(null);

  useEffect(() => {
    if (centerCoordinates) {
      setCircleCenter(centerCoordinates);
      const initialRadius = calculateRadiusInPixels(currentZoom, mapRadius);
      setCircleRadius(initialRadius);
      setIsLoading(false);
    }
  }, [centerCoordinates, currentZoom, mapRadius]);

  useEffect(() => {
    if (activities) {
      console.log("activities: ", activities);
      setMarkerCoordinates(
        activities.map((activity) => [activity?.coordinates[0] ?? 0, activity?.coordinates[1] ?? 0])
      );
    }
  }, [activities, centerCoordinates]);

  const circleLayer: CircleLayer = {
    id: "circle-layer",
    type: "circle",
    paint: {
      "circle-radius": circleRadius,
      "circle-color": "#FF0000",
      "circle-opacity": 0.2,
      "circle-stroke-color": "#FF0000",
      "circle-stroke-width": 2,
      "circle-stroke-opacity": 0.5,
    },
    source: "circle-source",
  };

  const circleData = circleCenter
    ? turf.circle([circleCenter[1], circleCenter[0]], mapRadius / 1000, {
        steps: 64,
        units: "kilometers",
      })
    : null;

  // Define the tint layer
  const tintLayer: FillLayer = {
    id: "tint-layer",
    type: "fill",
    source: "tint-source",
    paint: {
      "fill-color": "black",
      "fill-opacity": searchOpen ? 0.08 : 0,
    },
  };

  // Create a GeoJSON source for the tint layer that covers the entire map
  const tintSource = {
    type: "geojson",
    data: {
      type: "Feature",
      properties: {},
      geometry: {
        type: "Polygon",
        coordinates: [
          [
            [-180, -90],
            [180, -90],
            [180, 90],
            [-180, 90],
            [-180, -90],
          ],
        ],
      },
    },
  };

  const handleSearchOpen = () => {
    setSearchOpen(!searchOpen);
    setSelectedTab("search");
  };
  const handleSearchClose = () => {
    setSearchOpen(!searchOpen);
  };

  const handleZoom = (zoom: number, radius: number) => {
    setCurrentZoom(zoom);
    setRadius(radius);
  };

  const handleMarkerDrag = (event: any) => {
    const newCenter = event.lngLat;
    setCircleCenter([newCenter.lat, newCenter.lng]);
    setCenterCoordinates([newCenter.lat, newCenter.lng]);
    if (mapRef.current) {
      const zoom = (mapRef.current as any).getMap().getZoom();
      handleZoom(zoom, mapRadius);
    }
    // Manually refetch activities without triggering a full page reload
    // refetchActivities();
  };

  const handleGenerateActivities = () => {
    const generateActivities = async () => {
      setIsGeneratingActivities(true);
      if (circleCenter) {
        const activities = await fetchNearbyActivities(circleCenter[0], circleCenter[1], mapRadius);
        setActivities(activities);
      }
      setIsGeneratingActivities(false);
    };
    generateActivities();
  };

  if (isLoading) {
    return (
      <Skeleton className="flex flex-col items-center justify-center w-full h-full gap-2">
        <Earth size={32} />
        <div className="text-md">Loading Map...</div>
      </Skeleton>
    );
  }

  return (
    <div style={{ position: "relative", width: "100%", height: "100%" }}>
      {circleCenter && (
        <div style={{ position: "relative", width: "100%", height: "100%" }}>
          <div style={{ width: "100%", height: "100%" }}>
            <Map
              ref={mapRef}
              mapboxAccessToken={process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN}
              initialViewState={{
                latitude: circleCenter[0],
                longitude: circleCenter[1],
                zoom: currentZoom,
              }}
              mapStyle={"mapbox://styles/mapbox/streets-v9"}
              style={{ width: "100%", height: "100%" }}
              onMove={(evt) => {
                handleZoom(evt.viewState.zoom, mapRadius);
              }}
            >
              {/* Add the tint layer */}
              <Source id="tint-source" type="geojson" data={tintSource.data}>
                <Layer {...tintLayer} />
              </Source>

              <div>
                {circleData && (
                  <Source id="circle-source" type="geojson" data={circleData}>
                    <Layer
                      id="circle-fill-layer"
                      type="fill"
                      paint={{
                        "fill-color": "#FF0000",
                        "fill-opacity": searchOpen ? 0.2 : 0.08,
                      }}
                    />
                    <Layer
                      id="circle-border-layer"
                      type="line"
                      paint={{
                        "line-color": "#FF0000",
                        "line-width": searchOpen ? 2 : 0,
                        "line-opacity": searchOpen ? 0.5 : 0.2,
                        "line-dasharray": [2, 2],
                      }}
                    />
                  </Source>
                )}
                {markerCoordinates &&
                  markerCoordinates.map((coordinate, index) => (
                    <Marker key={index} latitude={coordinate[0]} longitude={coordinate[1]} color="#2c7ce5" />
                  ))}
                {searchOpen && (
                  <Marker
                    latitude={circleCenter[0]}
                    longitude={circleCenter[1]}
                    draggable
                    onDragEnd={handleMarkerDrag}
                    color="#f82553"
                  />
                )}
              </div>
              <NavigationControl position="top-left" />
            </Map>
          </div>

          <AnimatePresence>
            {searchOpen && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.5 }}
              >
                <motion.div
                  animate={{
                    background: [
                      `linear-gradient(to top, rgba(243,50,97,0.8), rgba(243,50,97,0) 5%),
                   linear-gradient(to bottom, rgba(243,50,97,0.8), rgba(243,50,97,0) 5%),
                   linear-gradient(to left, rgba(243,50,97,0.8), rgba(243,50,97,0) 5%),
                   linear-gradient(to right, rgba(243,50,97,0.8), rgba(243,50,97,0) 5%)`,
                      `linear-gradient(to top, rgba(197,163,239,0.8), rgba(197,163,239,0) 5%),
                   linear-gradient(to bottom, rgba(197,163,239,0.8), rgba(197,163,239,0) 5%),
                   linear-gradient(to left, rgba(197,163,239,0.8), rgba(197,163,239,0) 5%),
                   linear-gradient(to right, rgba(197,163,239,0.8), rgba(197,163,239,0) 5%)`,
                      `linear-gradient(to top, rgba(246,170,35,0.8), rgba(246,170,35,0) 5%),
                   linear-gradient(to bottom, rgba(246,170,35,0.8), rgba(246,170,35,0) 5%),
                   linear-gradient(to left, rgba(246,170,35,0.8), rgba(246,170,35,0) 5%),
                   linear-gradient(to right, rgba(246,170,35,0.8), rgba(246,170,35,0) 5%)`,
                    ],
                  }}
                  transition={{
                    duration: 10,
                    repeat: Infinity,
                    repeatType: "mirror",
                  }}
                  style={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    pointerEvents: "none",
                    mixBlendMode: "multiply",
                  }}
                />
              </motion.div>
            )}
          </AnimatePresence>

          {searchOpen ? (
            <div className="flex flex-col">
              <div
                className={`flex flex-col absolute top-2 right-2 z-10 gap-2 items-end ${
                  isSidebarOpen ? "hidden md:block" : "lg:block"
                }`}
              >
                <Button variant="outline" size="icon" onClick={handleSearchOpen} className="rounded-full w-10 h-10">
                  <X size={16} />
                </Button>
                <div className="flex flex-col items-center">
                  <div className="text-sm text-zinc-500">Radius</div>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => handleZoom(currentZoom, largeRadiusInMeters)}
                    className="rounded-b-none w-10 h-10"
                  >
                    <CirclePlus size={16} />
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => handleZoom(currentZoom, smallRadiusInMeters)}
                    className="rounded-t-none w-10 h-10"
                  >
                    <CircleMinus size={16} />
                  </Button>
                </div>
              </div>
              <div
                className={`absolute bottom-10 left-0 right-0 flex justify-center z-10 px-4  ${
                  isSidebarOpen ? "hidden md:block" : "lg:block"
                }`}
              >
                {isGeneratingActivities ? (
                  <Button variant="outline" className={`w-full rounded-full flex items-center justify-center`} disabled>
                    <div className="flex items-center">
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      <span>Please wait</span>
                    </div>
                  </Button>
                ) : (
                  <Button variant="outline" className={`w-full rounded-full `} onClick={handleGenerateActivities}>
                    Search for Activities
                  </Button>
                )}
              </div>
            </div>
          ) : (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.5 }}
            >
              <div className="flex flex-col absolute top-2 right-2 z-10">
                <Button variant="outline" onClick={handleSearchOpen}>
                  Explore Activities
                </Button>
              </div>
            </motion.div>
          )}
        </div>
      )}
    </div>
  );
}
