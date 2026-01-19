import { useMemo } from 'react';
import { isSameDay } from 'date-fns';
import { useItineraryActivityStore } from '@/store/itineraryActivityStore';
import { useItinerarySlotStore } from '@/store/itinerarySlotStore';
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
  waypointNumber?: number;
  activity?: {
    name: string;
    address?: string;
    coordinates?: [number, number];
    types?: string[];
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
  const slots = useItinerarySlotStore((s) => s.slots);
  const slotOptions = useItinerarySlotStore((s) => s.slotOptions);

  const scheduledActivities: ScheduledActivity[] = useMemo(() => {
    const slotIdByActivityId = new Map<string, string>();
    const activityIdsBySlotId = new Map<string, string[]>();

    for (const option of slotOptions) {
      const slotId = String((option as any)?.itinerary_slot_id ?? "").trim();
      const activityId = String((option as any)?.itinerary_activity_id ?? "").trim();
      if (!slotId || !activityId) continue;
      slotIdByActivityId.set(activityId, slotId);
      const list = activityIdsBySlotId.get(slotId) ?? [];
      list.push(activityId);
      activityIdsBySlotId.set(slotId, list);
    }

    const primaryBySlotId = new Map<string, string>();
    for (const slot of slots) {
      const slotId = String((slot as any)?.itinerary_slot_id ?? "").trim();
      if (!slotId) continue;
      const primary = String((slot as any)?.primary_itinerary_activity_id ?? "").trim();
      if (primary) primaryBySlotId.set(slotId, primary);
    }

    const isPrimaryForActivity = (itineraryActivityId: string) => {
      const id = String(itineraryActivityId ?? "").trim();
      if (!id) return true;

      const slotId = slotIdByActivityId.get(id);
      if (!slotId) return true;

      const optionIds = activityIdsBySlotId.get(slotId) ?? [];
      if (optionIds.length <= 1) return true;

      const primary =
        primaryBySlotId.get(slotId) ??
        optionIds
          .slice()
          .sort((a, b) => Number(a) - Number(b))
          .find(Boolean);
      if (!primary) return true;
      return primary === id;
    };

    const parseTimeToMinutes = (time: string | null | undefined) => {
      if (!time) return null;
      const [hourStr, minuteStr] = time.split(":");
      const hour = Number(hourStr);
      const minute = Number(minuteStr);
      if (!Number.isFinite(hour) || !Number.isFinite(minute)) return null;
      return hour * 60 + minute;
    };

    const waypointNumberById = new Map<string, number>();
    const candidatesByDay = new Map<number, Array<{ id: string; startMinutes: number | null; name: string }>>();

    for (const activity of itineraryActivities) {
      if (!activity.date) continue;
      if (activity.deleted_at !== null) continue;
      if (!isPrimaryForActivity(String(activity.itinerary_activity_id))) continue;
      if (
        !activity.activity?.coordinates ||
        !Array.isArray(activity.activity.coordinates) ||
        activity.activity.coordinates.length !== 2
      ) {
        continue;
      }

      const activityDate = new Date(activity.date as string);
      const dayIndex = days.findIndex((day) => isSameDay(day, activityDate));
      if (dayIndex === -1) continue;

      const list = candidatesByDay.get(dayIndex);
      const entry = {
        id: String(activity.itinerary_activity_id),
        startMinutes: parseTimeToMinutes(activity.start_time),
        name: activity.activity?.name ?? "",
      };
      if (list) list.push(entry);
      else candidatesByDay.set(dayIndex, [entry]);
    }

    for (const list of candidatesByDay.values()) {
      list.sort((a, b) => {
        if (a.startMinutes != null && b.startMinutes != null && a.startMinutes !== b.startMinutes) {
          return a.startMinutes - b.startMinutes;
        }
        if (a.startMinutes != null && b.startMinutes == null) return -1;
        if (a.startMinutes == null && b.startMinutes != null) return 1;

        const nameSort = a.name.localeCompare(b.name);
        if (nameSort !== 0) return nameSort;
        return a.id.localeCompare(b.id);
      });

      list.forEach((entry, idx) => {
        waypointNumberById.set(entry.id, idx + 1);
      });
    }

    return itineraryActivities
      .filter(activity => activity.date && activity.start_time && activity.end_time)
      .filter((activity) => isPrimaryForActivity(String(activity.itinerary_activity_id)))
      .map(activity => {
        const activityDate = new Date(activity.date as string);
        const dayIndex = days.findIndex(day => isSameDay(day, activityDate));
        
        if (dayIndex === -1) return null;

        const [startHour, startMinute] = (activity.start_time as string).split(':').map(Number);
        const [endHour, endMinute] = (activity.end_time as string).split(':').map(Number);
        
        let startSlot = timeSlots.findIndex(slot => 
          slot.hour === startHour && slot.minute === startMinute
        );
        let endSlot = timeSlots.findIndex(slot => 
          slot.hour === endHour && slot.minute === endMinute
        );

        if (startSlot === -1 && timeSlots.length > 0) {
          const startMinutes = startHour * 60 + startMinute;
          const firstSlot = timeSlots[0];
          const firstMinutes = firstSlot.hour * 60 + firstSlot.minute;
          const inferredInterval =
            timeSlots.length > 1
              ? (timeSlots[1].hour * 60 + timeSlots[1].minute) - firstMinutes
              : 60;
          startSlot = Math.min(
            Math.max(0, Math.round((startMinutes - firstMinutes) / inferredInterval)),
            Math.max(0, timeSlots.length - 1)
          );
        }

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
          waypointNumber: waypointNumberById.get(String(activity.itinerary_activity_id)),
          position: {
            day: dayIndex,
            startSlot: Math.max(0, startSlot),
            span: Math.max(1, span)
          },
          activity: activity.activity
        };
      })
      .filter(Boolean) as ScheduledActivity[];
  }, [days, itineraryActivities, slotOptions, slots, timeSlots]);

  return scheduledActivities;
}
