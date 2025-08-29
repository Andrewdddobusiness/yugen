"use client";

import React from "react";
import Image from "next/image";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ImageIcon } from "lucide-react";
import { type IActivity } from "@/store/activityStore";
import { formatPriceLevel, getActivityPhotoUrls } from "../utils";
import { cn } from "@/lib/utils";

interface ActivityImageProps {
  activity: IActivity;
  variant: 'vertical' | 'horizontal-full';
  showPrice?: boolean;
  className?: string;
  loading?: boolean;
}

export const ActivityImage: React.FC<ActivityImageProps> = ({
  activity,
  variant,
  showPrice = true,
  className,
  loading = false
}) => {
  const photoUrls = getActivityPhotoUrls({ ...activity });
  const hasImage = photoUrls.length > 0;
  const priceText = formatPriceLevel(activity.price_level);
  
  const imageClasses = cn(
    "h-full w-full object-cover object-center", // Added object-center for better cropping
    variant === 'vertical' ? "rounded-t-lg" : "rounded-l-lg",
    className
  );
  
  const containerClasses = cn(
    "h-full w-full overflow-hidden",
    variant === 'vertical' ? "rounded-t-lg" : "rounded-l-lg"
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
          variant === 'vertical' ? "top-3 right-3" : "top-3 right-3"
        )}>
          <Badge className="bg-white/90 text-gray-700 shadow-sm backdrop-blur-sm font-medium">
            {priceText}
          </Badge>
        </div>
      )}
    </div>
  );
};