import { create } from "zustand";

interface ISidebarProps {
  isSidebarRightOpen: boolean;
  isSidebarLeftOpen: boolean;
  setIsSidebarRightOpen: (isSidebarRightOpen: boolean) => void;
  setIsSidebarLeftOpen: (isSidebarLeftOpen: boolean) => void;
}

export const useSidebarStore = create<ISidebarProps>((set) => ({
  isSidebarRightOpen: false,
  isSidebarLeftOpen: false,
  setIsSidebarRightOpen: (isSidebarRightOpen: boolean) => set({ isSidebarRightOpen }),
  setIsSidebarLeftOpen: (isSidebarLeftOpen: boolean) => set({ isSidebarLeftOpen }),
}));
