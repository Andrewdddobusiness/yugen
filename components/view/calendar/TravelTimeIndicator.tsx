"use client";

import React, { useMemo } from 'react';
import { Car, MapPin, Clock, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { estimateTravelTime } from '@/utils/calendar/durationEstimation';

interface TravelTimeIndicatorProps {
  fromActivity: {
    id: string;
    name: string;
    endTime: string;
    coordinates?: [number, number];
    address?: string;
  };
  toActivity: {
    id: string;
    name: string;
    startTime: string;
    coordinates?: [number, number];
    address?: string;
  };
  mode?: 'walking' | 'driving' | 'transit';
  showBuffer?: boolean;
  bufferMinutes?: number;
  className?: string;
}

interface TravelBlockProps {
  activities: Array<{
    id: string;
    name: string;
    startTime: string;
    endTime: string;
    coordinates?: [number, number];
    address?: string;
  }>;
  timeSlots: Array<{
    time: string;
    hour: number;
    minute: number;
  }>;
  travelMode?: 'walking' | 'driving' | 'transit';
  showBuffer?: boolean;
  bufferMinutes?: number;
  dayIndex: number;
  className?: string;
}

/**
 * Visual indicator for travel time between two activities
 */
export function TravelTimeIndicator({
  fromActivity,
  toActivity,
  mode = 'walking',
  showBuffer = true,
  bufferMinutes = 10,
  className
}: TravelTimeIndicatorProps) {
  const travelInfo = useMemo(() => {
    // Calculate travel time
    const estimatedTime = estimateTravelTime(
      {
        coordinates: fromActivity.coordinates,
        address: fromActivity.address
      },
      {
        coordinates: toActivity.coordinates,
        address: toActivity.address
      },
      mode
    );

    // Calculate available time between activities
    const fromEndMinutes = timeToMinutes(fromActivity.endTime);
    const toStartMinutes = timeToMinutes(toActivity.startTime);
    const availableTime = toStartMinutes - fromEndMinutes;

    // Calculate required time (travel + buffer)
    const requiredTime = estimatedTime + (showBuffer ? bufferMinutes : 0);

    // Determine conflict level
    const conflict = requiredTime > availableTime ? 'high' : 
                    requiredTime > availableTime * 0.8 ? 'medium' : 'none';

    return {
      estimatedTime,
      availableTime,
      requiredTime,
      conflict,
      hasEnoughTime: availableTime >= requiredTime
    };
  }, [fromActivity, toActivity, mode, showBuffer, bufferMinutes]);

  const getModeIcon = () => {
    switch (mode) {
      case 'driving': return <Car className="h-3 w-3" />;
      case 'transit': return <MapPin className="h-3 w-3" />;
      case 'walking':
      default: return <Clock className="h-3 w-3" />;
    }
  };

  const getConflictColor = () => {
    switch (travelInfo.conflict) {
      case 'high': return 'bg-red-100 border-red-200 text-red-700';
      case 'medium': return 'bg-amber-100 border-amber-200 text-amber-700';
      case 'none':
      default: return 'bg-gray-100 border-gray-200 text-gray-600';
    }
  };

  return (
    <div className={cn(
      "flex items-center space-x-2 p-2 rounded border text-xs",
      getConflictColor(),
      className
    )}>
      {getModeIcon()}
      
      <div className="flex-1">
        <div className="flex items-center justify-between">
          <span className="font-medium">
            {travelInfo.estimatedTime}min travel
          </span>
          {travelInfo.conflict !== 'none' && (
            <AlertTriangle className="h-3 w-3" />
          )}
        </div>
        
        <div className="text-xs opacity-75">
          {travelInfo.availableTime}min available
          {showBuffer && ` (incl. ${bufferMinutes}min buffer)`}
        </div>
      </div>
    </div>
  );
}

/**
 * Travel time blocks displayed in the calendar grid
 */
export function TravelBlocks({
  activities,
  timeSlots,
  travelMode = 'walking',
  showBuffer = true,
  bufferMinutes = 10,
  dayIndex,
  className
}: TravelBlockProps) {
  const travelBlocks = useMemo(() => {
    const blocks = [];
    
    // Sort activities by start time
    const sortedActivities = [...activities].sort((a, b) => 
      timeToMinutes(a.startTime) - timeToMinutes(b.startTime)
    );

    for (let i = 0; i < sortedActivities.length - 1; i++) {
      const fromActivity = sortedActivities[i];
      const toActivity = sortedActivities[i + 1];
      
      const fromEndMinutes = timeToMinutes(fromActivity.endTime);
      const toStartMinutes = timeToMinutes(toActivity.startTime);
      const gapMinutes = toStartMinutes - fromEndMinutes;
      
      // Only show travel block if there's a significant gap
      if (gapMinutes >= 15) {
        const travelTime = estimateTravelTime(
          {
            coordinates: fromActivity.coordinates,
            address: fromActivity.address
          },
          {
            coordinates: toActivity.coordinates,
            address: toActivity.address
          },
          travelMode
        );
        
        // Find the time slot positions
        const startSlotIndex = timeSlots.findIndex(slot => {
          const slotMinutes = slot.hour * 60 + slot.minute;
          return slotMinutes >= fromEndMinutes;
        });
        
        if (startSlotIndex !== -1) {
          blocks.push({
            key: `travel-${fromActivity.id}-${toActivity.id}`,
            fromActivity,
            toActivity,
            startSlotIndex,
            travelTime,
            availableTime: gapMinutes,
            conflict: (travelTime + bufferMinutes) > gapMinutes
          });
        }
      }
    }
    
    return blocks;
  }, [activities, timeSlots, travelMode, bufferMinutes]);

  if (!travelBlocks.length) return null;

  return (
    <div className={cn("absolute inset-0 pointer-events-none", className)}>
      {travelBlocks.map((block) => {
        const slotHeight = 48; // 30-minute slot height
        const blockHeight = Math.min(
          Math.floor((block.availableTime / 30) * slotHeight),
          slotHeight * 2 // Max 2 slots
        );
        
        return (
          <div
            key={block.key}
            className={cn(
              "absolute left-1 right-1 rounded border-l-2 bg-opacity-50",
              block.conflict 
                ? "bg-red-50 border-l-red-300" 
                : "bg-blue-50 border-l-blue-300"
            )}
            style={{
              top: `${48 + (block.startSlotIndex * slotHeight)}px`,
              height: `${blockHeight}px`,
              minHeight: '20px'
            }}
          >
            <div className="p-1 text-xs">
              <div className="flex items-center space-x-1 text-gray-600">
                {travelMode === 'driving' && <Car className="h-2 w-2" />}
                {travelMode === 'transit' && <MapPin className="h-2 w-2" />}
                {travelMode === 'walking' && <Clock className="h-2 w-2" />}
                <span className="font-medium">{block.travelTime}m</span>
                {block.conflict && <AlertTriangle className="h-2 w-2 text-red-500" />}
              </div>
              
              {blockHeight > 30 && (
                <div className="text-xs text-gray-500 mt-1">
                  to {block.toActivity.name.slice(0, 20)}
                  {block.toActivity.name.length > 20 && '...'}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

/**
 * Travel time summary for a day
 */
export function TravelTimeSummary({
  activities,
  travelMode = 'walking',
  className
}: {
  activities: Array<{
    id: string;
    name: string;
    startTime: string;
    endTime: string;
    coordinates?: [number, number];
    address?: string;
  }>;
  travelMode?: 'walking' | 'driving' | 'transit';
  className?: string;
}) {
  const summary = useMemo(() => {
    if (activities.length < 2) return null;
    
    const sortedActivities = [...activities].sort((a, b) => 
      timeToMinutes(a.startTime) - timeToMinutes(b.startTime)
    );
    
    let totalTravelTime = 0;
    let conflicts = 0;
    
    for (let i = 0; i < sortedActivities.length - 1; i++) {
      const from = sortedActivities[i];
      const to = sortedActivities[i + 1];
      
      const travelTime = estimateTravelTime(
        { coordinates: from.coordinates, address: from.address },
        { coordinates: to.coordinates, address: to.address },
        travelMode
      );
      
      const fromEnd = timeToMinutes(from.endTime);
      const toStart = timeToMinutes(to.startTime);
      const available = toStart - fromEnd;
      
      totalTravelTime += travelTime;
      
      if (travelTime > available) {
        conflicts++;
      }
    }
    
    return {
      totalTravelTime,
      conflicts,
      legs: sortedActivities.length - 1
    };
  }, [activities, travelMode]);

  if (!summary) return null;

  return (
    <div className={cn(
      "flex items-center space-x-3 text-sm text-muted-foreground p-2 bg-gray-50 rounded",
      className
    )}>
      <div className="flex items-center space-x-1">
        {travelMode === 'driving' && <Car className="h-4 w-4" />}
        {travelMode === 'transit' && <MapPin className="h-4 w-4" />}
        {travelMode === 'walking' && <Clock className="h-4 w-4" />}
        <span>{summary.totalTravelTime}min total travel</span>
      </div>
      
      <span>•</span>
      
      <div>{summary.legs} leg{summary.legs !== 1 ? 's' : ''}</div>
      
      {summary.conflicts > 0 && (
        <>
          <span>•</span>
          <div className="flex items-center space-x-1 text-red-600">
            <AlertTriangle className="h-4 w-4" />
            <span>{summary.conflicts} conflict{summary.conflicts !== 1 ? 's' : ''}</span>
          </div>
        </>
      )}
    </div>
  );
}

// Utility function
function timeToMinutes(timeString: string): number {
  const [hours, minutes] = timeString.split(':').map(Number);
  return hours * 60 + minutes;
}