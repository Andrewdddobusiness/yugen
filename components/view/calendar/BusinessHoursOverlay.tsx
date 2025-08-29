"use client";

import React from 'react';
import { cn } from '@/lib/utils';

interface BusinessHours {
  open: string; // "09:00"
  close: string; // "17:00"
  isOpen24Hours?: boolean;
  isClosed?: boolean;
  name?: string;
}

interface BusinessHoursOverlayProps {
  businessHours: BusinessHours[];
  timeSlots: Array<{
    time: string;
    hour: number;
    minute: number;
  }>;
  className?: string;
}

/**
 * Overlay that shows business hours for venues on the calendar
 */
export function BusinessHoursOverlay({
  businessHours,
  timeSlots,
  className
}: BusinessHoursOverlayProps) {
  if (!businessHours.length) return null;

  const getSlotOpacity = (slot: { time: string; hour: number; minute: number }): number => {
    const slotMinutes = slot.hour * 60 + slot.minute;
    let totalWeight = 0;
    let openWeight = 0;

    businessHours.forEach(hours => {
      if (hours.isClosed) {
        // Venue is closed - no weight contribution to "open"
        totalWeight += 1;
        return;
      }

      if (hours.isOpen24Hours) {
        // 24-hour venue - full weight to "open"
        totalWeight += 1;
        openWeight += 1;
        return;
      }

      // Parse open/close times
      const [openH, openM] = hours.open.split(':').map(Number);
      const [closeH, closeM] = hours.close.split(':').map(Number);
      const openMinutes = openH * 60 + openM;
      const closeMinutes = closeH * 60 + closeM;

      totalWeight += 1;

      // Check if slot falls within business hours
      if (slotMinutes >= openMinutes && slotMinutes < closeMinutes) {
        openWeight += 1;
      }
    });

    // Return the ratio of open venues (0 = all closed, 1 = all open)
    return totalWeight > 0 ? openWeight / totalWeight : 0;
  };

  const getSlotColor = (opacity: number): string => {
    if (opacity === 0) {
      return 'bg-gray-400/30'; // All venues closed
    } else if (opacity < 0.5) {
      return 'bg-amber-400/20'; // Some venues closed
    } else if (opacity < 1) {
      return 'bg-green-400/10'; // Most venues open
    } else {
      return 'bg-transparent'; // All venues open (no overlay needed)
    }
  };

  return (
    <div className={cn("absolute inset-0 pointer-events-none", className)}>
      {timeSlots.map((slot, index) => {
        const opacity = getSlotOpacity(slot);
        const colorClass = getSlotColor(opacity);
        
        if (colorClass === 'bg-transparent') return null;

        const slotHeight = 48; // Default 30-minute slot height
        
        return (
          <div
            key={slot.time}
            className={cn(
              "absolute left-0 right-0 border-b border-transparent",
              colorClass
            )}
            style={{
              top: `${48 + (index * slotHeight)}px`, // 48px header offset
              height: `${slotHeight}px`,
            }}
          >
            {/* Optional time indicator for closed hours */}
            {opacity === 0 && (
              <div className="absolute right-1 top-1 text-xs text-gray-500 bg-white/80 px-1 rounded">
                Closed
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

/**
 * Helper component for displaying business hours legend
 */
export function BusinessHoursLegend({ className }: { className?: string }) {
  return (
    <div className={cn("flex items-center space-x-4 text-xs text-muted-foreground", className)}>
      <div className="flex items-center space-x-1">
        <div className="w-3 h-3 bg-gray-400/30 rounded" />
        <span>Closed</span>
      </div>
      <div className="flex items-center space-x-1">
        <div className="w-3 h-3 bg-amber-400/20 rounded" />
        <span>Limited Hours</span>
      </div>
      <div className="flex items-center space-x-1">
        <div className="w-3 h-3 bg-green-400/10 rounded" />
        <span>Mostly Open</span>
      </div>
    </div>
  );
}

/**
 * Utility to extract business hours from Google Places data
 */
export function extractBusinessHours(
  placesData: Array<{
    place_id: string;
    name: string;
    opening_hours?: {
      open_now?: boolean;
      periods?: Array<{
        open: { day: number; time: string };
        close: { day: number; time: string };
      }>;
    };
  }>,
  dayOfWeek: number = new Date().getDay() // 0 = Sunday, 1 = Monday, etc.
): BusinessHours[] {
  return placesData
    .map(place => {
      if (!place.opening_hours?.periods) {
        return {
          open: "09:00",
          close: "17:00",
          name: place.name,
          isClosed: !place.opening_hours?.open_now
        };
      }

      // Find the period for the current day
      const todayPeriod = place.opening_hours.periods.find(
        period => period.open.day === dayOfWeek
      );

      if (!todayPeriod) {
        return {
          open: "09:00",
          close: "17:00",
          name: place.name,
          isClosed: true
        };
      }

      // Format time from Google Places format (e.g., "0900" -> "09:00")
      const formatTime = (timeStr: string): string => {
        const padded = timeStr.padStart(4, '0');
        return `${padded.slice(0, 2)}:${padded.slice(2, 4)}`;
      };

      // Check if it's 24 hours (no close time or close time is next day)
      const is24Hours = !todayPeriod.close || 
        (todayPeriod.close.day !== todayPeriod.open.day);

      return {
        open: formatTime(todayPeriod.open.time),
        close: todayPeriod.close ? formatTime(todayPeriod.close.time) : "23:59",
        isOpen24Hours: is24Hours,
        name: place.name
      };
    })
    .filter(Boolean);
}