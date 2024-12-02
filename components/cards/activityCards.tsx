import React from "react";
import ActivityCard from "./activityCard";
import { IActivityWithLocation } from "@/store/activityStore";
import { useSidebarStore } from "@/store/sidebarStore";
import PersistedQueryProvider from "@/components/providers/persistedQueryProvider";

interface IActivityCardsProps {
  activities: IActivityWithLocation[];
  onSelectActivity: (activity: IActivityWithLocation) => void;
  // onHover: (coordinates: [number, number]) => void;
}

export default function ActivityCards({ activities, onSelectActivity }: IActivityCardsProps) {
  const { isSidebarRightOpen, isSidebarLeftOpen } = useSidebarStore();

  return (
    <PersistedQueryProvider>
      <div
        className={`grid ${
          isSidebarLeftOpen
            ? isSidebarRightOpen
              ? "grid-cols-1 2xl:grid-cols-2 4xl:grid-cols-3 6xl:grid-cols-4"
              : "grid-cols-1 lg:grid-cols-2 3xl:grid-cols-3 5xl:grid-cols-4"
            : isSidebarRightOpen
            ? "grid-cols-1 2xl:grid-cols-2 4xl:grid-cols-3 6xl:grid-cols-4"
            : "grid-cols-1 lg:grid-cols-2 3xl:grid-cols-3 5xl:grid-cols-4 6xl:grid-cols-5"
        } gap-4 pb-8`}
      >
        {activities.map((activity) => (
          <ActivityCard
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
