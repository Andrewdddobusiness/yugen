"use client";

import { useEffect, useCallback, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import { useItineraryLayoutStore } from '@/store/itineraryLayoutStore';
import { format, isValid, parseISO } from 'date-fns';

export type ViewMode = 'calendar' | 'table' | 'list';

interface UseViewRouterOptions {
  enableUrlSync?: boolean;
  paramName?: string;
  defaultView?: ViewMode;
  dateParamName?: string;
  onDateChange?: (date: Date | null) => void;
}

const validViews: ViewMode[] = ['calendar', 'table', 'list'];
const isValidView = (view: string | null): view is ViewMode =>
  view !== null && validViews.includes(view as ViewMode);

const parseUrlDate = (dateStr: string | null): Date | null => {
  if (!dateStr) return null;
  try {
    const date = parseISO(dateStr);
    return isValid(date) ? date : null;
  } catch {
    return null;
  }
};

export function useViewRouter(options: UseViewRouterOptions = {}) {
  const {
    enableUrlSync = true,
    paramName = 'view',
    dateParamName = 'date',
    defaultView = 'table',
    onDateChange,
  } = options;

  const pathname = usePathname();
  
  const { 
    currentView, 
    setCurrentView,
    setViewWithTransition,
    defaultView: storeDefaultView 
  } = useItineraryLayoutStore();

  const currentViewRef = useRef(currentView);
  useEffect(() => {
    currentViewRef.current = currentView;
  }, [currentView]);

  const onDateChangeRef = useRef<UseViewRouterOptions['onDateChange']>(onDateChange);
  useEffect(() => {
    onDateChangeRef.current = onDateChange;
  }, [onDateChange]);

  const [currentDate, setCurrentDate] = useState<Date | null>(null);
  const lastNotifiedDateKeyRef = useRef<string | null>(null);
  const debugEnabledRef = useRef(false);
  useEffect(() => {
    if (process.env.NODE_ENV !== 'development') return;
    if (typeof window === 'undefined') return;
    debugEnabledRef.current =
      window.localStorage.getItem('debug:view-router') === '1';
  }, []);

  const debugLog = useCallback((...args: unknown[]) => {
    if (!debugEnabledRef.current) return;
    // eslint-disable-next-line no-console
    console.log('[useViewRouter]', ...args);
  }, []);

  const notifyDateIfChanged = useCallback((date: Date | null) => {
    const key = date ? format(date, 'yyyy-MM-dd') : null;
    if (key === lastNotifiedDateKeyRef.current) return;
    lastNotifiedDateKeyRef.current = key;
    onDateChangeRef.current?.(date);
  }, []);

  const setCurrentDateIfChanged = useCallback((date: Date | null) => {
    setCurrentDate((prev) => {
      const prevTime = prev?.getTime() ?? null;
      const nextTime = date?.getTime() ?? null;
      return prevTime === nextTime ? prev : date;
    });
    notifyDateIfChanged(date);
  }, [notifyDateIfChanged]);

  // Sync URL with store on mount and on back/forward (popstate).
  // We intentionally avoid Next.js router.replace here because changing only search params
  // triggers an RSC navigation (POST "flight" request), which makes view switching feel slow.
  useEffect(() => {
    if (!enableUrlSync) return;
    if (typeof window === 'undefined') return;

    const syncFromUrl = () => {
      const params = new URLSearchParams(window.location.search);
      const urlView = params.get(paramName);
      const urlDate = params.get(dateParamName);

      const storeView = currentViewRef.current;
      const targetView = isValidView(urlView) ? urlView : storeView;
      if (targetView !== storeView) {
        debugLog('sync-view', { urlView, storeView, targetView });
        setCurrentView(targetView);
      }

      const parsed = parseUrlDate(urlDate);
      debugLog('sync-date', { urlDate, parsed });
      setCurrentDateIfChanged(parsed);
    };

    syncFromUrl();
    window.addEventListener('popstate', syncFromUrl);
    return () => window.removeEventListener('popstate', syncFromUrl);
  }, [enableUrlSync, paramName, dateParamName, debugLog, setCurrentView, setCurrentDateIfChanged]);

  // Update URL when view or date changes
  const updateUrl = useCallback((view?: ViewMode, date?: Date | null, replace = true) => {
    if (!enableUrlSync) return;
    if (typeof window === 'undefined') return;

    const params = new URLSearchParams(window.location.search);
    
    // Handle view parameter
    if (view !== undefined) {
      if (view === (storeDefaultView || defaultView)) {
        params.delete(paramName);
      } else {
        params.set(paramName, view);
      }
    }

    // Handle date parameter
    if (date !== undefined) {
      if (date === null) {
        params.delete(dateParamName);
      } else {
        const dateStr = format(date, 'yyyy-MM-dd');
        params.set(dateParamName, dateStr);
      }
    }

    const newUrl = `${pathname}${params.toString() ? `?${params.toString()}` : ''}`;
    
    // Use history API to avoid triggering an RSC navigation.
    // IMPORTANT: preserve Next.js App Router's internal history state.
    const writeHistory = () => {
      const state: any = window.history.state;
      const hasNextState = !!(state && (state.__NA || state._N));
      if (!hasNextState) return false;

      if (replace) {
        window.history.replaceState(state, '', newUrl);
      } else {
        window.history.pushState(state, '', newUrl);
      }

      return true;
    };

    // If this runs before Next patches history (possible on very slow devices),
    // avoid clobbering the internal state; retry once on the next tick.
    if (!writeHistory()) {
      setTimeout(() => {
        writeHistory();
      }, 0);
    }
  }, [pathname, paramName, dateParamName, storeDefaultView, defaultView, enableUrlSync]);

  // Enhanced view change with URL sync and error handling
  const changeView = useCallback(async (view: ViewMode, date?: Date | null) => {
    if (view === currentView && date === undefined) {
      return;
    }
    
    try {
      // Update store first for immediate UI response.
      if (view !== currentView) {
        await setViewWithTransition(view);
      }
      
      if (date !== undefined) {
        setCurrentDateIfChanged(date);
      }

      updateUrl(view, date);
    } catch (error) {
      console.error('Failed to change view:', error);
      throw error;
    }
  }, [currentView, updateUrl, setViewWithTransition, setCurrentDateIfChanged]);

  // Quick view change without transition but with error handling
  const changeViewInstant = useCallback((view: ViewMode, date?: Date | null) => {
    if (view === currentView && date === undefined) return;
    
    try {
      if (view !== currentView) {
        setCurrentView(view);
      }
      
      if (date !== undefined) {
        setCurrentDateIfChanged(date);
      }

      updateUrl(view, date);
    } catch (error) {
      console.error('Failed to change view instantly:', error);
      throw error;
    }
  }, [currentView, updateUrl, setCurrentView, setCurrentDateIfChanged]);

  // Navigate to specific date in current view with error handling
  const navigateToDate = useCallback((date: Date | null, pushHistory = false) => {
    try {
      debugLog('navigate-to-date', { date, pushHistory });
      setCurrentDateIfChanged(date);
      updateUrl(undefined, date, !pushHistory);
    } catch (error) {
      console.error('Failed to navigate to date:', error);
      throw error;
    }
  }, [updateUrl, debugLog, setCurrentDateIfChanged]);

  // Generate shareable URL for specific view and/or date
  const getShareableUrl = useCallback((view?: ViewMode, date?: Date | null) => {
    const params =
      typeof window !== 'undefined'
        ? new URLSearchParams(window.location.search)
        : new URLSearchParams();
    
    // Handle view parameter
    if (view !== undefined) {
      if (view === (storeDefaultView || defaultView)) {
        params.delete(paramName);
      } else {
        params.set(paramName, view);
      }
    }

    // Handle date parameter
    if (date !== undefined) {
      if (date === null) {
        params.delete(dateParamName);
      } else {
        params.set(dateParamName, format(date, 'yyyy-MM-dd'));
      }
    }

    const baseUrl = typeof window !== 'undefined' 
      ? `${window.location.origin}${pathname}` 
      : pathname;
      
    return `${baseUrl}${params.toString() ? `?${params.toString()}` : ''}`;
  }, [pathname, paramName, dateParamName, storeDefaultView, defaultView]);

  // Navigate to specific view with optional query params
  const navigateToView = useCallback((view: ViewMode, additionalParams?: Record<string, string>) => {
    const params =
      typeof window !== 'undefined'
        ? new URLSearchParams(window.location.search)
        : new URLSearchParams();
    
    // Add view param
    if (view === (storeDefaultView || defaultView)) {
      params.delete(paramName);
    } else {
      params.set(paramName, view);
    }

    // Add additional params
    if (additionalParams) {
      Object.entries(additionalParams).forEach(([key, value]) => {
        if (value) {
          params.set(key, value);
        } else {
          params.delete(key);
        }
      });
    }

    const newUrl = `${pathname}${params.toString() ? `?${params.toString()}` : ''}`;
    if (typeof window === 'undefined') return;

    // Preserve Next.js App Router internal state; avoid dispatching a synthetic popstate
    // event (Next also listens to it and can enter a bad state).
    const state: any = window.history.state;
    const hasNextState = !!(state && (state.__NA || state._N));
    if (!hasNextState) return;
    window.history.pushState(state, '', newUrl);
  }, [pathname, paramName, storeDefaultView, defaultView]);

  // Generate deep link URL patterns
  const getDeepLinkUrl = useCallback((view: ViewMode, date: Date) => {
    const baseUrl = typeof window !== 'undefined' 
      ? `${window.location.origin}${pathname}` 
      : pathname;
    
    const dateStr = format(date, 'yyyy-MM-dd');
    const params = new URLSearchParams();
    
    if (view !== (storeDefaultView || defaultView)) {
      params.set(paramName, view);
    }
    params.set(dateParamName, dateStr);
    
    return `${baseUrl}?${params.toString()}`;
  }, [pathname, paramName, dateParamName, storeDefaultView, defaultView]);

  return {
    currentView,
    currentDate,
    changeView,
    changeViewInstant,
    navigateToDate,
    getShareableUrl,
    getDeepLinkUrl,
    navigateToView,
    isValidView,
    urlView: null,
    urlDate: currentDate,
  };
}
