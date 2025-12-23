"use client";

import React, { useMemo } from 'react';
import { cn } from '@/lib/utils';
import { CALENDAR_HEADER_HEIGHT_PX, getCalendarSlotHeightPx } from './layoutMetrics';

export interface TimeSlot {
  time: string;
  hour: number;
  minute: number;
  label: string;
  isHour: boolean;
  intervalIndex: number;
}

export interface TimeGridConfig {
  interval: 15 | 30 | 60; // minutes
  startHour: number; // 0-23
  endHour: number;   // 0-23  
  showExtendedHours: boolean; // 24-hour view
  timezone?: string;
}

interface TimeGridProps {
  config: TimeGridConfig;
  children?: (timeSlots: TimeSlot[]) => React.ReactNode;
  className?: string;
}

/**
 * Enhanced time grid system with configurable intervals and precise scheduling
 */
export function TimeGrid({ config, children, className }: TimeGridProps) {
  const timeSlots: TimeSlot[] = useMemo(() => {
    const { interval, startHour, endHour } = config;
    const slots: TimeSlot[] = [];
    let intervalIndex = 0;

    for (let hour = startHour; hour <= endHour; hour++) {
      const intervalsPerHour = 60 / interval;
      
      for (let i = 0; i < intervalsPerHour; i++) {
        const minute = i * interval;
        const timeString = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
        
        // Format display time
        let displayTime: string;
        if (minute === 0) {
          const displayHour = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
          displayTime = `${displayHour}:00 ${hour >= 12 ? 'PM' : 'AM'}`;
        } else {
          const displayHour = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
          displayTime = `${displayHour}:${minute.toString().padStart(2, '0')} ${hour >= 12 ? 'PM' : 'AM'}`;
        }

        slots.push({
          time: timeString,
          hour,
          minute,
          label: displayTime,
          isHour: minute === 0,
          intervalIndex
        });

        intervalIndex++;
      }
    }

    return slots;
  }, [config]);

  if (children) {
    return <div className={cn("flex-shrink-0", className)}>{children(timeSlots)}</div>;
  }

  return (
    <div className={cn("w-20 flex-shrink-0 bg-gray-50 border-r border-gray-200", className)}>
      {/* Header spacer */}
      <div className="border-b border-gray-200" style={{ height: CALENDAR_HEADER_HEIGHT_PX }} />
      
      {/* Time slots */}
      <div className="relative">
        {timeSlots.map((slot) => {
          const slotHeight = getCalendarSlotHeightPx(config.interval);
          
          return (
            <div
              key={slot.time}
              className={cn(
                "border-b relative",
                slot.isHour ? "border-gray-200" : "border-gray-100"
              )}
              style={{ height: `${slotHeight}px` }}
            >
              {/* Time label - show for hours or based on interval */}
              {(slot.isHour || config.interval === 15) && (
                <div 
                  className={cn(
                    "absolute -top-2 right-2 text-xs px-1 bg-gray-50",
                    slot.isHour ? "text-gray-700 font-medium" : "text-gray-500"
                  )}
                >
                  {config.interval === 15 || slot.isHour ? slot.label : ''}
                </div>
              )}
              
              {/* Hour marker line for visual hierarchy */}
              {slot.isHour && (
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
 * Default time grid configuration
 */
export const DEFAULT_TIME_CONFIG: TimeGridConfig = {
  interval: 30,
  startHour: 6,
  endHour: 23,
  showExtendedHours: false
};

/**
 * Extended hours configuration for 24-hour view
 */
export const EXTENDED_TIME_CONFIG: TimeGridConfig = {
  interval: 30,
  startHour: 0,
  endHour: 23,
  showExtendedHours: true
};
