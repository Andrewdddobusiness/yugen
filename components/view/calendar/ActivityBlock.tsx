"use client";

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ActivityBlockContent } from './ActivityBlockContent';
import { ActivityBlockPopover } from './ActivityBlockPopover';

interface ActivityData {
  name: string;
  address?: string;
  coordinates?: [number, number];
  types?: string[];
  rating?: number;
  price_level?: string;
  phone_number?: string;
  website_url?: string;
  photo_names?: string[];
}

interface ScheduledActivity {
  id: string;
  activityId: string;
  placeId: string;
  date: Date;
  startTime: string;
  endTime: string;
  duration: number;
  position: { day: number; startSlot: number; span: number };
  activity?: ActivityData;
  notes?: string;
  is_booked?: boolean;
  cost?: number;
  priority?: number;
}

interface ActivityBlockProps {
  activity: ScheduledActivity;
  isOverlay?: boolean;
  className?: string;
  onResize?: (activityId: string, newDuration: number, resizeDirection: 'top' | 'bottom') => void;
}

export function ActivityBlock({
  activity,
  isOverlay = false,
  className,
  onResize
}: ActivityBlockProps) {
  const [isResizing, setIsResizing] = useState(false);
  const [resizeDirection, setResizeDirection] = useState<'top' | 'bottom' | null>(null);
  const [showPopover, setShowPopover] = useState(false);
  const [popoverPosition, setPopoverPosition] = useState({ x: 0, y: 0 });
  const [previewDuration, setPreviewDuration] = useState<number>(activity.duration);
  const [previewHeight, setPreviewHeight] = useState<number>(0);
  const blockRef = useRef<HTMLDivElement | null>(null);
  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    isDragging
  } = useDraggable({
    id: activity.id,
    disabled: isOverlay || isResizing // Disable dragging during resize
  });

  const handleResizeStart = useCallback((direction: 'top' | 'bottom', e: MouseEvent) => {
    setIsResizing(true);
    setResizeDirection(direction);
    setPreviewDuration(activity.duration);
    
    // Get initial mouse position and calendar grid context
    const initialMouseY = e.clientY;
    const blockElement = blockRef.current;
    if (!blockElement) return;
    
    // Calendar grid constants - based on TimeGrid.tsx and DayColumn.tsx
    const SLOT_HEIGHT = 48; // h-12 = 48px per 30-minute slot 
    const MINUTES_PER_SLOT = 30; // Each slot is 30 minutes
    const MIN_DURATION = 30; // Minimum 30 minutes
    
    // Calculate initial height in pixels based on duration
    const initialHeight = (activity.duration / MINUTES_PER_SLOT) * SLOT_HEIGHT;
    setPreviewHeight(initialHeight);
    
    let lastCalculatedDuration = activity.duration;
    
    const handleMouseMove = (e: MouseEvent) => {
      if (!blockElement) return;
      
      e.preventDefault();
      e.stopPropagation();
      
      // Calculate mouse movement in pixels
      const deltaY = e.clientY - initialMouseY;
      
      // Snap to grid slots - convert pixel movement to slot changes
      const slotsChanged = Math.round(deltaY / SLOT_HEIGHT);
      const minutesChanged = slotsChanged * MINUTES_PER_SLOT;
      
      // Calculate new duration based on resize direction
      let newDuration: number;
      if (direction === 'bottom') {
        // Bottom handle: dragging DOWN extends END time (increases duration)
        // dragging UP shortens END time (decreases duration)
        newDuration = Math.max(MIN_DURATION, activity.duration + minutesChanged);
      } else {
        // Top handle: dragging UP extends START time backwards (increases duration)
        // dragging DOWN shortens START time forwards (decreases duration)
        newDuration = Math.max(MIN_DURATION, activity.duration - minutesChanged);
      }
      
      // Snap to 30-minute intervals (grid slots)
      newDuration = Math.max(MIN_DURATION, Math.round(newDuration / MINUTES_PER_SLOT) * MINUTES_PER_SLOT);
      
      // Update preview if duration changed
      if (newDuration !== lastCalculatedDuration) {
        lastCalculatedDuration = newDuration;
        setPreviewDuration(newDuration);
        
        // For top handle resize, we need to adjust the visual position
        if (direction === 'top') {
          // When extending start time (making duration longer), block should appear to grow upward
          const heightDiff = ((newDuration - activity.duration) / MINUTES_PER_SLOT) * SLOT_HEIGHT;
          const newHeight = (newDuration / MINUTES_PER_SLOT) * SLOT_HEIGHT;
          setPreviewHeight(newHeight);
          
          // Also need to adjust the block position upward
          if (blockElement) {
            const existingTransform = style?.transform || '';
            blockElement.style.transform = `${existingTransform} translateY(${-heightDiff}px)`;
          }
        } else {
          // Bottom handle: just change height, no position change needed
          const newHeight = (newDuration / MINUTES_PER_SLOT) * SLOT_HEIGHT;
          setPreviewHeight(newHeight);
        }
      }
    };

    const handleMouseUp = (e: MouseEvent) => {
      setIsResizing(false);
      setResizeDirection(null);
      setPreviewDuration(activity.duration);
      setPreviewHeight(0);
      
      // Reset any transform applied during resize
      if (blockElement) {
        blockElement.style.transform = style?.transform || '';
      }
      
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      
      // Calculate final duration and apply resize
      if (onResize && lastCalculatedDuration !== activity.duration) {
        onResize(activity.id, lastCalculatedDuration, direction);
      }
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  }, [activity.duration, activity.id, onResize]);

  const handleResizeTopMouseDown = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    handleResizeStart('top', e.nativeEvent);
  }, [handleResizeStart]);

  const handleResizeBottomMouseDown = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    handleResizeStart('bottom', e.nativeEvent);
  }, [handleResizeStart]);

  const handleMouseEnter = useCallback((e: React.MouseEvent) => {
    // Don't show popover if we're dragging or resizing, or if it's an overlay
    if (isDragging || isResizing || isOverlay) return;
    
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
    }
    
    hoverTimeoutRef.current = setTimeout(() => {
      if (blockRef.current) {
        const rect = blockRef.current.getBoundingClientRect();
        setPopoverPosition({
          x: rect.left + rect.width / 2,
          y: rect.top
        });
        setShowPopover(true);
      }
    }, 500); // Show after 500ms delay
  }, [isDragging, isResizing, isOverlay]);

  const handleMouseLeave = useCallback(() => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
      hoverTimeoutRef.current = null;
    }
    setShowPopover(false);
  }, []);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (hoverTimeoutRef.current) {
        clearTimeout(hoverTimeoutRef.current);
      }
    };
  }, []);

  const style = transform ? {
    transform: CSS.Translate.toString(transform),
  } : undefined;

  // Determine block size based on duration
  const getBlockSize = (duration: number): 'compact' | 'standard' | 'extended' => {
    if (duration < 60) return 'compact';        // < 1 hour
    if (duration < 180) return 'standard';      // 1-3 hours  
    return 'extended';                          // 3+ hours
  };

  // Generate color based on activity category following the color coding system
  const getActivityColor = (types?: string[], activityId?: string) => {
    if (types && types.length > 0) {
      const primaryType = types[0].toLowerCase();
      
      // Category-based colors as per CALENDAR-002 specification
      if (primaryType.includes('restaurant') || primaryType.includes('food') || primaryType.includes('meal')) {
        return 'bg-red-500';  // 🍴 Food & Dining: Red/Orange tones
      }
      if (primaryType.includes('tourist_attraction') || primaryType.includes('museum') || primaryType.includes('landmark')) {
        return 'bg-blue-500';  // 🏛️ Attractions: Blue tones
      }
      if (primaryType.includes('shopping') || primaryType.includes('store') || primaryType.includes('mall')) {
        return 'bg-purple-500';  // 🛍️ Shopping: Purple tones
      }
      if (primaryType.includes('park') || primaryType.includes('natural') || primaryType.includes('outdoor')) {
        return 'bg-green-500';  // 🌳 Outdoors: Green tones
      }
      if (primaryType.includes('entertainment') || primaryType.includes('amusement') || primaryType.includes('night_club')) {
        return 'bg-pink-500';  // 🎭 Entertainment: Pink/Magenta tones
      }
      if (primaryType.includes('lodging') || primaryType.includes('hotel') || primaryType.includes('accommodation')) {
        return 'bg-gray-500';  // 🏨 Accommodation: Gray tones
      }
      if (primaryType.includes('transit') || primaryType.includes('transport') || primaryType.includes('airport')) {
        return 'bg-yellow-500';  // 🚗 Transportation: Yellow/Amber tones
      }
    }

    // Fallback to hash-based color for consistency
    const colors = [
      'bg-blue-500', 'bg-green-500', 'bg-purple-500', 'bg-orange-500',
      'bg-red-500', 'bg-teal-500', 'bg-pink-500', 'bg-indigo-500'
    ];
    
    const hash = (activityId || '').split('').reduce((a, b) => {
      a = ((a << 5) - a) + b.charCodeAt(0);
      return a & a;
    }, 0);
    
    return colors[Math.abs(hash) % colors.length];
  };

  const blockSize = getBlockSize(activity.duration);
  const activityColor = getActivityColor(activity.activity?.types, activity.activityId || activity.id);

  // Calculate dynamic height during resize
  const calculateBlockHeight = () => {
    if (isResizing && previewHeight > 0) {
      return `${previewHeight}px`;
    }
    
    // Default height based on duration (30 minutes = 48px slot height)
    const baseHeight = (activity.duration / 30) * 48;
    return `${Math.max(48, baseHeight)}px`; // Minimum 48px (1 slot)
  };

  return (
    <>
      <div
        ref={(node) => {
          setNodeRef(node);
          blockRef.current = node;
        }}
        style={{
          ...style,
          height: calculateBlockHeight(),
          transition: isResizing ? 'none' : 'height 0.2s ease'
        }}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        className={cn(
        "relative rounded-lg shadow-sm border-l-4 overflow-hidden group",
        "cursor-default", // Default cursor, not cursor-move
        isResizing && "cursor-ns-resize select-none",
        "hover:shadow-md active:shadow-lg",
        isDragging && "opacity-50 rotate-1 shadow-xl",
        isResizing && "shadow-lg ring-2 ring-blue-300 z-30 ring-opacity-70",
        isOverlay && "shadow-2xl border-2 border-white",
        activityColor.replace('bg-', 'border-l-'),
        "bg-white",
        className
      )}
      role="button"
      tabIndex={0}
      aria-label={`Move ${activity.activity?.name || 'activity'}`}
    >
      {/* Drag Handle - only show on hover and for standard+ blocks */}
      {blockSize !== 'compact' && !isResizing && (
        <div 
          className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity z-20 cursor-move p-1 hover:bg-gray-100 rounded"
          {...listeners}
          {...attributes}
          title="Drag to move activity"
        >
          <GripVertical className="h-3 w-3 text-gray-400 hover:text-gray-600" />
        </div>
      )}

      {/* Activity Content */}
      <ActivityBlockContent
        activity={activity}
        blockSize={blockSize}
        activityColor={activityColor}
        isResizing={isResizing}
        isDragging={isDragging}
      />

      {/* Resize Handles - only show for standard+ blocks */}
      {!isOverlay && onResize && blockSize !== 'compact' && (
        <>
          <div 
            className={cn(
              "absolute top-0 left-0 right-0 h-2 cursor-n-resize transition-all z-20",
              isResizing && resizeDirection === 'top' 
                ? "bg-blue-400 opacity-100" 
                : "hover:bg-blue-300 opacity-0 group-hover:opacity-100"
            )}
            onMouseDown={handleResizeTopMouseDown}
            title="Adjust start time (drag up to start earlier, down to start later)"
          />
          <div 
            className={cn(
              "absolute bottom-0 left-0 right-0 h-2 cursor-s-resize transition-all z-20",
              isResizing && resizeDirection === 'bottom' 
                ? "bg-blue-400 opacity-100" 
                : "hover:bg-blue-300 opacity-0 group-hover:opacity-100"
            )}
            onMouseDown={handleResizeBottomMouseDown}
            title="Adjust end time (drag down to end later, up to end earlier)"
          />
        </>
      )}

      {/* Status indicators */}
      {isDragging && (
        <div className="absolute inset-0 bg-blue-500 bg-opacity-20 flex items-center justify-center">
          <div className="text-blue-700 text-xs font-medium">Moving...</div>
        </div>
      )}
      
      {isResizing && (
        <div className="absolute inset-0 bg-blue-500 bg-opacity-20 flex items-center justify-center">
          <div className="text-center">
            <div className="text-blue-700 text-xs font-medium">
              {resizeDirection === 'top' ? 'Adjusting start time' : 'Adjusting end time'}
            </div>
            <div className="text-blue-600 text-xs mt-1 font-semibold">
              {Math.floor(previewDuration / 60)}h {previewDuration % 60}m
            </div>
          </div>
        </div>
      )}
      </div>

      {/* Hover Popover */}
      <ActivityBlockPopover
        activity={activity}
        isVisible={showPopover}
        position={popoverPosition}
      />
    </>
  );
}