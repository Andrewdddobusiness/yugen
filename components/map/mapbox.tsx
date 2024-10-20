import * as React from "react";
import { useEffect, useRef, useState } from "react";
import Map, { Layer, Source, NavigationControl, Marker } from "react-map-gl";
import type { CircleLayer } from "react-map-gl";
import "mapbox-gl/dist/mapbox-gl.css";

import { Button } from "../ui/button";
import { CircleMinus, CirclePlus, Earth, X } from "lucide-react";

import { useActivitiesStore } from "@/store/activityStore";
import { useMapStore } from "@/store/mapStore";
import { Skeleton } from "../ui/skeleton";

import * as turf from "@turf/turf";

export default function Mapbox({ isSidebarOpen }: { isSidebarOpen: boolean }) {
  // Define the calculateRadiusInPixels function before using it
  const calculateRadiusInPixels = (zoom: number, radiusInMeters: number) => {
    const earthCircumference = 40075017; // Earth's circumference in meters
    const metersPerPixel = earthCircumference / (256 * Math.pow(2, zoom));
    return radiusInMeters / metersPerPixel;
  };

  const { activities } = useActivitiesStore();
  const {
    centerCoordinates,
    setCenterCoordinates,
    initialZoom,
    smallRadiusInMeters,
    largeRadiusInMeters,
    mapRadius,
    setRadius,
  } = useMapStore();

  const [searchOpen, setSearchOpen] = useState(false);
  const [circleRadius, setCircleRadius] = useState(() => calculateRadiusInPixels(initialZoom, smallRadiusInMeters));
  const [circleCenter, setCircleCenter] = useState<[number, number] | null>(null);
  const [markerCoordinates, setMarkerCoordinates] = useState<[number, number][] | null>(null);
  const [isLoading, setIsLoading] = useState(true);
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

  const handleSearchOpen = () => {
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
          <Map
            ref={mapRef}
            mapboxAccessToken={process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN}
            initialViewState={{
              latitude: circleCenter[0],
              longitude: circleCenter[1],
              zoom: currentZoom,
            }}
            mapStyle="mapbox://styles/mapbox/streets-v9"
            style={{ width: "100%", height: "100%" }}
            onMove={(evt) => {
              handleZoom(evt.viewState.zoom, mapRadius);
            }}
          >
            {searchOpen ? (
              <>
                {circleData && (
                  <Source id="circle-source" type="geojson" data={circleData}>
                    <Layer
                      id="circle-layer"
                      type="fill"
                      paint={{
                        "fill-color": "#FF0000",
                        "fill-opacity": 0.2,
                        "fill-outline-color": "#FF0000",
                      }}
                    />
                  </Source>
                )}
                <Marker latitude={circleCenter[0]} longitude={circleCenter[1]} draggable onDragEnd={handleMarkerDrag} />
              </>
            ) : (
              markerCoordinates &&
              markerCoordinates.map((coordinate, index) => (
                <Marker
                  key={index}
                  latitude={coordinate[0]}
                  longitude={coordinate[1]}
                  draggable
                  onDragEnd={handleMarkerDrag}
                />
              ))
            )}
            <NavigationControl position="top-left" />
          </Map>
          <div className="flex flex-col absolute top-2 right-2 z-10">
            {searchOpen ? (
              <div className="flex flex-col gap-2 items-end">
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
            ) : (
              <Button
                variant="outline"
                onClick={handleSearchOpen}
                className={`
     ${isSidebarOpen ? "hidden md:block" : "lg:block"}
  `}
              >
                Explore Activities
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
