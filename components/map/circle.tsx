import { useEffect, useRef } from "react";
import { useMap } from "@vis.gl/react-google-maps";

interface CircleProps {
  center: { lat: number; lng: number };
  radius: number;
}

export default function Circle({ center, radius }: CircleProps) {
  const map = useMap();
  const circleRef = useRef<google.maps.Circle | null>(null);

  useEffect(() => {
    if (!map) return;

    // Create circle if it doesn't exist
    if (!circleRef.current) {
      circleRef.current = new google.maps.Circle({
        map,
        center,
        radius,
        fillColor: "#FF0000", //red
        fillOpacity: 0.15,
        strokeColor: "#FF0000",
        strokeOpacity: 0.7,
        strokeWeight: 2,
      });
    } else {
      // Update existing circle
      circleRef.current.setOptions({
        center,
        radius,
      });
    }

    return () => {
      if (circleRef.current) {
        circleRef.current.setMap(null);
        circleRef.current = null;
      }
    };
  }, [map, center, radius]);

  return null;
}
