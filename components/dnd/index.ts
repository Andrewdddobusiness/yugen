// Drag and Drop System - Complete Implementation
// This module provides a comprehensive drag-and-drop system for the calendar application

// Core Provider and Context
export { 
  DragProvider, 
  useDragContext, 
  useDragState, 
  useDragOperations, 
  useDragValidation 
} from './DragProvider';

export type { 
  DraggedItem, 
  DropValidation, 
  DragOperation, 
  DragPreferences 
} from './DragProvider';

// Visual Components
export { DragPreview, SnapPreview, DragGhost } from './DragPreview';

export { 
  DraggableWishlistItem, 
  useWishlistItemDrag, 
  createWishlistDragData 
} from './DraggableWishlistItem';

// Drop Zone Components
export { 
  DropZoneIndicator,
  SnapPreview as DropZoneSnapPreview,
  DropZoneOverlay,
  DragGhost as DropZoneDragGhost,
  SuggestedTimesIndicator,
  ConflictIndicator
} from './DropZoneIndicators';

// Validation System
export { 
  DropValidationFeedback, 
  DropValidator 
} from './DropValidation';

// Keyboard Accessibility
export { 
  KeyboardDragHandler, 
  useKeyboardDrag, 
  KeyboardDragInstructions 
} from './KeyboardDragHandler';

// Undo/Redo System
export { 
  UndoRedoControls, 
  CompactUndoRedoControls 
} from './UndoRedoControls';

// Error Handling
export { 
  DragErrorHandler, 
  useDragErrorHandler, 
  DragErrorBoundary, 
  OfflineDragQueue, 
  EdgeCaseValidator 
} from './ErrorHandling';

export type { 
  DragErrorType, 
  DragError 
} from './ErrorHandling';

// Performance Optimizations
export { 
  OptimizedDragPreview,
  VirtualizedDropZoneGrid,
  useThrottledValidation,
  useDragStateOptimization,
  useIntersectionOptimization,
  DragPerformanceDebugger,
  useBatchDragUpdates,
  useDragPerformanceMonitor
} from './PerformanceOptimizations';

// Utility Functions and Helpers
export const DragUtilities = {
  // Time formatting utilities
  formatTime: (timeString: string): string => {
    const [hours, minutes] = timeString.split(':').map(Number);
    const displayHour = hours > 12 ? hours - 12 : hours === 0 ? 12 : hours;
    const period = hours >= 12 ? 'PM' : 'AM';
    
    if (minutes === 0) {
      return `${displayHour} ${period}`;
    }
    return `${displayHour}:${minutes.toString().padStart(2, '0')} ${period}`;
  },

  // Duration formatting
  formatDuration: (minutes: number): string => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    
    if (hours > 0) {
      return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
    }
    return `${mins}m`;
  },

  // Generate unique drag IDs
  generateDragId: (type: string, itemId: string): string => {
    return `${type}-${itemId}-${Date.now()}`;
  },

  // Validate drop zone ID format
  parseDropZoneId: (zoneId: string): { date: string; timeSlot: string } | null => {
    const parts = zoneId.split('-');
    if (parts.length >= 4) {
      const date = `${parts[0]}-${parts[1]}-${parts[2]}`;
      const timeSlot = parts.slice(3).join('-');
      return { date, timeSlot };
    }
    return null;
  },

  // Calculate drag distance
  calculateDragDistance: (
    start: { x: number; y: number },
    end: { x: number; y: number }
  ): number => {
    return Math.sqrt(Math.pow(end.x - start.x, 2) + Math.pow(end.y - start.y, 2));
  },

  // Check if point is within bounds
  isPointInBounds: (
    point: { x: number; y: number },
    bounds: { x: number; y: number; width: number; height: number }
  ): boolean => {
    return point.x >= bounds.x &&
           point.x <= bounds.x + bounds.width &&
           point.y >= bounds.y &&
           point.y <= bounds.y + bounds.height;
  }
};

// Configuration Constants
export const DRAG_CONFIG = {
  // Default drag thresholds
  DRAG_THRESHOLD: 8,
  LONG_PRESS_DELAY: 300,
  AUTO_SCROLL_THRESHOLD: 50,
  AUTO_SCROLL_SPEED: 5,

  // Animation durations
  SNAP_ANIMATION_DURATION: 200,
  PREVIEW_FADE_DURATION: 150,
  DROP_ANIMATION_DURATION: 300,

  // Validation timeouts
  VALIDATION_DEBOUNCE_DELAY: 100,
  CONFLICT_CHECK_DELAY: 50,

  // Performance limits
  MAX_HISTORY_SIZE: 50,
  VIRTUALIZATION_THRESHOLD: 100,
  PERFORMANCE_WARNING_THRESHOLD: 16.67, // 60fps

  // Z-index layers
  Z_INDEX: {
    DROP_ZONES: 5,
    DRAG_PREVIEW: 9999,
    KEYBOARD_MODAL: 50,
    ERROR_MESSAGES: 40,
    PERFORMANCE_DEBUGGER: 50
  }
};

// Hook combinations for common use cases
export const useDragAndDrop = () => {
  const dragContext = useDragContext();
  const errorHandler = useDragErrorHandler();
  const performanceMonitor = useDragPerformanceMonitor();
  
  return {
    // Core drag state
    ...dragContext,
    
    // Error handling
    ...errorHandler,
    
    // Performance monitoring
    ...performanceMonitor,
    
    // Combined utilities
    startDragWithMonitoring: (item: any) => {
      performanceMonitor.startMonitoring();
      dragContext.startDrag(item);
    },
    
    endDragWithCleanup: (success: boolean, operation?: any) => {
      dragContext.endDrag(success, operation);
      performanceMonitor.endMonitoring();
    }
  };
};

// Version info
export const DRAG_SYSTEM_VERSION = '1.0.0';
export const DRAG_SYSTEM_BUILD_DATE = new Date().toISOString();

// Development helpers
export const DragDevTools = {
  // Log drag state for debugging
  logDragState: (state: any) => {
    console.group('Drag State Debug');
    console.log('isDragging:', state.isDragging);
    console.log('activeDrag:', state.activeDrag);
    console.log('validDropZones:', Array.from(state.validDropZones || []));
    console.log('dropValidation:', state.dropValidation);
    console.groupEnd();
  },

  // Simulate drag events for testing
  simulateDragEvent: (type: 'start' | 'move' | 'end', data?: any) => {
    console.log(`Simulating drag ${type}:`, data);
  },

  // Performance analysis
  analyzeDragPerformance: (metrics: any) => {
    const warnings = [];
    
    if (metrics.totalDragDuration > 5000) {
      warnings.push('Long drag duration detected');
    }
    
    if (metrics.maxUpdateTime > 16.67) {
      warnings.push('Slow updates detected (may cause frame drops)');
    }
    
    if (metrics.updateCount > 100) {
      warnings.push('High update frequency (consider throttling)');
    }
    
    return {
      score: warnings.length === 0 ? 'Good' : warnings.length === 1 ? 'Fair' : 'Poor',
      warnings,
      recommendations: warnings.map(warning => {
        switch (warning) {
          case 'Long drag duration detected':
            return 'Consider adding progress indicators for long operations';
          case 'Slow updates detected (may cause frame drops)':
            return 'Optimize drag update logic or use throttling';
          case 'High update frequency (consider throttling)':
            return 'Implement update throttling or use RAF';
          default:
            return 'Review drag implementation';
        }
      })
    };
  }
};