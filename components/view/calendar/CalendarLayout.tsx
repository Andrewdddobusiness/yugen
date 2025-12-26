import React, { useMemo } from "react";
import { DndContext, DragOverlay, closestCorners } from "@dnd-kit/core";
import { format } from "date-fns";
import { DayColumn } from "./DayColumn";
import { ActivityBlock } from "./ActivityBlock";
import { TimeGrid } from "./TimeGrid";
import { CalendarControls } from "./CalendarControls";
import { ConflictResolver, TimeConflict } from "./ConflictResolver";
import { cn } from "@/lib/utils";
import { useSchedulingContext } from "@/store/timeSchedulingStore";
import { ScheduledActivity } from "./hooks/useScheduledActivities";
import { TimeSlot } from "./TimeGrid";
import {
  CALENDAR_HEADER_HEIGHT_PX,
  getCalendarSlotHeightPx,
} from "./layoutMetrics";
import { MonthGrid } from "./MonthGrid";
import { useItineraryActivityStore } from "@/store/itineraryActivityStore";

interface CalendarLayoutProps {
  // Calendar configuration
  selectedDate: Date;
  viewMode: "day" | "3-day" | "week" | "month";
  onViewModeChange?: (mode: "day" | "3-day" | "week" | "month") => void;
  onDateChange?: (date: Date) => void;
  className?: string;

  // Data
  days: Date[];
  timeSlots: TimeSlot[];
  scheduledActivities: ScheduledActivity[];

  // Drag & drop handlers
  onDragStart: (event: any) => void;
  onDragOver: (event: any) => void;
  onDragEnd: (event: any) => void;
  onResize: (
    activityId: string,
    newDuration: number,
    resizeDirection: "top" | "bottom"
  ) => void;

  // State
  activeActivity?: ScheduledActivity | null;
  dragOverInfo?: {
    dayIndex: number;
    slotIndex: number;
    hasConflict: boolean;
  } | null;
  isSaving: boolean;

  // Conflict resolution (optional for now)
  conflicts?: TimeConflict[];
  showConflictResolver?: boolean;
  onCloseConflictResolver?: () => void;
  onResolveConflicts?: (resolutions: any[]) => Promise<void>;
}

/**
 * CalendarLayout - Main layout component for calendar grid
 *
 * Features:
 * - Responsive calendar grid layout
 * - Time column with configurable intervals
 * - Day columns for activities
 * - Drag & drop context
 * - Loading indicators
 * - Conflict resolution UI
 *
 * This component focuses on layout and UI structure while delegating
 * business logic to hooks and services.
 */
export function CalendarLayout({
  selectedDate,
  viewMode,
  onViewModeChange,
  onDateChange,
  className,
  days,
  timeSlots,
  scheduledActivities,
  onDragStart,
  onDragOver,
  onDragEnd,
  onResize,
  activeActivity,
  dragOverInfo,
  isSaving,
  conflicts = [],
  showConflictResolver = false,
  onCloseConflictResolver,
  onResolveConflicts,
}: CalendarLayoutProps) {
  const schedulingContext = useSchedulingContext();
  const slotHeightPx = getCalendarSlotHeightPx(
    schedulingContext.config.interval
  );
  const { itineraryActivities } = useItineraryActivityStore();

  const allDayActivitiesByDay = useMemo(() => {
    const inView = new Set(days.map((d) => format(d, "yyyy-MM-dd")));
    const map = new Map<string, Array<{ id: string; name: string }>>();

    for (const activity of itineraryActivities) {
      if (activity.deleted_at !== null) continue;
      if (!activity.date) continue;
      if (activity.start_time && activity.end_time) continue;

      const dayKey = (activity.date as string).slice(0, 10); // YYYY-MM-DD
      if (!inView.has(dayKey)) continue;

      const list = map.get(dayKey);
      const item = {
        id: activity.itinerary_activity_id,
        name: activity.activity?.name ?? "Activity",
      };
      if (list) list.push(item);
      else map.set(dayKey, [item]);
    }

    for (const list of map.values()) {
      list.sort((a, b) => a.name.localeCompare(b.name));
    }

    return map;
  }, [itineraryActivities, days]);

  return (
    <div
      className={cn("flex flex-col h-full w-full min-w-0 bg-bg-0", className)}
    >
      {/* Calendar Controls */}
      <CalendarControls
        selectedDate={selectedDate}
        viewMode={viewMode}
        onViewModeChange={onViewModeChange}
        onDateChange={onDateChange}
        className="border-b border-stroke-200 rounded-t-xl"
      />

      {/* Saving Indicator */}
      {isSaving && (
        <div className="absolute top-16 right-4 bg-white rounded-lg shadow-lg p-2 flex items-center space-x-2 z-50">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
          <span className="text-sm text-gray-600">Saving...</span>
        </div>
      )}

      <DndContext
        collisionDetection={closestCorners}
        onDragStart={onDragStart}
        onDragOver={onDragOver}
        onDragEnd={onDragEnd}
      >
        {viewMode === "month" ? (
          <div className="flex-1 overflow-hidden bg-bg-0/70">
            <MonthGrid
              monthDate={selectedDate}
              days={days}
              scheduledActivities={scheduledActivities}
              onSelectDate={(date) => onDateChange?.(date)}
            />
          </div>
        ) : (
          <div className="flex-1 min-h-0 flex items-start overflow-y-auto overflow-x-hidden bg-bg-0 dark:bg-ink-900">
            {/* Time Column using enhanced TimeGrid */}
            <TimeGrid
              config={schedulingContext.config}
              className="border-r border-stroke-200 bg-bg-0/80 backdrop-blur-sm"
            >
              {(slots) => (
                <div className="w-24 flex-shrink-0 bg-bg-0/70">
                  <div
                    className="sticky top-0 z-40 border-b border-stroke-200/70 bg-bg-0/90 backdrop-blur-sm shrink-0"
                    style={{ height: CALENDAR_HEADER_HEIGHT_PX }}
                  />
                  <div className="relative">
                    {slots.map((slot) => {
                      return (
                        <div
                          key={slot.time}
                          className={cn(
                            "border-b relative",
                            slot.isHour
                              ? "border-stroke-200"
                              : "border-stroke-200/70",
                            "bg-bg-0/60"
                          )}
                          style={{ height: `${slotHeightPx}px` }}
                        >
                          {(slot.isHour ||
                            schedulingContext.config.interval === 15) && (
                            <div
                              className={cn(
                                "absolute top-1 right-2 text-xs px-1 bg-bg-0/90",
                                slot.isHour
                                  ? "text-ink-700 font-medium"
                                  : "text-ink-500"
                              )}
                            >
                              {schedulingContext.config.interval === 15 ||
                              slot.isHour
                                ? slot.label
                                : ""}
                            </div>
                          )}
                          {slot.isHour && (
                            <div className="absolute left-0 top-0 w-2 h-px bg-stroke-200" />
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </TimeGrid>

            {/* Days Grid */}
            <div className="flex-1 flex items-start min-w-0 bg-bg-0">
              {days.map((day, dayIndex) => (
                <DayColumn
                  key={format(day, "yyyy-MM-dd")}
                  date={day}
                  dayIndex={dayIndex}
                  timeSlots={timeSlots}
                  activities={scheduledActivities.filter(
                    (act) => act.position.day === dayIndex
                  )}
                  allDayActivities={
                    allDayActivitiesByDay.get(format(day, "yyyy-MM-dd")) ?? []
                  }
                  dragOverInfo={dragOverInfo}
                  onResize={onResize}
                  className={
                    dayIndex < days.length - 1
                      ? "border-r border-stroke-200/70"
                      : ""
                  }
                />
              ))}
            </div>
          </div>
        )}

        {/* Drag Overlay */}
        <DragOverlay>
          {activeActivity && (
            <ActivityBlock
              activity={activeActivity}
              isOverlay
              className="opacity-80 rotate-3 shadow-lg"
            />
          )}
        </DragOverlay>
      </DndContext>

      {/* Conflict Resolution Dialog */}
      {onCloseConflictResolver && onResolveConflicts && (
        <ConflictResolver
          conflicts={conflicts}
          isOpen={showConflictResolver}
          onClose={onCloseConflictResolver}
          onResolve={onResolveConflicts}
        />
      )}
    </div>
  );
}
