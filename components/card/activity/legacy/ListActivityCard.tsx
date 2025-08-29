"use client";

import React, { useState } from "react";
import { GripVertical } from "lucide-react";
import { BaseActivityCard, BaseActivityCardProps } from "./BaseActivityCard";
import { DatePickerPopover } from "@/components/date/datePickerPopover";
import TimePopover from "@/components/shared/TimePopover";
import { cn } from "@/lib/utils";
import { useDateRangeStore } from "@/store/dateRangeStore";
import { useParams } from "next/navigation";
import { useItineraryActivityStore } from "@/store/itineraryActivityStore";

interface ListActivityCardProps extends Omit<BaseActivityCardProps, 'customActions' | 'customHeader'> {
  // Drag and drop props
  dragHandleProps?: any;
  showDragHandle?: boolean;
  
  // List-specific options  
  showDatePicker?: boolean;
  showTimePicker?: boolean;
  
  // Remove action handler
  onRemove?: () => void;
}

export const ListActivityCard: React.FC<ListActivityCardProps> = ({
  activity,
  dragHandleProps,
  showDragHandle = true,
  showDatePicker = true,
  showTimePicker = true,
  onRemove,
  isHovered: externalHovered,
  onHover,
  className,
  ...baseProps
}) => {
  const [internalHovered, setInternalHovered] = useState(false);
  const hovered = externalHovered || internalHovered;
  
  const { startDate, endDate } = useDateRangeStore();
  const { removeItineraryActivity, itineraryActivities } = useItineraryActivityStore();
  const { itineraryId } = useParams();
  
  // Get the latest activity data from store
  const latestActivity = itineraryActivities.find(
    (a) => a.itinerary_activity_id === activity.itinerary_activity_id
  ) || activity;

  const [loading, setLoading] = useState(false);

  const handleRemove = async () => {
    if (onRemove) {
      onRemove();
      return;
    }

    if (!activity?.activity?.place_id || !itineraryId) return;
    
    setLoading(true);
    await removeItineraryActivity(activity.activity.place_id, itineraryId.toString());
    setLoading(false);
  };

  const handleHover = (hovered: boolean) => {
    setInternalHovered(hovered);
    onHover?.(hovered);
  };

  // Custom actions for list view
  const customActions = (
    <div className="flex flex-row gap-4 items-center" onClick={(e) => e.stopPropagation()}>
      {showDatePicker && (
        <DatePickerPopover
          itineraryActivityId={Number(activity.itinerary_activity_id)}
          showText={false}
          styled={false}
          startDate={startDate || undefined}
          endDate={endDate || undefined}
        />
      )}

      {showTimePicker && (
        <TimePopover
          itineraryActivityId={Number(latestActivity.itinerary_activity_id)}
          storeStartTime={latestActivity.start_time}
          storeEndTime={latestActivity.end_time}
          showText={false}
          styled={false}
        />
      )}
    </div>
  );

  // Custom header with drag handle
  const customHeader = showDragHandle ? (
    <div
      {...dragHandleProps}
      className={cn(
        "flex h-full cursor-grab transition-all duration-200 hover:text-zinc-500 hover:scale-110 mr-2",
        hovered ? "opacity-100" : "opacity-0"
      )}
      onClick={(e) => e.stopPropagation()}
    >
      <span className="rounded-md flex items-center">
        <GripVertical size={20} />
      </span>
    </div>
  ) : null;

  return (
    <div className={cn("relative w-full", className)}>
      <div className="flex flex-row w-full gap-2 items-center">
        {customHeader}
        
        <BaseActivityCard
          {...baseProps}
          activity={activity}
          variant="list"
          orientation="horizontal"
          isHovered={hovered}
          onHover={handleHover}
          isLoading={loading}
          onDelete={handleRemove}
          customActions={customActions}
          className="flex-grow"
          showTime={false} // Time is handled by the TimePopover
          showDate={false} // Date is handled by the DatePickerPopover
        />
      </div>
    </div>
  );
};