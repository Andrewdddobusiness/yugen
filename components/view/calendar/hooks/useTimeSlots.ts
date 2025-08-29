import { useMemo } from 'react';
import { useSchedulingContext } from '@/store/timeSchedulingStore';
import { TimeSlot } from '../TimeGrid';

/**
 * useTimeSlots - Generates time slots for the calendar grid
 * 
 * Features:
 * - Configurable time intervals (15min, 30min, 60min)
 * - Proper time formatting with AM/PM display
 * - Enhanced slot metadata for rendering
 * 
 * @returns Array of time slots with formatting and metadata
 */
export function useTimeSlots(): TimeSlot[] {
  const schedulingContext = useSchedulingContext();

  const timeSlots: TimeSlot[] = useMemo(() => {
    const { interval, startHour, endHour } = schedulingContext.config;
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
  }, [schedulingContext.config]);

  return timeSlots;
}