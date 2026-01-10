import React, { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { DndContext, DragOverlay, pointerWithin } from "@dnd-kit/core";
import { format, isToday, isWeekend } from "date-fns";
import { DayColumn } from "./DayColumn";
import { ActivityBlock } from "./ActivityBlock";
import { CustomEventBlock } from "./CustomEventBlock";
import { TimeGrid } from "./TimeGrid";
import { CalendarControls } from "./CalendarControls";
import { ConflictResolver, TimeConflict } from "./ConflictResolver";
import { cn } from "@/lib/utils";
import { useSchedulingContext } from "@/store/timeSchedulingStore";
import { ScheduledActivity } from "./hooks/useScheduledActivities";
import type { ScheduledCustomEvent } from "./hooks/useScheduledCustomEvents";
import { TimeSlot } from "./TimeGrid";
import {
  CALENDAR_HEADER_HEIGHT_PX,
  getCalendarSlotHeightPx,
} from "./layoutMetrics";
import { MonthGrid } from "./MonthGrid";
import { useItineraryActivityStore } from "@/store/itineraryActivityStore";
import { SidebarActivityDragOverlay } from "./SidebarActivityDragOverlay";
import { useItineraryLayoutStore } from "@/store/itineraryLayoutStore";
import { colors } from "@/lib/colors/colors";
import type { ItineraryDestinationSummary } from "@/actions/supabase/destinations";
import { getCityLabelForDateKey } from "@/lib/itinerary/cityTimeline";
import { CityLabelPill } from "./CityLabelPill";
import { useItineraryCustomEventStore } from "@/store/itineraryCustomEventStore";
import { useParams } from "next/navigation";
import { CustomEventPopover } from "./CustomEventPopover";
import type { AnchorRect } from "./CustomEventPopover";

const DAY_OF_WEEK_PALETTE = [
  colors.Blue, // Sun
  colors.Purple, // Mon
  colors.Green, // Tue
  colors.Yellow, // Wed
  colors.Orange, // Thu
  colors.Red, // Fri
  colors.TangyOrange, // Sat
];

const EMPTY_ACTIVE_DAYS: string[] = [];
const CITY_HEADER_HEIGHT_PX = 34;

function getDayColor(date: Date) {
  return DAY_OF_WEEK_PALETTE[date.getDay()] ?? colors.Blue;
}

function areStringArraysEqual(a: string[], b: string[]) {
  if (a === b) return true;
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i += 1) {
    if (a[i] !== b[i]) return false;
  }
  return true;
}

interface CalendarLayoutProps {
  // Calendar configuration
  selectedDate: Date;
  viewMode: "day" | "3-day" | "week" | "month";
  onViewModeChange?: (mode: "day" | "3-day" | "week" | "month") => void;
  onDateChange?: (date: Date) => void;
  className?: string;
  useExternalDndContext?: boolean;

  // Data
  days: Date[];
  timeSlots: TimeSlot[];
  scheduledActivities: ScheduledActivity[];
  scheduledCustomEvents: ScheduledCustomEvent[];
  destinations?: ItineraryDestinationSummary[];

  // Drag & drop handlers
  onDragStart: (event: any) => void;
  onDragMove: (event: any) => void;
  onDragOver: (event: any) => void;
  onDragEnd: (event: any) => void;
  onDragCancel?: (event: any) => void;
  onResize: (
    activityId: string,
    newDuration: number,
    resizeDirection: "top" | "bottom"
  ) => void;
  onCustomEventResize?: (
    eventId: string,
    newDuration: number,
    resizeDirection: "top" | "bottom"
  ) => void;

  // State
  activeId?: string | null;
  activeType?:
    | "scheduled-activity"
    | "itinerary-activity"
    | "wishlist-item"
    | "custom-event"
    | null;
  activeActivity?: ScheduledActivity | null;
  activeCustomEvent?: ScheduledCustomEvent | null;
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
  useExternalDndContext = false,
  days,
  timeSlots,
  scheduledActivities,
  scheduledCustomEvents,
  destinations,
  onDragStart,
  onDragMove,
  onDragOver,
  onDragEnd,
  onDragCancel,
  onResize,
  onCustomEventResize,
  activeId,
  activeType,
  activeActivity,
  activeCustomEvent,
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
  const activeDays = useItineraryLayoutStore((s) => s.viewStates.calendar.activeDays);
  const showCityLabels = useItineraryLayoutStore((s) => s.viewStates.calendar.showCityLabels);
  const saveViewState = useItineraryLayoutStore((s) => s.saveViewState);

  const visibleDayKeys = useMemo(
    () => days.map((day) => format(day, "yyyy-MM-dd")),
    [days]
  );

  const defaultActiveDays = EMPTY_ACTIVE_DAYS;

  const activeDayKeys = useMemo(() => {
    const order = new Map(visibleDayKeys.map((key, index) => [key, index]));
    const normalize = (keys: string[]) =>
      keys
        .filter((key) => order.has(key))
        .sort((a, b) => (order.get(a) ?? 0) - (order.get(b) ?? 0));

    if (activeDays == null) return defaultActiveDays;
    if (activeDays.length === 0) return [];

    const pruned = normalize(activeDays);
    if (activeDays.length > 0 && pruned.length === 0) return defaultActiveDays;
    return pruned;
  }, [activeDays, defaultActiveDays, visibleDayKeys]);

  useEffect(() => {
    if (activeDays == null) {
      saveViewState("calendar", { activeDays: defaultActiveDays });
      return;
    }

    const order = new Map(visibleDayKeys.map((key, index) => [key, index]));
    const normalized = activeDays
      .filter((key) => order.has(key))
      .sort((a, b) => (order.get(a) ?? 0) - (order.get(b) ?? 0));
    let next =
      activeDays.length > 0 && normalized.length === 0 ? defaultActiveDays : normalized;

    if (!areStringArraysEqual(activeDays, next)) {
      saveViewState("calendar", { activeDays: next });
    }
  }, [activeDays, defaultActiveDays, saveViewState, visibleDayKeys]);

  const activeDaySet = useMemo(() => new Set(activeDayKeys), [activeDayKeys]);

  const toggleActiveDay = React.useCallback(
    (date: Date) => {
      const dayKey = format(date, "yyyy-MM-dd");
      const base = activeDays ?? defaultActiveDays;
      const isActive = base.includes(dayKey);
      const next = isActive ? base.filter((key) => key !== dayKey) : [...base, dayKey];

      const order = new Map(visibleDayKeys.map((key, index) => [key, index]));
      const normalized = next
        .filter((key) => order.has(key))
        .sort((a, b) => (order.get(a) ?? 0) - (order.get(b) ?? 0));
      saveViewState("calendar", { activeDays: normalized });
    },
    [activeDays, defaultActiveDays, saveViewState, visibleDayKeys]
  );

  const activeSidebarActivity = useMemo(() => {
    if (activeType !== "itinerary-activity" || !activeId) return null;
    return (
      itineraryActivities.find(
        (act) => String(act.itinerary_activity_id) === String(activeId)
      ) ?? null
    );
  }, [activeType, activeId, itineraryActivities]);

  const highlightActivityId = useMemo(() => {
    if (activeType !== "itinerary-activity" || !activeId) return null;
    return scheduledActivities.some(
      (act) => String(act.id) === String(activeId)
    )
      ? String(activeId)
      : null;
  }, [activeType, activeId, scheduledActivities]);

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

  const upsertCustomEvent = useItineraryCustomEventStore((s) => s.upsertCustomEvent);
  const { itineraryId } = useParams();
  const itineraryIdValue = Array.isArray(itineraryId) ? itineraryId[0] : String(itineraryId ?? "");
  const itineraryIdNumber = /^\d+$/.test(itineraryIdValue) ? Number(itineraryIdValue) : null;

  const [customEventPopoverOpen, setCustomEventPopoverOpen] = useState(false);
  const [customEventDraft, setCustomEventDraft] = useState<
    | {
        mode: "create";
        itineraryId: number;
        date: Date;
        startTime: string;
        endTime: string;
      }
    | {
        mode: "edit";
        itineraryId: number;
        eventId: number;
        title: string;
        notes: string | null;
        date: Date;
        startTime: string;
        endTime: string;
        colorHex: string | null;
      }
    | null
  >(null);
  const [customEventAnchorRect, setCustomEventAnchorRect] = useState<AnchorRect | null>(null);
  const [highlightedSlot, setHighlightedSlot] = useState<{ dayIndex: number; slotIndex: number } | null>(null);

  const minutesToTimeString = React.useCallback((minutes: number) => {
    const clamped = Math.max(0, Math.min(24 * 60 - 1, minutes));
    const h = Math.floor(clamped / 60);
    const m = clamped % 60;
    return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}:00`;
  }, []);

  const closeCustomEventPopover = React.useCallback(() => {
    setCustomEventPopoverOpen(false);
    setCustomEventDraft(null);
    setCustomEventAnchorRect(null);
    setHighlightedSlot(null);
  }, []);

  const handleTimeSlotContextMenu = React.useCallback(
    ({
      date,
      slot,
      dayIndex,
      slotIndex,
      anchorRect,
    }: {
      date: Date;
      slot: TimeSlot;
      dayIndex: number;
      slotIndex: number;
      anchorRect: AnchorRect;
    }) => {
      if (!itineraryIdNumber) return;
      const startMinutes = slot.hour * 60 + slot.minute;
      const defaultMinutes = Math.max(60, schedulingContext.config.interval);
      setCustomEventDraft({
        mode: "create",
        itineraryId: itineraryIdNumber,
        date,
        startTime: minutesToTimeString(startMinutes),
        endTime: minutesToTimeString(startMinutes + defaultMinutes),
      });
      setCustomEventAnchorRect(anchorRect);
      setHighlightedSlot({ dayIndex, slotIndex });
      setCustomEventPopoverOpen(true);
    },
    [itineraryIdNumber, minutesToTimeString, schedulingContext.config.interval]
  );

  const handleCustomEventEdit = React.useCallback(
    (event: ScheduledCustomEvent, anchorRect: AnchorRect) => {
      if (!itineraryIdNumber) return;
      setCustomEventDraft({
        mode: "edit",
        itineraryId: itineraryIdNumber,
        eventId: Number(event.id),
        title: event.title,
        notes: event.notes ?? null,
        date: event.date,
        startTime: event.startTime,
        endTime: event.endTime,
        colorHex: event.colorHex ?? null,
      });
      setCustomEventAnchorRect(anchorRect);
      setHighlightedSlot(null);
      setCustomEventPopoverOpen(true);
    },
    [itineraryIdNumber]
  );

  const [canPortal, setCanPortal] = useState(false);
  useEffect(() => {
    setCanPortal(true);
  }, []);

  const calendarContent = (
    <>
      {viewMode === "month" ? (
        <div className="flex-1 overflow-hidden bg-bg-0/70">
          <MonthGrid
            monthDate={selectedDate}
            days={days}
            scheduledActivities={scheduledActivities}
            destinations={destinations}
            onSelectDate={(date) => {
              toggleActiveDay(date);
              onDateChange?.(date);
            }}
          />
        </div>
      ) : (
        <div
          className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden bg-bg-0 dark:bg-ink-900"
          onScroll={() => {
            if (customEventPopoverOpen) closeCustomEventPopover();
          }}
        >
          {/* Sticky column headers (Sun/Mon/...) */}
          <div className="sticky top-0 z-50">
            {showCityLabels ? (
              <div
                className="flex items-stretch border-b border-stroke-200/70 bg-bg-0/90 backdrop-blur-sm"
                style={{ height: CITY_HEADER_HEIGHT_PX }}
              >
                <div className="w-24 flex-shrink-0 border-r border-stroke-200 bg-bg-0/70 flex items-center justify-center">
                  <div className="text-[10px] text-ink-500 uppercase tracking-wide leading-none">
                    City
                  </div>
                </div>
                <div className="flex-1 flex min-w-0">
                  {days.map((day, dayIndex) => {
                    const dayKey = visibleDayKeys[dayIndex] ?? format(day, "yyyy-MM-dd");
                    const label =
                      destinations?.length
                        ? getCityLabelForDateKey(dayKey, destinations)
                        : null;

                    return (
                      <div
                        key={`city:${dayKey}`}
                        className={cn(
                          "flex-1 flex items-center justify-center px-2",
                          dayIndex < days.length - 1 && "border-r border-stroke-200/70"
                        )}
                      >
                        {label ? <CityLabelPill label={label} /> : null}
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : null}

            <div
              className="flex items-stretch border-b border-stroke-200/70 bg-bg-0/90 backdrop-blur-sm"
              style={{ height: CALENDAR_HEADER_HEIGHT_PX }}
            >
              <div className="w-24 flex-shrink-0 border-r border-stroke-200 bg-bg-0/70" />
              <div className="flex-1 flex min-w-0">
                {days.map((day, dayIndex) => {
                  const dayKey = visibleDayKeys[dayIndex] ?? format(day, "yyyy-MM-dd");
                  const isActiveDay = activeDaySet.has(dayKey);
                  const dayColor = getDayColor(day);
                  const isCurrentDay = isToday(day);
                  const isWeekendDay = isWeekend(day);
                  const allDayActivities = allDayActivitiesByDay.get(dayKey) ?? [];

                  return (
                    <div
                      key={`header:${dayKey}`}
                      className={cn(
                        "flex-1 flex flex-col items-center justify-center px-2 py-1 relative",
                        dayIndex < days.length - 1 && "border-r border-stroke-200/70",
                        onDateChange && "cursor-pointer hover:bg-bg-50/80",
                        isCurrentDay && "bg-brand-500/10 border-brand-400/60",
                        isWeekendDay && "bg-bg-50"
                      )}
                      role={onDateChange ? "button" : undefined}
                      tabIndex={onDateChange ? 0 : undefined}
                      aria-pressed={onDateChange ? isActiveDay : undefined}
                      onClick={
                        onDateChange
                          ? () => {
                              toggleActiveDay(day);
                              onDateChange(day);
                            }
                          : undefined
                      }
                      onKeyDown={
                        onDateChange
                          ? (event) => {
                              if (event.key === "Enter" || event.key === " ") {
                                event.preventDefault();
                                toggleActiveDay(day);
                                onDateChange(day);
                              }
                            }
                          : undefined
                      }
                    >
                      {isActiveDay ? (
                        <div
                          className="absolute top-0 left-0 right-0 h-1"
                          style={{ backgroundColor: dayColor }}
                        />
                      ) : null}
                      <div className="text-xs text-ink-500 uppercase tracking-wide leading-none">
                        {format(day, "EEE")}
                      </div>
                      <div
                        className={cn(
                          "text-lg font-semibold leading-none",
                          isCurrentDay ? "text-brand-600" : "text-ink-900"
                        )}
                      >
                        {format(day, "d")}
                      </div>
                      {isCurrentDay && (
                        <div className="w-1 h-1 bg-brand-500 rounded-full mt-1" />
                      )}
                      {allDayActivities.length > 0 ? (
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
                      ) : null}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="flex items-start min-w-0">
            {/* Time Column using enhanced TimeGrid */}
            <TimeGrid
              config={schedulingContext.config}
              className="border-r border-stroke-200 bg-bg-0/80 backdrop-blur-sm"
            >
              {(slots) => (
                <div className="w-24 flex-shrink-0 bg-bg-0/70">
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
                (() => {
                  const dayKey = visibleDayKeys[dayIndex] ?? format(day, "yyyy-MM-dd");
                  const isActiveDay = activeDaySet.has(dayKey);
                  const dayColor = getDayColor(day);

                  return (
                <DayColumn
                  key={dayKey}
                  date={day}
                  dayIndex={dayIndex}
                  timeSlots={timeSlots}
                  activities={scheduledActivities.filter(
                    (act) => act.position.day === dayIndex
                  )}
                  customEvents={scheduledCustomEvents.filter(
                    (event) => event.position.day === dayIndex
                  )}
                  highlightActivityId={highlightActivityId}
                  onSelectDate={onDateChange}
                  isActive={isActiveDay}
                  activeColor={dayColor}
                  onToggleActiveDay={toggleActiveDay}
                  showWaypoints={isActiveDay}
                  showHeader={false}
                  allDayActivities={
                    allDayActivitiesByDay.get(format(day, "yyyy-MM-dd")) ?? []
                  }
                  dragOverInfo={dragOverInfo}
                  onResize={onResize}
                  onCustomEventResize={onCustomEventResize}
                  onCustomEventEdit={handleCustomEventEdit}
                  onTimeSlotContextMenu={handleTimeSlotContextMenu}
                  highlightedSlot={highlightedSlot}
                  className={
                    dayIndex < days.length - 1
                      ? "border-r border-stroke-200/70"
                      : ""
                  }
                />
                  );
                })()
              ))}
            </div>
          </div>
        </div>
      )}

      {canPortal &&
        createPortal(
          <DragOverlay zIndex={2000}>
            {activeType === "itinerary-activity" &&
            activeSidebarActivity &&
            !dragOverInfo ? (
              <SidebarActivityDragOverlay activity={activeSidebarActivity} />
            ) : activeType === "custom-event" && activeCustomEvent ? (
              <CustomEventBlock
                event={activeCustomEvent}
                isOverlay
                className="opacity-80 rotate-3 shadow-lg"
              />
            ) : (
              activeActivity && (
              <ActivityBlock
                activity={activeActivity}
                isOverlay
                className="opacity-80 rotate-3 shadow-lg"
                showWaypointBadge={activeDaySet.has(format(activeActivity.date, "yyyy-MM-dd"))}
              />
              )
            )}
          </DragOverlay>,
          document.body
        )}
    </>
  );

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

      {useExternalDndContext ? (
        calendarContent
      ) : (
        <DndContext
          collisionDetection={pointerWithin}
          onDragStart={onDragStart}
          onDragMove={onDragMove}
          onDragOver={onDragOver}
          onDragEnd={onDragEnd}
          onDragCancel={onDragCancel}
        >
          {calendarContent}
        </DndContext>
      )}

      <CustomEventPopover
        open={customEventPopoverOpen}
        onOpenChange={(open) => {
          if (!open) {
            closeCustomEventPopover();
            return;
          }
          setCustomEventPopoverOpen(true);
        }}
        draft={customEventDraft}
        anchorRect={customEventAnchorRect}
        onSaved={(event) => upsertCustomEvent(event)}
      />

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
