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
  const blockRef = useRef<HTMLDivElement>(null);
  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    isDragging
  } = useDraggable({
    id: activity.id,
    disabled: isOverlay || isResizing
  });

  const handleResizeStart = useCallback((direction: 'top' | 'bottom') => {
    setIsResizing(true);
    setResizeDirection(direction);
    
    const handleMouseMove = (e: MouseEvent) => {
      // Calculate new duration based on mouse movement
      // This is a simplified version - in a real implementation you'd need to:
      // 1. Calculate the mouse position relative to the calendar grid
      // 2. Convert to time slots
      // 3. Update the activity duration accordingly
      e.preventDefault();
    };

    const handleMouseUp = () => {
      setIsResizing(false);
      setResizeDirection(null);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  }, []);

  const handleResizeTopMouseDown = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    handleResizeStart('top');
  }, [handleResizeStart]);

  const handleResizeBottomMouseDown = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    handleResizeStart('bottom');
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

  return (
    <>
      <div
        ref={(node) => {
          setNodeRef(node);
          blockRef.current = node;
        }}
        style={style}
        {...listeners}
        {...attributes}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        className={cn(
        "relative rounded-lg shadow-sm border-l-4 overflow-hidden transition-all group",
        !isResizing && "cursor-move",
        isResizing && "cursor-ns-resize",
        "hover:shadow-md active:shadow-lg",
        isDragging && "opacity-50 rotate-1 shadow-xl",
        isResizing && "shadow-lg ring-2 ring-blue-300",
        isOverlay && "shadow-2xl border-2 border-white",
        activityColor.replace('bg-', 'border-l-'),
        "bg-white",
        // Dynamic height based on block size
        blockSize === 'compact' && "min-h-[2rem]",
        blockSize === 'standard' && "min-h-[3rem]", 
        blockSize === 'extended' && "min-h-[5rem]",
        className
      )}
      role="button"
      tabIndex={0}
      aria-label={`Move ${activity.activity?.name || 'activity'}`}
    >
      {/* Drag Handle - only show on hover and for standard+ blocks */}
      {blockSize !== 'compact' && (
        <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity z-20">
          <GripVertical className="h-3 w-3 text-gray-400" />
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
            className="absolute top-0 left-0 right-0 h-2 cursor-n-resize hover:bg-blue-300 opacity-0 group-hover:opacity-100 transition-opacity z-10"
            onMouseDown={handleResizeTopMouseDown}
            title="Resize start time"
          />
          <div 
            className="absolute bottom-0 left-0 right-0 h-2 cursor-s-resize hover:bg-blue-300 opacity-0 group-hover:opacity-100 transition-opacity z-10"
            onMouseDown={handleResizeBottomMouseDown}
            title="Resize end time"
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
          <div className="text-blue-700 text-xs font-medium">
            Resizing {resizeDirection === 'top' ? 'start time' : 'end time'}...
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