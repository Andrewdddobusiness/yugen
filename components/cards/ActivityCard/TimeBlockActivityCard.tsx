"use client";

import React from "react";
import { ActivityCard } from "./ActivityCard";
import { type ActivityTimeBlock } from "@/utils/timeSlots";
import { cn } from "@/lib/utils";

interface TimeBlockActivityCardProps {
  timeBlock: ActivityTimeBlock;
  isSelected?: boolean;
  isEditing?: boolean;
  onEdit?: () => void;
  onDelete?: () => void;
  onSelect?: () => void;
  showTravelTimeBefore?: boolean;
  travelTime?: string;
  
  // Time block specific positioning
  startPosition?: number;
  height?: number;
  minHeight?: number;
  
  className?: string;
}

/**
 * Adapter component that wraps the unified ActivityCard for time block usage
 * This maintains compatibility with the time management system
 */
export const TimeBlockActivityCard: React.FC<TimeBlockActivityCardProps> = ({
  timeBlock,
  isSelected,
  isEditing,
  onEdit,
  onDelete,
  onSelect,
  showTravelTimeBefore = false,
  travelTime,
  startPosition,
  height,
  minHeight = 50,
  className
}) => {
  const { activity, startTime, endTime, duration, startPosition: blockStartPosition, height: blockHeight } = timeBlock;
  
  // Use provided positioning or fallback to timeBlock values
  const finalStartPosition = startPosition ?? blockStartPosition;
  const finalHeight = height ?? Math.max(blockHeight, minHeight);

  return (
    <div 
      className={cn("absolute left-16 right-4 z-10", className)}
      style={{ 
        top: finalStartPosition,
        height: finalHeight
      }}
    >
      <ActivityCard
        activity={activity}
        variant="timeblock"
        size="sm"
        onClick={onSelect}
        onEdit={onEdit}
        onDelete={onDelete}
        isSelected={isSelected}
        isEditing={isEditing}
        startTime={startTime}
        endTime={endTime}
        duration={duration}
        travelTime={travelTime}
        showTravelTime={showTravelTimeBefore}
        showTime={true}
        showAddress={false}
        showDescription={false}
        showNotes={false}
        showActions={true}
        className="h-full group"
      />
    </div>
  );
};