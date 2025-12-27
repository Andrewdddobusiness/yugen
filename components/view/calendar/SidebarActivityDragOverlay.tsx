"use client";

import React from "react";
import { format } from "date-fns";
import { Clock, GripVertical, MapPin } from "lucide-react";
import { cn } from "@/lib/utils";

type SidebarItineraryActivity = {
  itinerary_activity_id: string;
  start_time: string | null;
  end_time: string | null;
  activity?: {
    name?: string | null;
    address?: string | null;
    types?: string[] | null;
  } | null;
};

function getActivityTypeIcon(types: string[] | null | undefined) {
  if (!types || types.length === 0) return "📍";
  if (types.includes("restaurant")) return "🍽️";
  if (types.includes("lodging")) return "🏨";
  if (types.includes("tourist_attraction")) return "🎯";
  if (types.includes("museum")) return "🏛️";
  if (types.includes("park")) return "🌳";
  if (types.includes("shopping_mall")) return "🛍️";
  if (types.includes("cafe")) return "☕";
  if (types.includes("bar")) return "🍺";
  return "📍";
}

function formatTime(time: string) {
  return format(new Date(`2024-01-01T${time}`), "h:mm a");
}

export function SidebarActivityDragOverlay({
  activity,
  className,
}: {
  activity: SidebarItineraryActivity;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "p-2 rounded-md bg-muted/60 border border-muted-foreground/20 shadow-lg",
        "opacity-90 rotate-2",
        className
      )}
    >
      <div className="flex items-start gap-2">
        <div className="mt-0.5">
          <GripVertical className="h-3 w-3 text-muted-foreground/60" />
        </div>

        <span className="text-sm mt-0.5">
          {getActivityTypeIcon(activity.activity?.types)}
        </span>

        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate">
            {activity.activity?.name || "Unnamed Activity"}
          </p>

          {activity.start_time && (
            <div className="flex items-center gap-1 mt-0.5">
              <Clock className="h-3 w-3 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">
                {formatTime(activity.start_time)}
                {activity.end_time && <> - {formatTime(activity.end_time)}</>}
              </span>
            </div>
          )}

          {activity.activity?.address && (
            <div className="flex items-center gap-1 mt-0.5">
              <MapPin className="h-3 w-3 text-muted-foreground" />
              <span className="text-xs text-muted-foreground truncate">
                {activity.activity.address.split(",")[0]}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

