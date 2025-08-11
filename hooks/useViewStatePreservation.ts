import { useCallback, useRef, useEffect } from 'react';
import { useItineraryLayoutStore } from '@/store/itineraryLayoutStore';

type ViewType = 'calendar' | 'table' | 'list';

interface ViewStatePreservationOptions {
  onViewEnter?: (view: ViewType) => void;
  onViewExit?: (view: ViewType) => void;
  enableAutoSave?: boolean;
  debounceMs?: number;
}

export function useViewStatePreservation(options: ViewStatePreservationOptions = {}) {
  const { 
    onViewEnter, 
    onViewExit, 
    enableAutoSave = true, 
    debounceMs = 250 
  } = options;

  const { currentView, saveViewState, getViewState } = useItineraryLayoutStore();
  const previousViewRef = useRef<ViewType | null>(null);
  const saveTimeoutRef = useRef<NodeJS.Timeout>();

  // Handle view transitions with error handling
  useEffect(() => {
    try {
      const previousView = previousViewRef.current;
      
      if (previousView && previousView !== currentView) {
        // Exiting previous view
        onViewExit?.(previousView);
      }
      
      if (currentView) {
        // Entering new view
        onViewEnter?.(currentView);
      }
      
      previousViewRef.current = currentView;
    } catch (error) {
      console.error('Error during view transition:', error);
    }
  }, [currentView, onViewEnter, onViewExit]);

  // Debounced save function with error handling
  const debouncedSave = useCallback((view: ViewType, state: any) => {
    if (!enableAutoSave) return;
    
    try {
      clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = setTimeout(() => {
        try {
          saveViewState(view, state);
        } catch (error) {
          console.error('Error saving view state:', error);
        }
      }, debounceMs);
    } catch (error) {
      console.error('Error setting up debounced save:', error);
    }
  }, [enableAutoSave, debounceMs, saveViewState]);

  // Immediate save function with error handling
  const saveState = useCallback((view: ViewType, state: any) => {
    try {
      clearTimeout(saveTimeoutRef.current);
      saveViewState(view, state);
    } catch (error) {
      console.error('Error saving view state immediately:', error);
    }
  }, [saveViewState]);

  // Get current view state with error handling
  const getCurrentViewState = useCallback((view: ViewType) => {
    try {
      return getViewState(view);
    } catch (error) {
      console.error('Error getting view state:', error);
      return {};
    }
  }, [getViewState]);

  // Save scroll position helper with error handling
  const saveScrollPosition = useCallback((element: HTMLElement, view?: ViewType) => {
    try {
      const targetView = view || currentView;
      if (targetView && element && typeof element.scrollTop === 'number') {
        debouncedSave(targetView, { scrollPosition: element.scrollTop });
      }
    } catch (error) {
      console.error('Error saving scroll position:', error);
    }
  }, [currentView, debouncedSave]);

  // Restore scroll position helper with error handling
  const restoreScrollPosition = useCallback((element: HTMLElement, view?: ViewType, delay = 100) => {
    try {
      const targetView = view || currentView;
      if (targetView && element) {
        const viewState = getViewState(targetView);
        if (viewState?.scrollPosition > 0) {
          setTimeout(() => {
            try {
              if (element && typeof element.scrollTop !== 'undefined') {
                element.scrollTop = viewState.scrollPosition;
              }
            } catch (scrollError) {
              console.error('Error restoring scroll position:', scrollError);
            }
          }, delay);
        }
      }
    } catch (error) {
      console.error('Error setting up scroll position restoration:', error);
    }
  }, [currentView, getViewState]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      clearTimeout(saveTimeoutRef.current);
    };
  }, []);

  return {
    currentView,
    saveState,
    debouncedSave,
    getCurrentViewState,
    saveScrollPosition,
    restoreScrollPosition,
  };
}