import { create } from "zustand";

interface IActivityTabStore {
  selectedTab: "area-search" | "history" | "top-places" | "search";
  setSelectedTab: (tab: "area-search" | "history" | "top-places" | "search") => void;
}

export const useActivityTabStore = create<IActivityTabStore>((set) => ({
  selectedTab: "area-search",
  setSelectedTab: (tab) => set({ selectedTab: tab }),
}));
