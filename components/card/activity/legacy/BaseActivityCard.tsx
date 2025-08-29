"use client";

import React, { useState } from "react";
import { Clock, MapPin, Star, DollarSign, Edit3, Trash2, Loader2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { capitalizeFirstLetterOfEachWord } from "@/utils/formatting/capitalise";
import { formatCategoryType } from "@/utils/formatting/types";
import { formatTimeRange, formatDuration, formatTime } from "@/utils/formatting/time";
import { type IItineraryActivity } from "@/store/itineraryActivityStore";

export interface BaseActivityCardProps {
  activity: IItineraryActivity;
  className?: string;
  variant?: "list" | "timeblock" | "compact";
  
  // Interaction states
  isSelected?: boolean;
  isHovered?: boolean;
  isDragging?: boolean;
  isEditing?: boolean;
  isLoading?: boolean;
  
  // Event handlers
  onClick?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  onHover?: (hovered: boolean) => void;
  
  // Display options
  showTime?: boolean;
  showDate?: boolean;
  showAddress?: boolean;
  showRating?: boolean;
  showPrice?: boolean;
  showCategory?: boolean;
  showNotes?: boolean;
  showTravelTime?: boolean;
  
  // Layout options  
  orientation?: "horizontal" | "vertical";
  size?: "sm" | "md" | "lg";
  
  // Custom content
  customActions?: React.ReactNode;
  customHeader?: React.ReactNode;
  customFooter?: React.ReactNode;
  
  // Time/duration data
  startTime?: string;
  endTime?: string;
  duration?: number;
  travelTime?: string;
  
  // Additional styling
  borderColor?: string;
  accentColor?: string;
}

export const BaseActivityCard: React.FC<BaseActivityCardProps> = ({
  activity,
  className,
  variant = "list",
  isSelected = false,
  isHovered = false,
  isDragging = false,
  isEditing = false,
  isLoading = false,
  onClick,
  onEdit,
  onDelete,
  onHover,
  showTime = true,
  showDate = false,
  showAddress = true,
  showRating = true,
  showPrice = true,
  showCategory = true,
  showNotes = true,
  showTravelTime = false,
  orientation = "horizontal",
  size = "md",
  customActions,
  customHeader,
  customFooter,
  startTime,
  endTime,
  duration,
  travelTime,
  borderColor,
  accentColor,
}) => {
  const [internalHovered, setInternalHovered] = useState(false);
  const hovered = isHovered || internalHovered;
  
  // Use provided times or fallback to activity times
  const displayStartTime = startTime || activity.start_time;
  const displayEndTime = endTime || activity.end_time;
  
  // Price level display helper
  const getPriceDisplay = (priceLevel: string) => {
    const levels: Record<string, string> = {
      '1': '$',
      '2': '$$', 
      '3': '$$$',
      '4': '$$$$',
    };
    return levels[priceLevel] || '';
  };

  // Get category color for border
  const getCategoryBorderColor = () => {
    if (borderColor) return borderColor;
    if (!activity.activity?.types?.length) return "border-l-gray-400";
    
    const types = activity.activity.types;
    if (types.includes('restaurant')) return "border-l-orange-500";
    if (types.includes('tourist_attraction')) return "border-l-purple-500";
    if (types.includes('lodging')) return "border-l-blue-500";
    return "border-l-gray-400";
  };

  const handleMouseEnter = () => {
    setInternalHovered(true);
    onHover?.(true);
  };

  const handleMouseLeave = () => {
    setInternalHovered(false);
    onHover?.(false);
  };

  const sizeClasses = {
    sm: "text-xs p-2",
    md: "text-sm p-3", 
    lg: "text-base p-4"
  };

  return (
    <div 
      className={cn("relative", className)}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* Travel time indicator */}
      {showTravelTime && travelTime && (
        <div className="mb-1 text-xs text-gray-500 flex items-center gap-1">
          <Clock className="h-3 w-3" />
          {travelTime}
        </div>
      )}

      <Card 
        className={cn(
          "cursor-pointer transition-all duration-200 hover:shadow-md",
          "border-l-4", getCategoryBorderColor(),
          isSelected && "ring-2 ring-blue-500 bg-blue-50/30 dark:bg-blue-900/20",
          isEditing && "ring-2 ring-yellow-500",
          isDragging && "opacity-50 shadow-lg",
          orientation === "horizontal" ? "flex-row" : "flex-col"
        )}
        onClick={onClick}
      >
        <CardContent className={cn("flex h-full", sizeClasses[size])}>
          {/* Custom Header */}
          {customHeader}
          
          <div className={cn(
            "flex w-full gap-3",
            orientation === "horizontal" ? "flex-row items-center" : "flex-col"
          )}>
            {/* Main Content */}
            <div className="flex-1 min-w-0 space-y-2">
              {/* Activity Title */}
              <div className="flex items-start justify-between gap-2">
                <h4 className={cn(
                  "font-semibold leading-tight",
                  orientation === "horizontal" ? "line-clamp-1" : "line-clamp-2",
                  size === "sm" ? "text-xs" : size === "lg" ? "text-base" : "text-sm"
                )}>
                  {capitalizeFirstLetterOfEachWord(activity.activity?.name || "Unnamed Activity")}
                </h4>
                
                {/* Action buttons */}
                <div className={cn(
                  "flex gap-1 transition-opacity",
                  variant !== "compact" && "opacity-0 group-hover:opacity-100"
                )}>
                  {customActions}
                  {onEdit && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        onEdit();
                      }}
                      className="h-6 w-6 p-0"
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
                      className="h-6 w-6 p-0 text-red-500 hover:text-red-700"
                      disabled={isLoading}
                    >
                      {isLoading ? 
                        <Loader2 className="h-3 w-3 animate-spin" /> : 
                        <Trash2 className="h-3 w-3" />
                      }
                    </Button>
                  )}
                </div>
              </div>

              {/* Time Display */}
              {showTime && (displayStartTime || displayEndTime) && (
                <div className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400">
                  <Clock className="h-3 w-3" />
                  <span>
                    {formatTimeRange(displayStartTime, displayEndTime, duration)}
                  </span>
                </div>
              )}

              {/* Address */}
              {showAddress && activity.activity?.address && (
                <div className="flex items-center gap-1 text-xs text-gray-600 dark:text-gray-400">
                  <MapPin className="h-3 w-3 flex-shrink-0" />
                  <span className="truncate">{activity.activity.address}</span>
                </div>
              )}
              
              {/* Metadata Row */}
              <div className="flex flex-wrap gap-1 items-center">
                {/* Category */}
                {showCategory && activity.activity?.types && activity.activity.types.length > 0 && (
                  <Badge variant="secondary" className="text-xs px-1 py-0">
                    {formatCategoryType(activity.activity.types[0])}
                  </Badge>
                )}
                
                {/* Rating */}
                {showRating && activity.activity?.rating && (
                  <div className="flex items-center gap-0.5 text-xs">
                    <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                    <span>{activity.activity.rating}</span>
                  </div>
                )}
                
                {/* Price */}
                {showPrice && activity.activity?.price_level && (
                  <div className="flex items-center gap-0.5 text-xs">
                    <DollarSign className="h-3 w-3" />
                    <span>{getPriceDisplay(activity.activity.price_level)}</span>
                  </div>
                )}
              </div>
              
              {/* Notes */}
              {showNotes && activity.notes && (
                <div className="text-xs text-gray-700 dark:text-gray-300 line-clamp-2">
                  {activity.notes}
                </div>
              )}
            </div>
          </div>

          {/* Custom Footer */}
          {customFooter}
        </CardContent>
      </Card>
    </div>
  );
};