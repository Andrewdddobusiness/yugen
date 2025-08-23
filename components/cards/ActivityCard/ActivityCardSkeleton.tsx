"use client";

import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { type ActivityCardSkeletonProps } from "./types";
import { VARIANT_CONFIGS, SIZE_CONFIGS } from "./constants";
import { cn } from "@/lib/utils";

export const ActivityCardSkeleton: React.FC<ActivityCardSkeletonProps> = ({
  variant = 'vertical',
  size = 'md',
  className
}) => {
  const variantConfig = VARIANT_CONFIGS[variant];
  const sizeConfig = SIZE_CONFIGS[size];
  
  // Vertical card skeleton
  if (variant === 'vertical') {
    return (
      <Card className={cn("flex flex-col w-full h-[365px]", className)}>
        <Skeleton className="w-full h-40 rounded-t-lg rounded-b-none" />
        <CardContent className={cn("flex flex-col gap-2 mt-5 flex-grow", sizeConfig.padding)}>
          <Skeleton className="h-6 w-3/4" />
          <div className="flex items-center gap-2">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-4 w-8" />
          </div>
          <div className="flex gap-2">
            <Skeleton className="h-6 w-16 rounded-full" />
            <Skeleton className="h-6 w-20 rounded-full" />
          </div>
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-2/3" />
        </CardContent>
        <div className="p-0 h-10 w-full">
          <Skeleton className="h-full w-full rounded-t-none" />
        </div>
      </Card>
    );
  }
  
  // Horizontal full skeleton
  if (variant === 'horizontal-full') {
    return (
      <Card className={cn("flex flex-row w-full h-[200px]", className)}>
        <Skeleton className="w-[250px] h-full rounded-r-none" />
        <CardContent className={cn("flex flex-col gap-2 flex-grow", sizeConfig.padding)}>
          <div className="flex justify-between">
            <Skeleton className="h-6 w-2/3" />
            <div className="flex gap-2">
              <Skeleton className="h-8 w-20" />
              <Skeleton className="h-8 w-8" />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-4 w-8" />
          </div>
          <div className="flex gap-2">
            <Skeleton className="h-6 w-16 rounded-full" />
          </div>
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
        </CardContent>
      </Card>
    );
  }
  
  // Horizontal simple skeleton
  if (variant === 'horizontal-simple') {
    return (
      <Card className={cn("flex flex-row items-center justify-between w-full h-16 px-4", className)}>
        <Skeleton className="h-5 w-1/3" />
        <div className="flex gap-2">
          <Skeleton className="h-8 w-20" />
          <Skeleton className="h-8 w-8" />
        </div>
      </Card>
    );
  }
  
  // Compact skeleton
  if (variant === 'compact') {
    return (
      <Card className={cn("flex flex-row items-center w-full h-12 px-3", className)}>
        <Skeleton className="h-4 w-1/2" />
      </Card>
    );
  }
  
  // Timeblock skeleton
  return (
    <Card className={cn("flex flex-col p-2 w-full", className)}>
      <Skeleton className="h-4 w-3/4 mb-1" />
      <Skeleton className="h-3 w-1/2 mb-2" />
      <div className="flex gap-1">
        <Skeleton className="h-5 w-12 rounded-full" />
        <Skeleton className="h-5 w-10 rounded-full" />
      </div>
    </Card>
  );
};