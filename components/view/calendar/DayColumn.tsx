"use client";

import React from 'react';
import { useDroppable } from '@dnd-kit/core';
import { format, isToday, isWeekend } from 'date-fns';
import { cn } from '@/lib/utils';
import { ActivityBlock } from './ActivityBlock';
import { useSchedulingContext } from '@/store/timeSchedulingStore';
import { CALENDAR_HEADER_HEIGHT_PX, getCalendarSlotHeightPx } from './layoutMetrics';

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
  dragOverInfo?: {
    dayIndex: number;
    slotIndex: number;
    hasConflict: boolean;
  } | null;
  className?: string;
  onResize?: (activityId: string, newDuration: number, resizeDirection: 'top' | 'bottom') => void;
}

interface TimeSlotDropZoneProps {
  dayIndex: number;
  slotIndex: number;
  isOver?: boolean;
  className?: string;
}

function TimeSlotDropZone({ dayIndex, slotIndex, isOver, hasConflict, className }: TimeSlotDropZoneProps & { hasConflict?: boolean }) {
  const { setNodeRef } = useDroppable({
    id: `slot-${dayIndex}-${slotIndex}`
  });

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "absolute inset-0 transition-colors",
        isOver && !hasConflict && "bg-blue-100 border-2 border-blue-300 border-dashed",
        isOver && hasConflict && "bg-red-100 border-2 border-red-300 border-dashed",
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
  dragOverInfo,
  className,
  onResize
}: DayColumnProps) {
  const isCurrentDay = isToday(date);
  const isWeekendDay = isWeekend(date);
  const schedulingContext = useSchedulingContext();
  const slotHeightPx = getCalendarSlotHeightPx(schedulingContext.config.interval);
  const minutesPerSlot = schedulingContext.config.interval;

  return (
    <div className={cn("flex-1 flex flex-col", className)}>
      {/* Day Header */}
      <div className={cn(
        "border-b border-stroke-200 flex flex-col items-center justify-center p-2 bg-bg-0/80",
        isCurrentDay && "bg-brand-500/10 border-brand-400/60",
        isWeekendDay && "bg-bg-50"
      )} style={{ height: CALENDAR_HEADER_HEIGHT_PX }}>
        <div className="text-xs text-ink-500 uppercase tracking-wide leading-none">
          {format(date, 'EEE')}
        </div>
        <div className={cn(
          "text-lg font-semibold leading-none",
          isCurrentDay ? "text-brand-600" : "text-ink-900"
        )}>
          {format(date, 'd')}
        </div>
        {isCurrentDay && (
          <div className="w-1 h-1 bg-brand-500 rounded-full mt-1" />
        )}
      </div>

      {/* Time Slots */}
      <div className="flex-1 relative">
        {timeSlots.map((slot, slotIndex) => (
          <div
            key={`${dayIndex}-${slotIndex}`}
            className={cn(
              "border-b border-stroke-200/60 relative",
              isWeekendDay && "bg-bg-50/60"
            )}
            style={{ height: `${slotHeightPx}px` }}
          >
            {/* Drop zone for this time slot */}
            <TimeSlotDropZone
              dayIndex={dayIndex}
              slotIndex={slotIndex}
              isOver={dragOverInfo?.dayIndex === dayIndex && dragOverInfo?.slotIndex === slotIndex}
              hasConflict={dragOverInfo?.dayIndex === dayIndex && dragOverInfo?.slotIndex === slotIndex ? dragOverInfo.hasConflict : false}
            />

            {/* Current time indicator */}
            {isCurrentDay && (() => {
              const now = new Date();
              const currentHour = now.getHours();
              const currentMinute = now.getMinutes();
              
              // Check if current time falls within this slot
              const slotStart = slot.hour * 60 + slot.minute;
              const slotEnd = slotStart + minutesPerSlot;
              const currentTime = currentHour * 60 + currentMinute;
              
              if (currentTime >= slotStart && currentTime < slotEnd) {
                const progress = ((currentTime - slotStart) / minutesPerSlot) * 100;
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

        {/* Activity Blocks */}
        <div className="absolute inset-0 pointer-events-none">
          {activities.map((activity) => (
            <div
              key={activity.id}
              className="absolute pointer-events-auto"
              style={{
                top: `${activity.position.startSlot * slotHeightPx}px`,
                height: `${activity.position.span * slotHeightPx}px`,
                left: '2px',
                right: '2px',
                zIndex: 1
              }}
            >
              <ActivityBlock
                activity={activity}
                className="h-full"
                onResize={onResize}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
