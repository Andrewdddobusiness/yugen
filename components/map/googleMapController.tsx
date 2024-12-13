import { useEffect } from "react";
import { useMap } from "@vis.gl/react-google-maps";

import { useMapStore } from "@/store/mapStore";
import { useActivitiesStore } from "@/store/activityStore";
import { useSidebar } from "@/components/ui/sidebar";

import { fetchPlaceDetails } from "@/actions/google/actions";

export default function GoogleMapController() {
  const map = useMap("map-instance");
  const { setTempMarker } = useMapStore();
  const { setSelectedActivity } = useActivitiesStore();
  const { open } = useSidebar();

  useEffect(() => {
    if (!map) return;

    const listener = map.addListener("click", async (e: google.maps.MapMouseEvent & { placeId?: string }) => {
      if (e.placeId) {
        e.stop?.();
        try {
          const activity = await fetchPlaceDetails(e.placeId);
          if (!activity.coordinates || activity.coordinates.length !== 2) return;

          map.panTo({
            lat: activity.coordinates[0],
            lng: activity.coordinates[1],
          });

          setTempMarker({
            latitude: activity.coordinates[0],
            longitude: activity.coordinates[1],
            activity: activity,
          });

          setSelectedActivity(activity);
        } catch (error) {
          console.error("Error fetching place details:", error);
        }
      }
    });

    return () => {
      google.maps.event.removeListener(listener);
    };
  }, [map, setTempMarker, setSelectedActivity]);

  return null;
}
