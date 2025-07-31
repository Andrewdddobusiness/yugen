import { create } from "zustand";

interface IActivityTabStore {
  selectedTab: "top-places" | "search" | "area-search" | "history";
  setSelectedTab: (tab: "top-places" | "search" | "area-search" | "history") => void;
}

export const useActivityTabStore = create<IActivityTabStore>((set) => ({
  selectedTab: "top-places",
  setSelectedTab: (tab) => set({ selectedTab: tab }),
}));
