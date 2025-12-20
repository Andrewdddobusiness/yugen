"use client";

import React from 'react';
import { Clock, MapPin, Star, DollarSign, Edit3, Trash2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { formatCategoryType } from '@/utils/formatting/types';
import { formatTimeRange } from '@/utils/formatting/time';
import { type ActivityTimeBlock } from '@/utils/timeSlots';

interface ActivityTimeBlockProps {
  timeBlock: ActivityTimeBlock;
  className?: string;
  isSelected?: boolean;
  isEditing?: boolean;
  onEdit?: () => void;
  onDelete?: () => void;
  onSelect?: () => void;
  showTravelTime?: boolean;
  travelTime?: string;
}

export function ActivityTimeBlock({
  timeBlock,
  className,
  isSelected = false,
  isEditing = false,
  onEdit,
  onDelete,
  onSelect,
  showTravelTime = false,
  travelTime,
}: ActivityTimeBlockProps) {
  const { activity, startTime, endTime, duration, startPosition, height } = timeBlock;
  
  const getPriceDisplay = (priceLevel: string) => {
    const levels: Record<string, string> = {
      '1': '$',
      '2': '$$',
      '3': '$$$',
      '4': '$$$$',
    };
    return levels[priceLevel] || '';
  };


  return (
    <div 
      className={cn("absolute left-16 right-4 z-10", className)}
      style={{ 
        top: startPosition,
        height: Math.max(height, 50) // Minimum height for readability
      }}
    >
      {/* Travel time indicator */}
      {showTravelTime && travelTime && (
        <div className="mb-1 text-xs text-ink-500 flex items-center gap-1">
          <Clock className="h-3 w-3" />
          {travelTime} travel
        </div>
      )}
      
      <Card 
        className={cn(
          "group h-full cursor-pointer transition-all duration-200",
          "bg-bg-0 border border-stroke-200 hover:shadow-card border-l-4",
          isSelected && "ring-2 ring-brand-500 bg-brand-500/10",
          isEditing && "ring-2 ring-amber-500",
          // Color coding based on activity type
          activity.activity?.types?.includes('restaurant') && "border-l-amber-500",
          activity.activity?.types?.includes('tourist_attraction') && "border-l-teal-500",
          activity.activity?.types?.includes('lodging') && "border-l-brand-500",
          !activity.activity?.types && "border-l-stroke-200"
        )}
        onClick={onSelect}
      >
        <CardContent className="p-3 h-full flex flex-col">
          {/* Header with title and controls */}
          <div className="flex items-start justify-between gap-2 mb-2">
            <div className="flex-1 min-w-0">
              <h4 className="font-semibold text-sm leading-tight line-clamp-2">
                {activity.activity?.name || 'Unnamed Activity'}
              </h4>
              
              {/* Time display */}
              <div className="flex items-center gap-2 mt-1 text-xs text-ink-500 dark:text-white/60">
                <Clock className="h-3 w-3" />
                <span>
                  {formatTimeRange(startTime, endTime, duration)}
                </span>
              </div>
            </div>
            
            {/* Action buttons */}
            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              {onEdit && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    onEdit();
                  }}
                  className="h-7 w-7 p-0 text-ink-500 hover:text-ink-700"
                >
                  <Edit3 className="h-3 w-3" />
                </Button>
              )}
              {onDelete && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete();
                  }}
                  className="h-7 w-7 p-0 text-coral-500 hover:text-coral-500/80"
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              )}
            </div>
          </div>
          
          {/* Content */}
          <div className="flex-1 space-y-1">
            {/* Address */}
            {activity.activity?.address && (
              <div className="flex items-center gap-1 text-xs text-ink-500 dark:text-white/60">
                <MapPin className="h-3 w-3 flex-shrink-0" />
                <span className="truncate">{activity.activity.address}</span>
              </div>
            )}
            
            {/* Tags and metadata */}
            <div className="flex flex-wrap gap-1 items-center">
              {/* Category */}
              {activity.activity?.types && activity.activity.types.length > 0 && (
                <Badge variant="secondary" className="text-xs px-1 py-0">
                  {formatCategoryType(activity.activity.types[0])}
                </Badge>
              )}
              
              {/* Rating */}
              {activity.activity?.rating && (
                <div className="flex items-center gap-0.5 text-xs">
                  <Star className="h-3 w-3 fill-amber-500 text-amber-500" />
                  <span>{activity.activity.rating}</span>
                </div>
              )}
              
              {/* Price */}
              {activity.activity?.price_level && (
                <div className="flex items-center gap-0.5 text-xs">
                  <DollarSign className="h-3 w-3" />
                  <span>{getPriceDisplay(activity.activity.price_level)}</span>
                </div>
              )}
            </div>
            
            {/* Notes */}
            {activity.notes && (
              <div className="text-xs text-ink-700 dark:text-white/80 mt-1 line-clamp-2">
                {activity.notes}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
