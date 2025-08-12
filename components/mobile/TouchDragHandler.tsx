"use client";

import React, { useRef, useState, useCallback, useEffect } from 'react';
import { cn } from '@/lib/utils';

interface TouchDragConfig {
  longPressDelay?: number;
  dragThreshold?: number;
  enableHaptics?: boolean;
  onDragStart?: (id: string, position: { x: number; y: number }) => void;
  onDragMove?: (id: string, position: { x: number; y: number }) => void;
  onDragEnd?: (id: string, dropTarget?: string) => void;
  onTap?: (id: string) => void;
  onLongPress?: (id: string) => void;
}

interface TouchDragState {
  isDragging: boolean;
  dragId: string | null;
  startPosition: { x: number; y: number } | null;
  currentPosition: { x: number; y: number } | null;
  offset: { x: number; y: number } | null;
}

const initialState: TouchDragState = {
  isDragging: false,
  dragId: null,
  startPosition: null,
  currentPosition: null,
  offset: null,
};

export function useTouchDrag(config: TouchDragConfig = {}) {
  const {
    longPressDelay = 500,
    dragThreshold = 10,
    enableHaptics = true,
    onDragStart,
    onDragMove,
    onDragEnd,
    onTap,
    onLongPress,
  } = config;

  const [state, setState] = useState<TouchDragState>(initialState);
  const longPressTimer = useRef<NodeJS.Timeout | null>(null);
  const dragPreviewRef = useRef<HTMLElement | null>(null);

  const triggerHaptic = useCallback((intensity: 'light' | 'medium' | 'heavy' = 'medium') => {
    if (!enableHaptics || !('vibrate' in navigator)) return;
    
    const patterns = {
      light: [10],
      medium: [50],
      heavy: [100, 50, 100]
    };
    
    navigator.vibrate(patterns[intensity]);
  }, [enableHaptics]);

  const clearLongPressTimer = useCallback(() => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  }, []);

  const getEventPosition = useCallback((event: TouchEvent | MouseEvent) => {
    if ('touches' in event) {
      const touch = event.touches[0] || event.changedTouches[0];
      return { x: touch.clientX, y: touch.clientY };
    }
    return { x: event.clientX, y: event.clientY };
  }, []);

  const startDrag = useCallback((id: string, position: { x: number; y: number }) => {
    setState(prev => ({
      ...prev,
      isDragging: true,
      dragId: id,
      startPosition: position,
      currentPosition: position,
      offset: { x: 0, y: 0 },
    }));
    
    triggerHaptic('medium');
    onDragStart?.(id, position);
  }, [onDragStart, triggerHaptic]);

  const moveDrag = useCallback((position: { x: number; y: number }) => {
    setState(prev => {
      if (!prev.isDragging || !prev.startPosition) return prev;
      
      const offset = {
        x: position.x - prev.startPosition.x,
        y: position.y - prev.startPosition.y,
      };
      
      const newState = {
        ...prev,
        currentPosition: position,
        offset,
      };
      
      onDragMove?.(prev.dragId!, position);
      return newState;
    });
  }, [onDragMove]);

  const endDrag = useCallback((dropTarget?: string) => {
    const { dragId } = state;
    
    setState(initialState);
    clearLongPressTimer();
    
    if (dragId) {
      triggerHaptic('light');
      onDragEnd?.(dragId, dropTarget);
    }
  }, [state, clearLongPressTimer, triggerHaptic, onDragEnd]);

  const handleTouchStart = useCallback((event: TouchEvent, id: string) => {
    event.preventDefault();
    
    const position = getEventPosition(event);
    
    // Start long press timer
    longPressTimer.current = setTimeout(() => {
      if (!state.isDragging) {
        startDrag(id, position);
        onLongPress?.(id);
      }
    }, longPressDelay);
    
    setState(prev => ({
      ...prev,
      startPosition: position,
    }));
  }, [getEventPosition, longPressDelay, startDrag, onLongPress, state.isDragging]);

  const handleTouchMove = useCallback((event: TouchEvent) => {
    event.preventDefault();
    
    const position = getEventPosition(event);
    
    if (state.isDragging) {
      moveDrag(position);
    } else if (state.startPosition) {
      // Check if we've moved enough to cancel long press
      const distance = Math.sqrt(
        Math.pow(position.x - state.startPosition.x, 2) +
        Math.pow(position.y - state.startPosition.y, 2)
      );
      
      if (distance > dragThreshold) {
        clearLongPressTimer();
      }
    }
  }, [state.isDragging, state.startPosition, moveDrag, dragThreshold, clearLongPressTimer, getEventPosition]);

  const handleTouchEnd = useCallback((event: TouchEvent, id?: string) => {
    event.preventDefault();
    
    clearLongPressTimer();
    
    if (state.isDragging) {
      // Find drop target
      const touch = event.changedTouches[0];
      const elementBelow = document.elementFromPoint(touch.clientX, touch.clientY);
      const dropTarget = elementBelow?.closest('[data-drop-target]')?.getAttribute('data-drop-target');
      
      endDrag(dropTarget || undefined);
    } else if (id && state.startPosition) {
      // This was a tap
      onTap?.(id);
    }
    
    setState(prev => ({
      ...prev,
      startPosition: null,
    }));
  }, [state.isDragging, state.startPosition, clearLongPressTimer, endDrag, onTap]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      clearLongPressTimer();
    };
  }, [clearLongPressTimer]);

  const getDragHandleProps = useCallback((id: string) => ({
    onTouchStart: (event: TouchEvent) => handleTouchStart(event, id),
    onTouchMove: handleTouchMove,
    onTouchEnd: (event: TouchEvent) => handleTouchEnd(event, id),
    style: {
      touchAction: 'none',
      userSelect: 'none' as const,
      WebkitUserSelect: 'none' as const,
      WebkitTouchCallout: 'none' as const,
    },
  }), [handleTouchStart, handleTouchMove, handleTouchEnd]);

  const getDraggableProps = useCallback((id: string) => ({
    ...getDragHandleProps(id),
    'data-draggable-id': id,
  }), [getDragHandleProps]);

  return {
    state,
    getDragHandleProps,
    getDraggableProps,
    endDrag,
  };
}

interface TouchDraggableProps {
  id: string;
  children: React.ReactNode;
  config?: TouchDragConfig;
  className?: string;
  dragHandleSelector?: string;
}

export function TouchDraggable({ 
  id, 
  children, 
  config = {}, 
  className,
  dragHandleSelector 
}: TouchDraggableProps) {
  const { state, getDraggableProps } = useTouchDrag(config);
  const isDragging = state.isDragging && state.dragId === id;

  return (
    <div
      {...(dragHandleSelector ? {} : getDraggableProps(id))}
      className={cn(
        "relative transition-transform",
        isDragging && "z-50 scale-105 opacity-80 rotate-1",
        className
      )}
      style={{
        transform: isDragging && state.offset 
          ? `translate(${state.offset.x}px, ${state.offset.y}px)` 
          : undefined,
      }}
    >
      {children}
    </div>
  );
}

interface DropZoneProps {
  id: string;
  children: React.ReactNode;
  onDrop?: (draggedId: string) => void;
  className?: string;
  activeClassName?: string;
}

export function TouchDropZone({ 
  id, 
  children, 
  onDrop,
  className,
  activeClassName 
}: DropZoneProps) {
  const [isActive, setIsActive] = useState(false);

  useEffect(() => {
    const handleDragEnter = () => setIsActive(true);
    const handleDragLeave = () => setIsActive(false);
    const handleDrop = () => setIsActive(false);

    // These would be triggered by the drag system
    // For now, this is a placeholder for the drop zone visual feedback
    
    return () => {
      // Cleanup
    };
  }, []);

  return (
    <div
      data-drop-target={id}
      className={cn(
        "transition-colors",
        className,
        isActive && activeClassName
      )}
      onDrop={(event) => {
        event.preventDefault();
        const draggedId = event.dataTransfer?.getData('text/plain');
        if (draggedId) {
          onDrop?.(draggedId);
        }
      }}
      onDragOver={(event) => event.preventDefault()}
    >
      {children}
    </div>
  );
}

// Hook for detecting if touch device
export function useIsTouchDevice() {
  const [isTouch, setIsTouch] = useState(false);

  useEffect(() => {
    const checkTouch = () => {
      setIsTouch('ontouchstart' in window || navigator.maxTouchPoints > 0);
    };
    
    checkTouch();
    
    // Some devices might not have touch initially but could connect later
    window.addEventListener('touchstart', checkTouch, { once: true });
    
    return () => {
      window.removeEventListener('touchstart', checkTouch);
    };
  }, []);

  return isTouch;
}