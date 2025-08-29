"use client";

import React from "react";
import { Clock, MapPin } from "lucide-react";
import { formatTimeRange, formatTime } from "@/utils/formatting/time";
import { SIZE_CONFIGS } from "../constants";
import { cn } from "@/lib/utils";

interface ActivityTimeInfoProps {
  startTime?: string;
  endTime?: string;
  duration?: number;
  travelTime?: string;
  address?: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const ActivityTimeInfo: React.FC<ActivityTimeInfoProps> = ({
  startTime,
  endTime,
  duration,
  travelTime,
  address,
  size = 'md',
  className
}) => {
  const sizeConfig = SIZE_CONFIGS[size];
  
  if (travelTime) {
    return (
      <div className={cn(
        "text-gray-500 flex items-center gap-1",
        sizeConfig.text,
        className
      )}>
        <Clock className={sizeConfig.icon} />
        {travelTime}
      </div>
    );
  }
  
  if (address) {
    return (
      <div className={cn(
        "text-gray-600 dark:text-gray-400 flex items-center gap-1",
        sizeConfig.text,
        className
      )}>
        <MapPin className={cn(sizeConfig.icon, "flex-shrink-0")} />
        <span className="truncate">{address}</span>
      </div>
    );
  }
  
  if (startTime || endTime) {
    return (
      <div className={cn(
        "text-gray-600 dark:text-gray-400 flex items-center gap-2",
        sizeConfig.text,
        className
      )}>
        <Clock className={sizeConfig.icon} />
        <span>
          {formatTimeRange(startTime, endTime, duration)}
        </span>
      </div>
    );
  }
  
  return null;
};