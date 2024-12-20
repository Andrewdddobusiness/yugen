import React, { useMemo, useState } from "react";
import { useDroppable } from "@dnd-kit/core";
import { format } from "date-fns";
import { ItineraryListCardWrapper } from "./itineraryListCardWrapper";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { CalendarX, ChevronDown, ChevronRight } from "lucide-react";

interface DateGroupProps {
  date: Date;
  activities: any[];
  isUnscheduled: boolean;
  index: number;
  activeId: string | null;
  overDateId: string | null;
  overItemId: string | null;
}

export function DateGroup({ date, activities, isUnscheduled }: DateGroupProps) {
  const [isOpen, setIsOpen] = useState(true);
  const dateString = isUnscheduled ? "unscheduled" : format(date, "yyyy-MM-dd");
  const { setNodeRef, isOver } = useDroppable({
    id: `date_${dateString}`,
  });

  const sortedActivities = useMemo(() => {
    return [...activities].sort((a, b) => {
      if (a.time && b.time) {
        return a.time.localeCompare(b.time);
      }
      return 0;
    });
  }, [activities]);

  const toggleOpen = () => setIsOpen(!isOpen);

  return (
    <div
      ref={setNodeRef}
      data-date={dateString}
      className={`pb-4 rounded-lg ${isOver ? "bg-blue-100" : ""} transition-colors duration-200`}
    >
      <div className="flex items-center mb-2">
        <Button variant="ghost" size="icon" className="rounded-full " onClick={toggleOpen}>
          {isOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
        </Button>
        <h2 className="text-lg font-semibold">{isUnscheduled ? "Unscheduled" : format(date, "MMMM d, yyyy")}</h2>
      </div>

      {isOpen && (
        <div className="flex flex-col justify-center items-center space-y-2">
          {sortedActivities.length > 0 ? (
            sortedActivities.map((activity) => (
              <ItineraryListCardWrapper key={activity.itinerary_activity_id} activity={activity} />
            ))
          ) : (
            <div className="flex w-full px-12">
              <div className="flex flex-col w-full text-gray-500 min-h-[100px] border-2 border-dashed border-gray-300 rounded-lg items-center justify-center gap-2">
                <CalendarX size={24} className="text-gray-400" />
                <p className="text-gray-400 text-sm">No activities scheduled</p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
