"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Trash2 } from "lucide-react";
import { useState } from "react";
import { capitalizeFirstLetterOfEachWord } from "@/utils/formatting/capitalise";
import TimePopover from "../time/timePopover";
import { cn } from "@/components/lib/utils";
import { DatePickerPopover } from "../date/datePickerPopover";
import { useItineraryActivityStore, IItineraryActivity } from "@/store/itineraryActivityStore";

interface ItineraryListCardProps {
  activity: IItineraryActivity;
  dragHandleProps: any;
  isDragging: boolean;
}

export const ItineraryListCard: React.FC<ItineraryListCardProps> = ({ activity, dragHandleProps, isDragging }) => {
  const { itineraryActivities } = useItineraryActivityStore();
  const latestActivity =
    itineraryActivities.find((a) => a.itinerary_activity_id === activity.itinerary_activity_id) || activity;
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div className="relative w-full" onMouseEnter={() => setIsHovered(true)} onMouseLeave={() => setIsHovered(false)}>
      {/* Draggable content */}
      <div
        className={cn(
          "flex flex-row w-full gap-4 transition-all duration-300 items-center",
          isDragging ? "opacity-50" : ""
        )}
        {...dragHandleProps}
      >
        {/* Left column for grip */}
        <div
          className={cn(
            "flex h-full cursor-grab transition-all duration-200 hover:text-zinc-500 hover:scale-110",
            isHovered ? "opacity-100" : "opacity-0"
          )}
        >
          <span className="rounded-md">
            <GripVertical size={20} />
          </span>
        </div>

        {/* Card content */}
        <div className="flex flex-row flex-grow justify-between gap-4 bg-white py-2 px-4 rounded-lg">
          <h3
            className={cn(
              "flex-1 min-w-[200px] text-md font-medium line-clamp-1 transition-all duration-200",
              isHovered ? "text-zinc-500" : ""
            )}
          >
            {capitalizeFirstLetterOfEachWord(activity.activity?.name || "")}
          </h3>
        </div>

        {/* Delete button */}
        <div
          className={cn(
            "flex-shrink-0 cursor-pointer transition-all duration-200 hover:text-red-500 hover:scale-110",
            isHovered ? "opacity-100" : "opacity-0"
          )}
        >
          <span className="rounded-md">
            <Trash2 size={16} />
          </span>
        </div>
      </div>

      {/* Non-draggable overlay elements */}
      <div className="absolute right-8 top-1/2 -translate-y-1/2 flex flex-row gap-4 items-center pr-4">
        <TimePopover
          itineraryActivityId={Number(latestActivity.itinerary_activity_id)}
          storeStartTime={latestActivity.start_time}
          storeEndTime={latestActivity.end_time}
          showText={false}
          styled={false}
        />

        <DatePickerPopover
          itineraryActivityId={Number(activity.itinerary_activity_id)}
          showText={false}
          styled={false}
        />
      </div>
    </div>
  );
};
