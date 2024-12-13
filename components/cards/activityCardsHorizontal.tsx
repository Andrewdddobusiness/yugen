import React from "react";
import ActivityCardHorizontal from "./activityCardHorizontal";
import { IActivityWithLocation } from "@/store/activityStore";
import { useSidebar } from "../ui/sidebar";

interface IActivityCardsProps {
  activities: IActivityWithLocation[];
  onSelectActivity?: (activity: IActivityWithLocation) => void;
  variant?: "full" | "simple";
  // onHover: (coordinates: [number, number]) => void;
}

export default function ActivityCardsHorizontal({
  activities,
  onSelectActivity,
  variant = "full",
}: IActivityCardsProps) {
  const { open } = useSidebar();

  return (
    <div className={`grid ${open ? "grid-cols-1" : "grid-cols-1"} gap-4 pb-8`}>
      {activities.map((activity) => (
        <ActivityCardHorizontal
          key={activity.place_id}
          activity={activity}
          onClick={() => onSelectActivity?.(activity)}
          variant={variant}
          // onMouseEnter={() => onHover([activity.latit ude, activity.longitude])}
        />
      ))}
    </div>
  );
}
