"use client";

import React, { useRef, useCallback, useEffect } from 'react';
import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { 
  MapPin, 
  Star, 
  Clock, 
  MoreVertical,
  GripVertical,
  Calendar,
  Heart,
  AlertCircle
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { WishlistItem as WishlistItemType } from '@/store/wishlistStore';
import { useDragContext } from './DragProvider';

interface DraggableWishlistItemProps {
  item: WishlistItemType;
  onEdit?: (item: WishlistItemType) => void;
  onRemove?: (item: WishlistItemType) => void;
  onSchedule?: (item: WishlistItemType) => void;
  isDragEnabled?: boolean;
  showActions?: boolean;
  className?: string;
  // Drag-specific props
  onDragStart?: (item: WishlistItemType) => void;
  onDragEnd?: (item: WishlistItemType, result: 'success' | 'error' | 'cancelled') => void;
}

/**
 * Enhanced draggable wishlist item component that integrates with the DragProvider system
 * Supports both mouse/touch drag and keyboard accessibility
 */
export function DraggableWishlistItem({
  item,
  onEdit,
  onRemove,
  onSchedule,
  isDragEnabled = true,
  showActions = true,
  className,
  onDragStart,
  onDragEnd
}: DraggableWishlistItemProps) {
  const dragContext = useDragContext();
  const elementRef = useRef<HTMLDivElement>(null);
  const dragStartTimeRef = useRef<number>(0);
  const isDragThresholdMet = useRef<boolean>(false);

  const dragData = {
    type: 'wishlist-item' as const,
    item: item,
    sourceType: 'wishlist' as const
  };

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    isDragging
  } = useDraggable({
    id: `wishlist-${item.placeId}`,
    data: dragData,
    disabled: !isDragEnabled
  });

  const style = transform ? {
    transform: CSS.Translate.toString(transform),
    zIndex: isDragging ? 1000 : 'auto',
  } : undefined;

  // Handle drag start with threshold
  const handleDragStart = useCallback((event: React.MouseEvent | React.TouchEvent) => {
    if (!isDragEnabled) return;

    dragStartTimeRef.current = Date.now();
    isDragThresholdMet.current = false;

    // Start drag in our context
    dragContext.startDrag({
      id: `wishlist-${item.placeId}`,
      type: 'wishlist-item',
      data: item,
      sourceType: 'wishlist'
    });

    onDragStart?.(item);
  }, [isDragEnabled, dragContext, item, onDragStart]);

  // Handle drag end
  const handleDragEnd = useCallback((result: 'success' | 'error' | 'cancelled') => {
    onDragEnd?.(item, result);
  }, [item, onDragEnd]);

  // Long press handling for mobile
  const handleTouchStart = useCallback((event: React.TouchEvent) => {
    if (!isDragEnabled) return;

    const touchStartTime = Date.now();
    let longPressTimer: NodeJS.Timeout;

    const handleLongPress = () => {
      // Trigger haptic feedback if available
      if ('vibrate' in navigator) {
        navigator.vibrate(50);
      }
      
      handleDragStart(event);
    };

    longPressTimer = setTimeout(handleLongPress, dragContext.state.preferences.longPressDelay);

    const handleTouchEnd = () => {
      clearTimeout(longPressTimer);
      document.removeEventListener('touchend', handleTouchEnd);
      document.removeEventListener('touchmove', handleTouchMove);
    };

    const handleTouchMove = (moveEvent: TouchEvent) => {
      const timeDiff = Date.now() - touchStartTime;
      if (timeDiff < dragContext.state.preferences.longPressDelay) {
        clearTimeout(longPressTimer);
      }
    };

    document.addEventListener('touchend', handleTouchEnd, { once: true });
    document.addEventListener('touchmove', handleTouchMove);
  }, [isDragEnabled, dragContext, handleDragStart]);

  // Keyboard drag handling
  const handleKeyDown = useCallback((event: React.KeyboardEvent) => {
    if (!isDragEnabled) return;

    switch (event.key) {
      case ' ':
      case 'Enter':
        event.preventDefault();
        if (!dragContext.state.isDragging) {
          handleDragStart(event as any);
        }
        break;
      case 'Escape':
        if (dragContext.state.isDragging) {
          dragContext.cancelDrag();
        }
        break;
    }
  }, [isDragEnabled, dragContext, handleDragStart]);

  // Auto-scroll during drag
  useEffect(() => {
    if (!isDragging || !dragContext.state.preferences.autoScroll) return;

    const handleAutoScroll = (event: MouseEvent | TouchEvent) => {
      const viewport = window.innerHeight;
      const threshold = 50;
      const scrollSpeed = 5;
      
      let clientY: number;
      if (event instanceof MouseEvent) {
        clientY = event.clientY;
      } else {
        clientY = event.touches[0]?.clientY || 0;
      }

      if (clientY < threshold) {
        window.scrollBy(0, -scrollSpeed);
      } else if (clientY > viewport - threshold) {
        window.scrollBy(0, scrollSpeed);
      }
    };

    document.addEventListener('mousemove', handleAutoScroll);
    document.addEventListener('touchmove', handleAutoScroll);

    return () => {
      document.removeEventListener('mousemove', handleAutoScroll);
      document.removeEventListener('touchmove', handleAutoScroll);
    };
  }, [isDragging, dragContext.state.preferences.autoScroll]);

  const getPriorityColor = (priority?: string) => {
    switch (priority) {
      case 'high':
        return 'text-red-600 bg-red-50';
      case 'medium':
        return 'text-yellow-600 bg-yellow-50';
      case 'low':
        return 'text-green-600 bg-green-50';
      default:
        return 'text-gray-600 bg-gray-50';
    }
  };

  const getPriceLevelDisplay = (priceLevel?: string) => {
    switch (priceLevel) {
      case 'PRICE_LEVEL_FREE':
        return 'Free';
      case 'PRICE_LEVEL_INEXPENSIVE':
        return '$';
      case 'PRICE_LEVEL_MODERATE':
        return '$$';
      case 'PRICE_LEVEL_EXPENSIVE':
        return '$$$';
      case 'PRICE_LEVEL_VERY_EXPENSIVE':
        return '$$$$';
      default:
        return null;
    }
  };

  const getCategoryIcon = (types?: string[]) => {
    if (!types || types.length === 0) return '📍';
    
    const type = types[0].toLowerCase();
    if (type.includes('restaurant') || type.includes('food')) return '🍴';
    if (type.includes('tourist_attraction') || type.includes('museum')) return '🏛️';
    if (type.includes('shopping')) return '🛍️';
    if (type.includes('park') || type.includes('natural')) return '🌳';
    if (type.includes('entertainment') || type.includes('amusement')) return '🎭';
    if (type.includes('lodging')) return '🏨';
    if (type.includes('transit')) return '🚗';
    
    return '📍';
  };

  const formatCategory = (types?: string[]) => {
    if (!types || types.length === 0) return 'Place';
    return types[0].replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  const categoryIcon = getCategoryIcon(item.activity?.types);
  const category = formatCategory(item.activity?.types);
  const priceLevel = getPriceLevelDisplay(item.activity?.price_level);

  // Calculate estimated duration for scheduling
  const estimatedDuration = item.estimatedDuration || 60; // Default 1 hour

  return (
    <div
      ref={(node) => {
        setNodeRef(node);
        elementRef.current = node;
      }}
      style={style}
      className={cn(
        "group relative bg-white hover:bg-gray-50 rounded-lg border transition-all duration-200",
        "focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2",
        isDragEnabled && "cursor-grab active:cursor-grabbing",
        isDragging && "opacity-50 rotate-1 shadow-xl z-50 ring-2 ring-blue-300",
        dragContext.state.isDragging && dragContext.state.activeDrag?.id !== `wishlist-${item.placeId}` && "opacity-30",
        className
      )}
      onTouchStart={handleTouchStart}
      onKeyDown={handleKeyDown}
      tabIndex={isDragEnabled ? 0 : -1}
      role={isDragEnabled ? "button" : undefined}
      aria-label={isDragEnabled ? `Drag ${item.activity?.name || 'place'} to calendar` : undefined}
      aria-describedby={isDragEnabled ? `drag-help-${item.placeId}` : undefined}
      {...(isDragEnabled ? { ...listeners, ...attributes } : {})}
    >
      {/* Drag Handle - enhanced visibility */}
      {isDragEnabled && (
        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100 transition-opacity">
          <GripVertical className="h-4 w-4 text-gray-400 group-hover:text-gray-600" />
        </div>
      )}

      {/* Screen reader drag instructions */}
      {isDragEnabled && (
        <div
          id={`drag-help-${item.placeId}`}
          className="sr-only"
        >
          Press space or enter to start dragging, use arrow keys to move, enter to drop, escape to cancel
        </div>
      )}

      <div className="p-3">
        {/* Header */}
        <div className="flex items-start justify-between mb-2">
          <div className="flex items-start space-x-2 flex-1 min-w-0">
            <span className="text-sm flex-shrink-0">{categoryIcon}</span>
            <div className="flex-1 min-w-0">
              <h4 className="font-medium text-sm text-gray-900 truncate">
                {item.activity?.name || (
                  <span className="text-gray-500 italic">
                    Place information not available
                  </span>
                )}
              </h4>
              
              {/* Category and Priority */}
              <div className="flex items-center space-x-2 mt-1">
                <Badge variant="secondary" className="text-xs px-1.5 py-0.5">
                  {category}
                </Badge>
                
                {item.priority && (
                  <Badge 
                    className={cn(
                      "text-xs px-1.5 py-0.5",
                      getPriorityColor(item.priority)
                    )}
                  >
                    {item.priority}
                  </Badge>
                )}

                {/* Duration indicator for scheduling */}
                <Badge variant="outline" className="text-xs px-1.5 py-0.5">
                  <Clock className="h-2.5 w-2.5 mr-1" />
                  {estimatedDuration >= 60 
                    ? `${Math.floor(estimatedDuration / 60)}h${estimatedDuration % 60 > 0 ? ` ${estimatedDuration % 60}m` : ''}`
                    : `${estimatedDuration}m`
                  }
                </Badge>
              </div>
            </div>
          </div>

          {/* Actions Menu */}
          {showActions && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={(e) => e.stopPropagation()}
                >
                  <MoreVertical className="h-3 w-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-40">
                {onSchedule && (
                  <DropdownMenuItem onClick={() => onSchedule(item)}>
                    <Calendar className="h-4 w-4 mr-2" />
                    Schedule
                  </DropdownMenuItem>
                )}
                {onEdit && (
                  <DropdownMenuItem onClick={() => onEdit(item)}>
                    <Heart className="h-4 w-4 mr-2" />
                    Edit Notes
                  </DropdownMenuItem>
                )}
                {onRemove && (
                  <DropdownMenuItem 
                    onClick={() => onRemove(item)}
                    className="text-red-600"
                  >
                    <AlertCircle className="h-4 w-4 mr-2" />
                    Remove
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>

        {/* Details */}
        <div className="space-y-2">
          {/* Rating and Price */}
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center space-x-3">
              {item.activity?.rating && (
                <div className="flex items-center">
                  <Star className="h-3 w-3 text-yellow-500 mr-1" />
                  <span className="text-gray-600">
                    {item.activity.rating.toFixed(1)}
                  </span>
                </div>
              )}
              
              {priceLevel && (
                <span className="text-gray-600 font-medium">
                  {priceLevel}
                </span>
              )}
            </div>
            
            {item.savedAt && (
              <div className="flex items-center text-gray-500">
                <Clock className="h-3 w-3 mr-1" />
                <span>
                  {new Date(item.savedAt).toLocaleDateString()}
                </span>
              </div>
            )}
          </div>

          {/* Address */}
          {item.activity?.address && (
            <div className="flex items-start space-x-1">
              <MapPin className="h-3 w-3 text-gray-400 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-gray-600 line-clamp-2">
                {item.activity.address}
              </p>
            </div>
          )}

          {/* User Notes */}
          {item.notes && (
            <div className="bg-blue-50 rounded p-2">
              <p className="text-xs text-blue-800 italic line-clamp-2">
                &quot;{item.notes}&quot;
              </p>
            </div>
          )}

          {/* Categories/Tags */}
          {item.categories && item.categories.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {item.categories.slice(0, 3).map((category, index) => (
                <Badge
                  key={index}
                  variant="outline"
                  className="text-xs px-1 py-0"
                >
                  {category}
                </Badge>
              ))}
              {item.categories.length > 3 && (
                <span className="text-xs text-gray-500">
                  +{item.categories.length - 3} more
                </span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Dragging States */}
      {isDragging && (
        <div className="absolute inset-0 bg-blue-500 bg-opacity-20 flex items-center justify-center rounded-lg">
          <div className="text-blue-700 text-xs font-medium animate-pulse">
            Drag to calendar...
          </div>
        </div>
      )}

      {/* Drop zone indicator when other items are being dragged */}
      {dragContext.state.isDragging && 
       dragContext.state.activeDrag?.id !== `wishlist-${item.placeId}` && (
        <div className="absolute inset-0 bg-gray-500 bg-opacity-10 rounded-lg pointer-events-none" />
      )}

      {/* Focus indicator for keyboard navigation */}
      <div className="absolute inset-0 rounded-lg ring-blue-500 ring-offset-2 opacity-0 group-focus-visible:opacity-100 ring-2 pointer-events-none transition-opacity" />
    </div>
  );
}

/**
 * Hook to get drag-related data for a wishlist item
 */
export function useWishlistItemDrag(item: WishlistItemType) {
  const dragContext = useDragContext();
  
  const isDraggedItem = dragContext.state.activeDrag?.id === `wishlist-${item.placeId}`;
  const isDragInProgress = dragContext.state.isDragging;
  const canDrop = !isDragInProgress || isDraggedItem;
  
  return {
    isDraggedItem,
    isDragInProgress,
    canDrop,
    dragState: dragContext.state
  };
}

/**
 * Utility function to create drag data for wishlist items
 */
export function createWishlistDragData(item: WishlistItemType) {
  return {
    id: `wishlist-${item.placeId}`,
    type: 'wishlist-item' as const,
    data: item,
    sourceType: 'wishlist' as const
  };
}