"use client";

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ActivityBlockContent, type ActivityAccent } from './ActivityBlockContent';
import { ActivityBlockPopover } from './ActivityBlockPopover';
import { useSchedulingContext } from '@/store/timeSchedulingStore';
import { getCalendarSlotHeightPx } from './layoutMetrics';

const accentStyles: Record<ActivityAccent, { border: string; tint: string }> = {
  brand: { border: "border-l-brand-500", tint: "bg-brand-500/10" },
  teal: { border: "border-l-teal-500", tint: "bg-teal-500/10" },
  amber: { border: "border-l-amber-500", tint: "bg-amber-500/10" },
  coral: { border: "border-l-coral-500", tint: "bg-coral-500/10" },
  lime: { border: "border-l-lime-500", tint: "bg-lime-500/10" },
  tan: { border: "border-l-tan-500", tint: "bg-tan-500/10" },
};

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
  const schedulingContext = useSchedulingContext();
  const minutesPerSlot = schedulingContext.config.interval;
  const slotHeightPx = getCalendarSlotHeightPx(minutesPerSlot);
  const [isResizing, setIsResizing] = useState(false);
  const [resizeDirection, setResizeDirection] = useState<'top' | 'bottom' | null>(null);
  const [showPopover, setShowPopover] = useState(false);
  const [popoverPosition, setPopoverPosition] = useState({ x: 0, y: 0 });
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
    data: {
      type: 'scheduled-activity',
    },
    disabled: isOverlay || isResizing // Disable dragging during resize
  });

  const setNodeRefRef = useRef(setNodeRef);
  useEffect(() => {
    setNodeRefRef.current = setNodeRef;
  }, [setNodeRef]);

  const setBlockRef = useCallback((node: HTMLDivElement | null) => {
    setNodeRefRef.current(node);
    blockRef.current = node;
  }, []);

  const handleResizeStart = useCallback((direction: 'top' | 'bottom', e: MouseEvent) => {
    setIsResizing(true);
    setResizeDirection(direction);
    
    // Get initial mouse position and calendar grid context
    const initialMouseY = e.clientY;
    const blockElement = blockRef.current;
    if (!blockElement) return;
    const baseTransform = blockElement.style.transform;
    
    const MIN_DURATION = minutesPerSlot; // Minimum 1 slot

    // Calculate initial height in pixels based on duration
    const initialHeight = Math.max(
      slotHeightPx,
      Math.ceil(activity.duration / minutesPerSlot) * slotHeightPx
    );
    setPreviewHeight(initialHeight);
    
    let lastCalculatedDuration = activity.duration;
    
    const handleMouseMove = (e: MouseEvent) => {
      if (!blockElement) return;
      
      e.preventDefault();
      e.stopPropagation();
      
      // Calculate mouse movement in pixels
      const deltaY = e.clientY - initialMouseY;
      
      // Snap to grid slots - convert pixel movement to slot changes
      const slotsChanged = Math.round(deltaY / slotHeightPx);
      const minutesChanged = slotsChanged * minutesPerSlot;
      
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
      
      // Snap to grid intervals
      newDuration = Math.max(
        MIN_DURATION,
        Math.round(newDuration / minutesPerSlot) * minutesPerSlot
      );
      
      // Update preview if duration changed
      if (newDuration !== lastCalculatedDuration) {
        lastCalculatedDuration = newDuration;
        
        // For top handle resize, we need to adjust the visual position
        if (direction === 'top') {
          // When extending start time (making duration longer), block should appear to grow upward
          const heightDiff =
            ((newDuration - activity.duration) / minutesPerSlot) * slotHeightPx;
          const newHeight = (newDuration / minutesPerSlot) * slotHeightPx;
          setPreviewHeight(newHeight);
          
          // Also need to adjust the block position upward
          if (blockElement) {
            blockElement.style.transform = baseTransform
              ? `${baseTransform} translateY(${-heightDiff}px)`
              : `translateY(${-heightDiff}px)`;
          }
        } else {
          // Bottom handle: just change height, no position change needed
          const newHeight = (newDuration / minutesPerSlot) * slotHeightPx;
          setPreviewHeight(newHeight);
        }
      }
    };

    const handleMouseUp = (e: MouseEvent) => {
      setIsResizing(false);
      setResizeDirection(null);
      setPreviewHeight(0);
      
      // Reset any transform applied during resize
      if (blockElement) {
        blockElement.style.transform = baseTransform;
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
  }, [activity.duration, activity.id, minutesPerSlot, onResize, slotHeightPx]);

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
  const getActivityAccent = (types?: string[], activityId?: unknown): ActivityAccent => {
    if (types && types.length > 0) {
      const primaryType = types[0].toLowerCase();
      
      // Category-based accents (calendar blocks use tinted fills + accent borders)
      if (primaryType.includes('restaurant') || primaryType.includes('food') || primaryType.includes('meal')) {
        return 'amber';
      }
      if (primaryType.includes('tourist_attraction') || primaryType.includes('museum') || primaryType.includes('landmark')) {
        return 'brand';
      }
      if (primaryType.includes('shopping') || primaryType.includes('store') || primaryType.includes('mall')) {
        return 'teal';
      }
      if (primaryType.includes('park') || primaryType.includes('natural') || primaryType.includes('outdoor')) {
        return 'lime';
      }
      if (primaryType.includes('entertainment') || primaryType.includes('amusement') || primaryType.includes('night_club')) {
        return 'coral';
      }
      if (primaryType.includes('lodging') || primaryType.includes('hotel') || primaryType.includes('accommodation')) {
        return 'tan';
      }
      if (primaryType.includes('transit') || primaryType.includes('transport') || primaryType.includes('airport')) {
        return 'amber';
      }
    }

    // Fallback to hash-based accent for consistency
    const accents: ActivityAccent[] = ["brand", "teal", "amber", "tan", "lime", "coral"];
    const activityIdString = activityId == null ? '' : String(activityId);
    const hash = activityIdString.split('').reduce((a, b) => {
      a = ((a << 5) - a) + b.charCodeAt(0);
      return a & a;
    }, 0);
    
    return accents[Math.abs(hash) % accents.length];
  };

  const blockSize = getBlockSize(activity.duration);
  const activityAccent = getActivityAccent(activity.activity?.types, activity.activityId || activity.id);

  const blockHeight =
    isResizing && previewHeight > 0
      ? `${previewHeight}px`
      : isOverlay
        ? `${Math.max(1, activity.position.span) * slotHeightPx}px`
        : undefined;

  return (
    <>
      <div
        ref={setBlockRef}
        style={{
          ...style,
          ...(blockHeight ? { height: blockHeight } : {}),
          transition: isResizing ? 'none' : 'height 0.2s ease'
        }}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        className={cn(
          "relative rounded-lg overflow-hidden group border border-stroke-200 border-l-4",
          "cursor-default",
          isResizing && "cursor-ns-resize select-none",
          "shadow-sm hover:shadow-card active:shadow-float",
          isDragging && "opacity-50 rotate-1 shadow-float",
          isResizing && "shadow-float ring-2 ring-brand-400/50 z-30",
          isOverlay && "shadow-2xl border-2 border-white",
          accentStyles[activityAccent].border,
          "bg-bg-0",
          className
        )}
      role="button"
      tabIndex={0}
      aria-label={`Move ${activity.activity?.name || 'activity'}`}
    >
      <div
        aria-hidden="true"
        className={cn(
          "absolute inset-0 pointer-events-none",
          accentStyles[activityAccent].tint
        )}
      />

      {/* Drag Handle - only show on hover and for standard+ blocks */}
      {blockSize !== 'compact' && !isResizing && (
        <div 
          className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity z-20 cursor-move p-1 hover:bg-bg-50 rounded"
          {...listeners}
          {...attributes}
          title="Drag to move activity"
        >
          <GripVertical className="h-3 w-3 text-ink-500 hover:text-brand-600" />
        </div>
      )}

      {/* Activity Content */}
      <ActivityBlockContent
        activity={activity}
        blockSize={blockSize}
        activityAccent={activityAccent}
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
                ? "bg-brand-500/30 opacity-100" 
                : "hover:bg-brand-500/20 opacity-0 group-hover:opacity-100"
            )}
            onMouseDown={handleResizeTopMouseDown}
            title="Adjust start time (drag up to start earlier, down to start later)"
          />
          <div 
            className={cn(
              "absolute bottom-0 left-0 right-0 h-2 cursor-s-resize transition-all z-20",
              isResizing && resizeDirection === 'bottom' 
                ? "bg-brand-500/30 opacity-100" 
                : "hover:bg-brand-500/20 opacity-0 group-hover:opacity-100"
            )}
            onMouseDown={handleResizeBottomMouseDown}
            title="Adjust end time (drag down to end later, up to end earlier)"
          />
        </>
      )}

      {/* Status indicators */}
      {isDragging && (
        <div className="absolute inset-0 bg-brand-500/10 flex items-center justify-center">
          <div className="text-brand-700 text-xs font-medium">Moving…</div>
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
