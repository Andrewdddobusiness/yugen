"use client";

import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Clock, MapPin, Star, Calendar } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatDuration, formatTime } from '@/utils/formatting/time';
import { formatCategoryType } from '@/utils/formatting/types';
import { useDragState } from '@/components/provider/dnd/DragProvider';

interface DragPreviewProps {
  className?: string;
}

/**
 * Drag preview overlay that follows the cursor during drag operations
 */
export function DragPreview({ className }: DragPreviewProps) {
  const dragState = useDragState();
  const previewRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!dragState.dragPreview.visible || !previewRef.current) return;

    const updatePosition = (e: MouseEvent) => {
      if (previewRef.current) {
        const x = e.clientX + 12; // Offset to avoid cursor overlap
        const y = e.clientY - 8;
        
        previewRef.current.style.transform = `translate3d(${x}px, ${y}px, 0)`;
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (previewRef.current && e.touches[0]) {
        const touch = e.touches[0];
        const x = touch.clientX + 12;
        const y = touch.clientY - 8;
        
        previewRef.current.style.transform = `translate3d(${x}px, ${y}px, 0)`;
      }
    };

    document.addEventListener('mousemove', updatePosition, { passive: true });
    document.addEventListener('touchmove', handleTouchMove, { passive: true });

    return () => {
      document.removeEventListener('mousemove', updatePosition);
      document.removeEventListener('touchmove', handleTouchMove);
    };
  }, [dragState.dragPreview.visible]);

  if (!dragState.dragPreview.visible || !dragState.dragPreview.item) {
    return null;
  }

  const item = dragState.dragPreview.item;

  return createPortal(
    <div
      ref={previewRef}
      className={cn(
        "fixed pointer-events-none z-[9999] transition-opacity duration-200",
        "opacity-90 transform-gpu will-change-transform",
        className
      )}
      style={{
        transform: `translate3d(${dragState.dragPreview.position.x}px, ${dragState.dragPreview.position.y}px, 0)`
      }}
    >
      {item.type === 'wishlist-item' ? (
        <WishlistItemPreview item={item} />
      ) : (
        <ActivityPreview item={item} />
      )}
      
      {/* Drag indicators */}
      <div className="absolute -top-2 -right-2 bg-blue-500 text-white rounded-full p-1">
        <Calendar className="h-3 w-3" />
      </div>
    </div>,
    document.body
  );
}

/**
 * Preview for wishlist items being dragged
 */
function WishlistItemPreview({ item }: { item: any }) {
  const activity = item.data?.activity || item.data;
  
  return (
    <div className={cn(
      "bg-white border border-gray-300 rounded-lg shadow-lg p-3 min-w-[200px] max-w-[280px]",
      "transform rotate-3 scale-95"
    )}>
      {/* Header */}
      <div className="flex items-start space-x-2 mb-2">
        <div className="flex-1">
          <h4 className="font-medium text-sm text-gray-900 line-clamp-2">
            {activity?.name || 'Unknown Activity'}
          </h4>
          
          {activity?.address && (
            <div className="flex items-center space-x-1 mt-1">
              <MapPin className="h-3 w-3 text-gray-400" />
              <span className="text-xs text-gray-500 truncate">
                {activity.address}
              </span>
            </div>
          )}
        </div>
        
        {activity?.rating && (
          <div className="flex items-center space-x-1">
            <Star className="h-3 w-3 text-yellow-400 fill-current" />
            <span className="text-xs font-medium text-gray-600">
              {activity.rating.toFixed(1)}
            </span>
          </div>
        )}
      </div>

      {/* Duration indicator */}
      <div className="flex items-center space-x-1 text-xs text-gray-500 bg-gray-50 rounded px-2 py-1">
        <Clock className="h-3 w-3" />
        <span>
          {formatDuration(activity?.duration || 60)}
        </span>
      </div>

      {/* Categories */}
      {activity?.types && activity.types.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-2">
          {activity.types.slice(0, 2).map((type: string, index: number) => (
            <span
              key={index}
              className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded"
            >
              {formatCategoryType(type)}
            </span>
          ))}
          {activity.types.length > 2 && (
            <span className="text-xs text-gray-400">
              +{activity.types.length - 2}
            </span>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * Preview for scheduled activities being moved
 */
function ActivityPreview({ item }: { item: any }) {
  const activity = item.data?.activity || item.data;
  
  return (
    <div className={cn(
      "bg-blue-50 border-2 border-blue-300 border-dashed rounded-lg p-3 min-w-[180px]",
      "transform rotate-2 scale-90"
    )}>
      <div className="flex items-center space-x-2">
        <Calendar className="h-4 w-4 text-blue-600" />
        <div className="flex-1">
          <h4 className="font-medium text-sm text-blue-900 line-clamp-1">
            {activity?.name || 'Scheduled Activity'}
          </h4>
          
          {item.data?.startTime && (
            <div className="flex items-center space-x-1 mt-1">
              <Clock className="h-3 w-3 text-blue-500" />
              <span className="text-xs text-blue-600">
                {formatTime(item.data.startTime)}
                {item.data.endTime && ` - ${formatTime(item.data.endTime)}`}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * Snap preview showing where item will be placed
 */
export function SnapPreview({
  targetSlot,
  activity,
  isVisible,
  className
}: {
  targetSlot: { date: Date; timeSlot: string };
  activity: any;
  isVisible: boolean;
  className?: string;
}) {
  if (!isVisible) return null;

  return (
    <div className={cn(
      "absolute inset-0 bg-green-100 border-2 border-green-300 border-dashed rounded",
      "flex items-center justify-center pointer-events-none z-10",
      "animate-pulse",
      className
    )}>
      <div className="bg-white rounded-lg p-2 shadow-sm">
        <div className="flex items-center space-x-2 text-sm">
          <Clock className="h-4 w-4 text-green-600" />
          <span className="font-medium text-green-800">
            {formatTime(targetSlot.timeSlot)}
          </span>
        </div>
        <div className="text-xs text-green-600 mt-1 max-w-[120px] truncate">
          {activity?.name || 'New Activity'}
        </div>
      </div>
    </div>
  );
}

/**
 * Ghost element for the original dragged item
 */
export function DragGhost({
  isVisible,
  className
}: {
  isVisible: boolean;
  className?: string;
}) {
  if (!isVisible) return null;

  return (
    <div className={cn(
      "absolute inset-0 bg-gray-200 opacity-50 rounded",
      "pointer-events-none z-0",
      className
    )} />
  );
}

