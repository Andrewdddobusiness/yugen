"use client";

import React, { useRef, useCallback, useEffect, useState } from 'react';
import { cn } from '@/lib/utils';

export type SwipeDirection = 'left' | 'right' | 'up' | 'down';

interface SwipeConfig {
  threshold?: number;
  velocity?: number;
  preventScroll?: boolean;
  enableHaptics?: boolean;
  onSwipe?: (direction: SwipeDirection) => void;
  onSwipeStart?: (direction: SwipeDirection) => void;
  onSwipeEnd?: () => void;
}

interface SwipeState {
  isActive: boolean;
  direction: SwipeDirection | null;
  progress: number; // 0 to 1
  distance: number;
}

const initialSwipeState: SwipeState = {
  isActive: false,
  direction: null,
  progress: 0,
  distance: 0,
};

export function useSwipeGesture(config: SwipeConfig = {}) {
  const {
    threshold = 50,
    velocity = 0.3,
    preventScroll = false,
    enableHaptics = true,
    onSwipe,
    onSwipeStart,
    onSwipeEnd,
  } = config;

  const [state, setState] = useState<SwipeState>(initialSwipeState);
  const startPoint = useRef<{ x: number; y: number } | null>(null);
  const startTime = useRef<number>(0);

  const triggerHaptic = useCallback((intensity: 'light' | 'medium' | 'heavy' = 'light') => {
    if (!enableHaptics || !('vibrate' in navigator)) return;
    
    const patterns = {
      light: [10],
      medium: [25],
      heavy: [50]
    };
    
    navigator.vibrate(patterns[intensity]);
  }, [enableHaptics]);

  const getSwipeDirection = useCallback((deltaX: number, deltaY: number): SwipeDirection | null => {
    const absX = Math.abs(deltaX);
    const absY = Math.abs(deltaY);
    
    // Determine if horizontal or vertical swipe
    if (absX > absY) {
      // Horizontal swipe
      return deltaX > 0 ? 'right' : 'left';
    } else {
      // Vertical swipe
      return deltaY > 0 ? 'down' : 'up';
    }
  }, []);

  const handleTouchStart = useCallback((event: React.TouchEvent) => {
    const touch = event.touches[0];
    startPoint.current = { x: touch.clientX, y: touch.clientY };
    startTime.current = Date.now();
    
    setState(initialSwipeState);
  }, []);

  const handleTouchMove = useCallback((event: React.TouchEvent) => {
    if (!startPoint.current) return;
    
    const touch = event.touches[0];
    const deltaX = touch.clientX - startPoint.current.x;
    const deltaY = touch.clientY - startPoint.current.y;
    const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
    
    if (distance < 10) return; // Too small to be meaningful
    
    const direction = getSwipeDirection(deltaX, deltaY);
    const progress = Math.min(distance / threshold, 1);
    
    // Prevent scrolling if configured and this is a horizontal swipe
    if (preventScroll && (direction === 'left' || direction === 'right')) {
      event.preventDefault();
    }
    
    setState(prev => {
      const newState = {
        isActive: true,
        direction,
        progress,
        distance,
      };
      
      // Trigger swipe start if direction changed or first time
      if (prev.direction !== direction && direction) {
        onSwipeStart?.(direction);
        
        // Light haptic on swipe start
        if (progress > 0.2) {
          triggerHaptic('light');
        }
      }
      
      return newState;
    });
  }, [threshold, getSwipeDirection, preventScroll, onSwipeStart, triggerHaptic]);

  const handleTouchEnd = useCallback((event: React.TouchEvent) => {
    if (!startPoint.current || !state.direction) {
      setState(initialSwipeState);
      return;
    }
    
    const touch = event.changedTouches[0];
    const deltaX = touch.clientX - startPoint.current.x;
    const deltaY = touch.clientY - startPoint.current.y;
    const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
    const duration = Date.now() - startTime.current;
    const speed = distance / duration; // pixels per ms
    
    // Check if swipe meets threshold or velocity requirements
    const shouldTriggerSwipe = distance >= threshold || speed >= velocity;
    
    if (shouldTriggerSwipe && state.direction) {
      triggerHaptic('medium');
      onSwipe?.(state.direction);
    }
    
    onSwipeEnd?.();
    setState(initialSwipeState);
    startPoint.current = null;
  }, [state.direction, threshold, velocity, triggerHaptic, onSwipe, onSwipeEnd]);

  const getSwipeProps = useCallback(() => ({
    onTouchStart: handleTouchStart,
    onTouchMove: handleTouchMove,
    onTouchEnd: handleTouchEnd,
    style: {
      touchAction: preventScroll ? 'pan-y' : 'auto',
    },
  }), [handleTouchStart, handleTouchMove, handleTouchEnd, preventScroll]);

  return {
    state,
    getSwipeProps,
  };
}

interface SwipeableProps {
  children: React.ReactNode;
  onSwipe?: (direction: SwipeDirection) => void;
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  onSwipeUp?: () => void;
  onSwipeDown?: () => void;
  threshold?: number;
  className?: string;
  showSwipeIndicator?: boolean;
}

export function Swipeable({
  children,
  onSwipe,
  onSwipeLeft,
  onSwipeRight,
  onSwipeUp,
  onSwipeDown,
  threshold = 50,
  className,
  showSwipeIndicator = false,
}: SwipeableProps) {
  const { state, getSwipeProps } = useSwipeGesture({
    threshold,
    onSwipe: useCallback((direction: SwipeDirection) => {
      onSwipe?.(direction);
      
      switch (direction) {
        case 'left':
          onSwipeLeft?.();
          break;
        case 'right':
          onSwipeRight?.();
          break;
        case 'up':
          onSwipeUp?.();
          break;
        case 'down':
          onSwipeDown?.();
          break;
      }
    }, [onSwipe, onSwipeLeft, onSwipeRight, onSwipeUp, onSwipeDown]),
  });

  const getSwipeTransform = () => {
    if (!state.isActive || !state.direction) return '';
    
    const progress = Math.min(state.progress * 0.1, 0.05); // Subtle movement
    
    switch (state.direction) {
      case 'left':
        return `translateX(-${progress * 100}%)`;
      case 'right':
        return `translateX(${progress * 100}%)`;
      case 'up':
        return `translateY(-${progress * 100}%)`;
      case 'down':
        return `translateY(${progress * 100}%)`;
      default:
        return '';
    }
  };

  return (
    <div
      {...getSwipeProps()}
      className={cn(
        "relative transition-transform duration-75",
        className
      )}
      style={{
        transform: getSwipeTransform(),
      }}
    >
      {children}
      
      {/* Swipe Indicator */}
      {showSwipeIndicator && state.isActive && (
        <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
          <div className={cn(
            "bg-black/20 text-white px-3 py-1 rounded-full text-sm font-medium",
            "transition-opacity duration-200",
            state.progress > 0.3 ? 'opacity-100' : 'opacity-0'
          )}>
            {state.direction === 'left' && '← Swipe left'}
            {state.direction === 'right' && 'Swipe right →'}
            {state.direction === 'up' && '↑ Swipe up'}
            {state.direction === 'down' && '↓ Swipe down'}
          </div>
        </div>
      )}
    </div>
  );
}

// Card with swipe actions
interface SwipeActionCardProps {
  children: React.ReactNode;
  leftAction?: {
    icon: React.ReactNode;
    label: string;
    action: () => void;
    color?: string;
  };
  rightAction?: {
    icon: React.ReactNode;
    label: string;
    action: () => void;
    color?: string;
  };
  className?: string;
}

export function SwipeActionCard({
  children,
  leftAction,
  rightAction,
  className,
}: SwipeActionCardProps) {
  const [revealed, setRevealed] = useState<'left' | 'right' | null>(null);
  const [translateX, setTranslateX] = useState(0);

  const { getSwipeProps } = useSwipeGesture({
    threshold: 60,
    preventScroll: true,
    onSwipeStart: (direction) => {
      if ((direction === 'left' && rightAction) || (direction === 'right' && leftAction)) {
        setRevealed(direction === 'left' ? 'right' : 'left');
      }
    },
    onSwipe: (direction) => {
      if (direction === 'left' && rightAction) {
        setTranslateX(-80);
      } else if (direction === 'right' && leftAction) {
        setTranslateX(80);
      }
    },
    onSwipeEnd: () => {
      // Auto-hide after delay
      setTimeout(() => {
        setTranslateX(0);
        setRevealed(null);
      }, 2000);
    },
  });

  const handleActionTap = useCallback((action: () => void) => {
    action();
    setTranslateX(0);
    setRevealed(null);
  }, []);

  return (
    <div className={cn("relative overflow-hidden rounded-lg", className)}>
      {/* Left Action */}
      {leftAction && (
        <div className={cn(
          "absolute left-0 top-0 h-full w-20 flex items-center justify-center transition-transform duration-200",
          leftAction.color || "bg-blue-500",
          revealed === 'left' ? 'translate-x-0' : '-translate-x-full'
        )}>
          <button
            onClick={() => handleActionTap(leftAction.action)}
            className="flex flex-col items-center text-white text-xs touch-manipulation"
          >
            {leftAction.icon}
            <span className="mt-1">{leftAction.label}</span>
          </button>
        </div>
      )}

      {/* Right Action */}
      {rightAction && (
        <div className={cn(
          "absolute right-0 top-0 h-full w-20 flex items-center justify-center transition-transform duration-200",
          rightAction.color || "bg-red-500",
          revealed === 'right' ? 'translate-x-0' : 'translate-x-full'
        )}>
          <button
            onClick={() => handleActionTap(rightAction.action)}
            className="flex flex-col items-center text-white text-xs touch-manipulation"
          >
            {rightAction.icon}
            <span className="mt-1">{rightAction.label}</span>
          </button>
        </div>
      )}

      {/* Main Content */}
      <div
        {...getSwipeProps()}
        className="bg-white dark:bg-gray-800 transition-transform duration-200"
        style={{
          transform: `translateX(${translateX}px)`,
        }}
      >
        {children}
      </div>
    </div>
  );
}

// Day navigation with swipe
interface SwipeNavigationProps {
  currentIndex: number;
  totalItems: number;
  onNavigate: (index: number) => void;
  children: React.ReactNode;
  className?: string;
}

export function SwipeNavigation({
  currentIndex,
  totalItems,
  onNavigate,
  children,
  className,
}: SwipeNavigationProps) {
  const canGoNext = currentIndex < totalItems - 1;
  const canGoPrevious = currentIndex > 0;

  const { getSwipeProps } = useSwipeGesture({
    threshold: 100,
    preventScroll: true,
    onSwipe: (direction) => {
      if (direction === 'left' && canGoNext) {
        onNavigate(currentIndex + 1);
      } else if (direction === 'right' && canGoPrevious) {
        onNavigate(currentIndex - 1);
      }
    },
  });

  return (
    <div {...getSwipeProps()} className={cn("select-none", className)}>
      {children}
      
      {/* Navigation Hints */}
      <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex items-center gap-2">
        <div className={cn(
          "text-xs text-gray-500 px-2 py-1 bg-black/10 rounded-full",
          !canGoPrevious && "opacity-50"
        )}>
          ← Previous
        </div>
        <div className="flex gap-1">
          {Array.from({ length: totalItems }, (_, i) => (
            <div
              key={i}
              className={cn(
                "w-2 h-2 rounded-full",
                i === currentIndex ? "bg-blue-500" : "bg-gray-300"
              )}
            />
          ))}
        </div>
        <div className={cn(
          "text-xs text-gray-500 px-2 py-1 bg-black/10 rounded-full",
          !canGoNext && "opacity-50"
        )}>
          Next →
        </div>
      </div>
    </div>
  );
}