import { useEffect, useRef } from "react";
import { useMap } from "@vis.gl/react-google-maps";

interface CircleProps {
  center: { lat: number; lng: number };
  radius: number;
  fillColor?: string;
  fillOpacity?: number;
  strokeColor?: string;
  strokeOpacity?: number;
  strokeWeight?: number;
}

export default function Circle({ 
  center, 
  radius, 
  fillColor = "#3B82F6", // Default blue
  fillOpacity = 0.1,
  strokeColor = "#3B82F6", // Default blue
  strokeOpacity = 0.8,
  strokeWeight = 2
}: CircleProps) {
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
        fillColor,
        fillOpacity,
        strokeColor,
        strokeOpacity,
        strokeWeight,
      });
    } else {
      // Update existing circle
      circleRef.current.setOptions({
        center,
        radius,
        fillColor,
        fillOpacity,
        strokeColor,
        strokeOpacity,
        strokeWeight,
      });
    }

    return () => {
      if (circleRef.current) {
        circleRef.current.setMap(null);
        circleRef.current = null;
      }
    };
  }, [map, center, radius, fillColor, fillOpacity, strokeColor, strokeOpacity, strokeWeight]);

  return null;
}
