import { useEffect, useState } from "react";
import { IActivity, useActivitiesStore } from "@/store/activityStore";
import { useActivityTabStore } from "@/store/activityTabStore";

import { colors, TColor } from "@/lib/colors/colors";
import GoogleMarker from "./GoogleMarker";

export default function GoogleMarkers({ color }: { color?: TColor }) {
  const { selectedTab } = useActivityTabStore();
  const { activities, topPlacesActivities, searchHistoryActivities, areaSearchActivities } = useActivitiesStore();
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
      case "area-search":
        currentActivities = areaSearchActivities;
        break;
    }

    if (currentActivities && Array.isArray(currentActivities)) {
      coordinates = currentActivities
        .filter((activity) => activity?.coordinates?.length === 2)
        .map((activity) => [activity.coordinates[0], activity.coordinates[1]]); // Keep as [lng, lat] for internal use
    }

    setMarkerCoordinates(coordinates);
  }, [selectedTab, activities, topPlacesActivities, searchHistoryActivities, areaSearchActivities]);

  const getActivityFromCoordinate = (coordinate: [number, number]) => {
    const currentActivities =
      selectedTab === "top-places"
        ? topPlacesActivities
        : selectedTab === "search"
        ? activities
        : selectedTab === "area-search"
        ? areaSearchActivities
        : searchHistoryActivities;

    if (!coordinate || !currentActivities || currentActivities.length === 0) return null;

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
          <GoogleMarker
            key={`${selectedTab}-marker-${index}`}
            latitude={coordinate[1]}
            longitude={coordinate[0]}
            activity={activity}
            number={index + 1}
            color={color || (colors.Blue as TColor)}
          />
        );
      })}
    </>
  );
}
