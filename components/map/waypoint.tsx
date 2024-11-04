import { useRef, useState } from "react";
import { Marker } from "react-map-gl";
import { IActivity, useActivitiesStore } from "@/store/activityStore";
import { useSidebarStore } from "@/store/sidebarStore";
import CustomWaypoint from "./customWaypoint";
import { TColor } from "@/lib/colors/colors";
import { useSidebar } from "../ui/sidebar";

interface IWaypointProps {
  latitude: number;
  longitude: number;
  color?: TColor;
  activity: IActivity;
  number?: number;
  isSelected?: boolean;
  transition?: {
    duration: number;
    delay: number;
  };
}

const Waypoint = ({ latitude, longitude, color, activity, number, isSelected = false }: IWaypointProps) => {
  const { setSelectedActivity } = useActivitiesStore();
  const { setIsSidebarOpen } = useSidebarStore();

  const { openSidebar } = useSidebar();

  const [showPopup, setShowPopup] = useState(false);

  const handleClick = () => {
    setSelectedActivity(activity);
    setIsSidebarOpen(true);
    openSidebar();
  };

  return (
    <Marker latitude={latitude} longitude={longitude} onClick={handleClick}>
      <div
        className="cursor-pointer hover:filter hover:brightness-90"
        onMouseEnter={() => setShowPopup(true)}
        onMouseLeave={() => setShowPopup(false)}
      >
        <CustomWaypoint number={number} color={color} size="md" isSelected={isSelected} />
        {showPopup && (
          <div
            className="absolute -top-10 left-1/2 -translate-x-1/2 bg-white px-2 py-1 rounded-md shadow-lg whitespace-nowrap"
            style={{
              zIndex: 1,
              pointerEvents: "none",
            }}
          >
            <span className="text-sm font-medium">{activity.name}</span>
          </div>
        )}
      </div>
    </Marker>
  );
};

export default Waypoint;
