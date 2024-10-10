"use client";
import { useEffect, useRef, useState } from "react";
import mapboxgl, { LngLatLike } from "mapbox-gl";
import MapboxGeocoder from "@mapbox/mapbox-gl-geocoder";
import "@mapbox/mapbox-gl-geocoder/dist/mapbox-gl-geocoder.css";
import "mapbox-gl/dist/mapbox-gl.css";

const accessToken = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN || "";
mapboxgl.accessToken = accessToken;

const styles = [
  { label: "Standard", value: "mapbox://styles/mapbox/standard" },
  { label: "Streets", value: "mapbox://styles/mapbox/streets-v12" },
  { label: "Outdoors", value: "mapbox://styles/mapbox/outdoors-v12" },
  { label: "Light", value: "mapbox://styles/mapbox/light-v11" },
  { label: "Dark", value: "mapbox://styles/mapbox/dark-v11" },
  { label: "Satellite", value: "mapbox://styles/mapbox/satellite-v9" },
  {
    label: "Satellite Streets",
    value: "mapbox://styles/mapbox/satellite-streets-v12",
  },
  {
    label: "Navigation Day",
    value: "mapbox://styles/mapbox/navigation-day-v1",
  },
  {
    label: "Navigation Night",
    value: "mapbox://styles/mapbox/navigation-night-v1",
  },
];

export function determineActivityType(categories: string[]) {
  if (
    categories.some(
      (cat) => cat.includes("historical") || cat.includes("landmark")
    )
  )
    return "historical";
  if (
    categories.some((cat) => cat.includes("outdoors") || cat.includes("park"))
  )
    return "outdoors";
  if (categories.some((cat) => cat.includes("art") || cat.includes("museum")))
    return "art & culture";
  if (
    categories.some(
      (cat) => cat.includes("entertainment") || cat.includes("theater")
    )
  )
    return "entertainment";
  if (
    categories.some((cat) => cat.includes("restaurant") || cat.includes("food"))
  )
    return "food";
  return "other";
}

interface MapBoxProps {
  selectedActivity: any;
  setSelectedActivity: (activity: any) => void;
  activities: any[] | undefined;
  center: [number, number] | undefined;
  onWaypointClick: (
    setCenter: (location: [number, number] | null) => void
  ) => void;
}

export default function MapBox({
  selectedActivity,
  setSelectedActivity,
  activities = [],
  center,
  onWaypointClick,
}: MapBoxProps) {
  const mapContainer = useRef<any>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const [selectedStyle, setSelectedStyle] = useState(styles[0].value);
  const [mapState, setMapState] = useState({
    center: [151.2093, -33.8688] as [number, number], // Default to Sydney, Australia
    zoom: 13,
    bearing: -17.6,
    pitch: 45,
  });

  const centerMap = (coordinates: [number, number]) => {
    if (map.current) {
      map.current.flyTo({
        center: coordinates,
        zoom: 15,
        duration: 1000,
      });
    }
  };

  useEffect(() => {
    if (!accessToken || map.current) {
      return;
    }

    let mapCenter: [number, number] = mapState.center;

    if (
      Array.isArray(center) &&
      center.length === 2 &&
      typeof center[0] === "number" &&
      typeof center[1] === "number" &&
      !isNaN(center[0]) &&
      !isNaN(center[1])
    ) {
      mapCenter = center;
    }

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: selectedStyle,
      center: mapCenter,
      zoom: mapState.zoom,
      pitch: mapState.pitch,
      bearing: mapState.bearing,
      antialias: true,
    });

    const navigationControl = new mapboxgl.NavigationControl();
    map.current.addControl(navigationControl, "top-left");
    map.current.dragRotate.enable();

    map.current.on("load", () => {
      if (!map.current) return;

      map.current.addLayer({
        id: "3d-buildings",
        source: "composite",
        "source-layer": "building",
        filter: ["==", "extrude", "true"],
        type: "fill-extrusion",
        minzoom: 15,
        paint: {
          "fill-extrusion-color": "#aaa",
          "fill-extrusion-height": [
            "interpolate",
            ["linear"],
            ["zoom"],
            15,
            0,
            15.05,
            ["get", "height"],
          ],
          "fill-extrusion-base": [
            "interpolate",
            ["linear"],
            ["zoom"],
            15,
            0,
            15.05,
            ["get", "min_height"],
          ],
          "fill-extrusion-opacity": 0.6,
        },
      });

      updateMarkers();
    });

    return () => {
      if (map.current) {
        map.current.remove();
        map.current = null;
      }
    };
  }, [accessToken]);

  useEffect(() => {
    if (map.current) {
      map.current.setStyle(selectedStyle);
      map.current.setCenter(mapState.center);
      map.current.setZoom(mapState.zoom);
      map.current.setBearing(mapState.bearing);
      map.current.setPitch(mapState.pitch);
      if (activities) {
        updateMarkers();
      }
    }
  }, [selectedStyle, mapState, activities]);

  useEffect(() => {
    if (map.current) {
      map.current.resize(); // Resize the map when the panel is resized
    }
  }, [mapContainer]);

  useEffect(() => {
    if (map.current && activities) {
      updateMarkers();
    }
  }, [activities]);

  const handleStyleChange = (value: string) => {
    setSelectedStyle(value);
    saveMapState();
  };

  const saveMapState = () => {
    if (!map.current) return;
    const center = map.current.getCenter();
    setMapState({
      center: [center.lng, center.lat],
      zoom: map.current.getZoom(),
      bearing: map.current.getBearing(),
      pitch: map.current.getPitch(),
    });
  };

  const updateMarkers = () => {
    if (!map.current || !activities) return;

    // Remove existing markers
    const existingMarkers = document.getElementsByClassName("mapboxgl-marker");
    while (existingMarkers[0]) {
      existingMarkers[0].remove();
    }

    // Add new markers
    activities.forEach((activity: any) => {
      if (activity.location) {
        new mapboxgl.Marker()
          .setLngLat([activity.location.longitude, activity.location.latitude])
          .setPopup(
            new mapboxgl.Popup({ offset: 25 }).setHTML(
              `<h3>${activity.displayName?.text || "Activity"}</h3><p>${
                activity.formattedAddress
              }</p>`
            )
          )
          .addTo(map.current!);
      }
    });
  };

  useEffect(() => {
    if (
      map.current &&
      Array.isArray(center) &&
      center.length === 2 &&
      typeof center[0] === "number" &&
      typeof center[1] === "number" &&
      !isNaN(center[0]) &&
      !isNaN(center[1])
    ) {
      map.current.setCenter(center);
    }
  }, [center]);

  useEffect(() => {
    if (map.current) {
      onWaypointClick((location: [number, number] | null) => {
        if (location && Array.isArray(location) && location.length === 2) {
          centerMap(location);
        }
      });
    }
  }, [onWaypointClick]);

  return (
    <div className="w-full h-full">
      <div id="map" className="w-full h-full">
        <div className="w-full h-full" ref={mapContainer} />
      </div>
    </div>
  );
}
