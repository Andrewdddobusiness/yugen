"use client";

import React, { useMemo } from "react";
import { format, isSameDay, isSameMonth, isToday, isWeekend, startOfMonth } from "date-fns";
import { cn } from "@/lib/utils";
import type { ScheduledActivity } from "./hooks/useScheduledActivities";
import { useItineraryActivityStore } from "@/store/itineraryActivityStore";
import { useItineraryCustomEventStore } from "@/store/itineraryCustomEventStore";
import { useItineraryLayoutStore } from "@/store/itineraryLayoutStore";
import { ACTIVITY_ACCENT_DOT_CLASSES, getActivityThemeForTypes } from "@/lib/activityAccent";
import { colors } from "@/lib/colors/colors";
import type { ItineraryDestinationSummary } from "@/actions/supabase/destinations";
import { getCityLabelForDateKey } from "@/lib/itinerary/cityTimeline";
import { CityLabelPill } from "./CityLabelPill";

interface MonthGridProps {
  monthDate: Date;
  days: Date[];
  scheduledActivities: ScheduledActivity[];
  destinations?: ItineraryDestinationSummary[];
  onSelectDate?: (date: Date) => void;
  className?: string;
}

const weekdayLabels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;

const DAY_OF_WEEK_PALETTE = [
  colors.Blue, // Sun
  colors.Purple, // Mon
  colors.Green, // Tue
  colors.Yellow, // Wed
  colors.Orange, // Thu
  colors.Red, // Fri
  colors.TangyOrange, // Sat
];

function getDayColor(date: Date) {
  return DAY_OF_WEEK_PALETTE[date.getDay()] ?? colors.Blue;
}

export function MonthGrid({
  monthDate,
  days,
  scheduledActivities,
  destinations,
  onSelectDate,
  className,
}: MonthGridProps) {
  const monthStart = startOfMonth(monthDate);
  const { itineraryActivities } = useItineraryActivityStore();
  const customEvents = useItineraryCustomEventStore((s) => s.customEvents);
  const activityCategoryAccents = useItineraryLayoutStore((s) => s.activityCategoryAccents);
  const activityCategoryCustomColors = useItineraryLayoutStore((s) => s.activityCategoryCustomColors);
  const activeDays = useItineraryLayoutStore((s) => s.viewStates.calendar.activeDays ?? []);
  const showCityLabels = useItineraryLayoutStore((s) => s.viewStates.calendar.showCityLabels);
  const activeDaySet = useMemo(() => new Set(activeDays ?? []), [activeDays]);

  const itemsByDay = useMemo(() => {
    type MonthCellItem =
      | {
          kind: "activity";
          id: string;
          activityId: unknown;
          dateKey: string;
          startTime: string | null;
          name: string;
          types: string[];
        }
      | {
          kind: "custom-event";
          id: string;
          dateKey: string;
          startTime: string | null;
          name: string;
          colorHex: string | null;
        };

    // Prefer source-of-truth itinerary activities so month view can show date-only items too.
    // Fall back to scheduledActivities (already filtered to view range) if store is empty.
    const activitySource: MonthCellItem[] =
      itineraryActivities && itineraryActivities.length > 0
        ? itineraryActivities
            .filter((a) => a.deleted_at === null && a.date)
            .map((a) => {
              const dateKey = (a.date ?? "").slice(0, 10); // YYYY-MM-DD
              const startTime = a.start_time ? a.start_time.slice(0, 5) : null; // HH:mm
              return {
                kind: "activity",
                id: String(a.itinerary_activity_id),
                activityId: a.activity_id || a.itinerary_activity_id,
                dateKey,
                startTime,
                name: a.activity?.name ?? "Activity",
                types: a.activity?.types ?? [],
              };
            })
        : scheduledActivities.map((a) => ({
            kind: "activity",
            id: a.id,
            activityId: a.activityId || a.id,
            dateKey: format(a.date, "yyyy-MM-dd"),
            startTime: a.startTime ? a.startTime.slice(0, 5) : null,
            name: a.activity?.name ?? "Activity",
            types: a.activity?.types ?? [],
          }));

    const customSource: MonthCellItem[] = customEvents
      .filter((event) => event.deleted_at === null && event.date)
      .map((event) => ({
        kind: "custom-event",
        id: `custom-${event.itinerary_custom_event_id}`,
        dateKey: String(event.date).slice(0, 10),
        startTime: event.start_time ? String(event.start_time).slice(0, 5) : null,
        name: event.title,
        colorHex: event.color_hex,
      }));

    const source: MonthCellItem[] = [...activitySource, ...customSource];

    const map = new Map<string, MonthCellItem[]>();

    for (const item of source) {
      if (!item.dateKey) continue;
      const existing = map.get(item.dateKey);
      if (existing) existing.push(item);
      else map.set(item.dateKey, [item]);
    }

    for (const list of map.values()) {
      list.sort((a, b) => {
        // Timed activities first, then by time, then by name.
        if (a.startTime && !b.startTime) return -1;
        if (!a.startTime && b.startTime) return 1;
        if (a.startTime && b.startTime) return a.startTime.localeCompare(b.startTime);
        return a.name.localeCompare(b.name);
      });
    }

    return map;
  }, [customEvents, itineraryActivities, scheduledActivities]);

  return (
    <div className={cn("flex flex-col h-full min-h-0", className)}>
      <div className="grid grid-cols-7 border-b border-stroke-200/70 bg-bg-0/80 backdrop-blur-sm">
        {weekdayLabels.map((label) => (
          <div
            key={label}
            className="py-2 text-center text-xs font-medium text-ink-500 uppercase tracking-wide"
          >
            {label}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 grid-rows-6 flex-1 min-h-0 bg-bg-0">
        {days.map((day, index) => {
          const inMonth = isSameMonth(day, monthStart);
          const isSelected = isSameDay(day, monthDate);
          const isCurrentDay = isToday(day);
          const isWeekendDay = isWeekend(day);
          const dayKey = format(day, "yyyy-MM-dd");
          const isActiveDay = activeDaySet.has(dayKey);
          const dayColor = getDayColor(day);
          const dayItems = itemsByDay.get(dayKey) ?? [];
          const cityLabel =
            showCityLabels && destinations?.length
              ? getCityLabelForDateKey(dayKey, destinations)
              : null;

          const isLastColumn = index % 7 === 6;
          const cellEvents = dayItems.slice(0, 3);
          const overflowCount = Math.max(0, dayItems.length - cellEvents.length);

          return (
            <button
              key={dayKey}
              type="button"
              onClick={() => onSelectDate?.(day)}
              aria-pressed={Boolean(isActiveDay)}
              className={cn(
                "relative flex flex-col min-h-0 p-2 text-left transition-colors",
                "border-b border-stroke-200/70",
                !isLastColumn && "border-r border-stroke-200/70",
                isWeekendDay && "bg-bg-50/40",
                !inMonth && "bg-bg-50/20 text-ink-400",
                isSelected && "bg-brand-500/10",
                "hover:bg-brand-500/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40"
              )}
            >
              {isActiveDay ? (
                <span
                  aria-hidden="true"
                  className="absolute top-0 left-0 right-0 h-1"
                  style={{ backgroundColor: dayColor }}
                />
              ) : null}
              <div className="flex items-center justify-between">
                <div
                  className={cn(
                    "flex items-center justify-center w-7 h-7 rounded-full text-sm font-medium",
                    isCurrentDay && "bg-brand-500 text-white",
                    !isCurrentDay && inMonth && "text-ink-900",
                    !inMonth && "text-ink-400"
                  )}
                >
                  {format(day, "d")}
                </div>
              </div>

              {cityLabel ? (
                <div className="mt-1 max-w-full">
                  <CityLabelPill
                    label={cityLabel}
                    size="sm"
                    className={cn(!inMonth && "opacity-80")}
                  />
                </div>
              ) : null}

              <div className="mt-1 space-y-1 min-h-0 overflow-hidden">
                {cellEvents.map((item) => {
                  const isCustomEvent = item.kind === "custom-event";
                  const theme = !isCustomEvent
                    ? getActivityThemeForTypes(
                        item.types,
                        item.activityId,
                        activityCategoryAccents,
                        activityCategoryCustomColors
                      )
                    : null;

                  return (
                    <div
                      key={item.id}
                      className={cn(
                        "flex items-center gap-1.5 truncate text-[11px] leading-4",
                        !inMonth && "text-ink-400",
                        inMonth && "text-ink-700"
                      )}
                      title={item.name}
                    >
                      <span
                        className={cn(
                          "inline-block w-1.5 h-1.5 rounded-full flex-shrink-0",
                          !inMonth && "opacity-60",
                          isCustomEvent
                            ? "bg-transparent"
                            : theme?.customHex
                              ? "bg-transparent"
                              : theme
                                ? ACTIVITY_ACCENT_DOT_CLASSES[theme.accent]
                                : "bg-brand-500"
                        )}
                        style={
                          isCustomEvent
                            ? {
                                backgroundColor: item.colorHex || "#94a3b8",
                              }
                            : theme?.customHex
                              ? { backgroundColor: theme.customHex }
                              : undefined
                        }
                      />
                      {item.startTime && (
                        <span className={cn("font-medium flex-shrink-0", !inMonth && "text-ink-400")}>
                          {item.startTime}
                        </span>
                      )}
                      <span className="truncate">{item.name}</span>
                    </div>
                  );
                })}

                {overflowCount > 0 && (
                  <div className={cn("text-[11px] leading-4 px-1", inMonth ? "text-ink-500" : "text-ink-400")}>
                    +{overflowCount} more
                  </div>
                )}

                {dayItems.length > 0 && cellEvents.length === 0 && (
                  <div className={cn("flex items-center gap-1 text-[11px] px-1", inMonth ? "text-ink-500" : "text-ink-400")}>
                    <span className="inline-block w-1.5 h-1.5 rounded-full bg-brand-500" />
                    <span>{dayItems.length} items</span>
                  </div>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
