import { APIProvider, Map, AdvancedMarker } from "@vis.gl/react-google-maps";
import { useEffect, useMemo } from "react";
import { IItineraryActivity } from "@/store/itineraryActivityStore";
import CustomMarker from "./customMarker";
import { colors } from "@/lib/colors/colors";

interface GoogleMapComponentProps {
  activities: IItineraryActivity[];
}

export default function GoogleMapView({ activities }: GoogleMapComponentProps) {
  const center = useMemo(() => {
    if (activities.length === 0) return { lat: 0, lng: 0 };
    return {
      lat: activities[0].activity?.coordinates[0] || 0,
      lng: activities[0].activity?.coordinates[1] || 0,
    };
  }, [activities]);

  return (
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
          >
            <CustomMarker number={index + 1} color="Blue" size="md" />
          </AdvancedMarker>
        ))}
      </Map>
    </APIProvider>
  );
}
