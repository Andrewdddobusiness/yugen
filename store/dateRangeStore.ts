import { create } from "zustand";

interface DateRangeState {
  startDate: Date | null;
  endDate: Date | null;
  setDateRange: (start: Date | null, end: Date | null) => void;
}

export const useDateRangeStore = create<DateRangeState>((set) => ({
  startDate: null,
  endDate: null,
  setDateRange: (start, end) => set({ startDate: start, endDate: end }),
}));
