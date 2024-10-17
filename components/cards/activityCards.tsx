import React from "react";
import ActivityCard from "./activityCard";
import { IActivity, IActivityWithLocation } from "@/store/activityStore";

interface ActivityCardsProps {
  activities: IActivityWithLocation[];
  onSelectActivity: (activity: IActivityWithLocation) => void;
  onHover: (coordinates: [number, number]) => void;
  isSidebarOpen: boolean;
}

export default function ActivityCards({
  activities,
  onSelectActivity,
  onHover,
  isSidebarOpen,
}: ActivityCardsProps) {
  return (
    <div
      className={`grid ${
        isSidebarOpen
          ? "grid-cols-1 2xl:grid-cols-2"
          : "grid-cols-1 lg:grid-cols-2 2xl:grid-cols-3"
      } gap-4 pb-8`}
    >
      {activities.map((activity) => (
        <ActivityCard
          key={activity.place_id}
          activity={activity}
          onClick={() => onSelectActivity(activity)}
          onMouseEnter={() => onHover([activity.latitude, activity.longitude])}
        />
      ))}
    </div>
  );
}
