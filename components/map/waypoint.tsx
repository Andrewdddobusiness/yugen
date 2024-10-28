import { Marker } from "react-map-gl";

interface WaypointProps {
  latitude: number;
  longitude: number;
  color?: string;
  draggable?: boolean;
  onDragEnd?: (event: any) => void;
  transition?: {
    duration: number;
    delay: number;
  };
}

const Waypoint = ({ latitude, longitude, color = "#2c7ce5", draggable = false, onDragEnd }: WaypointProps) => {
  return <Marker latitude={latitude} longitude={longitude} color={color} draggable={draggable} onDragEnd={onDragEnd} />;
};

export default Waypoint;
