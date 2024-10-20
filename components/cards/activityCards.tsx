import React from "react";
import ActivityCard from "./activityCard";
import { IActivity, IActivityWithLocation } from "@/store/activityStore";

interface IActivityCardsProps {
  activities: IActivityWithLocation[];
  onSelectActivity: (activity: IActivityWithLocation) => void;
  // onHover: (coordinates: [number, number]) => void;
  isSidebarOpen: boolean;
}

export default function ActivityCards({
  activities,
  onSelectActivity,
  // onHover,
  isSidebarOpen,
}: IActivityCardsProps) {
  return (
    <div
      className={`grid ${
        isSidebarOpen
          ? "grid-cols-1 3xl:grid-cols-2 6xl:grid-cols-3"
          : "grid-cols-1 lg:grid-cols-2 3xl:grid-cols-3 4xl:grid-cols-4 6xl:grid-cols-5"
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
  );
}
