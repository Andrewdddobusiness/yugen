"use client";

import React from 'react';
import { cn } from '@/lib/utils';
import { 
  generateTimeSlots, 
  TIME_SLOT_CONFIG, 
  getTotalGridHeight,
  type TimeSlot 
} from '@/utils/timeSlots';

interface TimeSlotGridProps {
  className?: string;
  children?: React.ReactNode;
  showCurrentTimeLine?: boolean;
}

export function TimeSlotGrid({ 
  className, 
  children, 
  showCurrentTimeLine = true 
}: TimeSlotGridProps) {
  const timeSlots = generateTimeSlots();
  const totalHeight = getTotalGridHeight();

  // Calculate current time position for "now" line
  const getCurrentTimePosition = () => {
    const now = new Date();
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    
    if (currentHour < TIME_SLOT_CONFIG.startHour || currentHour > TIME_SLOT_CONFIG.endHour) {
      return -1; // Outside visible hours
    }
    
    const hoursFromStart = currentHour - TIME_SLOT_CONFIG.startHour;
    return (hoursFromStart * TIME_SLOT_CONFIG.slotHeight) + (currentMinute * TIME_SLOT_CONFIG.minuteHeight);
  };

  const currentTimePosition = showCurrentTimeLine ? getCurrentTimePosition() : -1;
  const showNowLine = currentTimePosition >= 0;

  return (
    <div 
      className={cn("relative", className)}
      style={{ minHeight: totalHeight }}
    >
      {/* Time slot grid background */}
      <div className="absolute inset-0">
        {timeSlots.map((slot, index) => (
          <TimeSlotRow 
            key={`${slot.hour}-${slot.minute}`} 
            slot={slot}
            isLast={index === timeSlots.length - 1}
          />
        ))}
      </div>
      
      {/* Current time line */}
      {showNowLine && (
        <div 
          className="absolute left-0 right-0 z-20 border-t-2 border-red-500"
          style={{ top: currentTimePosition }}
        >
          <div className="absolute -left-2 -top-2 bg-red-500 text-white text-xs px-1 py-0.5 rounded">
            Now
          </div>
        </div>
      )}
      
      {/* Activity content */}
      <div className="relative z-10">
        {children}
      </div>
    </div>
  );
}

interface TimeSlotRowProps {
  slot: TimeSlot;
  isLast: boolean;
}

function TimeSlotRow({ slot, isLast }: TimeSlotRowProps) {
  return (
    <div 
      className="absolute left-0 right-0 flex"
      style={{ 
        top: slot.position,
        height: TIME_SLOT_CONFIG.slotHeight 
      }}
    >
      {/* Time label */}
      <div className="w-16 flex-shrink-0 pr-2 text-right">
        <span className="text-sm text-gray-500 dark:text-gray-400 font-medium">
          {slot.displayTime}
        </span>
      </div>
      
      {/* Grid line and content area */}
      <div className="flex-1 relative">
        {/* Top border line */}
        <div className="absolute top-0 left-0 right-0 border-t border-gray-200 dark:border-gray-700" />
        
        {/* Content area with subtle background */}
        <div className="h-full bg-gray-50/30 dark:bg-gray-800/30 hover:bg-gray-50/50 dark:hover:bg-gray-800/50 transition-colors" />
        
        {/* Bottom border for last slot */}
        {isLast && (
          <div className="absolute bottom-0 left-0 right-0 border-t border-gray-200 dark:border-gray-700" />
        )}
      </div>
    </div>
  );
}