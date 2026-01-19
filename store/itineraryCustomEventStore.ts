"use client";

import { create } from "zustand";
import type { ItineraryCustomEventKind } from "@/lib/customEvents/kinds";

export type ItineraryCustomEvent = {
  itinerary_custom_event_id: number;
  itinerary_id: number;
  itinerary_destination_id: number | null;
  kind?: ItineraryCustomEventKind | null;
  title: string;
  notes: string | null;
  date: string | null;
  start_time: string | null;
  end_time: string | null;
  color_hex: string | null;
  created_by: string | null;
  updated_by: string | null;
  created_at?: string;
  updated_at?: string;
  deleted_at: string | null;
};

type ItineraryCustomEventState = {
  customEvents: ItineraryCustomEvent[];
  setCustomEvents: (events: ItineraryCustomEvent[]) => void;
  upsertCustomEvent: (event: ItineraryCustomEvent) => void;
  updateCustomEvent: (eventId: number, patch: Partial<ItineraryCustomEvent>) => void;
  removeCustomEvent: (eventId: number) => void;
  getCustomEventById: (eventId: number | string) => ItineraryCustomEvent | null;
};

export const useItineraryCustomEventStore = create<ItineraryCustomEventState>((set, get) => ({
  customEvents: [],
  setCustomEvents: (events) => set({ customEvents: events }),
  upsertCustomEvent: (event) =>
    set((state) => {
      const next = [...state.customEvents];
      const id = Number(event.itinerary_custom_event_id);
      const idx = next.findIndex((row) => Number(row.itinerary_custom_event_id) === id);
      if (idx >= 0) {
        next[idx] = { ...next[idx], ...event };
      } else {
        next.push(event);
      }
      return { customEvents: next };
    }),
  updateCustomEvent: (eventId, patch) =>
    set((state) => ({
      customEvents: state.customEvents.map((row) =>
        Number(row.itinerary_custom_event_id) === Number(eventId) ? { ...row, ...patch } : row
      ),
    })),
  removeCustomEvent: (eventId) =>
    set((state) => ({
      customEvents: state.customEvents.filter(
        (row) => Number(row.itinerary_custom_event_id) !== Number(eventId)
      ),
    })),
  getCustomEventById: (eventId) => {
    const id = Number(eventId);
    if (!Number.isFinite(id)) return null;
    return get().customEvents.find((row) => Number(row.itinerary_custom_event_id) === id) ?? null;
  },
}));
