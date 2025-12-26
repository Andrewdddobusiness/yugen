"use client";

import React from "react";
import { format, isToday, isWeekend, isSameDay } from "date-fns";
import { cn } from "@/lib/utils";
import { Sun, Cloud, CloudRain, CloudSnow } from "lucide-react";
import {
  CALENDAR_HEADER_HEIGHT_PX,
  getCalendarSlotHeightPx,
} from "./layoutMetrics";

interface GridHeaderProps {
  dates: Date[];
  viewMode: "day" | "3-day" | "week" | "custom";
  showWeather?: boolean;
  className?: string;
}

interface DayHeaderProps {
  date: Date;
  isCompact?: boolean;
  showWeather?: boolean;
  weatherData?: {
    temp: number;
    condition: "sunny" | "cloudy" | "rainy" | "snowy";
  };
  className?: string;
}

/**
 * Calendar grid header showing day columns
 */
export function GridHeader({
  dates,
  viewMode,
  showWeather = false,
  className,
}: GridHeaderProps) {
  const isCompact = viewMode === "week" || dates.length > 5;

  return (
    <div
      className={cn(
        "flex border-b border-gray-200 bg-white sticky top-0 z-20",
        className
      )}
    >
      {/* Time column header */}
      <div
        className={cn(
          "flex-shrink-0 border-r border-gray-200",
          isCompact ? "w-16" : "w-20"
        )}
      >
        <div className="h-full flex items-center justify-center text-xs text-gray-500 font-medium">
          {isCompact ? "Time" : ""}
        </div>
      </div>

      {/* Day headers */}
      <div className="flex-1 flex">
        {dates.map((date, index) => (
          <DayHeader
            key={date.toISOString()}
            date={date}
            isCompact={isCompact}
            showWeather={showWeather}
            className={cn(
              "flex-1",
              index < dates.length - 1 && "border-r border-gray-200"
            )}
          />
        ))}
      </div>
    </div>
  );
}

/**
 * Individual day header
 */
export function DayHeader({
  date,
  isCompact = false,
  showWeather = false,
  weatherData,
  className,
}: DayHeaderProps) {
  const isCurrentDay = isToday(date);
  const isWeekendDay = isWeekend(date);

  const getWeatherIcon = () => {
    if (!weatherData) return null;

    switch (weatherData.condition) {
      case "sunny":
        return <Sun className="h-4 w-4 text-yellow-500" />;
      case "cloudy":
        return <Cloud className="h-4 w-4 text-gray-400" />;
      case "rainy":
        return <CloudRain className="h-4 w-4 text-blue-500" />;
      case "snowy":
        return <CloudSnow className="h-4 w-4 text-blue-300" />;
    }
  };

  return (
    <div
      className={cn(
        "p-3",
        isCurrentDay && "bg-blue-50",
        isWeekendDay && !isCurrentDay && "bg-gray-50",
        className
      )}
    >
      <div className="flex flex-col items-center space-y-1">
        {/* Day of week */}
        <div
          className={cn(
            "text-xs uppercase tracking-wider",
            isCurrentDay ? "text-blue-600 font-semibold" : "text-gray-500"
          )}
        >
          {format(date, isCompact ? "EEE" : "EEEE")}
        </div>

        {/* Date */}
        <div
          className={cn(
            "flex items-center space-x-1",
            isCurrentDay && "relative"
          )}
        >
          <span
            className={cn(
              isCompact ? "text-lg" : "text-xl",
              "font-semibold",
              isCurrentDay ? "text-blue-600" : "text-gray-900"
            )}
          >
            {format(date, "d")}
          </span>

          {!isCompact && (
            <span className="text-sm text-gray-500">{format(date, "MMM")}</span>
          )}

          {/* Today indicator */}
          {isCurrentDay && (
            <div className="absolute -bottom-1 left-1/2 transform -translate-x-1/2 w-1 h-1 bg-blue-600 rounded-full" />
          )}
        </div>

        {/* Weather (if enabled) */}
        {showWeather && weatherData && !isCompact && (
          <div className="flex items-center space-x-1 text-xs text-gray-600">
            {getWeatherIcon()}
            <span>{weatherData.temp}°</span>
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Time column showing hour labels
 */
export function TimeColumn({
  timeSlots,
  interval,
  isCompact = false,
  className,
}: {
  timeSlots: Array<{
    time: string;
    hour: number;
    minute: number;
    label: string;
  }>;
  interval: number;
  isCompact?: boolean;
  className?: string;
}) {
  const slotHeight = getCalendarSlotHeightPx(interval);

  return (
    <div
      className={cn(
        "flex-shrink-0 bg-gray-50 border-r border-gray-200",
        isCompact ? "w-16" : "w-20",
        className
      )}
    >
      {/* Header spacer */}
      <div
        className="border-b border-gray-200"
        style={{ height: CALENDAR_HEADER_HEIGHT_PX }}
      />

      {/* Time slots */}
      <div className="relative">
        {timeSlots.map((slot, index) => {
          const showLabel =
            slot.minute === 0 || (interval === 15 && index % 2 === 0);

          return (
            <div
              key={slot.time}
              className={cn(
                "relative border-b",
                slot.minute === 0 ? "border-gray-200" : "border-gray-100"
              )}
              style={{ height: `${slotHeight}px` }}
            >
              {showLabel && (
                <div
                  className={cn(
                    "absolute -top-2 px-1 bg-gray-50",
                    isCompact ? "right-1 text-xs" : "right-2 text-sm",
                    slot.minute === 0
                      ? "text-gray-700 font-medium"
                      : "text-gray-500"
                  )}
                >
                  {slot.label}
                </div>
              )}

              {/* Hour marker */}
              {slot.minute === 0 && (
                <div className="absolute left-0 top-0 w-2 h-px bg-gray-300" />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/**
 * Current time indicator line
 */
export function CurrentTimeIndicator({
  timeSlots,
  interval,
  className,
}: {
  timeSlots: Array<{ time: string; hour: number; minute: number }>;
  interval: number;
  className?: string;
}) {
  const now = new Date();
  const currentHour = now.getHours();
  const currentMinute = now.getMinutes();
  const currentTimeMinutes = currentHour * 60 + currentMinute;

  // Find the position of current time
  const firstSlotMinutes = timeSlots[0].hour * 60 + timeSlots[0].minute;
  const lastSlotMinutes =
    timeSlots[timeSlots.length - 1].hour * 60 +
    timeSlots[timeSlots.length - 1].minute;

  if (
    currentTimeMinutes < firstSlotMinutes ||
    currentTimeMinutes > lastSlotMinutes + interval
  ) {
    return null; // Current time is outside visible range
  }

  const minutesSinceStart = currentTimeMinutes - firstSlotMinutes;
  const slotHeight = interval === 15 ? 30 : interval === 30 ? 48 : 60;
  const pixelsPerMinute = slotHeight / interval;
  const topPosition = minutesSinceStart * pixelsPerMinute;

  return (
    <div
      className={cn(
        "absolute left-0 right-0 h-0.5 bg-red-500 pointer-events-none z-30",
        className
      )}
      style={{ top: `${topPosition}px` }}
    >
      <div className="absolute -left-1 -top-1 w-2 h-2 bg-red-500 rounded-full" />
      <div className="absolute -left-20 -top-2.5 bg-red-500 text-white text-xs px-1.5 py-0.5 rounded">
        {format(now, "HH:mm")}
      </div>
    </div>
  );
}
