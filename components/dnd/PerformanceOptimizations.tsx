"use client";

import React, { 
  useCallback, 
  useMemo, 
  useRef, 
  useEffect, 
  useState,
  memo
} from 'react';
// @ts-ignore
import { debounce, throttle } from 'lodash';
import { useDragContext } from '@/components/provider/dnd/DragProvider';

/**
 * Performance monitoring and optimization utilities for drag-and-drop operations
 */

// Performance metrics interface
interface PerformanceMetrics {
  dragStartTime: number;
  dragEndTime: number;
  totalDragDuration: number;
  updateCount: number;
  averageUpdateTime: number;
  maxUpdateTime: number;
  validationTime: number;
  renderTime: number;
  memoryUsage?: number;
}

// Performance monitor hook
export function useDragPerformanceMonitor() {
  const [metrics, setMetrics] = useState<PerformanceMetrics | null>(null);
  const updateTimes = useRef<number[]>([]);
  const startTime = useRef<number>(0);
  const updateCount = useRef<number>(0);

  const startMonitoring = useCallback(() => {
    startTime.current = performance.now();
    updateTimes.current = [];
    updateCount.current = 0;
  }, []);

  const recordUpdate = useCallback(() => {
    const updateTime = performance.now();
    updateTimes.current.push(updateTime);
    updateCount.current++;
  }, []);

  const endMonitoring = useCallback(() => {
    const endTime = performance.now();
    const totalDuration = endTime - startTime.current;
    
    const updateTimeDiffs = updateTimes.current.slice(1).map((time, index) => 
      time - updateTimes.current[index]
    );

    const averageUpdateTime = updateTimeDiffs.length > 0 
      ? updateTimeDiffs.reduce((sum, time) => sum + time, 0) / updateTimeDiffs.length 
      : 0;

    const maxUpdateTime = updateTimeDiffs.length > 0 
      ? Math.max(...updateTimeDiffs) 
      : 0;

    const performanceMetrics: PerformanceMetrics = {
      dragStartTime: startTime.current,
      dragEndTime: endTime,
      totalDragDuration: totalDuration,
      updateCount: updateCount.current,
      averageUpdateTime,
      maxUpdateTime,
      validationTime: 0, // Would be set by validation functions
      renderTime: 0, // Would be set by render functions
      memoryUsage: (performance as any).memory?.usedJSHeapSize || undefined
    };

    setMetrics(performanceMetrics);
    
    // Log performance warnings
    if (totalDuration > 5000) {
      console.warn('Long drag operation detected:', totalDuration + 'ms');
    }
    
    if (maxUpdateTime > 16.67) { // 60fps threshold
      console.warn('Slow drag updates detected:', maxUpdateTime + 'ms');
    }

    return performanceMetrics;
  }, []);

  const resetMetrics = useCallback(() => {
    setMetrics(null);
  }, []);

  return {
    metrics,
    startMonitoring,
    recordUpdate,
    endMonitoring,
    resetMetrics
  };
}

/**
 * Optimized drag preview component using RAF and memoization
 */
export const OptimizedDragPreview = memo(function OptimizedDragPreview({
  item,
  position,
  isVisible
}: {
  item: any;
  position: { x: number; y: number };
  isVisible: boolean;
}) {
  const elementRef = useRef<HTMLDivElement>(null);
  const animationFrameRef = useRef<number>();
  const lastPosition = useRef(position);

  // Throttled position updates using RAF
  const updatePosition = useCallback(() => {
    if (elementRef.current && 
        (position.x !== lastPosition.current.x || position.y !== lastPosition.current.y)) {
      
      elementRef.current.style.transform = `translate3d(${position.x}px, ${position.y}px, 0)`;
      lastPosition.current = position;
    }
  }, [position.x, position.y]);

  useEffect(() => {
    if (isVisible) {
      const animate = () => {
        updatePosition();
        animationFrameRef.current = requestAnimationFrame(animate);
      };
      animationFrameRef.current = requestAnimationFrame(animate);
    } else if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [isVisible, updatePosition]);

  if (!isVisible) return null;

  return (
    <div
      ref={elementRef}
      className="fixed pointer-events-none z-[9999] will-change-transform"
      style={{
        transform: `translate3d(${position.x}px, ${position.y}px, 0)`,
        contain: 'layout style paint'
      }}
    >
      <div className="bg-white border shadow-lg rounded-lg p-2 opacity-90">
        <div className="text-sm font-medium truncate max-w-[200px]">
          {item?.activity?.name || item?.name || 'Dragging...'}
        </div>
      </div>
    </div>
  );
});

/**
 * Virtualized drop zone grid for large calendars
 */
export function VirtualizedDropZoneGrid({
  startDate,
  endDate,
  timeSlotHeight = 30,
  containerHeight = 600,
  onCellRender
}: {
  startDate: Date;
  endDate: Date;
  timeSlotHeight?: number;
  containerHeight?: number;
  onCellRender?: (date: Date, timeSlot: string) => React.ReactNode;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [isScrolling, setIsScrolling] = useState(false);
  
  // Calculate visible range
  const visibleRange = useMemo(() => {
    const visibleSlots = Math.ceil(containerHeight / timeSlotHeight);
    const startIndex = Math.floor(scrollTop / timeSlotHeight);
    const endIndex = Math.min(startIndex + visibleSlots + 2, 48); // 24 hours * 2 (30min slots)
    
    return { startIndex, endIndex };
  }, [scrollTop, containerHeight, timeSlotHeight]);

  // Debounced scroll handler
  const handleScroll = useMemo(
    () => debounce((e: React.UIEvent<HTMLDivElement>) => {
      setScrollTop(e.currentTarget.scrollTop);
      setIsScrolling(false);
    }, 10),
    []
  );

  const handleScrollStart = useCallback(() => {
    setIsScrolling(true);
  }, []);

  // Generate visible cells
  const visibleCells = useMemo(() => {
    const cells = [];
    const { startIndex, endIndex } = visibleRange;
    
    for (let i = startIndex; i < endIndex; i++) {
      const hour = Math.floor(i / 2);
      const minute = (i % 2) * 30;
      const timeSlot = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
      
      cells.push({
        key: `slot-${i}`,
        timeSlot,
        hour,
        minute,
        top: i * timeSlotHeight
      });
    }
    
    return cells;
  }, [visibleRange, timeSlotHeight]);

  return (
    <div 
      ref={containerRef}
      className="relative overflow-auto"
      style={{ height: containerHeight }}
      onScroll={handleScroll}
      onScrollCapture={handleScrollStart}
    >
      {/* Total height spacer */}
      <div style={{ height: 48 * timeSlotHeight }}>
        {/* Visible cells */}
        {visibleCells.map(cell => (
          <div
            key={cell.key}
            className="absolute left-0 right-0 border-b border-gray-100"
            style={{
              top: cell.top,
              height: timeSlotHeight,
              transform: isScrolling ? 'translateZ(0)' : undefined
            }}
          >
            {onCellRender?.(startDate, cell.timeSlot)}
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * Throttled validation hook for drag operations
 */
export function useThrottledValidation(
  validationFn: (item: any, target: any) => boolean,
  delay = 100
) {
  const throttledValidation = useMemo(
    () => throttle(validationFn, delay, { 
      leading: true, 
      trailing: true 
    }),
    [validationFn, delay]
  );

  useEffect(() => {
    return () => {
      throttledValidation.cancel();
    };
  }, [throttledValidation]);

  return throttledValidation;
}

/**
 * Memory-efficient drag state manager
 */
export function useDragStateOptimization() {
  const dragContext = useDragContext();
  const stateSnapshotRef = useRef<any>(null);
  const cleanupTimeoutRef = useRef<NodeJS.Timeout>();

  // Create lightweight state snapshot
  const createSnapshot = useCallback(() => {
    stateSnapshotRef.current = {
      isDragging: dragContext.state.isDragging,
      activeDragId: dragContext.state.activeDrag?.id,
      validDropZones: Array.from(dragContext.state.validDropZones),
      timestamp: Date.now()
    };
  }, [dragContext.state]);

  // Clean up old references
  const scheduleCleanup = useCallback(() => {
    if (cleanupTimeoutRef.current) {
      clearTimeout(cleanupTimeoutRef.current);
    }
    
    cleanupTimeoutRef.current = setTimeout(() => {
      stateSnapshotRef.current = null;
    }, 5000); // Clean up after 5 seconds of inactivity
  }, []);

  useEffect(() => {
    if (dragContext.state.isDragging) {
      createSnapshot();
    } else {
      scheduleCleanup();
    }
  }, [dragContext.state.isDragging, createSnapshot, scheduleCleanup]);

  useEffect(() => {
    return () => {
      if (cleanupTimeoutRef.current) {
        clearTimeout(cleanupTimeoutRef.current);
      }
    };
  }, []);

  return stateSnapshotRef.current;
}

/**
 * Intersection observer for optimizing drop zone rendering
 */
export function useIntersectionOptimization(
  threshold = 0.1
) {
  const [visibleElements, setVisibleElements] = useState<Set<string>>(new Set());
  const observerRef = useRef<IntersectionObserver>();

  const observe = useCallback((element: HTMLElement, id: string) => {
    if (!observerRef.current) {
      observerRef.current = new IntersectionObserver(
        (entries) => {
          setVisibleElements(prev => {
            const newSet = new Set(prev);
            
            entries.forEach(entry => {
              const elementId = entry.target.getAttribute('data-element-id');
              if (elementId) {
                if (entry.isIntersecting) {
                  newSet.add(elementId);
                } else {
                  newSet.delete(elementId);
                }
              }
            });
            
            return newSet;
          });
        },
        { threshold }
      );
    }

    element.setAttribute('data-element-id', id);
    observerRef.current.observe(element);
  }, [threshold]);

  const unobserve = useCallback((element: HTMLElement) => {
    if (observerRef.current) {
      observerRef.current.unobserve(element);
    }
  }, []);

  useEffect(() => {
    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, []);

  return {
    visibleElements,
    observe,
    unobserve,
    isVisible: (id: string) => visibleElements.has(id)
  };
}

/**
 * Performance debugging component
 */
export function DragPerformanceDebugger({
  enabled = false,
  position = 'top-left'
}: {
  enabled?: boolean;
  position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
}) {
  const { metrics, startMonitoring, endMonitoring, resetMetrics } = useDragPerformanceMonitor();
  const dragContext = useDragContext();
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    if (!enabled) return;

    if (dragContext.state.isDragging && !metrics) {
      startMonitoring();
    } else if (!dragContext.state.isDragging && metrics) {
      endMonitoring();
    }
  }, [dragContext.state.isDragging, enabled, metrics, startMonitoring, endMonitoring]);

  if (!enabled || !metrics) return null;

  const positionClasses = {
    'top-left': 'fixed top-4 left-4',
    'top-right': 'fixed top-4 right-4',
    'bottom-left': 'fixed bottom-4 left-4',
    'bottom-right': 'fixed bottom-4 right-4'
  };

  return (
    <div className={`${positionClasses[position]} z-50 bg-black text-white p-2 rounded text-xs font-mono`}>
      <div 
        className="cursor-pointer mb-1"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        🔧 Performance {isExpanded ? '▼' : '▶'}
      </div>
      
      {isExpanded && (
        <div className="space-y-1 min-w-[200px]">
          <div>Duration: {metrics.totalDragDuration.toFixed(1)}ms</div>
          <div>Updates: {metrics.updateCount}</div>
          <div>Avg Update: {metrics.averageUpdateTime.toFixed(1)}ms</div>
          <div>Max Update: {metrics.maxUpdateTime.toFixed(1)}ms</div>
          {metrics.memoryUsage && (
            <div>Memory: {(metrics.memoryUsage / 1024 / 1024).toFixed(1)}MB</div>
          )}
          <button 
            onClick={resetMetrics}
            className="text-yellow-400 hover:text-yellow-300"
          >
            Reset
          </button>
        </div>
      )}
    </div>
  );
}

/**
 * Batch update hook for multiple drag operations
 */
export function useBatchDragUpdates() {
  const pendingUpdates = useRef<Array<() => void>>([]);
  const updateTimeoutRef = useRef<NodeJS.Timeout>();

  const batchUpdate = useCallback((updateFn: () => void) => {
    pendingUpdates.current.push(updateFn);

    if (updateTimeoutRef.current) {
      clearTimeout(updateTimeoutRef.current);
    }

    updateTimeoutRef.current = setTimeout(() => {
      // Process all pending updates in a single batch
      const updates = pendingUpdates.current;
      pendingUpdates.current = [];

      // Use React's batch update mechanism
      (React as any).unstable_batchedUpdates(() => {
        updates.forEach(update => update());
      });
    }, 0);
  }, []);

  useEffect(() => {
    return () => {
      if (updateTimeoutRef.current) {
        clearTimeout(updateTimeoutRef.current);
      }
    };
  }, []);

  return batchUpdate;
}