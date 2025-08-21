"use client";

import React from "react";
import { Clock } from "lucide-react";
import { BaseActivityCard, BaseActivityCardProps } from "./BaseActivityCard";
import { cn } from "@/components/lib/utils";
import { type ActivityTimeBlock } from "@/utils/timeSlots";

interface TimeBlockActivityCardProps extends Omit<BaseActivityCardProps, 'customHeader'> {
  timeBlock: ActivityTimeBlock;
  
  // Time block specific positioning
  startPosition?: number;
  height?: number;
  
  // Travel time display
  showTravelTimeBefore?: boolean;
  
  // Minimum height for readability
  minHeight?: number;
}

export const TimeBlockActivityCard: React.FC<TimeBlockActivityCardProps> = ({
  timeBlock,
  startPosition,
  height,
  showTravelTimeBefore = false,
  minHeight = 50,
  className,
  travelTime,
  ...baseProps
}) => {
  const { activity, startTime, endTime, duration, startPosition: blockStartPosition, height: blockHeight } = timeBlock;
  
  // Use provided positioning or fallback to timeBlock values
  const finalStartPosition = startPosition ?? blockStartPosition;
  const finalHeight = height ?? Math.max(blockHeight, minHeight);

  // Custom header with travel time
  const customHeader = showTravelTimeBefore && travelTime ? (
    <div className="mb-1 text-xs text-gray-500 flex items-center gap-1">
      <Clock className="h-3 w-3" />
      {travelTime}
    </div>
  ) : null;

  return (
    <div 
      className={cn("absolute left-16 right-4 z-10", className)}
      style={{ 
        top: finalStartPosition,
        height: finalHeight
      }}
    >
      <BaseActivityCard
        {...baseProps}
        activity={activity}
        variant="timeblock"
        orientation="vertical"
        size="sm"
        startTime={startTime}
        endTime={endTime}
        duration={duration}
        travelTime={travelTime}
        customHeader={customHeader}
        showTime={true}
        showTravelTime={false} // Handled by custom header
        className="h-full group" // Enable group hover for action buttons
      />
    </div>
  );
};