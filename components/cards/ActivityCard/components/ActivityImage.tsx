"use client";

import React from "react";
import Image from "next/image";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ImageIcon } from "lucide-react";
import SavePlaceButton from "@/components/wishlist/SavePlaceButton";
import { type IActivity } from "@/store/activityStore";
import { formatPriceLevel, getActivityPhotoUrls } from "../utils";
import { cn } from "@/lib/utils";

interface ActivityImageProps {
  activity: IActivity;
  variant: 'vertical' | 'horizontal-full';
  showSaveButton?: boolean;
  showPrice?: boolean;
  className?: string;
  loading?: boolean;
}

export const ActivityImage: React.FC<ActivityImageProps> = ({
  activity,
  variant,
  showSaveButton = false,
  showPrice = true,
  className,
  loading = false
}) => {
  const photoUrls = getActivityPhotoUrls({ ...activity });
  const hasImage = photoUrls.length > 0;
  const priceText = formatPriceLevel(activity.price_level);
  
  const imageClasses = cn(
    "h-full w-full object-cover",
    variant === 'vertical' ? "rounded-t-lg" : "rounded-l-lg",
    className
  );
  
  const containerClasses = cn(
    "h-full w-full",
    variant === 'vertical' ? "rounded-t-lg" : ""
  );

  if (loading) {
    return (
      <Skeleton className={cn("flex items-center justify-center", containerClasses)}>
        <ImageIcon size={32} className="text-zinc-300" />
      </Skeleton>
    );
  }

  return (
    <div className="relative h-full w-full">
      {hasImage ? (
        <div className={containerClasses}>
          <Image
            src={photoUrls[0]}
            alt={activity.name}
            width={1920}
            height={1080}
            priority
            className={imageClasses}
          />
        </div>
      ) : (
        <div className={cn(
          "bg-gray-200 flex items-center justify-center",
          containerClasses
        )}>
          <span className="text-gray-500">No image available</span>
        </div>
      )}
      
      {/* Price badge */}
      {showPrice && priceText && (
        <div className={cn(
          "absolute",
          variant === 'vertical' ? "top-2 left-2" : "bottom-2 left-2"
        )}>
          <Badge className="bg-[#3A86FF]/40 backdrop-blur-sm">
            {priceText}
          </Badge>
        </div>
      )}
      
      {/* Save button */}
      {showSaveButton && (
        <div className="absolute top-2 right-2">
          <SavePlaceButton 
            placeId={activity.place_id}
            activityData={{
              place_id: activity.place_id,
              name: activity.name,
              address: activity.address,
              coordinates: activity.coordinates ? {
                lat: activity.coordinates[0],
                lng: activity.coordinates[1]
              } : undefined,
              types: activity.types || [],
              price_level: activity.price_level,
              rating: activity.rating,
              description: activity.description,
              google_maps_url: activity.google_maps_url,
              website_url: activity.website_url,
              photo_names: activity.photo_names || [],
              phone_number: activity.phone_number,
              duration: activity.duration || undefined
            }}
            variant="icon"
            size="sm"
            className="bg-white/80 hover:bg-white shadow-sm"
          />
        </div>
      )}
    </div>
  );
};