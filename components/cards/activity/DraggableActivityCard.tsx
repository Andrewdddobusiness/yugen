"use client";

import React from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { ListActivityCard } from "./ListActivityCard";
import { TimeBlockActivityCard } from "./TimeBlockActivityCard";
import { BaseActivityCard, BaseActivityCardProps } from "./BaseActivityCard";
import { cn } from "@/lib/utils";
import { type IItineraryActivity } from "@/store/itineraryActivityStore";
import { type ActivityTimeBlock } from "@/utils/timeSlots";

interface DraggableActivityCardProps {
  activity: IItineraryActivity;
  
  // Card variant to render
  variant: "list" | "timeblock" | "base";
  
  // Drag and drop configuration
  dragId?: string | number;
  disabled?: boolean;
  
  // TimeBlock specific props (only used when variant="timeblock")
  timeBlock?: ActivityTimeBlock;
  
  // Pass-through props to the underlying card
  cardProps?: Partial<BaseActivityCardProps>;
  
  // Additional styling
  className?: string;
}

export const DraggableActivityCard: React.FC<DraggableActivityCardProps> = ({
  activity,
  variant,
  dragId,
  disabled = false,
  timeBlock,
  cardProps = {},
  className,
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: dragId || activity.itinerary_activity_id,
    disabled,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    width: "100%",
  };

  const dragHandleProps = { ...attributes, ...listeners };

  const renderCard = () => {
    switch (variant) {
      case "list":
        return (
          <ListActivityCard
            activity={activity}
            dragHandleProps={dragHandleProps}
            isDragging={isDragging}
            className={className}
            {...cardProps}
          />
        );
        
      case "timeblock":
        if (!timeBlock) {
          console.warn("TimeBlock variant requires timeBlock prop");
          return null;
        }
        return (
          <TimeBlockActivityCard
            timeBlock={timeBlock}
            isDragging={isDragging}
            className={className}
            {...cardProps}
          />
        );
        
      case "base":
      default:
        return (
          <BaseActivityCard
            activity={activity}
            isDragging={isDragging}
            className={className}
            {...cardProps}
          />
        );
    }
  };

  return (
    <div 
      ref={setNodeRef} 
      style={style} 
      className={cn(
        "w-full",
        variant === "list" && "px-2"
      )}
    >
      {renderCard()}
    </div>
  );
};