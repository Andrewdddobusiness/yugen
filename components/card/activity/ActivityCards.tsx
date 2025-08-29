import React from "react";
import LegacyActivityCard from "./LegacyActivityCard";
import { IActivityWithLocation } from "@/store/activityStore";
import PersistedQueryProvider from "@/components/provider/query/PersistedQueryProvider";
import { useSidebar } from "@/components/ui/sidebar";

interface IActivityCardsProps {
  activities: IActivityWithLocation[];
  onSelectActivity: (activity: IActivityWithLocation) => void;
  // onHover: (coordinates: [number, number]) => void;
}

export default function ActivityCards({ activities, onSelectActivity }: IActivityCardsProps) {
  const { open } = useSidebar();
  return (
    <PersistedQueryProvider>
      <div
        className={`grid ${
          open
            ? "grid-cols-1 xl:grid-cols-2 4xl:grid-cols-3 6xl:grid-cols-4"
            : "grid-cols-1 lg:grid-cols-2 3xl:grid-cols-3 5xl:grid-cols-4"
        } gap-4`}
      >
        {activities.map((activity) => (
          <LegacyActivityCard
            key={activity.place_id}
            activity={activity}
            onClick={() => onSelectActivity(activity)}
            // onMouseEnter={() => onHover([activity.latit ude, activity.longitude])}
          />
        ))}
      </div>
    </PersistedQueryProvider>
  );
}
