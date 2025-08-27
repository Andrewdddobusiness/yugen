import { create } from "zustand";

interface SidebarStore {
  isSidebarLeftOpen: boolean;
  isSidebarRightOpen: boolean;
  setIsSidebarLeftOpen: (open: boolean) => void;
  setIsSidebarRightOpen: (open: boolean) => void;
  openLeftSidebar: () => void;
  openRightSidebar: () => void;
  closeLeftSidebar: () => void;
  closeRightSidebar: () => void;
}

export const useSidebarStore = create<SidebarStore>((set) => ({
  isSidebarLeftOpen: false,
  isSidebarRightOpen: false,
  setIsSidebarLeftOpen: (open) => set({ isSidebarLeftOpen: open }),
  setIsSidebarRightOpen: (open) => set({ isSidebarRightOpen: open }),
  openLeftSidebar: () => set({ isSidebarLeftOpen: true }),
  openRightSidebar: () => set({ isSidebarRightOpen: true }),
  closeLeftSidebar: () => set({ isSidebarLeftOpen: false }),
  closeRightSidebar: () => set({ isSidebarRightOpen: false }),
}));
