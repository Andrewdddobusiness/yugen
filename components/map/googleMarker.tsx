import { AdvancedMarker, useMap } from "@vis.gl/react-google-maps";
import { IActivity, useActivitiesStore } from "@/store/activityStore";
import { useSidebarStore } from "@/store/sidebarStore";
import { useSidebar } from "../ui/sidebar";
import CustomMarker from "./customMarker";
import { TColor } from "@/lib/colors/colors";

interface IWaypointProps {
  latitude: number;
  longitude: number;
  activity: IActivity;
  number?: number;
  isSelected?: boolean;
  color?: TColor;
  size?: "sm" | "md" | "lg";
}

export default function GoogleMarker({
  latitude,
  longitude,
  activity,
  number,
  isSelected = false,
  color,
  size = "md",
}: IWaypointProps) {
  const { setSelectedActivity } = useActivitiesStore();
  const { setIsSidebarRightOpen } = useSidebarStore();
  const { openSidebar } = useSidebar();
  const map = useMap("map-instance");

  const handleClick = () => {
    if (map) {
      map.panTo({ lat: latitude, lng: longitude });
    }

    setSelectedActivity(activity);
    setIsSidebarRightOpen(true);
    openSidebar();
  };

  return (
    <AdvancedMarker position={{ lat: latitude, lng: longitude }} onClick={handleClick} title={activity.name}>
      <CustomMarker number={number} color={color} size={size} isSelected={isSelected} />
    </AdvancedMarker>
  );
}