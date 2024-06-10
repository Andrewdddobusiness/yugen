import mapboxgl, { LngLatLike } from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { useEffect, useRef, useState } from "react";
import MapboxGeocoder from "@mapbox/mapbox-gl-geocoder";
import "@mapbox/mapbox-gl-geocoder/dist/mapbox-gl-geocoder.css";

const accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || "";

mapboxgl.accessToken = accessToken;

export default function MapBox() {
  const mapContainer = useRef<any>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const geocoderContainer = useRef<any>(null);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [mapState, setMapState] = useState({
    center: [151.2093, -33.8688],
    zoom: 12,
    bearing: -17.6,
    pitch: 45,
  });

  useEffect(() => {
    if (!accessToken) {
      console.error("Mapbox access token is not provided.");
      return;
    }

    let center: LngLatLike | undefined;
    if (mapState.center && mapState.center.length >= 2) {
      center = mapState.center as LngLatLike;
    } else {
      center = [151.2093, -33.8688]; // Default center if mapState.center is not defined or doesn't have enough elements
    }

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: isDarkMode
        ? "mapbox://styles/mapbox/dark-v10"
        : "mapbox://styles/mapbox/standard",
      center: center,
      zoom: mapState.zoom || 12, // Default zoom level if mapState.zoom is not defined
      pitch: mapState.pitch || 0, // Default pitch if mapState.pitch is not defined
      bearing: mapState.bearing || 0, // Default bearing if mapState.bearing is not defined
      antialias: true,
    });

    // Add navigation control (zoom and rotation controls)
    map.current.addControl(new mapboxgl.NavigationControl());

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

    // Load the custom icon
    map.current.on("load", () => {
      map.current!.loadImage(
        "/", // Path to your custom icon in the public folder
        (error, image) => {
          if (error) throw error;

          // Add the image to the map's style
          if (map.current && image) {
            map.current.addImage("custom-icon", image);

            // Add a data source containing one point feature
            map.current.addSource("point", {
              type: "geojson",
              data: {
                type: "FeatureCollection",
                features: [
                  {
                    type: "Feature",
                    geometry: {
                      type: "Point",
                      coordinates: [151.2093, -33.8688], // Custom icon position
                    },
                    properties: null,
                  },
                ],
              },
            });

            // Add a layer to use the image to represent the data
            map.current.addLayer({
              id: "points",
              type: "symbol",
              source: "point", // Reference the data source
              layout: {
                "icon-image": "custom-icon", // Reference the image
                "icon-size": 0.5, // Adjust the size of the icon
              },
            });
          }
        }
      );

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

    // Cleanup function to remove map instance
    return () => {
      if (map.current) {
        map.current.remove();
      }
    };
  }, [
    isDarkMode,
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

  const toggleStyle = () => {
    setIsDarkMode(!isDarkMode);
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
    <div style={{ position: "relative", width: "100%", height: "100%" }}>
      <button
        onClick={toggleStyle}
        style={{
          position: "absolute",
          top: "10px",
          left: "10px",
          zIndex: 1,
          padding: "10px",
          background: "#fff",
          border: "none",
          borderRadius: "5px",
          cursor: "pointer",
        }}
      >
        Toggle Style
      </button>
      <div
        ref={geocoderContainer}
        style={{
          position: "absolute",
          top: "10px",
          left: "50%",
          transform: "translateX(-50%)",
          zIndex: 1,
          width: "300px",
          borderRadius: "5px",
          overflow: "hidden",
        }}
      ></div>
      <div id="map" style={{ width: "100%", height: "100%" }}>
        <div style={{ width: "100%", height: "100%" }} ref={mapContainer} />
      </div>
    </div>
  );
}
