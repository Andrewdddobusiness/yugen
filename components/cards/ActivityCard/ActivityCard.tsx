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
  
  // Build card classes
  const cardClasses = cn(
    "relative cursor-pointer",
    TRANSITIONS.card,
    TRANSITIONS.hover,
    "border-l-4",
    borderColor || typeColor.border,
    variantConfig.layout,
    variantConfig.height,
    isSelected && TRANSITIONS.selected,
    isEditing && TRANSITIONS.editing,
    isDragging && TRANSITIONS.drag,
    className
  );
  
  // Build content classes
  const contentClasses = cn(
    "flex h-full",
    sizeConfig.padding,
    variantConfig.contentSpacing,
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
              variant === 'vertical' ? 'relative w-full' : 'relative flex-shrink-0',
              variant === 'vertical' ? variantConfig.imageHeight : variantConfig.imageWidth
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
          
          {/* Content section */}
          <div className={cn(
            "flex-1 min-w-0",
            variant === 'horizontal-full' && "relative",
            sizeConfig.gap
          )}>
            {/* Title and actions row */}
            <div className="flex items-start justify-between gap-2">
              <h4 className={cn(
                "font-semibold leading-tight",
                sizeConfig.title,
                variantConfig.titleClamp
              )}>
                {capitalizeFirstLetterOfEachWord(getActivityName(activity))}
              </h4>
              
              {/* Inline actions for some variants */}
              {showActions && variant !== 'vertical' && (
                <div className={cn(
                  "flex-shrink-0",
                  variant === 'horizontal-full' && "absolute top-0 right-0"
                )}>
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
                      showHoverOnly={variant === 'horizontal-full'}
                    />
                  )}
                </div>
              )}
            </div>
            
            {/* Time display */}
            {showTime && (displayStartTime || displayEndTime) && shouldShowMetadata && (
              <ActivityTimeInfo
                startTime={displayStartTime}
                endTime={displayEndTime}
                duration={duration}
                size={size}
              />
            )}
            
            {/* Address */}
            {showAddress && activityData?.address && shouldShowMetadata && (
              <ActivityTimeInfo
                address={activityData.address}
                size={size}
              />
            )}
            
            {/* Metadata row */}
            {shouldShowMetadata && (
              <ActivityMetadata
                activity={activityData!}
                showRating={showRating}
                showPrice={showPrice}
                showCategory={showCategory}
                size={size}
              />
            )}
            
            {/* Description */}
            {shouldShowDescription && activityData?.description && (
              <div className={cn(
                "text-gray-500",
                sizeConfig.text,
                variantConfig.descriptionClamp
              )}>
                {activityData.description}
              </div>
            )}
            
            {/* Notes for itinerary activities */}
            {showNotes && isItineraryActivity(activity) && activity.notes && (
              <div className={cn(
                "text-gray-700 dark:text-gray-300",
                sizeConfig.text,
                "line-clamp-2"
              )}>
                {activity.notes}
              </div>
            )}
          </div>
        </CardContent>
        
        {/* Footer actions for vertical variant */}
        {showActions && variant === 'vertical' && (
          <CardFooter className="p-0 absolute bottom-0 left-0 right-0 z-20">
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