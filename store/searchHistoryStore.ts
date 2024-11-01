// store/searchHistoryStore.ts
import { create } from "zustand";

export interface ISearchHistoryItem {
  placeId: string;
  mainText: string;
  secondaryText: string;
  types: string[];
}

interface ISearchHistoryStore {
  history: ISearchHistoryItem[];
  selectedSearchQuery: string;
  addToHistory: (item: ISearchHistoryItem) => void;
  setSelectedSearchQuery: (query: string) => void;
}

export const useSearchHistoryStore = create<ISearchHistoryStore>((set) => ({
  history: [],
  selectedSearchQuery: "",
  addToHistory: (item) => set((state) => ({ history: [item, ...state.history.slice(0, 9)] })),
  setSelectedSearchQuery: (query) => set({ selectedSearchQuery: query }),
}));
