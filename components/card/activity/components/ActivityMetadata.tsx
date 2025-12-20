"use client";

import React from "react";
import { Star, DollarSign } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import Rating from "@/components/rating/Rating";
import { type ActivityMetadataProps } from "../types";
import { formatPriceLevel, getActivityTypeColor } from "../utils";
import { formatCategoryType } from "@/utils/formatting/types";
import { SIZE_CONFIGS } from "../constants";
import { cn } from "@/lib/utils";

export const ActivityMetadata: React.FC<ActivityMetadataProps> = ({
  activity,
  showRating = true,
  showPrice = true,
  showCategory = true,
  showDuration = false,
  size = 'md',
  className
}) => {
  const sizeConfig = SIZE_CONFIGS[size];
  const typeColor = getActivityTypeColor(activity.types);
  const priceText = formatPriceLevel(activity.price_level);
  
  const hasAnyMetadata = (
    (showRating && activity.rating) ||
    (showPrice && priceText) ||
    (showCategory && activity.types?.length > 0) ||
    (showDuration && activity.duration)
  );
  
  if (!hasAnyMetadata) return null;

  return (
    <div className={cn("flex flex-wrap items-center", sizeConfig.gap, className)}>
      {/* Category badge */}
      {showCategory && activity.types && activity.types.length > 0 && (
        <Badge 
          variant="secondary" 
          className={cn(
            "px-1.5 py-0.5",
            sizeConfig.text,
            typeColor.badge
          )}
        >
          {formatCategoryType(activity.types[0])}
        </Badge>
      )}
      
      {/* Rating */}
      {showRating && activity.rating && (
        <div className={cn("flex items-center gap-1", sizeConfig.text)}>
          {size === 'sm' ? (
            <>
              <Star className={cn(sizeConfig.icon, "fill-yellow-400 text-yellow-400")} />
              <span>{activity.rating}</span>
            </>
          ) : (
            <>
              <Rating rating={activity.rating} />
              <span className="ml-1 text-zinc-500">{activity.rating}</span>
            </>
          )}
        </div>
      )}
      
      {/* Price */}
      {showPrice && priceText && (
        <div className={cn("flex items-center", sizeConfig.text)}>
          {size === 'sm' ? (
            <span className="font-medium">{priceText}</span>
          ) : (
            <>
              <DollarSign className={sizeConfig.icon} />
              <span>{priceText}</span>
            </>
          )}
        </div>
      )}
      
      {/* Duration */}
      {showDuration && activity.duration && (
        <Badge variant="outline" className={cn("px-1.5 py-0.5", sizeConfig.text)}>
          {activity.duration} min
        </Badge>
      )}
    </div>
  );
};