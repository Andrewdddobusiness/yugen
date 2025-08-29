import React from "react";
import { ActivityCardSkeleton } from "./ActivityCard";
import { useSidebar } from "../ui/sidebar";


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
      <ActivityCardSkeleton variant="vertical" />
      <ActivityCardSkeleton variant="vertical" />
      <ActivityCardSkeleton variant="vertical" />
      <ActivityCardSkeleton variant="vertical" />
      <ActivityCardSkeleton variant="vertical" />
      <ActivityCardSkeleton variant="vertical" />
    </div>
  );
}
