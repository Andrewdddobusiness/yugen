"use client";

import React, { useMemo } from 'react';
import { format, isToday, isValid } from 'date-fns';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/components/hooks/use-mobile';
import { TimeSlotGrid } from './TimeSlotGrid';
import { ActivityTimeBlock } from './ActivityTimeBlock';
import { TimeConflicts, DayConflictsSummary } from './TimeConflicts';
import { FreeTimeSuggestions, FreeTimeSummary } from './FreeTimeSuggestions';
import { EfficiencyMetricsCard, EfficiencyScoreSummary } from './EfficiencyMetrics';
import { processDayActivities, type DayTimeSlots as DayTimeSlotsData } from '@/utils/timeSlots';
import { detectAllConflicts, type TimeConflict } from '@/utils/timeConflicts';
import { detectFreeTimeGaps, getFreeTimeSummary, type FreeTimeGap } from '@/utils/freeTimeSuggestions';
import { calculateDayEfficiency, type EfficiencyMetrics } from '@/utils/efficiencyMetrics';

interface DayTimeSlotsProps {
  date: string;
  activities: any[];
  isExpanded: boolean;
  onToggleExpanded: () => void;
  onActivityEdit?: (activityId: string) => void;
  onActivityDelete?: (activityId: string) => void;
  onActivitySelect?: (activityId: string) => void;
  selectedActivities?: Set<string>;
  editingActivity?: string;
  travelTimes?: { [key: string]: string };
  travelTimesData?: { [key: string]: { duration: string; durationValue: number; mode: string } };
  onApplyTimeSuggestion?: (activityId: string, newStartTime?: string, newEndTime?: string) => void;
  onAddFreeTimeActivity?: (startTime: string, duration: number, suggestion: any) => void;
  className?: string;
}

export function DayTimeSlots({
  date,
  activities,
  isExpanded,
  onToggleExpanded,
  onActivityEdit,
  onActivityDelete,
  onActivitySelect,
  selectedActivities = new Set(),
  editingActivity,
  travelTimes = {},
  travelTimesData = {},
  onApplyTimeSuggestion,
  onAddFreeTimeActivity,
  className,
}: DayTimeSlotsProps) {
  const isMobile = useIsMobile();

  // Process activities into time slots structure
  const dayData: DayTimeSlotsData = useMemo(() => {
    return processDayActivities(activities, date);
  }, [activities, date]);

  // Detect time conflicts
  const conflicts: TimeConflict[] = useMemo(() => {
    return detectAllConflicts(activities, travelTimesData);
  }, [activities, travelTimesData]);

  // Detect free time gaps and get summary
  const freeTimeGaps: FreeTimeGap[] = useMemo(() => {
    return detectFreeTimeGaps(activities);
  }, [activities]);

  const freeTimeSummary = useMemo(() => {
    return getFreeTimeSummary(activities);
  }, [activities]);

  // Calculate efficiency metrics
  const efficiencyMetrics: EfficiencyMetrics = useMemo(() => {
    return calculateDayEfficiency(activities, travelTimesData);
  }, [activities, travelTimesData]);

  const dateObj = new Date(date);
  const isValidDate = isValid(dateObj);
  const isToday_ = isValidDate && isToday(dateObj);

  // Count scheduled vs unscheduled
  const scheduledCount = dayData.activities.length;
  const unscheduledCount = dayData.unscheduledActivities.length;
  const totalCount = scheduledCount + unscheduledCount;

  const handleApplySuggestion = (activityId: string, suggestion: any) => {
    if (onApplyTimeSuggestion && (suggestion.newStartTime || suggestion.newEndTime)) {
      onApplyTimeSuggestion(activityId, suggestion.newStartTime, suggestion.newEndTime);
    }
  };

  if (totalCount === 0) {
    return null; // Don't render empty days
  }

  return (
    <div className={cn("mb-6", className)}>
      {/* Day Header */}
      <div className="sticky top-0 z-30 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 mb-4">
        <Button
          variant="ghost"
          onClick={onToggleExpanded}
          className="w-full justify-start p-4 h-auto hover:bg-gray-50 dark:hover:bg-gray-800"
        >
          <div className="flex items-center gap-3 w-full">
            {/* Expand/Collapse Icon */}
            {isExpanded ? (
              <ChevronDown className="h-4 w-4 text-gray-500" />
            ) : (
              <ChevronRight className="h-4 w-4 text-gray-500" />
            )}
            
            {/* Date Information */}
            <div className="flex-1 text-left">
              <div className="flex items-center gap-2">
                <h3 className={cn(
                  "font-semibold text-lg",
                  isToday_ && "text-blue-600 dark:text-blue-400"
                )}>
                  {isValidDate ? format(dateObj, 'EEEE, MMMM d') : date}
                </h3>
                {isToday_ && (
                  <span className="bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 text-xs px-2 py-0.5 rounded-full font-medium">
                    Today
                  </span>
                )}
              </div>
              
              {/* Activity Summary */}
              <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                {scheduledCount > 0 && (
                  <span>{scheduledCount} scheduled</span>
                )}
                {scheduledCount > 0 && unscheduledCount > 0 && (
                  <span className="mx-2">•</span>
                )}
                {unscheduledCount > 0 && (
                  <span>{unscheduledCount} unscheduled</span>
                )}
                <span className="ml-2">({totalCount} total)</span>
              </div>
              
              {/* Conflicts Summary */}
              {conflicts.length > 0 && (
                <div className="mt-2">
                  <DayConflictsSummary conflicts={conflicts} />
                </div>
              )}
              
              {/* Free Time Summary */}
              {freeTimeGaps.length > 0 && (
                <div className="mt-2">
                  <FreeTimeSummary 
                    totalFreeTime={freeTimeSummary.totalFreeTime}
                    largestGap={freeTimeSummary.largestGap}
                    gapCount={freeTimeSummary.gapCount}
                  />
                </div>
              )}
              
              {/* Efficiency Score Summary */}
              {scheduledCount > 0 && (
                <div className="mt-2">
                  <EfficiencyScoreSummary 
                    score={efficiencyMetrics.score}
                    recommendationType={efficiencyMetrics.recommendation.type}
                  />
                </div>
              )}
            </div>
          </div>
        </Button>
      </div>

      {/* Day Content */}
      {isExpanded && (
        <div className="space-y-4">
          {/* Time Conflicts */}
          {conflicts.length > 0 && (
            <div className={cn(isMobile ? "ml-8" : "ml-10")}>
              <TimeConflicts 
                conflicts={conflicts} 
                onApplySuggestion={handleApplySuggestion}
              />
            </div>
          )}

          {/* Time Slot Grid with Scheduled Activities */}
          {scheduledCount > 0 && (
            <div className="relative">
              <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 ml-16">
                Scheduled Activities
              </h4>
              <TimeSlotGrid className="group">
                {dayData.activities.map((timeBlock, index) => (
                  <ActivityTimeBlock
                    key={timeBlock.activity.itinerary_activity_id}
                    timeBlock={timeBlock}
                    isSelected={selectedActivities.has(timeBlock.activity.itinerary_activity_id)}
                    isEditing={editingActivity === timeBlock.activity.itinerary_activity_id}
                    onEdit={() => onActivityEdit?.(timeBlock.activity.itinerary_activity_id)}
                    onDelete={() => onActivityDelete?.(timeBlock.activity.itinerary_activity_id)}
                    onSelect={() => onActivitySelect?.(timeBlock.activity.itinerary_activity_id)}
                    showTravelTime={index > 0} // Show travel time for activities after the first
                    travelTime={travelTimes[timeBlock.activity.itinerary_activity_id]}
                  />
                ))}
              </TimeSlotGrid>
            </div>
          )}

          {/* Free Time Suggestions */}
          {freeTimeGaps.length > 0 && (
            <div className={cn(isMobile ? "ml-8" : "ml-10")}>
              <FreeTimeSuggestions 
                gaps={freeTimeGaps} 
                onAddActivity={onAddFreeTimeActivity}
              />
            </div>
          )}

          {/* Efficiency Metrics */}
          {scheduledCount > 0 && (
            <div className={cn(isMobile ? "ml-8" : "ml-10")}>
              <EfficiencyMetricsCard metrics={efficiencyMetrics} />
            </div>
          )}

          {/* Unscheduled Activities Section */}
          {unscheduledCount > 0 && (
            <div className="pl-16">
              <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                Unscheduled Activities
              </h4>
              <div className="grid gap-2">
                {dayData.unscheduledActivities.map((activity) => (
                  <UnscheduledActivityCard
                    key={activity.itinerary_activity_id}
                    activity={activity}
                    isSelected={selectedActivities.has(activity.itinerary_activity_id)}
                    isEditing={editingActivity === activity.itinerary_activity_id}
                    onEdit={() => onActivityEdit?.(activity.itinerary_activity_id)}
                    onDelete={() => onActivityDelete?.(activity.itinerary_activity_id)}
                    onSelect={() => onActivitySelect?.(activity.itinerary_activity_id)}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// Simple card for unscheduled activities
function UnscheduledActivityCard({
  activity,
  isSelected,
  isEditing,
  onEdit,
  onDelete,
  onSelect,
}: {
  activity: any;
  isSelected: boolean;
  isEditing: boolean;
  onEdit: () => void;
  onDelete: () => void;
  onSelect: () => void;
}) {
  return (
    <div 
      className={cn(
        "p-3 border border-gray-200 dark:border-gray-700 rounded-lg cursor-pointer",
        "hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors",
        "border-l-4 border-l-gray-400",
        isSelected && "ring-2 ring-blue-500 bg-blue-50/30 dark:bg-blue-900/20",
        isEditing && "ring-2 ring-yellow-500"
      )}
      onClick={onSelect}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <h5 className="font-medium text-sm line-clamp-1">
            {activity.activity?.name || 'Unnamed Activity'}
          </h5>
          <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
            No time assigned
          </p>
        </div>
        <div className="flex gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              onEdit();
            }}
            className="h-6 w-6 p-0"
          >
            <span className="sr-only">Edit</span>
            📝
          </Button>
        </div>
      </div>
    </div>
  );
}