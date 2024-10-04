import React from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { ItineraryListCard } from "./itineraryListCard";

const ItineraryListCardWrapper = ({ activity }: { activity: any }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: activity.itinerary_activity_id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div style={style}>
      <ItineraryListCard
        activity={activity}
        dragHandleProps={{ ref: setNodeRef, ...attributes, ...listeners }}
        isDragging={isDragging}
      />
    </div>
  );
};

export { ItineraryListCardWrapper };
