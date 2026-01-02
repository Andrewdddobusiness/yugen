"use client";

import React from 'react';
import { Loader2 } from 'lucide-react';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { cn } from '@/lib/utils';
import { SortableActivityItem } from './SortableActivityItem';
import { DayTimeSlots } from '../time-management/DayTimeSlots';
import { shouldShowTravelTime, getTravelTimeColor, formatTravelTime } from '@/utils/travel/travelTimeUtils';
import type { TravelTimeResult } from '@/utils/travel/travelTimeUtils';
import type { ItineraryActivity, EditingField } from './types';
import { TravelModeSelect } from '@/components/travel/TravelModeSelect';
import type { TravelMode } from '@/actions/google/travelTime';

interface ItineraryActivityListProps {
  date: string;
  activities: ItineraryActivity[];
  useTimeSlotView: boolean;
  isMobile: boolean;
  
  // Editor props
  editingField: EditingField | null;
  editingValues: { [key: string]: string };
  savingStates: { [key: string]: boolean };
  onStartEditing: (activityId: string, field: 'name' | 'time' | 'notes', currentValue: string) => void;
  onCancelEditing: () => void;
  onSaveField: (activity: ItineraryActivity) => void;
  onEditKeyDown: (e: React.KeyboardEvent, activity: ItineraryActivity) => void;
  onEditingValueChange: (key: string, value: string) => void;
  formatTime: (timeString: string | null) => string | null;
  formatTimeForEditing: (startTime: string | null, endTime: string | null) => string;
  validateTimeInput: (value: string) => boolean;
  getPriceDisplay: (priceLevel?: string) => string | null;
  
  // Action handlers
  onRemoveActivity: (placeId: string) => void;
  onBulkDelete: () => void;
  
  // Selection props
  selectedActivities: Set<string>;
  selectionMode: boolean;
  onToggleSelection: (activityId: string, selected: boolean, event?: React.MouseEvent) => void;
  isActivitySelected: (activityId: string) => boolean;
  
  // Travel time props
  travelTimes: { [activityId: string]: string };
  travelTimesData: { [activityId: string]: { duration: string; durationValue: number; mode: TravelMode } };
  travelTimesLoading: boolean;
  onTravelModeChange?: (activityId: string, mode: TravelMode) => void;
  
  // Search props
  searchTerm: string;
}

export function ItineraryActivityList({
  date,
  activities,
  useTimeSlotView,
  isMobile,
  editingField,
  editingValues,
  savingStates,
  onStartEditing,
  onCancelEditing,
  onSaveField,
  onEditKeyDown,
  onEditingValueChange,
  formatTime,
  formatTimeForEditing,
  validateTimeInput,
  getPriceDisplay,
  onRemoveActivity,
  onBulkDelete,
  selectedActivities,
  selectionMode,
  onToggleSelection,
  isActivitySelected,
  travelTimes,
  travelTimesData,
  travelTimesLoading,
  onTravelModeChange,
  searchTerm,
}: ItineraryActivityListProps) {
  
  if (useTimeSlotView) {
    return (
      <DayTimeSlots
        date={date}
        activities={activities}
        isExpanded={true}
        onToggleExpanded={() => {}}
        onActivityEdit={(activityId) => {
          const activity = activities.find(a => a.itinerary_activity_id === activityId);
          if (activity) {
            onStartEditing(activityId, 'name', activity.activity?.name || '');
          }
        }}
        onActivityDelete={onBulkDelete}
        onActivitySelect={(activityId) => onToggleSelection(activityId, !selectedActivities.has(activityId))}
        selectedActivities={selectedActivities}
        editingActivity={editingField?.activityId}
        travelTimes={travelTimes}
        travelTimesData={travelTimesData}
        onApplyTimeSuggestion={(activityId, newStartTime, newEndTime) => {
          const activity = activities.find(a => a.itinerary_activity_id === activityId);
          if (activity && (newStartTime || newEndTime)) {
            onSaveField({
              ...activity,
              start_time: newStartTime || activity.start_time,
              end_time: newEndTime || activity.end_time
            });
          }
        }}
        onAddFreeTimeActivity={(startTime, duration, suggestion) => {
          console.log('Add free time activity:', { startTime, duration, suggestion });
        }}
        className={cn(isMobile ? "ml-8" : "ml-10")}
      />
    );
  }

  // Traditional List View
  return (
    <SortableContext
      items={activities.map(a => a.itinerary_activity_id)}
      strategy={verticalListSortingStrategy}
    >
      <div className={cn("space-y-3", isMobile ? "ml-8" : "ml-10")}>
        {activities.map((activity, index) => {
          const nextActivity = activities[index + 1];
          const currentTravelData = travelTimesData[activity.itinerary_activity_id];
          
          return (
            <React.Fragment key={activity.itinerary_activity_id}>
              <SortableActivityItem
                activity={activity}
                index={index}
                editingField={editingField}
                editingValues={editingValues}
                savingStates={savingStates}
                onStartEditing={onStartEditing}
                onCancelEditing={onCancelEditing}
                onSaveField={onSaveField}
                onRemoveActivity={onRemoveActivity}
                onEditKeyDown={onEditKeyDown}
                onEditingValueChange={onEditingValueChange}
                formatTime={formatTime}
                formatTimeForEditing={formatTimeForEditing}
                validateTimeInput={validateTimeInput}
                getPriceDisplay={getPriceDisplay}
                isMobile={isMobile}
                isSelected={isActivitySelected(activity.itinerary_activity_id)}
                onToggleSelection={onToggleSelection}
                selectionMode={selectionMode}
                searchTerm={searchTerm}
              />
              
              {/* Travel Time Indicator */}
              {nextActivity && currentTravelData && shouldShowTravelTime(currentTravelData as TravelTimeResult) && (
                <div className="flex items-center justify-center py-2">
                  <div className="flex items-center gap-2 text-sm text-gray-600 bg-gray-50 rounded-full px-4 py-2 border">
                    <div className="h-4 w-4 text-gray-400">
                      {currentTravelData.mode === 'walking' && '🚶'}
                      {currentTravelData.mode === 'driving' && '🚗'}
                      {currentTravelData.mode === 'transit' && '🚌'}
                      {currentTravelData.mode === 'bicycling' && '🚲'}
                    </div>
                    <span className={cn("font-medium", getTravelTimeColor(currentTravelData.durationValue))}>
                      {currentTravelData.duration}
                    </span>
                    <span className="text-gray-400 hidden sm:inline">(travel time)</span>
                    <TravelModeSelect
                      value={(activity.travel_mode_to_next ?? currentTravelData.mode) as TravelMode}
                      onValueChange={(mode) => onTravelModeChange?.(activity.itinerary_activity_id, mode)}
                      disabled={!onTravelModeChange}
                      className="w-[110px] bg-white/70"
                      placeholder="Mode"
                    />
                  </div>
                </div>
              )}
              
              {/* Loading state for travel time */}
              {nextActivity && travelTimesLoading && !currentTravelData && (
                <div className="flex items-center justify-center py-2">
                  <div className="flex items-center gap-2 text-sm text-gray-500">
                    <Loader2 className="h-3 w-3 animate-spin" />
                    <span>Calculating travel time...</span>
                  </div>
                </div>
              )}
            </React.Fragment>
          );
        })}
      </div>
    </SortableContext>
  );
}
