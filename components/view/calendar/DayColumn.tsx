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
  onSelectDate?: (date: Date) => void;
  isActive?: boolean;
  activeColor?: string;
  onToggleActiveDay?: (date: Date) => void;
  showWaypoints?: boolean;
  showHeader?: boolean;
  dragOverInfo?: {
    dayIndex: number;
    slotIndex: number;
    spanSlots: number;
    hasConflict: boolean;
    mode: "overlap" | "trim";
    hasTimeOverlap: boolean;
    trimPreviewById?: Record<
      string,
      { startSlot: number; span: number } | null
    >;
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
  onSelectDate,
  dragOverInfo,
  className,
  onResize,
  isActive,
  activeColor,
  onToggleActiveDay,
  showWaypoints = true,
  showHeader = true,
}: DayColumnProps) {
  const isCurrentDay = isToday(date);
  const isWeekendDay = isWeekend(date);
  const schedulingContext = useSchedulingContext();
  const slotHeightPx = getCalendarSlotHeightPx(
    schedulingContext.config.interval
  );
  const minutesPerSlot = schedulingContext.config.interval;
  const trimPreviewById =
    dragOverInfo?.dayIndex === dayIndex && dragOverInfo?.mode === "trim"
      ? dragOverInfo.trimPreviewById
      : undefined;

  const handleHeaderActivate = React.useCallback(() => {
    onToggleActiveDay?.(date);
    onSelectDate?.(date);
  }, [date, onSelectDate, onToggleActiveDay]);

  const getDisplayPosition = React.useCallback(
    (activity: ScheduledActivity) => {
      const override = trimPreviewById?.[String(activity.id)];
      if (override === null) return null;
      if (override) {
        return {
          startSlot: Math.max(0, override.startSlot),
          span: Math.max(1, override.span),
        };
      }
      return activity.position;
    },
    [trimPreviewById]
  );

  const overlapLayoutById = React.useMemo(() => {
    type Event = { id: string; start: number; end: number };
    type Layout = { column: number; columnCount: number };

    const previewStart =
      dragOverInfo?.dayIndex === dayIndex && dragOverInfo?.mode === "overlap"
        ? dragOverInfo.slotIndex
        : null;
    const previewSpan =
      dragOverInfo?.dayIndex === dayIndex && dragOverInfo?.mode === "overlap"
        ? dragOverInfo.spanSlots
        : null;

    const events: Array<Event & { isPreview: boolean }> = activities
      .map((activity) => {
        const position = getDisplayPosition(activity);
        if (!position) return null;
        return {
          id: String(activity.id),
          start: Math.max(0, position.startSlot),
          end: Math.max(0, position.startSlot + Math.max(1, position.span)),
          isPreview: false,
        };
      })
      .filter(
        (event): event is Event & { isPreview: boolean } => event !== null
      )
      .concat(
        previewStart != null && previewSpan != null
          ? [
              {
                id: "__drag_preview__",
                start: Math.max(0, previewStart),
                end: Math.max(0, previewStart + Math.max(1, previewSpan)),
                isPreview: true,
              },
            ]
          : []
      )
      .sort((a, b) => {
        const startSort = a.start - b.start;
        if (startSort !== 0) return startSort;
        if (a.isPreview !== b.isPreview) return a.isPreview ? 1 : -1;
        return a.end - b.end;
      });

    const layout: Record<string, Layout> = {};

    const assignCluster = (cluster: Event[]) => {
      if (cluster.length === 0) return;

      const columnsEnd: number[] = [];
      const columnById = new Map<string, number>();

      for (const event of cluster) {
        let bestColumn = -1;
        let bestEnd = Number.POSITIVE_INFINITY;

        for (let i = 0; i < columnsEnd.length; i += 1) {
          const colEnd = columnsEnd[i];
          if (event.start >= colEnd && colEnd < bestEnd) {
            bestEnd = colEnd;
            bestColumn = i;
          }
        }

        if (bestColumn === -1) {
          bestColumn = columnsEnd.length;
          columnsEnd.push(event.end);
        } else {
          columnsEnd[bestColumn] = event.end;
        }

        columnById.set(event.id, bestColumn);
      }

      const columnCount = Math.max(1, columnsEnd.length);
      for (const event of cluster) {
        layout[event.id] = {
          column: columnById.get(event.id) ?? 0,
          columnCount,
        };
      }
    };

    let cluster: Event[] = [];
    let clusterEnd = -1;

    for (const event of events) {
      if (cluster.length === 0) {
        cluster = [event];
        clusterEnd = event.end;
        continue;
      }

      if (event.start < clusterEnd) {
        cluster.push(event);
        clusterEnd = Math.max(clusterEnd, event.end);
      } else {
        assignCluster(cluster);
        cluster = [event];
        clusterEnd = event.end;
      }
    }

    assignCluster(cluster);
    return layout;
  }, [activities, dayIndex, dragOverInfo, getDisplayPosition]);
  const dragPreview =
    dragOverInfo?.dayIndex === dayIndex
      ? {
          startSlot: dragOverInfo.slotIndex,
          spanSlots: Math.max(
            1,
            Math.min(dragOverInfo.spanSlots, timeSlots.length - dragOverInfo.slotIndex)
          ),
          hasConflict: dragOverInfo.hasConflict,
          mode: dragOverInfo.mode,
          hasTimeOverlap: dragOverInfo.hasTimeOverlap,
        }
      : null;

  return (
    <div className={cn("flex-1 flex flex-col", className)}>
      {/* Day Header */}
      {showHeader ? (
        <div
          className={cn(
            "sticky top-0 z-30 border-b border-stroke-200 flex flex-col items-center justify-center px-2 py-1 bg-bg-0/90 backdrop-blur-sm shrink-0 relative",
            onSelectDate && "cursor-pointer hover:bg-bg-50/80",
            isCurrentDay && "bg-brand-500/10 border-brand-400/60",
            isWeekendDay && "bg-bg-50"
          )}
          style={{ height: CALENDAR_HEADER_HEIGHT_PX }}
          role={onSelectDate ? "button" : undefined}
          tabIndex={onSelectDate ? 0 : undefined}
          aria-pressed={onSelectDate ? Boolean(isActive) : undefined}
          onClick={onSelectDate ? handleHeaderActivate : undefined}
          onKeyDown={
            onSelectDate
              ? (event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    handleHeaderActivate();
                  }
                }
              : undefined
          }
        >
          {isActive && activeColor ? (
            <div
              className="absolute top-0 left-0 right-0 h-1"
              style={{ backgroundColor: activeColor }}
            />
          ) : null}
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
      ) : null}

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
          (() => {
            const previewLayout = overlapLayoutById["__drag_preview__"];
            const columnCount =
              dragPreview.mode === "overlap" && previewLayout
                ? Math.max(1, previewLayout.columnCount)
                : 1;
            const column =
              dragPreview.mode === "overlap" && previewLayout
                ? Math.max(0, previewLayout.column)
                : 0;

            const gutterPx = 4; // left+right padding (2px each)
            const gapPx = columnCount > 1 ? 4 : 0;
            const totalGapPx = gapPx * (columnCount - 1);
            const columnWidth = `calc((100% - ${gutterPx + totalGapPx}px) / ${columnCount})`;
            const left =
              columnCount > 1
                ? `calc(2px + (${columnWidth} + ${gapPx}px) * ${column})`
                : "2px";

            return (
              <div
                className={cn(
                  "absolute rounded-lg border-2 border-dashed pointer-events-none z-20",
                  dragPreview.hasConflict
                    ? "bg-red-100/60 border-red-300"
                    : "bg-blue-100/60 border-blue-300"
                )}
                style={{
                  top: `${dragPreview.startSlot * slotHeightPx}px`,
                  height: `${dragPreview.spanSlots * slotHeightPx}px`,
                  ...(columnCount > 1
                    ? { left, width: columnWidth }
                    : { left: "2px", right: "2px" }),
                }}
              />
            );
          })()
        )}

        {/* Activity Blocks */}
        <div className="absolute inset-0 pointer-events-none">
          {activities.map((activity) => {
            const displayPosition = getDisplayPosition(activity);
            if (!displayPosition) return null;

            const overlap = overlapLayoutById[String(activity.id)] ?? {
              column: 0,
              columnCount: 1,
            };

            const columnCount = Math.max(1, overlap.columnCount);
            const column = Math.max(0, overlap.column);

            const gutterPx = 4; // left+right padding (2px each)
            const gapPx = columnCount > 1 ? 4 : 0;
            const totalGapPx = gapPx * (columnCount - 1);

            const columnWidth = `calc((100% - ${gutterPx + totalGapPx}px) / ${columnCount})`;
            const left =
              columnCount > 1
                ? `calc(2px + (${columnWidth} + ${gapPx}px) * ${column})`
                : "2px";

            return (
              <div
                key={activity.id}
                className="absolute pointer-events-auto"
                style={{
                  top: `${displayPosition.startSlot * slotHeightPx}px`,
                  height: `${displayPosition.span * slotHeightPx}px`,
                  zIndex: 10 + column,
                  ...(columnCount > 1
                    ? { left, width: columnWidth }
                    : { left: "2px", right: "2px" }),
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
                  showWaypointBadge={showWaypoints}
                />
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
