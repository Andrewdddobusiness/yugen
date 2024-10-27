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
  addToHistory: (item: ISearchHistoryItem) => void;
}

export const useSearchHistoryStore = create<ISearchHistoryStore>((set) => ({
  history: [],
  addToHistory: (item) => set((state) => ({ history: [item, ...state.history.slice(0, 9)] })),
}));
