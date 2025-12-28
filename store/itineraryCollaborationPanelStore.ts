import { create } from "zustand";

export type CollaborationTab = "collaborators" | "history";

interface ItineraryCollaborationPanelState {
  isOpen: boolean;
  tab: CollaborationTab;
  open: (tab?: CollaborationTab) => void;
  close: () => void;
  toggle: () => void;
  setTab: (tab: CollaborationTab) => void;
}

export const useItineraryCollaborationPanelStore = create<ItineraryCollaborationPanelState>((set) => ({
  isOpen: false,
  tab: "collaborators",
  open: (tab) => set({ isOpen: true, tab: tab ?? "collaborators" }),
  close: () => set({ isOpen: false }),
  toggle: () => set((state) => ({ isOpen: !state.isOpen })),
  setTab: (tab) => set({ tab }),
}));

