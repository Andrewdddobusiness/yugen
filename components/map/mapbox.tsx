import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { useEffect, useRef } from "react";

const accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || "";

mapboxgl.accessToken = accessToken;
export default function MapBox() {
  const mapContainer = useRef<any>(null);
  const map = useRef<mapboxgl.Map | null>(null);

  useEffect(() => {
    if (!accessToken) {
      console.error("Mapbox access token is not provided.");
      return;
    }

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: "mapbox://styles/mapbox/streets-v12",
      center: [115.2626, -8.5069], // Adjust the center coordinates
      zoom: 12, // Adjust the zoom level
    });

    // Cleanup function to remove map instance
    return () => {
      if (map.current) {
        map.current.remove();
      }
    };
  }, []);

  useEffect(() => {
    if (map.current) {
      map.current.resize(); // Resize the map when the panel is resized
    }
  }, [mapContainer]);

  return (
    <div id="map" style={{ width: "100%", height: "100%" }}>
      <div style={{ width: "100%", height: "100%" }} ref={mapContainer} />
    </div>
  );
}
