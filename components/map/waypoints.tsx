import { useEffect, useState } from "react";
import { IActivity, useActivitiesStore } from "@/store/activityStore";
import { useActivityTabStore } from "@/store/activityTabStore";
import Waypoint from "./waypoint";

export default function Waypoints() {
  const { selectedTab } = useActivityTabStore();
  const { activities, topPlacesActivities, searchHistoryActivities } = useActivitiesStore();
  const [markerCoordinates, setMarkerCoordinates] = useState<[number, number][] | null>(null);

  useEffect(() => {
    let coordinates: [number, number][] = [];
    let currentActivities = [];

    switch (selectedTab) {
      case "top-places":
        currentActivities = topPlacesActivities;
        break;
      case "search":
        currentActivities = activities;
        break;
      case "history":
        currentActivities = searchHistoryActivities;
        break;
    }

    if (currentActivities && Array.isArray(currentActivities)) {
      coordinates = currentActivities
        .filter((activity) => activity?.coordinates?.length === 2)
        .map((activity) => [activity.coordinates[0], activity.coordinates[1]]);
    }

    setMarkerCoordinates(coordinates);
  }, [selectedTab, activities, topPlacesActivities, searchHistoryActivities]);

  const getActivityFromCoordinate = (coordinate: [number, number]) => {
    const currentActivities =
      selectedTab === "top-places"
        ? topPlacesActivities
        : selectedTab === "search"
        ? activities
        : searchHistoryActivities;

    return currentActivities?.find(
      (activity) => activity?.coordinates[0] === coordinate[0] && activity?.coordinates[1] === coordinate[1]
    );
  };

  return (
    <>
      {markerCoordinates?.map((coordinate, index) => {
        const activity = getActivityFromCoordinate(coordinate);
        if (!activity) return null;

        return (
          <Waypoint
            key={`${selectedTab}-marker-${index}`}
            latitude={coordinate[0]}
            longitude={coordinate[1]}
            activity={activity}
            transition={{
              duration: 0.3,
              delay: index * 0.05,
            }}
          />
        );
      })}
    </>
  );
}
