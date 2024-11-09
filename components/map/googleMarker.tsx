import { AdvancedMarker } from "@vis.gl/react-google-maps";
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
}

export default function GoogleMarker({
  latitude,
  longitude,
  activity,
  number,
  isSelected = false,
  color,
}: IWaypointProps) {
  const { setSelectedActivity } = useActivitiesStore();
  const { setIsSidebarRightOpen } = useSidebarStore();
  const { openSidebar } = useSidebar();

  const handleClick = () => {
    setSelectedActivity(activity);
    setIsSidebarRightOpen(true);
    openSidebar();
  };

  return (
    <AdvancedMarker position={{ lat: latitude, lng: longitude }} onClick={handleClick} title={activity.name}>
      <CustomMarker number={number} color={color} size="md" isSelected={isSelected} />
    </AdvancedMarker>
  );
}
