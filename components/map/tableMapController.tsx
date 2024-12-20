// components/map/tableMapController.tsx
import { useEffect } from "react";
import { useMap } from "@vis.gl/react-google-maps";
import { useActivitiesStore } from "@/store/activityStore";

export default function TableMapController() {
  const map = useMap("map-instance");
  const { selectedActivity } = useActivitiesStore();

  useEffect(() => {
    if (map && selectedActivity?.coordinates) {
      map.panTo({
        lat: selectedActivity.coordinates[0],
        lng: selectedActivity.coordinates[1],
      });
      map.setZoom(15);
    }
  }, [selectedActivity, map]);

  return null;
}
