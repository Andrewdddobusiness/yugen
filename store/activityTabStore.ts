import { create } from "zustand";

interface IActivityTabStore {
  selectedTab: string;
  setSelectedTab: (tab: string) => void;
}

export const useActivityTabStore = create<IActivityTabStore>((set) => ({
  selectedTab: "top-places",
  setSelectedTab: (tab) => set({ selectedTab: tab }),
}));
