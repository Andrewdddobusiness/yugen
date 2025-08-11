import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface ItineraryLayoutState {
  // View settings
  currentView: 'calendar' | 'table' | 'list';
  timeRange: 'day' | 'week';
  showMap: boolean;
  
  // Enhanced view management
  viewHistory: Array<'calendar' | 'table' | 'list'>;
  defaultView: 'calendar' | 'table' | 'list';
  viewPreferences: {
    [K in 'calendar' | 'table' | 'list']: {
      lastUsed: Date | null;
      usageCount: number;
      userRating: number; // 1-5 stars
    };
  };
  isTransitioningView: boolean;
  transitionDuration: number;
  
  // View-specific state preservation
  viewStates: {
    list: {
      scrollPosition: number;
      expandedDays: string[];
      lastScrollTarget?: string;
    };
    calendar: {
      selectedDate: string | null;
      viewMode: 'day' | '3-day' | 'week';
      scrollPosition: number;
    };
    table: {
      expandedCards: string[];
      sortColumn?: string;
      sortDirection?: 'asc' | 'desc';
      scrollPosition: number;
    };
  };
  
  // Context tracking for recommendations
  contextData: {
    activityCount: number;
    hasScheduledActivities: boolean;
    timeSpanDays: number;
    lastActivity: Date | null;
    userBehavior: {
      prefersDragDrop: boolean;
      prefersDetailView: boolean;
      usesMobile: boolean;
    };
  };
  
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
    enableAnimations: boolean;
    compactMode: boolean;
  };

  // Actions
  setCurrentView: (view: 'calendar' | 'table' | 'list') => void;
  setViewWithTransition: (view: 'calendar' | 'table' | 'list') => Promise<void>;
  setTimeRange: (range: 'day' | 'week') => void;
  setShowMap: (show: boolean) => void;
  toggleMap: () => void;
  
  // Enhanced view management actions
  setDefaultView: (view: 'calendar' | 'table' | 'list') => void;
  addToViewHistory: (view: 'calendar' | 'table' | 'list') => void;
  clearViewHistory: () => void;
  rateView: (view: 'calendar' | 'table' | 'list', rating: number) => void;
  updateContextData: (data: Partial<ItineraryLayoutState['contextData']>) => void;
  getViewRecommendation: () => 'calendar' | 'table' | 'list' | null;
  
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
  
  // View state preservation actions
  saveViewState: <T extends keyof ItineraryLayoutState['viewStates']>(
    view: T, 
    state: Partial<ItineraryLayoutState['viewStates'][T]>
  ) => void;
  getViewState: <T extends keyof ItineraryLayoutState['viewStates']>(
    view: T
  ) => ItineraryLayoutState['viewStates'][T];
  clearViewState: (view: keyof ItineraryLayoutState['viewStates']) => void;
  clearAllViewStates: () => void;
}

const defaultLayoutPreferences = {
  sidebarWidth: 320,
  mapPanelSize: 40,
  showHeader: true,
  showToolbar: true,
  enableAnimations: true,
  compactMode: false,
};

const defaultViewPreferences = {
  calendar: { lastUsed: null, usageCount: 0, userRating: 3 },
  table: { lastUsed: null, usageCount: 0, userRating: 3 },
  list: { lastUsed: null, usageCount: 0, userRating: 3 },
};

const defaultContextData = {
  activityCount: 0,
  hasScheduledActivities: false,
  timeSpanDays: 1,
  lastActivity: null,
  userBehavior: {
    prefersDragDrop: false,
    prefersDetailView: false,
    usesMobile: false,
  },
};

const defaultViewStates = {
  list: {
    scrollPosition: 0,
    expandedDays: [],
    lastScrollTarget: undefined,
  },
  calendar: {
    selectedDate: null,
    viewMode: 'week' as const,
    scrollPosition: 0,
  },
  table: {
    expandedCards: [],
    sortColumn: undefined,
    sortDirection: undefined,
    scrollPosition: 0,
  },
};

export const useItineraryLayoutStore = create<ItineraryLayoutState>()(
  persist(
    (set, get) => ({
      // Initial state
      currentView: 'table',
      timeRange: 'day',
      showMap: false,
      viewHistory: [],
      defaultView: 'table',
      viewPreferences: defaultViewPreferences,
      isTransitioningView: false,
      transitionDuration: 300,
      viewStates: defaultViewStates,
      contextData: defaultContextData,
      sidebarCollapsed: false,
      sidebarActiveTab: 'wishlist',
      searchQuery: '',
      activeFilters: [],
      layoutPreferences: defaultLayoutPreferences,

      // View actions
      setCurrentView: (view) => {
        const state = get();
        if (view !== state.currentView) {
          // Update view preferences
          const updatedPreferences = {
            ...state.viewPreferences,
            [view]: {
              ...state.viewPreferences[view],
              lastUsed: new Date(),
              usageCount: state.viewPreferences[view].usageCount + 1,
            },
          };
          
          set({ 
            currentView: view,
            viewPreferences: updatedPreferences
          });
          
          // Add to history
          get().addToViewHistory(view);
        }
      },
      
      setViewWithTransition: async (view) => {
        const state = get();
        if (view === state.currentView || state.isTransitioningView) return;
        
        set({ isTransitioningView: true });
        
        // Artificial delay for smooth transition
        await new Promise(resolve => setTimeout(resolve, state.transitionDuration));
        
        state.setCurrentView(view);
        set({ isTransitioningView: false });
      },
      
      setTimeRange: (range) => set({ timeRange: range }),
      setShowMap: (show) => set({ showMap: show }),
      toggleMap: () => set((state) => ({ showMap: !state.showMap })),

      // Enhanced view management actions
      setDefaultView: (view) => set({ defaultView: view }),
      
      addToViewHistory: (view) => {
        const state = get();
        const newHistory = [view, ...state.viewHistory.filter(v => v !== view)].slice(0, 10);
        set({ viewHistory: newHistory });
      },
      
      clearViewHistory: () => set({ viewHistory: [] }),
      
      rateView: (view, rating) => {
        const state = get();
        const updatedPreferences = {
          ...state.viewPreferences,
          [view]: {
            ...state.viewPreferences[view],
            userRating: Math.max(1, Math.min(5, rating)),
          },
        };
        set({ viewPreferences: updatedPreferences });
      },
      
      updateContextData: (data) => {
        const state = get();
        set({ 
          contextData: { ...state.contextData, ...data }
        });
      },
      
      getViewRecommendation: () => {
        const state = get();
        const { contextData, currentView, viewPreferences } = state;
        
        // Smart recommendations based on context
        if (contextData.activityCount > 10 && contextData.hasScheduledActivities) {
          return currentView !== 'calendar' ? 'calendar' : null;
        }
        
        if (contextData.userBehavior.usesMobile && currentView !== 'list') {
          return 'list';
        }
        
        if (contextData.userBehavior.prefersDetailView && contextData.activityCount > 5 && currentView !== 'table') {
          return 'table';
        }
        
        // Recommend based on highest rated view that's not current
        const sortedViews = (['calendar', 'table', 'list'] as const)
          .filter(view => view !== currentView)
          .sort((a, b) => viewPreferences[b].userRating - viewPreferences[a].userRating);
        
        return sortedViews[0] || null;
      },

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
          viewHistory: [],
          defaultView: 'table',
          viewPreferences: defaultViewPreferences,
          isTransitioningView: false,
          viewStates: defaultViewStates,
          contextData: defaultContextData,
          sidebarCollapsed: false,
          sidebarActiveTab: 'wishlist',
          searchQuery: '',
          activeFilters: [],
          layoutPreferences: defaultLayoutPreferences,
        });
      },

      // View state preservation actions
      saveViewState: (view, state) => {
        set((currentState) => ({
          viewStates: {
            ...currentState.viewStates,
            [view]: {
              ...currentState.viewStates[view],
              ...state,
            },
          },
        }));
      },

      getViewState: (view) => {
        const state = get();
        return state.viewStates[view];
      },

      clearViewState: (view) => {
        set((currentState) => ({
          viewStates: {
            ...currentState.viewStates,
            [view]: defaultViewStates[view],
          },
        }));
      },

      clearAllViewStates: () => {
        set({
          viewStates: defaultViewStates,
        });
      },
    }),
    {
      name: 'itinerary-layout-storage',
      partialize: (state) => ({
        // Only persist user preferences, not temporary state
        currentView: state.currentView,
        viewHistory: state.viewHistory,
        defaultView: state.defaultView,
        viewPreferences: state.viewPreferences,
        transitionDuration: state.transitionDuration,
        viewStates: state.viewStates,
        sidebarCollapsed: state.sidebarCollapsed,
        sidebarActiveTab: state.sidebarActiveTab,
        layoutPreferences: state.layoutPreferences,
        contextData: {
          ...state.contextData,
          // Don't persist timestamps
          lastActivity: null,
        },
      }),
    }
  )
);