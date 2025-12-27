import { useMemo } from 'react';
import { isSameDay } from 'date-fns';
import { useItineraryActivityStore } from '@/store/itineraryActivityStore';
import { TimeSlot } from '../TimeGrid';

/**
 * Represents a scheduled activity with position information for calendar rendering
 */
export interface ScheduledActivity {
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

/**
 * useScheduledActivities - Converts itinerary activities to scheduled activities for calendar display
 * 
 * Features:
 * - Maps itinerary activities to calendar positions
 * - Calculates time slot spans and positions
 * - Filters activities for current view
 * 
 * @param days - Array of dates for current calendar view
 * @param timeSlots - Available time slots for positioning
 * @returns Array of scheduled activities with position metadata
 */
export function useScheduledActivities(days: Date[], timeSlots: TimeSlot[]): ScheduledActivity[] {
  const { itineraryActivities } = useItineraryActivityStore();

  const scheduledActivities: ScheduledActivity[] = useMemo(() => {
    return itineraryActivities
      .filter(activity => activity.date && activity.start_time && activity.end_time)
      .map(activity => {
        const activityDate = new Date(activity.date as string);
        const dayIndex = days.findIndex(day => isSameDay(day, activityDate));
        
        if (dayIndex === -1) return null;

        const [startHour, startMinute] = (activity.start_time as string).split(':').map(Number);
        const [endHour, endMinute] = (activity.end_time as string).split(':').map(Number);
        
        const startSlot = timeSlots.findIndex(slot => 
          slot.hour === startHour && slot.minute === startMinute
        );
        let endSlot = timeSlots.findIndex(slot => 
          slot.hour === endHour && slot.minute === endMinute
        );

        if (startSlot === -1) return null;

        if (endSlot === -1 && timeSlots.length > 0) {
          const endMinutes = endHour * 60 + endMinute;
          const firstSlot = timeSlots[0];
          const lastSlot = timeSlots[timeSlots.length - 1];
          const firstMinutes = firstSlot.hour * 60 + firstSlot.minute;
          const lastMinutes = lastSlot.hour * 60 + lastSlot.minute;
          const inferredInterval =
            timeSlots.length > 1
              ? (timeSlots[1].hour * 60 + timeSlots[1].minute) - firstMinutes
              : 60;
          const gridEndMinutes = lastMinutes + inferredInterval;

          // Allow activities ending exactly at the end of the grid (e.g. 24:00).
          if (endMinutes === gridEndMinutes) {
            endSlot = timeSlots.length;
          } else {
            endSlot = Math.min(
              timeSlots.length,
              Math.max(0, Math.round((endMinutes - firstMinutes) / inferredInterval))
            );
          }
        }
        
        const span = Math.max(1, endSlot - startSlot);
        const duration = (endHour * 60 + endMinute) - (startHour * 60 + startMinute);

        return {
          id: activity.itinerary_activity_id,
          activityId: activity.activity_id || '',
          placeId: activity.activity?.place_id || '',
          date: activityDate,
          startTime: activity.start_time as string,
          endTime: activity.end_time as string,
          duration,
          position: {
            day: dayIndex,
            startSlot: Math.max(0, startSlot),
            span: Math.max(1, span)
          },
          activity: activity.activity
        };
      })
      .filter(Boolean) as ScheduledActivity[];
  }, [itineraryActivities, days, timeSlots]);

  return scheduledActivities;
}
