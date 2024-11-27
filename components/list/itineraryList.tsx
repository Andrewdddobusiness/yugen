"use client";

import { useEffect, useState } from "react";
import { useQueryClient, useMutation, useQuery } from "@tanstack/react-query";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragStartEvent,
  DragOverEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";

import { useParams } from "next/navigation";
import { fetchFilteredTableData, setTableData } from "@/actions/supabase/actions";
import { format, parseISO } from "date-fns";
import { DragOverlay } from "@dnd-kit/core";
import { ItineraryListCardWrapper } from "./itineraryListCardWrapper";
import { DateGroupWrapper } from "./dateGroupWrapper";
import { useItineraryActivityStore } from "@/store/itineraryActivityStore";

export default function handleAddToItineraryItineraryList() {
  const { itineraryId } = useParams();
  const itinId = itineraryId.toString();

  const [dateRange, setDateRange] = useState<{ from: Date; to: Date } | null>(null);
  const [activeId, setActiveId] = useState(null);
  const [overDateId, setOverDateId] = useState<string | null>(null);
  const [overItemId, setOverItemId] = useState<string | null>(null);

  const { itineraryActivities, setItineraryActivities } = useItineraryActivityStore();

  const { data: dateRangeData } = useQuery({
    queryKey: ["itineraryDateRange", itinId],
    queryFn: async () => {
      const dateRangeResult = await fetchFilteredTableData(
        "itinerary_destination",
        "from_date, to_date",
        "itinerary_id",
        [itinId]
      );

      if (dateRangeResult.success && dateRangeResult.data && dateRangeResult.data.length > 0) {
        const { from_date, to_date } = dateRangeResult.data[0];
        return {
          from: new Date(from_date),
          to: new Date(to_date),
        };
      }
      return null;
    },
    enabled: !!itinId,
  });

  useEffect(() => {
    if (dateRangeData) {
      setDateRange(dateRangeData);
    }
  }, [dateRangeData]);

  useEffect(() => {
    if (itineraryActivities.length > 0) {
      const sortedActivities = sortActivities(itineraryActivities);
      setItineraryActivities(sortedActivities);
    }
  }, [itineraryActivities, setItineraryActivities]);

  const updateActivityMutation = useMutation({
    mutationFn: async ({ activityId, newDate }: { activityId: number; newDate: string | null }) => {
      return setTableData(
        "itinerary_activity",
        {
          itinerary_activity_id: activityId,
          date: newDate,
        },
        ["itinerary_activity_id"]
      );
    },
    onSuccess: (_, variables) => {
      setItineraryActivities(
        itineraryActivities.map((activity) =>
          activity.itinerary_activity_id === variables.activityId.toString()
            ? { ...activity, date: variables.newDate || "" }
            : activity
        )
      );
    },
  });

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const sortActivities = (activities: any[]) => {
    return activities.sort((a, b) => {
      const dateA = a.date ? parseISO(a.date) : new Date(0);
      const dateB = b.date ? parseISO(b.date) : new Date(0);
      if (dateA.getTime() !== dateB.getTime()) {
        return dateA.getTime() - dateB.getTime();
      }

      const timeA = a.time ? parseISO(`2000-01-01T${a.time}`) : new Date(0);
      const timeB = b.time ? parseISO(`2000-01-01T${b.time}`) : new Date(0);
      return timeA.getTime() - timeB.getTime();
    });
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);

    if (over && active.id !== over.id) {
      const oldIndex = itineraryActivities.findIndex((item) => item.itinerary_activity_id === active.id);
      const newIndex = itineraryActivities.findIndex((item) => item.itinerary_activity_id === over.id);

      if (oldIndex !== -1 && newIndex !== -1) {
        const updatedActivities = arrayMove(itineraryActivities, oldIndex, newIndex);
        setItineraryActivities(updatedActivities);
      } else {
        const updatedActivities = [...itineraryActivities];
        let movedItem: any = updatedActivities[oldIndex];
        updatedActivities.splice(oldIndex, 1);

        const newDateString = over.id.toString().replace("date_", "");
        movedItem.date = newDateString === "unscheduled" ? null : newDateString;

        const insertIndex = updatedActivities.findIndex(
          (item) => item.date === movedItem.date && (item.time || "") > (movedItem.time || "")
        );

        if (insertIndex === -1) {
          updatedActivities.push(movedItem);
        } else {
          updatedActivities.splice(insertIndex, 0, movedItem);
        }

        await updateActivityMutation.mutateAsync({
          activityId: movedItem.itinerary_activity_id,
          newDate: movedItem.date,
        });
      }
    }
  };

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id);
  };

  const handleDragOver = (event: DragOverEvent) => {
    const { over } = event;
    if (over) {
      const overId = over.id.toString();
      if (overId.startsWith("date_")) {
        setOverDateId(overId);
        setOverItemId(null);
      } else {
        setOverItemId(overId);
        setOverDateId(over.data.current?.sortable.containerId || null);
      }
    }
  };

  const handleDragCancel = () => {
    setActiveId(null);
    setOverDateId(null);
    setOverItemId(null);
  };

  const updateActivityDate = async (activityId: number, newDate: string | null) => {
    try {
      await updateActivityMutation.mutateAsync({ activityId, newDate });
    } catch (error) {
      console.error("Error updating activity date:", error);
    }
  };

  const generateDateRange = (start: Date, end: Date) => {
    const dates = [];
    let currentDate = new Date(start);
    while (currentDate <= end) {
      dates.push(new Date(currentDate));
      currentDate.setDate(currentDate.getDate() + 1);
    }
    return dates;
  };

  return (
    <div className="flex flex-col">
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragCancel={handleDragCancel}
      >
        {dateRange && (
          <SortableContext
            items={generateDateRange(dateRange.from, dateRange.to).map((date) => `date_${format(date, "yyyy-MM-dd")}`)}
            strategy={verticalListSortingStrategy}
          >
            {generateDateRange(dateRange.from, dateRange.to).map((date, index) => {
              const activitiesForDate = itineraryActivities.filter(
                (activity) => activity.date === format(date, "yyyy-MM-dd") && !activity.deleted_at
              );

              return (
                <SortableContext
                  key={date.toISOString()}
                  items={activitiesForDate.map((item) => item.itinerary_activity_id)}
                  strategy={verticalListSortingStrategy}
                >
                  <DateGroupWrapper
                    date={date}
                    activities={activitiesForDate}
                    isUnscheduled={false}
                    index={index}
                    onDateUpdate={updateActivityDate}
                    activeId={activeId}
                    overDateId={overDateId}
                    overItemId={overItemId}
                  />
                </SortableContext>
              );
            })}
          </SortableContext>
        )}
        <SortableContext
          items={itineraryActivities
            .filter((activity) => !activity.date && !activity.deleted_at)
            .map((item) => item.itinerary_activity_id)}
          strategy={verticalListSortingStrategy}
        >
          <DateGroupWrapper
            date={new Date()}
            activities={itineraryActivities.filter((activity) => !activity.date && !activity.deleted_at)}
            isUnscheduled={true}
            index={dateRange ? generateDateRange(dateRange.from, dateRange.to).length : 0}
            onDateUpdate={updateActivityDate}
            activeId={activeId}
            overDateId={overDateId}
            overItemId={overItemId}
          />
        </SortableContext>
        <DragOverlay>
          {activeId ? (
            <ItineraryListCardWrapper
              activity={itineraryActivities.find((item) => item.itinerary_activity_id === activeId)}
            />
          ) : null}
        </DragOverlay>
      </DndContext>
    </div>
  );
}
