import { create } from "zustand";

export interface IItinerarySlot {
  itinerary_slot_id: string;
  itinerary_id: string;
  itinerary_destination_id: string;
  date: string;
  start_time: string;
  end_time: string;
  primary_itinerary_activity_id: string | null;
  created_by?: string | null;
  updated_by?: string | null;
  created_at?: string;
  updated_at?: string;
  deleted_at?: string | null;
}

export interface IItinerarySlotOption {
  itinerary_slot_option_id: string;
  itinerary_slot_id: string;
  itinerary_activity_id: string;
  created_by?: string | null;
  created_at?: string;
}

interface ItinerarySlotStoreState {
  slots: IItinerarySlot[];
  slotOptions: IItinerarySlotOption[];

  setSlots: (slots: IItinerarySlot[]) => void;
  setSlotOptions: (options: IItinerarySlotOption[]) => void;

  upsertSlot: (slot: IItinerarySlot) => void;
  upsertSlotOptions: (options: IItinerarySlotOption[]) => void;
  removeSlots: (slotIds: string[]) => void;

  getSlotIdForActivity: (itineraryActivityId: string) => string | null;
  getActivityIdsForSlot: (slotId: string) => string[];
  getSlotById: (slotId: string) => IItinerarySlot | null;
  getPrimaryActivityIdForSlot: (slotId: string) => string | null;
  isPrimaryForActivity: (itineraryActivityId: string) => boolean;
}

const normalizeId = (value: unknown) => String(value ?? "").trim();

export const useItinerarySlotStore = create<ItinerarySlotStoreState>((set, get) => ({
  slots: [],
  slotOptions: [],

  setSlots: (slots) =>
    set({
      slots: Array.isArray(slots)
        ? slots.map((slot) => ({
            ...slot,
            itinerary_slot_id: normalizeId(slot.itinerary_slot_id),
            itinerary_id: normalizeId(slot.itinerary_id),
            itinerary_destination_id: normalizeId(slot.itinerary_destination_id),
            primary_itinerary_activity_id:
              slot.primary_itinerary_activity_id != null
                ? normalizeId(slot.primary_itinerary_activity_id)
                : null,
          }))
        : [],
    }),

  setSlotOptions: (options) =>
    set({
      slotOptions: Array.isArray(options)
        ? options.map((option) => ({
            ...option,
            itinerary_slot_option_id: normalizeId(option.itinerary_slot_option_id),
            itinerary_slot_id: normalizeId(option.itinerary_slot_id),
            itinerary_activity_id: normalizeId(option.itinerary_activity_id),
          }))
        : [],
    }),

  upsertSlot: (slot) =>
    set((state) => {
      const slotId = normalizeId(slot.itinerary_slot_id);
      const existingIndex = state.slots.findIndex((s) => normalizeId(s.itinerary_slot_id) === slotId);
      const next = {
        ...slot,
        itinerary_slot_id: slotId,
        itinerary_id: normalizeId(slot.itinerary_id),
        itinerary_destination_id: normalizeId(slot.itinerary_destination_id),
        primary_itinerary_activity_id:
          slot.primary_itinerary_activity_id != null ? normalizeId(slot.primary_itinerary_activity_id) : null,
      };

      if (existingIndex === -1) return { slots: [...state.slots, next] };

      const slots = [...state.slots];
      slots[existingIndex] = { ...slots[existingIndex], ...next };
      return { slots };
    }),

  upsertSlotOptions: (options) =>
    set((state) => {
      if (!Array.isArray(options) || options.length === 0) return {};

      const byId = new Map<string, IItinerarySlotOption>();
      for (const existing of state.slotOptions) {
        byId.set(normalizeId(existing.itinerary_slot_option_id), existing);
      }

      for (const option of options) {
        const optionId = normalizeId(option.itinerary_slot_option_id);
        byId.set(optionId, {
          ...byId.get(optionId),
          ...option,
          itinerary_slot_option_id: optionId,
          itinerary_slot_id: normalizeId(option.itinerary_slot_id),
          itinerary_activity_id: normalizeId(option.itinerary_activity_id),
        } as IItinerarySlotOption);
      }

      return { slotOptions: Array.from(byId.values()) };
    }),

  removeSlots: (slotIds) =>
    set((state) => {
      const ids = new Set((slotIds ?? []).map((id) => normalizeId(id)).filter(Boolean));
      if (ids.size === 0) return {};

      return {
        slots: state.slots.filter((slot) => !ids.has(normalizeId(slot.itinerary_slot_id))),
        slotOptions: state.slotOptions.filter((option) => !ids.has(normalizeId(option.itinerary_slot_id))),
      };
    }),

  getSlotIdForActivity: (itineraryActivityId) => {
    const activityId = normalizeId(itineraryActivityId);
    if (!activityId) return null;

    const option = get().slotOptions.find(
      (o) => normalizeId(o.itinerary_activity_id) === activityId
    );
    return option ? normalizeId(option.itinerary_slot_id) : null;
  },

  getActivityIdsForSlot: (slotId) => {
    const id = normalizeId(slotId);
    if (!id) return [];

    return get()
      .slotOptions.filter((o) => normalizeId(o.itinerary_slot_id) === id)
      .map((o) => normalizeId(o.itinerary_activity_id))
      .filter(Boolean);
  },

  getSlotById: (slotId) => {
    const id = normalizeId(slotId);
    if (!id) return null;
    return get().slots.find((s) => normalizeId(s.itinerary_slot_id) === id) ?? null;
  },

  getPrimaryActivityIdForSlot: (slotId) => {
    const id = normalizeId(slotId);
    if (!id) return null;

    const slot = get().getSlotById(id);
    const primary = slot?.primary_itinerary_activity_id ? normalizeId(slot.primary_itinerary_activity_id) : "";
    if (primary) return primary;

    const optionIds = get().getActivityIdsForSlot(id);
    if (optionIds.length === 0) return null;
    return optionIds
      .slice()
      .sort((a, b) => Number(a) - Number(b))
      .find(Boolean) ?? null;
  },

  isPrimaryForActivity: (itineraryActivityId) => {
    const activityId = normalizeId(itineraryActivityId);
    if (!activityId) return true;

    const slotId = get().getSlotIdForActivity(activityId);
    if (!slotId) return true;

    const optionIds = get().getActivityIdsForSlot(slotId);
    if (optionIds.length <= 1) return true;

    const primary = get().getPrimaryActivityIdForSlot(slotId);
    if (!primary) return true;
    return primary === activityId;
  },
}));
