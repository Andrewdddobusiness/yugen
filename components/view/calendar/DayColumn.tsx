"use client";

import React from "react";
import { useDroppable } from "@dnd-kit/core";
import { format, isToday, isWeekend } from "date-fns";
import { cn } from "@/lib/utils";
import { ActivityBlock } from "./ActivityBlock";
import { CustomEventBlock } from "./CustomEventBlock";
import { CommuteBlocks } from "./CommuteBlocks";
import { useSchedulingContext } from "@/store/timeSchedulingStore";
import type { AnchorRect } from "./CustomEventPopover";
import {
  CALENDAR_HEADER_HEIGHT_PX,
  getCalendarSlotHeightPx,
} from "./layoutMetrics";
import type { TimeSlot } from "./TimeGrid";
import type { ScheduledCustomEvent } from "./hooks/useScheduledCustomEvents";
import type { TravelMode } from "@/actions/google/travelTime";
import type { CommuteSegment, CommuteTravelTime } from "./commute";
import { getCommuteOverlayId, parseTimeToMinutes } from "./commute";

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
  customEvents?: ScheduledCustomEvent[];
  commuteSegments?: CommuteSegment[];
  commuteTimesByKey?: Record<string, Partial<Record<TravelMode, CommuteTravelTime | null>>>;
  commuteLoadingByKey?: Record<string, true>;
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
  onCustomEventResize?: (
    eventId: string,
    newDuration: number,
    resizeDirection: "top" | "bottom"
  ) => void;
  onTimeSlotContextMenu?: (args: {
    date: Date;
    slot: TimeSlot;
    dayIndex: number;
    slotIndex: number;
    anchorRect: { top: number; left: number; right: number; bottom: number; width: number; height: number };
  }) => void;
  onCustomEventEdit?: (event: ScheduledCustomEvent, anchorRect: AnchorRect) => void;
  highlightedSlot?: { dayIndex: number; slotIndex: number } | null;
}

interface TimeSlotDropZoneProps {
  dayIndex: number;
  slotIndex: number;
  isOver?: boolean;
  className?: string;
  onContextMenu?: React.MouseEventHandler<HTMLDivElement>;
}

function TimeSlotDropZone({
  dayIndex,
  slotIndex,
  isOver,
  hasConflict,
  className,
  onContextMenu,
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
      onContextMenu={onContextMenu}
    />
  );
}

export function DayColumn({
  date,
  dayIndex,
  timeSlots,
  activities,
  customEvents = [],
  commuteSegments = [],
  commuteTimesByKey = {},
  commuteLoadingByKey = {},
  allDayActivities = [],
  highlightActivityId,
  onSelectDate,
  dragOverInfo,
  className,
  onResize,
  onCustomEventResize,
  onCustomEventEdit,
  onTimeSlotContextMenu,
  highlightedSlot = null,
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
  const gridStartMinutes =
    timeSlots.length > 0 ? timeSlots[0].hour * 60 + timeSlots[0].minute : 0;
  const gridHeightPx = timeSlots.length * slotHeightPx;
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
    type Event = {
      id: string;
      start: number;
      end: number;
      kind: "activity" | "custom" | "commute" | "preview";
    };
    type BaseEvent = Omit<Event, "kind"> & { kind: "activity" | "custom" };
    type CommuteEvent = Omit<Event, "kind"> & { kind: "commute" };
    type Layout = { column: number; columnCount: number };

    const previewStart =
      dragOverInfo?.dayIndex === dayIndex && dragOverInfo?.mode === "overlap"
        ? dragOverInfo.slotIndex
        : null;
    const previewSpan =
      dragOverInfo?.dayIndex === dayIndex && dragOverInfo?.mode === "overlap"
        ? dragOverInfo.spanSlots
        : null;

    const baseEvents: BaseEvent[] = [
      ...customEvents.map((item) => {
        const position = getDisplayPosition(item as any);
        if (!position) return null;
        return {
          id: String((item as any).id),
          start: Math.max(0, position.startSlot),
          end: Math.max(0, position.startSlot + Math.max(1, position.span)),
          kind: "custom" as const,
        };
      }),
      ...activities.map((item) => {
        const position = getDisplayPosition(item as any);
        if (!position) return null;
        return {
          id: String((item as any).id),
          start: Math.max(0, position.startSlot),
          end: Math.max(0, position.startSlot + Math.max(1, position.span)),
          kind: "activity" as const,
        };
      }),
    ].filter((event): event is BaseEvent => event !== null);

    const commuteEvents: CommuteEvent[] = (commuteSegments ?? [])
      .map((segment) => {
        const fromEndMinutes = parseTimeToMinutes(segment.from.endTime);
        if (fromEndMinutes == null) return null;

        const travel = commuteTimesByKey?.[segment.key]?.[segment.preferredMode] ?? null;
        const travelMinutes =
          travel?.durationSeconds != null
            ? Math.max(1, Math.round(travel.durationSeconds / 60))
            : minutesPerSlot;
        const endMinutes = fromEndMinutes + travelMinutes;

        const startSlotIndex = timeSlots.findIndex((slot) => slot.hour * 60 + slot.minute >= fromEndMinutes);
        if (startSlotIndex === -1) return null;

        const endSlotIndex = timeSlots.findIndex((slot) => slot.hour * 60 + slot.minute >= endMinutes);
        const endSlot = endSlotIndex === -1 ? timeSlots.length : Math.max(endSlotIndex, startSlotIndex + 1);

        return {
          id: getCommuteOverlayId(segment.key),
          start: Math.max(0, startSlotIndex),
          end: Math.max(0, endSlot),
          kind: "commute" as const,
        };
      })
      .filter((event): event is CommuteEvent => event !== null);

    const previewEvents: Event[] =
      previewStart != null && previewSpan != null
        ? [
            {
              id: "__drag_preview__",
              start: Math.max(0, previewStart),
              end: Math.max(0, previewStart + Math.max(1, previewSpan)),
              kind: "preview" as const,
            },
          ]
        : [];

    const events: Event[] = [...baseEvents, ...commuteEvents, ...previewEvents].sort((a, b) => {
        const startSort = a.start - b.start;
        if (startSort !== 0) return startSort;

        // Preview should never influence normal column ordering.
        if (a.kind !== b.kind) {
          if (a.kind === "preview") return 1;
          if (b.kind === "preview") return -1;
          // Prefer commute blocks in the left-most column when they overlap.
          if (a.kind === "commute") return -1;
          if (b.kind === "commute") return 1;
        }

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
  }, [
    activities,
    commuteSegments,
    commuteTimesByKey,
    customEvents,
    dayIndex,
    dragOverInfo,
    getDisplayPosition,
    minutesPerSlot,
    timeSlots,
  ]);
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
              isWeekendDay ? "bg-bg-50/60" : "bg-bg-0",
              highlightedSlot?.dayIndex === dayIndex &&
                highlightedSlot?.slotIndex === slotIndex &&
                "bg-brand-500/5 ring-2 ring-brand-400/40 ring-inset"
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
              onContextMenu={
                onTimeSlotContextMenu
                  ? (event) => {
                      event.preventDefault();
                      event.stopPropagation();
                      const rect = event.currentTarget.getBoundingClientRect();
                      onTimeSlotContextMenu({
                        date,
                        slot,
                        dayIndex,
                        slotIndex,
                        anchorRect: {
                          top: rect.top,
                          left: rect.left,
                          right: rect.right,
                          bottom: rect.bottom,
                          width: rect.width,
                          height: rect.height,
                        },
                      });
                    }
                  : undefined
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
          {commuteSegments.length > 0 ? (
            <CommuteBlocks
              segments={commuteSegments}
              travelTimesByKey={commuteTimesByKey}
              loadingByKey={commuteLoadingByKey}
              overlapLayoutById={overlapLayoutById}
              gridStartMinutes={gridStartMinutes}
              minutesPerSlot={minutesPerSlot}
              slotHeightPx={slotHeightPx}
              gridHeightPx={gridHeightPx}
              includeBuffer={schedulingContext.travelSettings.includeBuffer}
              bufferMinutes={schedulingContext.travelSettings.bufferMinutes}
            />
          ) : null}

          {customEvents.map((event) => {
            const displayPosition = getDisplayPosition(event as any);
            if (!displayPosition) return null;

            const overlap = overlapLayoutById[String(event.id)] ?? {
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
                key={`custom-${event.id}`}
                className="absolute pointer-events-auto hover:!z-50 focus-within:!z-50"
                style={{
                  top: `${displayPosition.startSlot * slotHeightPx}px`,
                  height: `${displayPosition.span * slotHeightPx}px`,
                  zIndex: 9 + column,
                  ...(columnCount > 1
                    ? { left, width: columnWidth }
                    : { left: "2px", right: "2px" }),
                }}
              >
                <CustomEventBlock
                  event={event as any}
                  className="h-full"
                  onResize={onCustomEventResize}
                  onEdit={onCustomEventEdit}
                />
              </div>
            );
          })}

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
                className="absolute pointer-events-auto hover:!z-50 focus-within:!z-50"
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
