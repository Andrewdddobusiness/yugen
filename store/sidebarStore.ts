import { create } from "zustand";

interface ISidebarProps {
  isSidebarOpen: boolean;
  sidebarKey: number;
  setIsSidebarOpen: (isSidebarOpen: boolean) => void;
  getIsSidebarOpen: () => boolean;
  setSidebarKey: (key: number) => void;
}

export const useSidebarStore = create<ISidebarProps>((set, get) => ({
  isSidebarOpen: false,
  sidebarKey: 0,
  setIsSidebarOpen: (isSidebarOpen: boolean) => set({ isSidebarOpen }),
  getIsSidebarOpen: () => get().isSidebarOpen,
  setSidebarKey: (key: number) => set({ sidebarKey: key + 1 }),
}));
