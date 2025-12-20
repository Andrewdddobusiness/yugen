import { APIProvider, Map, AdvancedMarker } from "@vis.gl/react-google-maps";
import { useEffect, useMemo, useRef } from "react";
import { IItineraryActivity } from "@/store/itineraryActivityStore";
import CustomMarker from "./CustomMarker";
import { colors } from "@/lib/colors/colors";
import { ActivityOverlay } from "./ActivityOverlay";
import { motion, AnimatePresence } from "framer-motion";
import { useActivitiesStore } from "@/store/activityStore";
import TableMapController from "./TableMapController";

interface GoogleMapComponentProps {
  activities: IItineraryActivity[];
}

export default function GoogleMapView({ activities }: GoogleMapComponentProps) {
  const mapRef = useRef<google.maps.Map | null>(null);
  const { selectedActivity, setSelectedActivity } = useActivitiesStore();

  const center = useMemo(() => {
    if (activities.length === 0) return { lat: 0, lng: 0 };
    return {
      lat: activities[0].activity?.coordinates[0] || 0,
      lng: activities[0].activity?.coordinates[1] || 0,
    };
  }, [activities]);

  const handleMarkerClick = (activity: IItineraryActivity) => {
    setSelectedActivity(activity.activity || null);
    if (mapRef.current && activity.activity?.coordinates) {
      mapRef.current.panTo({
        lat: activity.activity.coordinates[0],
        lng: activity.activity.coordinates[1],
      });
    }
  };

  return (
    <div className="relative w-full h-full">
      <APIProvider apiKey={process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY!}>
        <Map
          id="map-instance"
          mapId={process.env.NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID}
          defaultCenter={center}
          defaultZoom={12}
          gestureHandling="greedy"
          disableDefaultUI={true}
        >
          {activities.map((activity, index) => (
            <AdvancedMarker
              key={activity.itinerary_activity_id}
              position={{
                lat: activity.activity?.coordinates[0] || 0,
                lng: activity.activity?.coordinates[1] || 0,
              }}
              onClick={() => handleMarkerClick(activity)}
            >
              <CustomMarker
                number={index + 1}
                color="Blue"
                size={selectedActivity?.place_id === activity.activity?.place_id ? "lg" : "md"}
              />
            </AdvancedMarker>
          ))}
          <TableMapController />
        </Map>
      </APIProvider>

      <AnimatePresence>
        {selectedActivity && (
          <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
          >
            <ActivityOverlay onClose={() => setSelectedActivity(null)} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
