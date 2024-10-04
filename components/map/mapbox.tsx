"use client";
import { useEffect, useRef, useState } from "react";

import mapboxgl, { LngLatLike } from "mapbox-gl";
import MapboxGeocoder from "@mapbox/mapbox-gl-geocoder";
import "@mapbox/mapbox-gl-geocoder/dist/mapbox-gl-geocoder.css";
import "mapbox-gl/dist/mapbox-gl.css";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";

const accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || "";

import WaypointSidebar from "../sidebar/activitySideBar";

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

const locations = [
  { name: "Royal Botanic Garden Sydney", coordinates: [151.2167, -33.8642] },
  { name: "Art Gallery of New South Wales", coordinates: [151.2171, -33.8689] },
  { name: "Sydney Opera House", coordinates: [151.214, -33.8568] },
  { name: "Taronga Zoo Sydney", coordinates: [151.2395, -33.8457] },
  { name: "Sydney Harbour Bridge", coordinates: [151.2108, -33.8523] },
];

// const locations = [{}];

export default function MapBox({ selectedActivity, setSelectedActivity }: any) {
  const mapContainer = useRef<any>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const geocoderContainer = useRef<any>(null);
  const [selectedStyle, setSelectedStyle] = useState(styles[0].value);
  const [mapState, setMapState] = useState({
    center: [151.2093, -33.8688],
    zoom: 12,
    bearing: -17.6,
    pitch: 45,
  });

  const [isMouseOverWaypoint, setIsMouseOverWaypoint] = useState(false);

  const onClose = () => {
    setSelectedActivity(false);
  };

  useEffect(() => {
    if (!accessToken) {
      console.error("Mapbox access token is not provided.");
      return;
    }

    let center: LngLatLike | undefined;
    if (mapState.center && mapState.center.length >= 2) {
      center = mapState.center as LngLatLike;
    } else {
      center = [151.2093, -33.8688];
    }

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: selectedStyle,
      center: center,
      zoom: mapState.zoom || 12,
      pitch: mapState.pitch || 0,
      bearing: mapState.bearing || 0,
      antialias: true,
    });

    // Add navigation control (zoom and rotation controls)
    const navigationControl = new mapboxgl.NavigationControl();
    map.current.addControl(navigationControl, "top-left");

    // Enable dragRotate interaction
    map.current.dragRotate.enable();

    // Add the Geocoder if it doesn't already exist
    if (
      geocoderContainer.current &&
      geocoderContainer.current.children.length === 0
    ) {
      const geocoder = new MapboxGeocoder({
        accessToken: mapboxgl.accessToken,
        mapboxgl: mapboxgl,
      });

      geocoderContainer.current.appendChild(geocoder.onAdd(map.current));
    }

    map.current.on("load", () => {
      map.current!.loadImage("/waypointRed.png", (error, image) => {
        if (error) throw error;

        // Add the image to the map's style
        if (map.current && image) {
          map.current.addImage("custom-icon", image);

          locations.forEach((location, index) => {
            // Add a source for each location
            map.current!.addSource(`point-${index}`, {
              type: "geojson",
              data: {
                type: "FeatureCollection",
                features: [
                  {
                    type: "Feature",
                    geometry: {
                      type: "Point",
                      coordinates: location.coordinates,
                    },
                    properties: {
                      title: location.name,
                      description: location.name,
                    },
                  },
                ],
              },
            });

            // Add a layer for each location
            map.current!.addLayer({
              id: `point-${index}`,
              type: "symbol",
              source: `point-${index}`,
              layout: {
                "icon-image": "custom-icon",
                "icon-size": 0.1,
                "text-field": "{title}",
                "text-font": ["Open Sans Bold", "Arial Unicode MS Bold"],
                "text-size": 12,
                "text-anchor": "top",
                "text-offset": [0, 2],
              },
            });
          });
        }
      });

      // Add 3D buildings layer
      map.current!.addLayer({
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
    });

    // Inside the useEffect hook where you add the waypoint layers

    map.current.on("click", (e) => {
      const features = map.current!.queryRenderedFeatures(e.point, {
        layers: locations.map((_, i) => `point-${i}`),
      });

      if (features.length) {
        setSelectedActivity(features[0].properties!.title); // Set selected location
      }
    });

    // Cleanup function to remove map instance
    return () => {
      if (map.current) {
        map.current.remove();
      }
    };
  }, [
    selectedStyle,
    mapState.bearing,
    mapState.center,
    mapState.pitch,
    mapState.zoom,
  ]);

  useEffect(() => {
    if (map.current) {
      map.current.resize(); // Resize the map when the panel is resized
    }
  }, [mapContainer]);

  const handleStyleChange = (value: string) => {
    setSelectedStyle(value);
    saveMapState();
  };

  useEffect(() => {
    const cleanup = enableMiddleMouseDragRotate();

    return () => {
      if (cleanup) {
        cleanup();
      }
    };
  }, []); // Add map.current as a dependency to re-run the effect whenever the map instance changes

  // Function to enable drag rotate with middle mouse button
  const enableMiddleMouseDragRotate = () => {
    if (!map.current) return;

    const handleMouseDown = (e: MouseEvent) => {
      if (e.button !== 1) return; // Check if the middle mouse button is pressed

      e.preventDefault();

      const handleMouseMove = (e: MouseEvent) => {
        if (!map.current) return;

        const { movementX, movementY } = e;

        // Adjust bearing (rotation) and pitch (tilt) based on mouse movement
        map.current.setBearing(map.current.getBearing() - movementX * 0.2);
        map.current.setPitch(
          Math.max(Math.min(map.current.getPitch() - movementY * 0.2, 85), 0)
        ); // Limit pitch between 0 and 85 degrees
      };

      const handleMouseUp = () => {
        if (!map.current) return;

        window.removeEventListener("mousemove", handleMouseMove);
        window.removeEventListener("mouseup", handleMouseUp);
      };

      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", handleMouseUp);

      // Return a cleanup function
      return () => {
        if (!map.current) return;

        window.removeEventListener("mousemove", handleMouseMove);
        window.removeEventListener("mouseup", handleMouseUp);
      };
    };

    if (map.current.getCanvas()) {
      map.current.getCanvas().addEventListener("mousedown", handleMouseDown);
    }

    // Cleanup function to remove event listener
    return () => {
      if (map.current && map.current.getCanvas()) {
        map.current
          .getCanvas()
          .removeEventListener("mousedown", handleMouseDown);
      }
    };
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

  return (
    <div>
      <div
        className={`absolute top-36 ${
          selectedActivity ? "right-100 mr-2" : "right-7"
        } z-50 rounded-lg cursor-pointer`}
      >
        <Select
          onValueChange={handleStyleChange}
          defaultValue={styles[0].value}
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Map Style" />
          </SelectTrigger>
          <SelectContent>
            {styles.map((style) => (
              <SelectItem key={style.value} value={style.value}>
                {style.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div
        ref={geocoderContainer}
        className="absolute top-36 left-72 transform -translate-x-1/2 z-50 w-72 rounded-lg overflow-hidden"
      >
        <div className="relative ml-auto flex-1 md:grow-0">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search for places"
            className="w-full rounded-lg bg-background pl-8 md:w-[200px] lg:w-[336px]"
            onChange={(e) => {
              const geocoder = new MapboxGeocoder({
                accessToken: mapboxgl.accessToken,
                mapboxgl: mapboxgl,
              });

              geocoder.query(e.target.value);
            }}
          />
        </div>
      </div>

      <div
        id="map"
        className="w-full h-[1120px] rounded-lg overflow-hidden z-0"
      >
        <div style={{ width: "100%", height: "100%" }} ref={mapContainer} />
      </div>

      {selectedActivity && (
        <WaypointSidebar waypoint={selectedActivity} onClose={onClose} />
      )}
    </div>
  );
}
