"use client";

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ActivityBlockContent } from './ActivityBlockContent';
import { ActivityBlockPopover } from './ActivityBlockPopover';
import { useSchedulingContext } from '@/store/timeSchedulingStore';
import { getCalendarSlotHeightPx } from './layoutMetrics';
import { useParams } from 'next/navigation';
import { useItineraryActivityStore } from '@/store/itineraryActivityStore';
import { useToast } from '@/components/ui/use-toast';
import { getActivityThemeForTypes, hexToRgba, type ActivityAccent } from '@/lib/activityAccent';
import { useItineraryLayoutStore } from '@/store/itineraryLayoutStore';

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
  const { itineraryId, destinationId } = useParams();
  const duplicateItineraryActivity = useItineraryActivityStore((s) => s.duplicateItineraryActivity);
  const unscheduleItineraryActivityInstance = useItineraryActivityStore(
    (s) => s.unscheduleItineraryActivityInstance
  );
  const { toast } = useToast();
  const minutesPerSlot = schedulingContext.config.interval;
  const slotHeightPx = getCalendarSlotHeightPx(minutesPerSlot);
  const [isResizing, setIsResizing] = useState(false);
  const [resizeDirection, setResizeDirection] = useState<'top' | 'bottom' | null>(null);
  const [showPopover, setShowPopover] = useState(false);
  const [popoverPosition, setPopoverPosition] = useState({ x: 0, y: 0 });
  const [previewHeight, setPreviewHeight] = useState<number>(0);
  const [contextMenu, setContextMenu] = useState<null | { x: number; y: number }>(null);
  const blockRef = useRef<HTMLDivElement | null>(null);
  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const contextMenuRef = useRef<HTMLDivElement | null>(null);

  const closeContextMenu = useCallback(() => setContextMenu(null), []);

  useEffect(() => {
    if (!contextMenu) return;

    const handlePointerDown = (event: PointerEvent) => {
      const menu = contextMenuRef.current;
      if (!menu) {
        setContextMenu(null);
        return;
      }
      if (menu.contains(event.target as Node)) return;
      setContextMenu(null);
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setContextMenu(null);
      }
    };

    const handleScrollOrResize = () => {
      setContextMenu(null);
    };

    document.addEventListener("pointerdown", handlePointerDown);
    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("resize", handleScrollOrResize);
    window.addEventListener("scroll", handleScrollOrResize, true);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("resize", handleScrollOrResize);
      window.removeEventListener("scroll", handleScrollOrResize, true);
    };
  }, [contextMenu]);
  
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    isDragging
  } = useDraggable({
    id: isOverlay ? `calendar-overlay:${activity.id}` : `calendar:${activity.id}`,
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

  const blockSize = getBlockSize(activity.duration);
  const activityCategoryAccents = useItineraryLayoutStore((s) => s.activityCategoryAccents);
  const activityCategoryCustomColors = useItineraryLayoutStore((s) => s.activityCategoryCustomColors);
  const { accent: activityAccent, customHex } = getActivityThemeForTypes(
    activity.activity?.types,
    activity.activityId || activity.id,
    activityCategoryAccents,
    activityCategoryCustomColors
  );
  const customTint = customHex ? hexToRgba(customHex, 0.1) : null;

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
          ...(customHex ? { borderLeftColor: customHex } : {}),
          transition: isResizing ? 'none' : 'height 0.2s ease'
        }}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onContextMenu={(e) => {
          if (isOverlay) return;
          e.preventDefault();
          e.stopPropagation();

          const padding = 8;
          const menuWidth = 200;
          const menuHeight = 88;
          const nextX = Math.min(e.clientX, window.innerWidth - menuWidth - padding);
          const nextY = Math.min(e.clientY, window.innerHeight - menuHeight - padding);
          setContextMenu({ x: nextX, y: nextY });
        }}
        className={cn(
          "relative rounded-lg overflow-hidden group border border-stroke-200 border-l-4",
          "cursor-default",
          isResizing && "cursor-ns-resize select-none",
          "shadow-sm hover:shadow-card active:shadow-float",
          isDragging && "opacity-50 rotate-1 shadow-float",
          isResizing && "shadow-float ring-2 ring-brand-400/50 z-30",
          isOverlay && "shadow-2xl border-2 border-white",
          !customHex && accentStyles[activityAccent].border,
          "bg-bg-0",
          className
        )}
      role="button"
      tabIndex={0}
      aria-label={`Move ${activity.activity?.name || 'activity'}`}
    >
      <div
        aria-hidden="true"
        className={cn("absolute inset-0 pointer-events-none", !customHex && accentStyles[activityAccent].tint)}
        style={customTint ? { backgroundColor: customTint } : undefined}
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
        customAccentColor={customHex ?? undefined}
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

      {contextMenu &&
        createPortal(
          <div
            ref={contextMenuRef}
            className="fixed z-[10000] min-w-48 rounded-lg border border-stroke-200 bg-bg-0 shadow-card p-1"
            style={{ left: contextMenu.x, top: contextMenu.y }}
            onContextMenu={(e) => {
              e.preventDefault();
              e.stopPropagation();
            }}
          >
            <button
              type="button"
              className="w-full rounded-md px-3 py-2 text-left text-sm text-ink-900 hover:bg-bg-50"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                if (!itineraryId || !destinationId) return;
                duplicateItineraryActivity(activity.id, itineraryId.toString(), destinationId.toString());
                closeContextMenu();
              }}
            >
              Duplicate
            </button>
            <button
              type="button"
              className="w-full rounded-md px-3 py-2 text-left text-sm text-red-700 hover:bg-red-50"
              onClick={async (e) => {
                e.preventDefault();
                e.stopPropagation();

                const result = await unscheduleItineraryActivityInstance(activity.id);
                if (!result.success) {
                  toast({
                    title: "Could not remove from calendar",
                    description: result.error ?? "Could not update activity.",
                    variant: "destructive",
                  });
                  return;
                }

                toast({ title: "Moved to Unscheduled" });
                closeContextMenu();
              }}
            >
              Remove from calendar
            </button>
          </div>,
          document.body
        )}
    </>
  );
}
