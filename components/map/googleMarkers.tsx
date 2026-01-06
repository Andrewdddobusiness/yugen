import { useMemo } from "react";
import { IActivity, useActivitiesStore } from "@/store/activityStore";
import { useActivityTabStore } from "@/store/activityTabStore";

import { colors, TColor } from "@/lib/colors/colors";
import GoogleMarker from "./googleMarker";

export default function GoogleMarkers({
  color,
  mapId,
  excludePlaceIds,
}: {
  color?: TColor | string;
  mapId?: string;
  excludePlaceIds?: string[];
}) {
  const { selectedTab } = useActivityTabStore();
  const { activities, topPlacesActivities, searchHistoryActivities, areaSearchActivities } = useActivitiesStore();

  const excluded = useMemo(() => new Set((excludePlaceIds ?? []).filter(Boolean)), [excludePlaceIds]);

  const currentActivities = useMemo((): IActivity[] => {
    switch (selectedTab) {
      case "top-places":
        return topPlacesActivities;
      case "search":
        return activities;
      case "history":
        return searchHistoryActivities;
      case "area-search":
        return areaSearchActivities;
      default:
        return [];
    }
  }, [selectedTab, activities, topPlacesActivities, searchHistoryActivities, areaSearchActivities]);

  const markers = useMemo(() => {
    const seen = new Set<string>();
    const deduped: IActivity[] = [];

    for (const activity of currentActivities) {
      if (!activity?.place_id) continue;
      if (excluded.has(activity.place_id)) continue;
      if (seen.has(activity.place_id)) continue;
      if (!Array.isArray(activity.coordinates) || activity.coordinates.length !== 2) continue;

      seen.add(activity.place_id);
      deduped.push(activity);
    }

    return deduped;
  }, [currentActivities, excluded]);

  return (
    <>
      {markers.map((activity, index) => {
        return (
          <GoogleMarker
            key={`${selectedTab}-marker-${activity.place_id}`}
            latitude={activity.coordinates[1]}
            longitude={activity.coordinates[0]}
            activity={activity}
            mapId={mapId}
            number={index + 1}
            color={color ?? colors.Blue}
          />
        );
      })}
    </>
  );
}
