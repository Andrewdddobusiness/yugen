"use client";

import { useEffect, useCallback, useMemo, useRef } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
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

export function useViewRouter(options: UseViewRouterOptions = {}) {
  const {
    enableUrlSync = true,
    paramName = 'view',
    dateParamName = 'date',
    defaultView = 'table',
    onDateChange
  } = options;

  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();
  
  const { 
    currentView, 
    setCurrentView,
    setViewWithTransition,
    defaultView: storeDefaultView 
  } = useItineraryLayoutStore();

  // Get view from URL or use default
  const urlView = searchParams.get(paramName) as ViewMode | null;
  const urlDate = searchParams.get(dateParamName);
  const validViews: ViewMode[] = ['calendar', 'table', 'list'];
  const isValidView = (view: string | null): view is ViewMode => 
    view !== null && validViews.includes(view as ViewMode);

  const onDateChangeRef = useRef<UseViewRouterOptions['onDateChange']>(onDateChange);
  useEffect(() => {
    onDateChangeRef.current = onDateChange;
  }, [onDateChange]);

  const lastNotifiedDateParamRef = useRef<string | null>(null);
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

  // Parse date from URL
  const parseUrlDate = useCallback((dateStr: string | null): Date | null => {
    if (!dateStr) return null;
    
    try {
      const date = parseISO(dateStr);
      return isValid(date) ? date : null;
    } catch {
      return null;
    }
  }, []);

  const parsedUrlDate = useMemo(() => parseUrlDate(urlDate), [parseUrlDate, urlDate]);

  // Sync URL with store on mount
  useEffect(() => {
    if (!enableUrlSync) return;

    // If the URL doesn't specify a view, keep whatever the store has (persisted)
    // instead of forcing the "default" view on every refresh.
    const targetView = isValidView(urlView) ? urlView : currentView;
    
    if (targetView !== currentView) {
      setCurrentView(targetView);
    }

    // Handle date parameter
    const nextDateParam = urlDate ?? null;
    if (nextDateParam !== lastNotifiedDateParamRef.current) {
      lastNotifiedDateParamRef.current = nextDateParam;
      const targetDate = parseUrlDate(nextDateParam);
      debugLog('sync-date', { urlDate: nextDateParam, targetDate });
      onDateChangeRef.current?.(targetDate);
    }
  }, [
    urlView,
    urlDate,
    currentView,
    setCurrentView,
    enableUrlSync,
    parseUrlDate,
    debugLog,
  ]);

  // Update URL when view or date changes
  const updateUrl = useCallback((view?: ViewMode, date?: Date | null, replace = true) => {
    if (!enableUrlSync) return;

    const params = new URLSearchParams(searchParams.toString());
    
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
        lastNotifiedDateParamRef.current = null;
      } else {
        const dateStr = format(date, 'yyyy-MM-dd');
        params.set(dateParamName, dateStr);
        lastNotifiedDateParamRef.current = dateStr;
      }
    }

    const newUrl = `${pathname}${params.toString() ? `?${params.toString()}` : ''}`;
    
    // Use replace or push based on parameter
    if (replace) {
      router.replace(newUrl, { scroll: false });
    } else {
      router.push(newUrl, { scroll: false });
    }
  }, [router, pathname, searchParams, paramName, dateParamName, storeDefaultView, defaultView, enableUrlSync]);

  // Enhanced view change with URL sync and error handling
  const changeView = useCallback(async (view: ViewMode, date?: Date | null) => {
    if (view === currentView && date === undefined) {
      return;
    }
    
    try {
      // Update URL first for immediate feedback
      updateUrl(view, date);
      
      // Then update store with transition
      if (view !== currentView) {
        await setViewWithTransition(view);
      }
      
      // Notify date change if provided
      if (date !== undefined && onDateChange) {
        onDateChange(date);
      }
    } catch (error) {
      console.error('Failed to change view:', error);
      // Revert URL if transition failed
      updateUrl(currentView, undefined);
      throw error;
    }
  }, [currentView, updateUrl, setViewWithTransition, onDateChange]);

  // Quick view change without transition but with error handling
  const changeViewInstant = useCallback((view: ViewMode, date?: Date | null) => {
    if (view === currentView && date === undefined) return;
    
    try {
      updateUrl(view, date);
      
      if (view !== currentView) {
        setCurrentView(view);
      }
      
      if (date !== undefined && onDateChange) {
        onDateChange(date);
      }
    } catch (error) {
      console.error('Failed to change view instantly:', error);
      throw error;
    }
  }, [currentView, updateUrl, setCurrentView, onDateChange]);

  // Navigate to specific date in current view with error handling
  const navigateToDate = useCallback((date: Date | null, pushHistory = false) => {
    try {
      debugLog('navigate-to-date', { date, pushHistory });
      updateUrl(undefined, date, !pushHistory);
      
      if (onDateChange) {
        onDateChange(date);
      }
    } catch (error) {
      console.error('Failed to navigate to date:', error);
      throw error;
    }
  }, [updateUrl, onDateChange, debugLog]);

  // Generate shareable URL for specific view and/or date
  const getShareableUrl = useCallback((view?: ViewMode, date?: Date | null) => {
    const params = new URLSearchParams(searchParams.toString());
    
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
  }, [pathname, searchParams, paramName, dateParamName, storeDefaultView, defaultView]);

  // Navigate to specific view with optional query params
  const navigateToView = useCallback((view: ViewMode, additionalParams?: Record<string, string>) => {
    const params = new URLSearchParams(searchParams.toString());
    
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
    router.push(newUrl);
  }, [router, pathname, searchParams, paramName, storeDefaultView, defaultView]);

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
    currentDate: parsedUrlDate,
    changeView,
    changeViewInstant,
    navigateToDate,
    getShareableUrl,
    getDeepLinkUrl,
    navigateToView,
    isValidView,
    urlView: isValidView(urlView) ? urlView : null,
    urlDate: parsedUrlDate,
  };
}
