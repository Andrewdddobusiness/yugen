"use client";

import React, { useState, useMemo } from 'react';
import { format, isToday, isValid } from 'date-fns';
import { ChevronDown, ChevronRight, Plus, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { MobileActivityCard } from './MobileActivityCard';
import { processDayActivities, type ActivityTimeBlock } from '@/utils/timeSlots';

interface MobileTimeSlotsProps {
  date: string;
  activities: any[];
  isExpanded: boolean;
  onToggleExpanded: () => void;
  onActivityEdit?: (activityId: string) => void;
  onActivitySelect?: (activityId: string) => void;
  selectedActivities?: Set<string>;
  onAddActivity?: () => void;
  className?: string;
}

export function MobileTimeSlots({
  date,
  activities,
  isExpanded,
  onToggleExpanded,
  onActivityEdit,
  onActivitySelect,
  selectedActivities = new Set(),
  onAddActivity,
  className,
}: MobileTimeSlotsProps) {
  const dayData = useMemo(() => {
    return processDayActivities(activities, date);
  }, [activities, date]);

  const dateObj = new Date(date);
  const isValidDate = isValid(dateObj);
  const isToday_ = isValidDate && isToday(dateObj);

  const scheduledCount = dayData.activities.length;
  const unscheduledCount = dayData.unscheduledActivities.length;
  const totalCount = scheduledCount + unscheduledCount;

  if (totalCount === 0) {
    return null;
  }

  return (
    <div className={cn("mb-4", className)}>
      {/* Day Header - Touch Optimized */}
      <div className="sticky top-0 z-30 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 mb-3">
        <Button
          variant="ghost"
          onClick={onToggleExpanded}
          className="w-full justify-start p-4 h-auto hover:bg-gray-50 dark:hover:bg-gray-800 touch-manipulation"
        >
          <div className="flex items-center gap-3 w-full">
            {/* Expand Icon */}
            <div className="flex items-center justify-center w-8 h-8">
              {isExpanded ? (
                <ChevronDown className="h-5 w-5 text-gray-500" />
              ) : (
                <ChevronRight className="h-5 w-5 text-gray-500" />
              )}
            </div>
            
            {/* Date Card */}
            <div className={cn(
              "flex flex-col items-center justify-center rounded-lg py-2 px-3 min-w-[80px]",
              date === "unscheduled" 
                ? "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400" 
                : (dateObj && isToday_)
                  ? "bg-blue-100 text-blue-700 border border-blue-200 dark:bg-blue-900 dark:text-blue-200" 
                  : "bg-gray-50 text-gray-700 dark:bg-gray-800 dark:text-gray-300"
            )}>
              {date === "unscheduled" ? (
                <span className="text-sm font-medium">Unscheduled</span>
              ) : (
                <>
                  <span className="text-xs uppercase tracking-wide font-medium">
                    {isValidDate ? format(dateObj, 'EEE') : ""}
                  </span>
                  <span className="text-lg font-semibold">
                    {isValidDate ? format(dateObj, 'd') : ""}
                  </span>
                  {isToday_ && (
                    <span className="text-xs text-blue-600 dark:text-blue-400 font-medium">Today</span>
                  )}
                </>
              )}
            </div>
            
            {/* Activity Summary */}
            <div className="flex-1 text-left">
              <div className="flex items-center gap-2">
                <h3 className={cn(
                  "font-semibold text-base",
                  isToday_ && "text-blue-600 dark:text-blue-400"
                )}>
                  {isValidDate ? format(dateObj, 'MMMM d') : date}
                </h3>
              </div>
              
              <div className="flex items-center gap-2 mt-1">
                <Badge variant="outline" className="text-xs">
                  {totalCount} {totalCount === 1 ? 'activity' : 'activities'}
                </Badge>
                
                {scheduledCount > 0 && (
                  <Badge variant="secondary" className="text-xs">
                    <Clock className="h-3 w-3 mr-1" />
                    {scheduledCount} scheduled
                  </Badge>
                )}
              </div>
            </div>
          </div>
        </Button>
      </div>

      {/* Day Content */}
      {isExpanded && (
        <div className="space-y-3 px-2">
          {/* Time-based Activities */}
          {scheduledCount > 0 && (
            <div className="space-y-2">
              <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 px-2">
                Scheduled Activities
              </h4>
              
              <div className="space-y-3">
                {dayData.activities.map((timeBlock: ActivityTimeBlock, index) => (
                  <div key={timeBlock.activity.itinerary_activity_id} className="relative">
                    {/* Time Slot Indicator */}
                    <div className="flex items-start gap-3">
                      <div className="flex flex-col items-center min-w-[60px] pt-2">
                        <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                          {timeBlock.startTime}
                        </div>
                        {timeBlock.endTime && (
                          <div className="text-xs text-gray-500 dark:text-gray-400">
                            {timeBlock.endTime}
                          </div>
                        )}
                        
                        {/* Duration indicator */}
                        {index < dayData.activities.length - 1 && (
                          <div className="flex-1 w-px bg-gray-200 dark:bg-gray-700 mt-2 min-h-[20px]" />
                        )}
                      </div>
                      
                      <div className="flex-1">
                        <MobileActivityCard
                          activity={timeBlock.activity}
                          showTime={false} // Time is shown separately
                          isSelected={selectedActivities.has(timeBlock.activity.itinerary_activity_id)}
                          onEdit={() => onActivityEdit?.(timeBlock.activity.itinerary_activity_id)}
                          onSelect={() => onActivitySelect?.(timeBlock.activity.itinerary_activity_id)}
                          className="mb-2"
                        />
                        
                        {/* Travel Time to Next */}
                        {index < dayData.activities.length - 1 && (
                          <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400 ml-3 mb-2">
                            <div className="w-4 h-4 text-center">🚶</div>
                            <span>Travel time to next activity</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Unscheduled Activities */}
          {unscheduledCount > 0 && (
            <div className="space-y-2 border-t border-gray-200 dark:border-gray-700 pt-4">
              <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 px-2">
                Unscheduled Activities
              </h4>
              
              <div className="space-y-2">
                {dayData.unscheduledActivities.map((activity) => (
                  <MobileActivityCard
                    key={activity.itinerary_activity_id}
                    activity={activity}
                    showTime={false}
                    isSelected={selectedActivities.has(activity.itinerary_activity_id)}
                    onEdit={() => onActivityEdit?.(activity.itinerary_activity_id)}
                    onSelect={() => onActivitySelect?.(activity.itinerary_activity_id)}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Add Activity Button */}
          {onAddActivity && (
            <div className="pt-2">
              <Button
                variant="outline"
                onClick={onAddActivity}
                className="w-full h-12 border-dashed touch-manipulation"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Activity to {isValidDate ? format(dateObj, 'MMMM d') : 'This Day'}
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// Compact day view for overview
export function MobileTimeSlotsCompact({
  date,
  activities,
  onClick,
  className,
}: {
  date: string;
  activities: any[];
  onClick?: () => void;
  className?: string;
}) {
  const dateObj = new Date(date);
  const isValidDate = isValid(dateObj);
  const isToday_ = isValidDate && isToday(dateObj);
  
  const scheduledActivities = activities.filter(a => a.start_time && a.end_time);
  const totalCount = activities.length;

  return (
    <div
      onClick={onClick}
      className={cn(
        "flex items-center gap-3 p-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg",
        "active:bg-gray-50 dark:active:bg-gray-700 transition-colors touch-manipulation cursor-pointer",
        className
      )}
    >
      {/* Date */}
      <div className={cn(
        "flex flex-col items-center justify-center w-16 h-16 rounded-lg",
        isToday_
          ? "bg-blue-100 text-blue-700 border border-blue-200 dark:bg-blue-900 dark:text-blue-200"
          : "bg-gray-50 text-gray-700 dark:bg-gray-800 dark:text-gray-300"
      )}>
        <span className="text-xs font-medium">
          {isValidDate ? format(dateObj, 'EEE') : ''}
        </span>
        <span className="text-lg font-bold">
          {isValidDate ? format(dateObj, 'd') : ''}
        </span>
      </div>

      {/* Summary */}
      <div className="flex-1">
        <h4 className="font-medium text-gray-900 dark:text-gray-100">
          {isValidDate ? format(dateObj, 'EEEE, MMMM d') : date}
        </h4>
        
        <div className="flex items-center gap-2 mt-1">
          <Badge variant="outline" className="text-xs">
            {totalCount} {totalCount === 1 ? 'activity' : 'activities'}
          </Badge>
          
          {scheduledActivities.length > 0 && (
            <Badge variant="secondary" className="text-xs">
              <Clock className="h-3 w-3 mr-1" />
              {scheduledActivities.length} timed
            </Badge>
          )}
        </div>
      </div>

      <ChevronRight className="h-5 w-5 text-gray-400" />
    </div>
  );
}