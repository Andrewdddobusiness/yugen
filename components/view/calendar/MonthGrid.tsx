"use client";

import React, { useMemo } from "react";
import { format, isSameDay, isSameMonth, isToday, isWeekend, startOfMonth } from "date-fns";
import { cn } from "@/lib/utils";
import type { ScheduledActivity } from "./hooks/useScheduledActivities";
import { useItineraryActivityStore } from "@/store/itineraryActivityStore";
import { useItineraryLayoutStore } from "@/store/itineraryLayoutStore";
import { ACTIVITY_ACCENT_DOT_CLASSES, getActivityThemeForTypes } from "@/lib/activityAccent";
import { colors } from "@/lib/colors/colors";

interface MonthGridProps {
  monthDate: Date;
  days: Date[];
  scheduledActivities: ScheduledActivity[];
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
  onSelectDate,
  className,
}: MonthGridProps) {
  const monthStart = startOfMonth(monthDate);
  const { itineraryActivities } = useItineraryActivityStore();
  const activityCategoryAccents = useItineraryLayoutStore((s) => s.activityCategoryAccents);
  const activityCategoryCustomColors = useItineraryLayoutStore((s) => s.activityCategoryCustomColors);
  const activeDays = useItineraryLayoutStore((s) => s.viewStates.calendar.activeDays ?? []);
  const activeDaySet = useMemo(() => new Set(activeDays ?? []), [activeDays]);

  const activitiesByDay = useMemo(() => {
    // Prefer source-of-truth itinerary activities so month view can show date-only items too.
    // Fall back to scheduledActivities (already filtered to view range) if store is empty.
    const source =
      itineraryActivities && itineraryActivities.length > 0
        ? itineraryActivities
            .filter((a) => a.deleted_at === null && a.date)
            .map((a) => {
              const dateKey = (a.date ?? "").slice(0, 10); // YYYY-MM-DD
              const startTime = a.start_time ? a.start_time.slice(0, 5) : null; // HH:mm
              return {
                id: String(a.itinerary_activity_id),
                activityId: a.activity_id || a.itinerary_activity_id,
                dateKey,
                startTime,
                name: a.activity?.name ?? "Activity",
                types: a.activity?.types ?? [],
              };
            })
        : scheduledActivities.map((a) => ({
            id: a.id,
            activityId: a.activityId || a.id,
            dateKey: format(a.date, "yyyy-MM-dd"),
            startTime: a.startTime ? a.startTime.slice(0, 5) : null,
            name: a.activity?.name ?? "Activity",
            types: a.activity?.types ?? [],
          }));

    const map = new Map<
      string,
      Array<{ id: string; activityId: unknown; startTime: string | null; name: string; types: string[] }>
    >();

    for (const item of source) {
      if (!item.dateKey) continue;
      const existing = map.get(item.dateKey);
      const payload = {
        id: item.id,
        activityId: item.activityId,
        startTime: item.startTime,
        name: item.name,
        types: item.types,
      };
      if (existing) existing.push(payload);
      else map.set(item.dateKey, [payload]);
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
  }, [itineraryActivities, scheduledActivities]);

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
          const dayActivities = activitiesByDay.get(dayKey) ?? [];

          const isLastColumn = index % 7 === 6;
          const cellEvents = dayActivities.slice(0, 3);
          const overflowCount = Math.max(0, dayActivities.length - cellEvents.length);

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

              <div className="mt-1 space-y-1 min-h-0 overflow-hidden">
                {cellEvents.map((activity) => {
                  const theme = getActivityThemeForTypes(
                    activity.types,
                    activity.activityId,
                    activityCategoryAccents,
                    activityCategoryCustomColors
                  );

                  return (
                    <div
                      key={activity.id}
                      className={cn(
                        "flex items-center gap-1.5 truncate text-[11px] leading-4",
                        !inMonth && "text-ink-400",
                        inMonth && "text-ink-700"
                      )}
                      title={activity.name}
                    >
                      <span
                        className={cn(
                          "inline-block w-1.5 h-1.5 rounded-full flex-shrink-0",
                          !inMonth && "opacity-60",
                          theme.customHex ? "bg-transparent" : ACTIVITY_ACCENT_DOT_CLASSES[theme.accent]
                        )}
                        style={theme.customHex ? { backgroundColor: theme.customHex } : undefined}
                      />
                      {activity.startTime && (
                        <span className={cn("font-medium flex-shrink-0", !inMonth && "text-ink-400")}>
                          {activity.startTime}
                        </span>
                      )}
                      <span className="truncate">{activity.name}</span>
                    </div>
                  );
                })}

                {overflowCount > 0 && (
                  <div className={cn("text-[11px] leading-4 px-1", inMonth ? "text-ink-500" : "text-ink-400")}>
                    +{overflowCount} more
                  </div>
                )}

                {dayActivities.length > 0 && cellEvents.length === 0 && (
                  <div className={cn("flex items-center gap-1 text-[11px] px-1", inMonth ? "text-ink-500" : "text-ink-400")}>
                    <span className="inline-block w-1.5 h-1.5 rounded-full bg-brand-500" />
                    <span>{dayActivities.length} activities</span>
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
