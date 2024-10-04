import React, { useMemo } from "react";
import { useDroppable } from "@dnd-kit/core";
import { format } from "date-fns";
import { ItineraryListCardWrapper } from "./itineraryListCardWrapper";
import { Separator } from "@/components/ui/separator";

interface DateGroupProps {
  date: Date;
  activities: any[];
  isUnscheduled: boolean;
  index: number;
  activeId: string | null;
  overDateId: string | null;
  overItemId: string | null;
}

export function DateGroup({
  date,
  activities,
  isUnscheduled,
  index,
  activeId,
  overDateId,
  overItemId,
}: DateGroupProps) {
  const dateString = isUnscheduled ? "unscheduled" : format(date, "yyyy-MM-dd");
  const { setNodeRef, isOver } = useDroppable({
    id: `date_${dateString}`,
  });

  const sortedActivities = useMemo(() => {
    return [...activities].sort((a, b) => {
      if (a.activity_time && b.activity_time) {
        return a.activity_time.localeCompare(b.activity_time);
      }
      return 0;
    });
  }, [activities]);

  return (
    <div
      ref={setNodeRef}
      data-date={dateString}
      className={`p-4 rounded-lg ${
        isOver ? "bg-blue-100" : ""
      } transition-colors duration-200`}
    >
      {index > 0 && <Separator className="my-6" />}
      <h2 className="text-xl font-bold mt-4 mb-2">
        {isUnscheduled ? "Unscheduled" : format(date, "MMMM d, yyyy")}
      </h2>

      <div className="space-y-4">
        {sortedActivities.length > 0 ? (
          sortedActivities.map((activity) => (
            <ItineraryListCardWrapper
              key={activity.itinerary_activity_id}
              activity={activity}
            />
          ))
        ) : (
          <div className="text-gray-500 italic min-h-[100px] border-2 border-dashed border-gray-300 rounded-md p-4 flex items-center justify-center">
            No activities scheduled
          </div>
        )}
      </div>
    </div>
  );
}
