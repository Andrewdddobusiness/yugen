import { create } from "zustand";

interface IActivityTabStore {
  selectedTab: "top-places" | "search" | "history";
  setSelectedTab: (tab: "top-places" | "search" | "history") => void;
}

export const useActivityTabStore = create<IActivityTabStore>((set) => ({
  selectedTab: "top-places",
  setSelectedTab: (tab) => set({ selectedTab: tab }),
}));
