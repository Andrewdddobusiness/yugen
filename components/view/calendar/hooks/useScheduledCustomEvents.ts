"use client";

import { useMemo } from "react";
import { isSameDay } from "date-fns";
import { TimeSlot } from "../TimeGrid";
import { useItineraryCustomEventStore } from "@/store/itineraryCustomEventStore";
import type { ItineraryCustomEventKind } from "@/lib/customEvents/kinds";

export interface ScheduledCustomEvent {
  id: string;
  date: Date;
  startTime: string;
  endTime: string;
  duration: number;
  position: { day: number; startSlot: number; span: number };
  title: string;
  kind: ItineraryCustomEventKind;
  notes?: string | null;
  colorHex?: string | null;
  createdBy?: string | null;
}

export function useScheduledCustomEvents(days: Date[], timeSlots: TimeSlot[]): ScheduledCustomEvent[] {
  const { customEvents } = useItineraryCustomEventStore();

  return useMemo(() => {
    const events = customEvents.filter((event) => event.deleted_at == null);

    return events
      .filter((event) => event.date && event.start_time && event.end_time)
      .map((event) => {
        const eventDate = new Date(event.date as string);
        const dayIndex = days.findIndex((day) => isSameDay(day, eventDate));
        if (dayIndex === -1) return null;

        const [startHour, startMinute] = String(event.start_time).slice(0, 5).split(":").map(Number);
        const [endHour, endMinute] = String(event.end_time).slice(0, 5).split(":").map(Number);
        if (!Number.isFinite(startHour) || !Number.isFinite(startMinute)) return null;
        if (!Number.isFinite(endHour) || !Number.isFinite(endMinute)) return null;

        let startSlot = timeSlots.findIndex((slot) => slot.hour === startHour && slot.minute === startMinute);
        let endSlot = timeSlots.findIndex((slot) => slot.hour === endHour && slot.minute === endMinute);
        if (startSlot === -1 && timeSlots.length > 0) {
          const startMinutes = startHour * 60 + startMinute;
          const firstSlot = timeSlots[0];
          const firstMinutes = firstSlot.hour * 60 + firstSlot.minute;
          const inferredInterval =
            timeSlots.length > 1
              ? timeSlots[1].hour * 60 + timeSlots[1].minute - firstMinutes
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
              ? timeSlots[1].hour * 60 + timeSlots[1].minute - firstMinutes
              : 60;
          const gridEndMinutes = lastMinutes + inferredInterval;

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
          id: String(event.itinerary_custom_event_id),
          date: eventDate,
          startTime: String(event.start_time),
          endTime: String(event.end_time),
          duration,
          position: {
            day: dayIndex,
            startSlot: Math.max(0, startSlot),
            span: Math.max(1, span),
          },
          title: event.title,
          kind: event.kind ?? "custom",
          notes: event.notes,
          colorHex: event.color_hex,
          createdBy: event.created_by,
        };
      })
      .filter(Boolean) as ScheduledCustomEvent[];
  }, [customEvents, days, timeSlots]);
}
