"use client";

import React from "react";
import { useDroppable } from "@dnd-kit/core";
import { format, isToday, isWeekend } from "date-fns";
import { cn } from "@/lib/utils";
import { ActivityBlock } from "./ActivityBlock";
import { useSchedulingContext } from "@/store/timeSchedulingStore";
import {
  CALENDAR_HEADER_HEIGHT_PX,
  getCalendarSlotHeightPx,
} from "./layoutMetrics";

interface TimeSlot {
  time: string;
  hour: number;
  minute: number;
  label: string;
}

interface ScheduledActivity {
  id: string;
  activityId: string;
  placeId: string;
  date: Date;
  startTime: string;
  endTime: string;
  duration: number;
  position: { day: number; startSlot: number; span: number };
  activity?: {
    name: string;
    address?: string;
    coordinates?: [number, number];
  };
}

interface DayColumnProps {
  date: Date;
  dayIndex: number;
  timeSlots: TimeSlot[];
  activities: ScheduledActivity[];
  allDayActivities?: Array<{ id: string; name: string }>;
  highlightActivityId?: string | null;
  dragOverInfo?: {
    dayIndex: number;
    slotIndex: number;
    spanSlots: number;
    hasConflict: boolean;
  } | null;
  className?: string;
  onResize?: (
    activityId: string,
    newDuration: number,
    resizeDirection: "top" | "bottom"
  ) => void;
}

interface TimeSlotDropZoneProps {
  dayIndex: number;
  slotIndex: number;
  isOver?: boolean;
  className?: string;
}

function TimeSlotDropZone({
  dayIndex,
  slotIndex,
  isOver,
  hasConflict,
  className,
}: TimeSlotDropZoneProps & { hasConflict?: boolean }) {
  const { setNodeRef } = useDroppable({
    id: `slot-${dayIndex}-${slotIndex}`,
  });

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "absolute inset-0 transition-colors",
        isOver && !hasConflict && "bg-blue-100/40",
        isOver && hasConflict && "bg-red-100/40",
        className
      )}
    />
  );
}

export function DayColumn({
  date,
  dayIndex,
  timeSlots,
  activities,
  allDayActivities = [],
  highlightActivityId,
  dragOverInfo,
  className,
  onResize,
}: DayColumnProps) {
  const isCurrentDay = isToday(date);
  const isWeekendDay = isWeekend(date);
  const schedulingContext = useSchedulingContext();
  const slotHeightPx = getCalendarSlotHeightPx(
    schedulingContext.config.interval
  );
  const minutesPerSlot = schedulingContext.config.interval;
  const dragPreview =
    dragOverInfo?.dayIndex === dayIndex
      ? {
          startSlot: dragOverInfo.slotIndex,
          spanSlots: Math.max(
            1,
            Math.min(dragOverInfo.spanSlots, timeSlots.length - dragOverInfo.slotIndex)
          ),
          hasConflict: dragOverInfo.hasConflict,
        }
      : null;

  return (
    <div className={cn("flex-1 flex flex-col", className)}>
      {/* Day Header */}
      <div
        className={cn(
          "sticky top-0 z-30 border-b border-stroke-200 flex flex-col items-center justify-center px-2 py-1 bg-bg-0/90 backdrop-blur-sm shrink-0",
          isCurrentDay && "bg-brand-500/10 border-brand-400/60",
          isWeekendDay && "bg-bg-50"
        )}
        style={{ height: CALENDAR_HEADER_HEIGHT_PX }}
      >
        <div className="text-xs text-ink-500 uppercase tracking-wide leading-none">
          {format(date, "EEE")}
        </div>
        <div
          className={cn(
            "text-lg font-semibold leading-none",
            isCurrentDay ? "text-brand-600" : "text-ink-900"
          )}
        >
          {format(date, "d")}
        </div>
        {isCurrentDay && (
          <div className="w-1 h-1 bg-brand-500 rounded-full mt-1" />
        )}
        {allDayActivities.length > 0 && (
          <div className="absolute top-1 right-1">
            <div
              className={cn(
                "min-w-5 h-5 px-1 rounded-full flex items-center justify-center",
                "text-[10px] font-semibold",
                "bg-brand-500/10 text-brand-700 border border-brand-500/20"
              )}
              title={`${allDayActivities.length} date-only activit${
                allDayActivities.length === 1 ? "y" : "ies"
              }`}
            >
              +{allDayActivities.length}
            </div>
          </div>
        )}
      </div>

      {/* Time Slots */}
      <div className="flex-1 relative">
        {timeSlots.map((slot, slotIndex) => (
          <div
            key={`${dayIndex}-${slotIndex}`}
            className={cn(
              "border-b border-stroke-200/60 relative",
              isWeekendDay ? "bg-bg-50/60" : "bg-bg-0"
            )}
            style={{ height: `${slotHeightPx}px` }}
          >
            {/* Drop zone for this time slot */}
            <TimeSlotDropZone
              dayIndex={dayIndex}
              slotIndex={slotIndex}
              isOver={
                dragOverInfo?.dayIndex === dayIndex &&
                dragOverInfo?.slotIndex === slotIndex
              }
              hasConflict={
                dragOverInfo?.dayIndex === dayIndex &&
                dragOverInfo?.slotIndex === slotIndex
                  ? dragOverInfo.hasConflict
                  : false
              }
            />

            {/* Current time indicator */}
            {isCurrentDay &&
              (() => {
                const now = new Date();
                const currentHour = now.getHours();
                const currentMinute = now.getMinutes();

                // Check if current time falls within this slot
                const slotStart = slot.hour * 60 + slot.minute;
                const slotEnd = slotStart + minutesPerSlot;
                const currentTime = currentHour * 60 + currentMinute;

                if (currentTime >= slotStart && currentTime < slotEnd) {
                  const progress =
                    ((currentTime - slotStart) / minutesPerSlot) * 100;
                  return (
                    <div
                      className="absolute left-0 right-0 h-0.5 bg-coral-500 z-10"
                      style={{ top: `${progress}%` }}
                    >
                      <div className="absolute -left-1 -top-1 w-2 h-2 bg-coral-500 rounded-full" />
                    </div>
                  );
                }
                return null;
              })()}
          </div>
        ))}

        {/* Drag placement preview */}
        {dragPreview && (
          <div
            className={cn(
              "absolute left-[2px] right-[2px] rounded-lg border-2 border-dashed pointer-events-none z-20",
              dragPreview.hasConflict
                ? "bg-red-100/60 border-red-300"
                : "bg-blue-100/60 border-blue-300"
            )}
            style={{
              top: `${dragPreview.startSlot * slotHeightPx}px`,
              height: `${dragPreview.spanSlots * slotHeightPx}px`,
            }}
          />
        )}

        {/* Activity Blocks */}
        <div className="absolute inset-0 pointer-events-none">
          {activities.map((activity) => (
            <div
              key={activity.id}
              className="absolute pointer-events-auto"
              style={{
                top: `${activity.position.startSlot * slotHeightPx}px`,
                height: `${activity.position.span * slotHeightPx}px`,
                left: "2px",
                right: "2px",
                zIndex: 1,
              }}
            >
              <ActivityBlock
                activity={activity}
                className={cn(
                  "h-full",
                  highlightActivityId &&
                    String(highlightActivityId) === String(activity.id) &&
                    "ring-2 ring-brand-400/70"
                )}
                onResize={onResize}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
