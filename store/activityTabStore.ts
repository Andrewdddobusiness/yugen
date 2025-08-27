import { create } from "zustand";

interface IActivityTabStore {
  selectedTab: "area-search" | "history";
  setSelectedTab: (tab: "area-search" | "history") => void;
}

export const useActivityTabStore = create<IActivityTabStore>((set) => ({
  selectedTab: "area-search",
  setSelectedTab: (tab) => set({ selectedTab: tab }),
}));
