import { Marker } from "react-map-gl";
import { IActivity, useActivitiesStore } from "@/store/activityStore";
import { useSidebarStore } from "@/store/sidebarStore";

interface IWaypointProps {
  latitude: number;
  longitude: number;
  color?: string;
  activity: IActivity;
  transition?: {
    duration: number;
    delay: number;
  };
}

const Waypoint = ({ latitude, longitude, color = "#2c7ce5", activity }: IWaypointProps) => {
  const { setSelectedActivity } = useActivitiesStore();
  const { setIsSidebarOpen } = useSidebarStore();

  const handleClick = () => {
    setSelectedActivity(activity);
    setIsSidebarOpen(true);
  };

  return <Marker latitude={latitude} longitude={longitude} color={color} onClick={handleClick} />;
};

export default Waypoint;
