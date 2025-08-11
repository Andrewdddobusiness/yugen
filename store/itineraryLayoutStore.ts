import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface ItineraryLayoutState {
  // View settings
  currentView: 'calendar' | 'table' | 'list';
  timeRange: 'day' | 'week';
  showMap: boolean;
  
  // Sidebar settings
  sidebarCollapsed: boolean;
  sidebarActiveTab: 'wishlist' | 'search' | 'suggestions';
  
  // Filters and search
  searchQuery: string;
  activeFilters: string[];
  
  // Layout preferences
  layoutPreferences: {
    sidebarWidth: number;
    mapPanelSize: number;
    showHeader: boolean;
    showToolbar: boolean;
  };

  // Actions
  setCurrentView: (view: 'calendar' | 'table' | 'list') => void;
  setTimeRange: (range: 'day' | 'week') => void;
  setShowMap: (show: boolean) => void;
  toggleMap: () => void;
  
  setSidebarCollapsed: (collapsed: boolean) => void;
  toggleSidebar: () => void;
  setSidebarActiveTab: (tab: 'wishlist' | 'search' | 'suggestions') => void;
  
  setSearchQuery: (query: string) => void;
  setActiveFilters: (filters: string[]) => void;
  addFilter: (filter: string) => void;
  removeFilter: (filter: string) => void;
  clearFilters: () => void;
  
  updateLayoutPreferences: (preferences: Partial<ItineraryLayoutState['layoutPreferences']>) => void;
  resetLayout: () => void;
}

const defaultLayoutPreferences = {
  sidebarWidth: 320,
  mapPanelSize: 40,
  showHeader: true,
  showToolbar: true,
};

export const useItineraryLayoutStore = create<ItineraryLayoutState>()(
  persist(
    (set, get) => ({
      // Initial state
      currentView: 'table',
      timeRange: 'day',
      showMap: false,
      sidebarCollapsed: false,
      sidebarActiveTab: 'wishlist',
      searchQuery: '',
      activeFilters: [],
      layoutPreferences: defaultLayoutPreferences,

      // View actions
      setCurrentView: (view) => set({ currentView: view }),
      setTimeRange: (range) => set({ timeRange: range }),
      setShowMap: (show) => set({ showMap: show }),
      toggleMap: () => set((state) => ({ showMap: !state.showMap })),

      // Sidebar actions
      setSidebarCollapsed: (collapsed) => set({ sidebarCollapsed: collapsed }),
      toggleSidebar: () => set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),
      setSidebarActiveTab: (tab) => set({ sidebarActiveTab: tab }),

      // Filter and search actions
      setSearchQuery: (query) => set({ searchQuery: query }),
      setActiveFilters: (filters) => set({ activeFilters: filters }),
      addFilter: (filter) => {
        const current = get().activeFilters;
        if (!current.includes(filter)) {
          set({ activeFilters: [...current, filter] });
        }
      },
      removeFilter: (filter) => {
        set((state) => ({
          activeFilters: state.activeFilters.filter(f => f !== filter)
        }));
      },
      clearFilters: () => set({ activeFilters: [] }),

      // Layout preference actions
      updateLayoutPreferences: (preferences) => {
        set((state) => ({
          layoutPreferences: { ...state.layoutPreferences, ...preferences }
        }));
      },
      resetLayout: () => {
        set({
          currentView: 'table',
          timeRange: 'day',
          showMap: false,
          sidebarCollapsed: false,
          sidebarActiveTab: 'wishlist',
          searchQuery: '',
          activeFilters: [],
          layoutPreferences: defaultLayoutPreferences,
        });
      },
    }),
    {
      name: 'itinerary-layout-storage',
      partialize: (state) => ({
        // Only persist user preferences, not temporary state
        currentView: state.currentView,
        sidebarCollapsed: state.sidebarCollapsed,
        sidebarActiveTab: state.sidebarActiveTab,
        layoutPreferences: state.layoutPreferences,
      }),
    }
  )
);