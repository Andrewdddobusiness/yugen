import React from "react";
import ActivityCard from "./activityCard";
import { IActivityWithLocation } from "@/store/activityStore";
import ActivitySkeletonCard from "./activitySkeletonCard";
import { useSidebar } from "../ui/sidebar";

interface IActivityCardsProps {
  activities: IActivityWithLocation[];
  onSelectActivity: (activity: IActivityWithLocation) => void;
  // onHover: (coordinates: [number, number]) => void;
}

export default function ActivitySkeletonCards() {
  const { open } = useSidebar();

  return (
    <div
      className={`grid ${
        open
          ? "grid-cols-1 xl:grid-cols-2 4xl:grid-cols-3 6xl:grid-cols-4"
          : "grid-cols-1 lg:grid-cols-2 3xl:grid-cols-3 5xl:grid-cols-4"
      } gap-4`}
    >
      <ActivitySkeletonCard />
      <ActivitySkeletonCard />
      <ActivitySkeletonCard />
      <ActivitySkeletonCard />
      <ActivitySkeletonCard />
      <ActivitySkeletonCard />
    </div>
  );
}
