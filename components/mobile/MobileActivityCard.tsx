"use client";

import React, { useState } from 'react';
import { Clock, MapPin, Star, DollarSign, Phone, Globe, Edit3, Trash2, GripVertical, ChevronRight, ChevronDown } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';
import { formatCategoryType } from '@/utils/formatting/types';

interface MobileActivityCardProps {
  activity: any;
  index?: number;
  showTime?: boolean;
  isDragging?: boolean;
  isSelected?: boolean;
  onSelect?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  dragHandleProps?: any;
  onClick?: () => void;
  className?: string;
}

export function MobileActivityCard({
  activity,
  index,
  showTime = true,
  isDragging = false,
  isSelected = false,
  onSelect,
  onEdit,
  onDelete,
  dragHandleProps,
  onClick,
  className,
}: MobileActivityCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const getPriceDisplay = (priceLevel: string) => {
    const levels: Record<string, string> = {
      '1': '$',
      '2': '$$',
      '3': '$$$',
      '4': '$$$$',
    };
    return levels[priceLevel] || '';
  };

  const formatTime = (time: string) => {
    try {
      const [hours, minutes] = time.split(':').map(Number);
      const date = new Date();
      date.setHours(hours, minutes);
      return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
    } catch {
      return time;
    }
  };

  return (
    <Card 
      className={cn(
        "transition-all duration-200 touch-manipulation",
        isDragging && "opacity-50 scale-95",
        isSelected && "ring-2 ring-blue-500 bg-blue-50/30 dark:bg-blue-900/20",
        className
      )}
      onClick={onClick}
    >
      <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
        <CollapsibleTrigger asChild>
          <div className="w-full">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                {/* Drag Handle */}
                {dragHandleProps && (
                  <div
                    {...dragHandleProps}
                    className="flex items-center justify-center w-8 h-8 touch-none cursor-grab active:cursor-grabbing mt-1"
                  >
                    <GripVertical className="h-4 w-4 text-gray-400" />
                  </div>
                )}

                {/* Main Content */}
                <div className="flex-1 min-w-0">
                  {/* Header Row */}
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1 min-w-0">
                      {/* Time Badge */}
                      {showTime && activity.start_time && (
                        <Badge variant="outline" className="mb-1 text-xs">
                          <Clock className="h-3 w-3 mr-1" />
                          {formatTime(activity.start_time)}
                          {activity.end_time && ` - ${formatTime(activity.end_time)}`}
                        </Badge>
                      )}
                      
                      {/* Activity Name */}
                      <h3 className="font-semibold text-base leading-tight line-clamp-2 text-gray-900 dark:text-gray-100">
                        {activity.activity?.name || 'Unnamed Activity'}
                      </h3>
                    </div>
                    
                    {/* Expand Arrow */}
                    <Button
                      variant="ghost"
                      size="sm"
                      className="p-1 h-8 w-8 ml-2 flex-shrink-0"
                    >
                      {isExpanded ? (
                        <ChevronDown className="h-4 w-4" />
                      ) : (
                        <ChevronRight className="h-4 w-4" />
                      )}
                    </Button>
                  </div>

                  {/* Quick Info Row */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 text-sm text-gray-600 dark:text-gray-400">
                      {/* Category */}
                      {activity.activity?.types && activity.activity.types.length > 0 && (
                        <Badge variant="secondary" className="text-xs px-2 py-0.5">
                          {formatCategoryType(activity.activity.types[0])}
                        </Badge>
                      )}
                      
                      {/* Rating */}
                      {activity.activity?.rating && (
                        <div className="flex items-center gap-1">
                          <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                          <span className="text-xs font-medium">{activity.activity.rating}</span>
                        </div>
                      )}
                      
                      {/* Price */}
                      {activity.activity?.price_level && (
                        <div className="flex items-center">
                          <span className="text-xs font-medium text-green-600">
                            {getPriceDisplay(activity.activity.price_level)}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Quick Actions */}
                    <div className="flex gap-1">
                      {onEdit && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            onEdit();
                          }}
                          className="h-8 w-8 p-0"
                        >
                          <Edit3 className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                  </div>

                  {/* Address - Always visible on mobile */}
                  {activity.activity?.address && (
                    <div className="flex items-start gap-1 mt-2 text-xs text-gray-600 dark:text-gray-400">
                      <MapPin className="h-3 w-3 mt-0.5 flex-shrink-0" />
                      <span className="line-clamp-1">{activity.activity.address}</span>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </div>
        </CollapsibleTrigger>

        {/* Expanded Content */}
        <CollapsibleContent>
          <div className="px-4 pb-4 border-t border-gray-100 dark:border-gray-700">
            <div className="pt-3 space-y-3">
              {/* Notes */}
              {activity.notes && (
                <div className="space-y-1">
                  <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">Notes</h4>
                  <p className="text-sm text-gray-600 dark:text-gray-400">{activity.notes}</p>
                </div>
              )}

              {/* Contact Info */}
              {(activity.activity?.phone_number || activity.activity?.website_url) && (
                <div className="space-y-2">
                  <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">Contact</h4>
                  
                  {activity.activity.phone_number && (
                    <div className="flex items-center gap-2">
                      <Phone className="h-3 w-3 text-gray-400" />
                      <a 
                        href={`tel:${activity.activity.phone_number}`}
                        className="text-sm text-blue-600 hover:underline"
                      >
                        {activity.activity.phone_number}
                      </a>
                    </div>
                  )}
                  
                  {activity.activity.website_url && (
                    <div className="flex items-center gap-2">
                      <Globe className="h-3 w-3 text-gray-400" />
                      <a 
                        href={activity.activity.website_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-blue-600 hover:underline"
                      >
                        Website
                      </a>
                    </div>
                  )}
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-2 pt-2">
                {onSelect && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelect();
                    }}
                    className="flex-1"
                  >
                    {isSelected ? 'Deselect' : 'Select'}
                  </Button>
                )}
                
                {onEdit && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      onEdit();
                    }}
                    className="flex-1"
                  >
                    <Edit3 className="h-3 w-3 mr-1" />
                    Edit
                  </Button>
                )}
                
                {onDelete && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDelete();
                    }}
                    className="flex-1 text-red-600 hover:text-red-700"
                  >
                    <Trash2 className="h-3 w-3 mr-1" />
                    Delete
                  </Button>
                )}
              </div>
            </div>
          </div>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}

// Compact version for dense lists
export function MobileActivityCardCompact({
  activity,
  showTime = true,
  isSelected = false,
  onTap,
  className,
}: {
  activity: any;
  showTime?: boolean;
  isSelected?: boolean;
  onTap?: () => void;
  className?: string;
}) {
  return (
    <div
      onClick={onTap}
      className={cn(
        "flex items-center gap-3 p-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg",
        "active:bg-gray-50 dark:active:bg-gray-700 transition-colors touch-manipulation cursor-pointer",
        isSelected && "ring-2 ring-blue-500 bg-blue-50/30 dark:bg-blue-900/20",
        className
      )}
    >
      {/* Time */}
      {showTime && activity.start_time && (
        <div className="text-xs text-gray-500 min-w-[50px] text-center">
          {activity.start_time.slice(0, 5)}
        </div>
      )}

      {/* Content */}
      <div className="flex-1 min-w-0">
        <h4 className="font-medium text-sm line-clamp-1 text-gray-900 dark:text-gray-100">
          {activity.activity?.name || 'Unnamed Activity'}
        </h4>
        
        <div className="flex items-center gap-2 mt-1">
          {activity.activity?.types && activity.activity.types.length > 0 && (
            <Badge variant="secondary" className="text-xs px-1 py-0">
              {formatCategoryType(activity.activity.types[0])}
            </Badge>
          )}
          
          {activity.activity?.rating && (
            <div className="flex items-center gap-0.5">
              <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
              <span className="text-xs">{activity.activity.rating}</span>
            </div>
          )}
        </div>
      </div>

      {/* Chevron */}
      <ChevronRight className="h-4 w-4 text-gray-400 flex-shrink-0" />
    </div>
  );
}