"use client";

import React from 'react';
import { cn } from '@/lib/utils';

interface TimeSlot {
  time: string;
  hour: number;
  minute: number;
  label: string;
}

interface TimeSlotsProps {
  timeSlots: TimeSlot[];
  className?: string;
}

export function TimeSlots({ timeSlots, className }: TimeSlotsProps) {
  return (
    <div className={cn("w-16 flex-shrink-0 bg-gray-50", className)}>
      {/* Header spacer */}
      <div className="h-12 border-b border-gray-200" />
      
      {/* Time slots */}
      <div className="relative">
        {timeSlots.map((slot, index) => (
          <div
            key={slot.time}
            className="h-12 border-b border-gray-100 relative"
          >
            {/* Show time label only on the hour */}
            {slot.minute === 0 && (
              <div className="absolute -top-2 right-2 text-xs text-gray-600 font-medium bg-gray-50 px-1">
                {slot.label}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}