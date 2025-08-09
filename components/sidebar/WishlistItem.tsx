"use client";

import React from 'react';
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

interface WishlistItemProps {
  item: WishlistItemType;
  onEdit?: (item: WishlistItemType) => void;
  onRemove?: (item: WishlistItemType) => void;
  onSchedule?: (item: WishlistItemType) => void;
  isDragEnabled?: boolean;
  showActions?: boolean;
  className?: string;
}

export function WishlistItem({
  item,
  onEdit,
  onRemove,
  onSchedule,
  isDragEnabled = false,
  showActions = true,
  className
}: WishlistItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    isDragging
  } = useDraggable({
    id: `wishlist-${item.placeId}`,
    data: {
      type: 'wishlist-item',
      item: item
    },
    disabled: !isDragEnabled
  });

  const style = transform ? {
    transform: CSS.Translate.toString(transform),
    zIndex: isDragging ? 1000 : 'auto',
  } : undefined;

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

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "group relative bg-white hover:bg-gray-50 rounded-lg border transition-all duration-200",
        isDragEnabled && "cursor-grab active:cursor-grabbing",
        isDragging && "opacity-50 rotate-1 shadow-xl z-50",
        className
      )}
      {...(isDragEnabled ? { ...listeners, ...attributes } : {})}
    >
      {/* Drag Handle - only visible when dragging is enabled */}
      {isDragEnabled && (
        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <GripVertical className="h-4 w-4 text-gray-400" />
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

      {/* Dragging Indicator */}
      {isDragging && (
        <div className="absolute inset-0 bg-blue-500 bg-opacity-20 flex items-center justify-center rounded-lg">
          <div className="text-blue-700 text-xs font-medium">
            Drag to calendar...
          </div>
        </div>
      )}
    </div>
  );
}