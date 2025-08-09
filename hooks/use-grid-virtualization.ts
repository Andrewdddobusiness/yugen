import { useState, useEffect, useMemo, useCallback } from 'react';

interface VirtualizationOptions {
  totalItems: number;
  itemHeight: number;
  containerHeight: number;
  overscan?: number;
}

interface VirtualizedItem {
  index: number;
  offset: number;
  height: number;
}

/**
 * Hook for virtualizing large calendar grids
 */
export function useGridVirtualization({
  totalItems,
  itemHeight,
  containerHeight,
  overscan = 5
}: VirtualizationOptions) {
  const [scrollTop, setScrollTop] = useState(0);
  
  const visibleItems = useMemo(() => {
    const visibleStart = Math.floor(scrollTop / itemHeight);
    const visibleEnd = Math.min(
      totalItems - 1,
      Math.ceil((scrollTop + containerHeight) / itemHeight)
    );
    
    const start = Math.max(0, visibleStart - overscan);
    const end = Math.min(totalItems - 1, visibleEnd + overscan);
    
    const items: VirtualizedItem[] = [];
    for (let i = start; i <= end; i++) {
      items.push({
        index: i,
        offset: i * itemHeight,
        height: itemHeight
      });
    }
    
    return items;
  }, [scrollTop, totalItems, itemHeight, containerHeight, overscan]);

  const totalHeight = totalItems * itemHeight;
  
  const handleScroll = useCallback((event: React.UIEvent<HTMLElement>) => {
    setScrollTop(event.currentTarget.scrollTop);
  }, []);

  return {
    visibleItems,
    totalHeight,
    handleScroll,
    scrollTop
  };
}

/**
 * Hook for virtualizing time slots in calendar
 */
export function useTimeSlotVirtualization({
  timeSlots,
  slotHeight,
  containerHeight,
  overscan = 5
}: {
  timeSlots: Array<{ time: string; hour: number; minute: number }>;
  slotHeight: number;
  containerHeight: number;
  overscan?: number;
}) {
  const [scrollTop, setScrollTop] = useState(0);
  
  const visibleSlots = useMemo(() => {
    const totalSlots = timeSlots.length;
    const visibleStart = Math.floor(scrollTop / slotHeight);
    const visibleEnd = Math.min(
      totalSlots - 1,
      Math.ceil((scrollTop + containerHeight) / slotHeight)
    );
    
    const start = Math.max(0, visibleStart - overscan);
    const end = Math.min(totalSlots - 1, visibleEnd + overscan);
    
    return {
      startIndex: start,
      endIndex: end,
      offsetY: start * slotHeight,
      visibleSlots: timeSlots.slice(start, end + 1).map((slot, index) => ({
        ...slot,
        index: start + index,
        offset: (start + index) * slotHeight
      }))
    };
  }, [timeSlots, scrollTop, slotHeight, containerHeight, overscan]);

  const totalHeight = timeSlots.length * slotHeight;
  
  const handleScroll = useCallback((event: React.UIEvent<HTMLElement>) => {
    setScrollTop(event.currentTarget.scrollTop);
  }, []);

  const scrollToTime = useCallback((timeString: string) => {
    const slotIndex = timeSlots.findIndex(slot => slot.time === timeString);
    if (slotIndex !== -1) {
      setScrollTop(slotIndex * slotHeight);
    }
  }, [timeSlots, slotHeight]);

  const scrollToCurrentTime = useCallback(() => {
    const now = new Date();
    const currentTimeString = `${now.getHours().toString().padStart(2, '0')}:${Math.floor(now.getMinutes() / 30) * 30}`;
    scrollToTime(currentTimeString);
  }, [scrollToTime]);

  return {
    visibleSlots,
    totalHeight,
    handleScroll,
    scrollTop,
    scrollToTime,
    scrollToCurrentTime
  };
}

/**
 * Hook for managing smooth scrolling animations
 */
export function useSmoothScroll() {
  const [isScrolling, setIsScrolling] = useState(false);
  
  const smoothScrollTo = useCallback((
    element: HTMLElement,
    targetScrollTop: number,
    duration: number = 300
  ) => {
    if (!element || isScrolling) return;
    
    setIsScrolling(true);
    const start = element.scrollTop;
    const distance = targetScrollTop - start;
    const startTime = performance.now();
    
    const animateScroll = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      // Easing function (ease-out)
      const easeOut = 1 - Math.pow(1 - progress, 3);
      
      element.scrollTop = start + distance * easeOut;
      
      if (progress < 1) {
        requestAnimationFrame(animateScroll);
      } else {
        setIsScrolling(false);
      }
    };
    
    requestAnimationFrame(animateScroll);
  }, [isScrolling]);

  return {
    isScrolling,
    smoothScrollTo
  };
}

/**
 * Hook for detecting scroll direction and velocity
 */
export function useScrollDetection() {
  const [scrollState, setScrollState] = useState({
    scrollTop: 0,
    direction: 'none' as 'up' | 'down' | 'none',
    velocity: 0,
    isScrolling: false
  });

  const handleScroll = useCallback((event: React.UIEvent<HTMLElement>) => {
    const scrollTop = event.currentTarget.scrollTop;
    
    setScrollState(prev => {
      const direction = scrollTop > prev.scrollTop ? 'down' : 
                      scrollTop < prev.scrollTop ? 'up' : 'none';
      const velocity = Math.abs(scrollTop - prev.scrollTop);
      
      return {
        scrollTop,
        direction,
        velocity,
        isScrolling: true
      };
    });

    // Debounce scrolling state
    const timeoutId = setTimeout(() => {
      setScrollState(prev => ({ ...prev, isScrolling: false, velocity: 0 }));
    }, 150);

    return () => clearTimeout(timeoutId);
  }, []);

  return {
    ...scrollState,
    handleScroll
  };
}

/**
 * Hook for managing grid scroll position restoration
 */
export function useScrollRestoration(key: string) {
  const [scrollTop, setScrollTop] = useState(0);
  
  // Save scroll position
  const saveScrollPosition = useCallback((scrollTop: number) => {
    localStorage.setItem(`grid-scroll-${key}`, scrollTop.toString());
    setScrollTop(scrollTop);
  }, [key]);
  
  // Restore scroll position
  const restoreScrollPosition = useCallback((element: HTMLElement) => {
    const savedScrollTop = localStorage.getItem(`grid-scroll-${key}`);
    if (savedScrollTop && element) {
      const scrollTop = parseInt(savedScrollTop, 10);
      element.scrollTop = scrollTop;
      setScrollTop(scrollTop);
    }
  }, [key]);
  
  // Clear saved position
  const clearScrollPosition = useCallback(() => {
    localStorage.removeItem(`grid-scroll-${key}`);
    setScrollTop(0);
  }, [key]);
  
  return {
    scrollTop,
    saveScrollPosition,
    restoreScrollPosition,
    clearScrollPosition
  };
}