"use client";

import React, { useState, memo } from "react";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { 
  ActivityCardProps, 
  isItineraryActivity,
  getActivityData 
} from "./types";
import { 
  VARIANT_CONFIGS, 
  SIZE_CONFIGS, 
  TRANSITIONS 
} from "./constants";
import { 
  getActivityName,
  getActivityTypeColor,
  hasFeature
} from "./utils";
import { ActivityImage } from "./components/ActivityImage";
import { ActivityMetadata } from "./components/ActivityMetadata";
import { ActivityActions } from "./components/ActivityActions";
import { ActivityTimeInfo } from "./components/ActivityTimeInfo";
import { capitalizeFirstLetterOfEachWord } from "@/utils/formatting/capitalise";

export const ActivityCard = memo<ActivityCardProps>(({
  activity,
  variant = 'vertical',
  size = 'md',
  className,
  
  // States
  isSelected = false,
  isHovered: externalHovered = false,
  isDragging = false,
  isEditing = false,
  isLoading = false,
  
  // Event handlers
  onClick,
  onEdit,
  onDelete,
  onHover,
  onAddToItinerary,
  onRemoveFromItinerary,
  onOptionsClick,
  
  // Display options
  showTime = true,
  showDate = false,
  showAddress = true,
  showRating = true,
  showPrice = true,
  showCategory = true,
  showNotes = true,
  showTravelTime = false,
  showImage = true,
  showDescription = true,
  showActions = true,
  showSaveButton = false,
  
  // Custom content
  customActions,
  customHeader,
  customFooter,
  customImage,
  
  // Time data
  startTime,
  endTime,
  duration,
  travelTime,
  
  // Styling
  borderColor,
  accentColor,
}) => {
  const [internalHovered, setInternalHovered] = useState(false);
  const hovered = externalHovered || internalHovered;
  
  // Get activity data and configurations
  const activityData = getActivityData(activity);
  const variantConfig = VARIANT_CONFIGS[variant];
  const sizeConfig = SIZE_CONFIGS[size];
  const typeColor = getActivityTypeColor(activityData?.types);
  
  // Determine what to show based on variant
  const shouldShowImage = showImage && !variantConfig.hideImage && hasFeature(activity, 'image');
  const shouldShowDescription = showDescription && !variantConfig.hideDescription && hasFeature(activity, 'description');
  const shouldShowMetadata = !variantConfig.hideAll;
  
  // Handle hover events
  const handleMouseEnter = () => {
    setInternalHovered(true);
    onHover?.(true);
  };
  
  const handleMouseLeave = () => {
    setInternalHovered(false);
    onHover?.(false);
  };
  
  // Get time display data
  const displayStartTime = startTime || (isItineraryActivity(activity) ? activity.start_time : undefined);
  const displayEndTime = endTime || (isItineraryActivity(activity) ? activity.end_time : undefined);
  
  // Build card classes - with consistent heights
  const cardClasses = cn(
    "relative cursor-pointer overflow-hidden rounded-lg shadow-sm border border-gray-200 dark:border-gray-700",
    TRANSITIONS.card,
    "hover:shadow-lg hover:border-gray-300 dark:hover:border-gray-600",
    variantConfig.layout,
    variantConfig.cardHeight, // Use consistent cardHeight for all variants
    isSelected && "ring-2 ring-blue-500 border-blue-500",
    isEditing && "ring-2 ring-yellow-500 border-yellow-500",
    isDragging && "opacity-50 shadow-xl scale-105",
    className
  );
  
  // Build content classes - no padding for full image coverage
  const contentClasses = cn(
    "flex h-full p-0",
    variantConfig.layout
  );

  return (
    <div 
      className="relative w-full"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* Travel time indicator */}
      {showTravelTime && travelTime && (
        <ActivityTimeInfo 
          travelTime={travelTime}
          size={size}
          className="mb-1"
        />
      )}
      
      <Card className={cardClasses} onClick={onClick}>
        {/* Custom header */}
        {customHeader}
        
        {/* Main card content */}
        <CardContent className={contentClasses}>
          {/* Image section for vertical and horizontal-full variants */}
          {shouldShowImage && (variant === 'vertical' || variant === 'horizontal-full') && (
            <div className={cn(
              "relative flex-shrink-0",
              variant === 'vertical' ? 'w-full' : variantConfig.imageWidth,
              variant === 'vertical' ? variantConfig.imageHeight : variantConfig.imageHeight
            )}>
              {customImage || (
                <ActivityImage 
                  activity={activityData!}
                  variant={variant}
                  showSaveButton={showSaveButton}
                  showPrice={showPrice}
                />
              )}
            </div>
          )}
          
          {/* Content section with proper padding and spacing */}
          <div className={cn(
            "flex-1 min-w-0 p-3 overflow-hidden", // Reduced padding from p-4 to p-3, added overflow-hidden
            variant === 'horizontal-full' && "relative",
            "flex flex-col gap-1.5" // Reduced gap from 2 to 1.5 for better space utilization
          )}>
            {/* Title and actions row */}
            <div className="flex items-start justify-between gap-2">
              <h4 className="font-semibold text-sm leading-tight text-gray-900 dark:text-gray-100 line-clamp-2 flex-1">
                {capitalizeFirstLetterOfEachWord(getActivityName(activity))}
              </h4>
              
              {/* Inline actions for some variants */}
              {showActions && variant !== 'vertical' && (
                <div className="flex-shrink-0">
                  {customActions || (
                    <ActivityActions
                      isAdded={false}
                      isLoading={isLoading}
                      onAdd={onAddToItinerary}
                      onRemove={onRemoveFromItinerary}
                      onOptions={onOptionsClick}
                      onEdit={onEdit}
                      onDelete={onDelete}
                      variant="inline"
                      size={size}
                      showHoverOnly={false}
                    />
                  )}
                </div>
              )}
            </div>
            
            {/* Address - moved higher for better hierarchy */}
            {showAddress && activityData?.address && shouldShowMetadata && (
              <div className="flex items-center gap-1 text-xs text-gray-600 dark:text-gray-400">
                <svg className="w-3 h-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <span className="truncate">{activityData.address}</span>
              </div>
            )}
            
            {/* Metadata row - improved spacing and styling */}
            {shouldShowMetadata && (
              <div className="flex items-center gap-3">
                <ActivityMetadata
                  activity={activityData!}
                  showRating={showRating}
                  showPrice={showPrice}
                  showCategory={showCategory}
                  size={size}
                />
              </div>
            )}
            
            {/* Description - better typography */}
            {shouldShowDescription && activityData?.description && (
              <div className="text-xs text-gray-600 dark:text-gray-400 line-clamp-2 leading-relaxed">
                {activityData.description}
              </div>
            )}
            
            {/* Time display */}
            {showTime && (displayStartTime || displayEndTime) && shouldShowMetadata && (
              <div className="flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400 font-medium">
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <ActivityTimeInfo
                  startTime={displayStartTime}
                  endTime={displayEndTime}
                  duration={duration}
                  size={size}
                />
              </div>
            )}
            
            {/* Notes for itinerary activities */}
            {showNotes && isItineraryActivity(activity) && activity.notes && (
              <div className="text-xs text-gray-700 dark:text-gray-300 line-clamp-1 italic border-l-2 border-gray-200 pl-2">
                {activity.notes}
              </div>
            )}
          </div>
        </CardContent>
        
        {/* Footer actions for vertical variant */}
        {showActions && variant === 'vertical' && (
          <CardFooter className="p-2 border-t border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/50">
            {customFooter || (
              <ActivityActions
                isAdded={false}
                isLoading={isLoading}
                onAdd={onAddToItinerary}
                onRemove={onRemoveFromItinerary}
                onOptions={onOptionsClick}
                variant="default"
                size={size}
                className="w-full"
              />
            )}
          </CardFooter>
        )}
        
        {/* Custom footer for other variants */}
        {customFooter && variant !== 'vertical' && customFooter}
      </Card>
    </div>
  );
});

ActivityCard.displayName = 'ActivityCard';