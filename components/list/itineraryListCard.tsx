"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Trash2, Loader2 } from "lucide-react";
import { useState } from "react";
import { capitalizeFirstLetterOfEachWord } from "@/utils/formatting/capitalise";
import TimePopover from "../time/timePopover";
import { cn } from "@/components/lib/utils";
import { DatePickerPopover } from "../date/datePickerPopover";
import { useItineraryActivityStore, IItineraryActivity } from "@/store/itineraryActivityStore";
import { Button } from "../ui/button";
import { useParams } from "next/dist/client/components/navigation";
import { useDateRangeStore } from "@/store/dateRangeStore";

interface ItineraryListCardProps {
  activity: IItineraryActivity;
  dragHandleProps: any;
  isDragging: boolean;
}

export const ItineraryListCard: React.FC<ItineraryListCardProps> = ({ activity, dragHandleProps, isDragging }) => {
  let { itineraryId } = useParams();
  itineraryId = itineraryId.toString();

  /* STATE */
  const [loading, setLoading] = useState(false);

  /* STORE */
  const { itineraryActivities, removeItineraryActivity } = useItineraryActivityStore();
  const latestActivity =
    itineraryActivities.find((a) => a.itinerary_activity_id === activity.itinerary_activity_id) || activity;
  const { startDate, endDate } = useDateRangeStore();
  const [isHovered, setIsHovered] = useState(false);

  /* HANDLERS */
  const handleRemoveFromItinerary = async (e: React.MouseEvent) => {
    setLoading(true);
    if (!activity || !itineraryId) return;

    await removeItineraryActivity(activity?.activity?.place_id || "", itineraryId);

    setLoading(false);
  };

  return (
    <div className="relative w-full" onMouseEnter={() => setIsHovered(true)} onMouseLeave={() => setIsHovered(false)}>
      <div
        className={cn(
          "flex flex-row w-full gap-2 transition-all duration-300 items-center",
          isDragging ? "opacity-50" : ""
        )}
      >
        {/* Drag handle - ONLY this part should be draggable */}
        <div
          {...dragHandleProps}
          className={cn(
            "flex h-full cursor-grab transition-all duration-200 hover:text-zinc-500 hover:scale-110",
            isHovered ? "opacity-100" : "opacity-0"
          )}
        >
          <span className="rounded-md">
            <GripVertical size={20} />
          </span>
        </div>

        {/* Card content - No drag behavior */}
        <div className="flex flex-row flex-grow justify-between gap-4 bg-white py-2 px-4 rounded-lg border">
          <h3
            className={cn(
              "flex-1 text-sm font-medium line-clamp-1 transition-all duration-200",
              isHovered ? "text-zinc-500" : ""
            )}
          >
            {capitalizeFirstLetterOfEachWord(activity.activity?.name || "")}
          </h3>

          {/* Interactive elements - No drag behavior */}
          <div className="flex flex-row gap-4 items-center" onClick={(e) => e.stopPropagation()}>
            <DatePickerPopover
              itineraryActivityId={Number(activity.itinerary_activity_id)}
              showText={false}
              styled={false}
              startDate={startDate || undefined}
              endDate={endDate || undefined}
            />

            <TimePopover
              itineraryActivityId={Number(latestActivity.itinerary_activity_id)}
              storeStartTime={latestActivity.start_time}
              storeEndTime={latestActivity.end_time}
              showText={false}
              styled={false}
            />
          </div>
        </div>

        {/* Delete button - Updated with loading state */}
        <div onClick={(e) => e.stopPropagation()} className="flex items-center justify-center">
          <Button
            variant="ghost"
            size="icon"
            className={cn(
              "rounded-md w-4 h-4 hover:text-red-500 hover:scale-110 cursor-pointer transition-all duration-200",
              isHovered ? "opacity-100" : "opacity-0",
              loading && "cursor-not-allowed hover:scale-100"
            )}
            onClick={handleRemoveFromItinerary}
            disabled={loading}
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
          </Button>
        </div>
      </div>
    </div>
  );
};
