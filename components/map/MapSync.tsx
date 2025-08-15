"use client";

import React, { useEffect, useCallback } from 'react';
import { useMapStore } from '@/store/mapStore';

interface MapSyncProps {
  // Calendar/List view state
  selectedDate?: string;
  selectedActivityId?: string;
  visibleDates?: string[];
  
  // Callbacks to update calendar/list views
  onDateSelect?: (date: string) => void;
  onActivitySelect?: (activityId: string) => void;
  onTimeSlotSelect?: (date: string, time: string) => void;
  
  // Activities data
  activities?: Array<{
    itinerary_activity_id: string;
    date: string | null;
    start_time: string | null;
    activity?: {
      coordinates?: [number, number];
      name: string;
    };
  }>;
}

export function MapSync({
  selectedDate,
  selectedActivityId,
  visibleDates = [],
  onDateSelect,
  onActivitySelect,
  onTimeSlotSelect,
  activities = [],
}: MapSyncProps) {
  const { centerCoordinates, setCenterCoordinates } = useMapStore();

  // Sync map center when activity is selected
  useEffect(() => {
    if (selectedActivityId && activities.length > 0) {
      const selectedActivity = activities.find(
        activity => activity.itinerary_activity_id === selectedActivityId
      );
      
      if (selectedActivity?.activity?.coordinates) {
        const [lng, lat] = selectedActivity.activity.coordinates;
        setCenterCoordinates([lat, lng]);
      }
    }
  }, [selectedActivityId, activities, setCenterCoordinates]);

  // Sync map center when date is selected (focus on activities for that day)
  useEffect(() => {
    if (selectedDate && activities.length > 0) {
      const dayActivities = activities.filter(
        activity => activity.date === selectedDate && activity.activity?.coordinates
      );
      
      if (dayActivities.length > 0) {
        // Calculate center of all activities for the day
        const validActivities = dayActivities.filter(act => act.activity?.coordinates);
        if (validActivities.length === 1) {
          const [lng, lat] = validActivities[0].activity!.coordinates!;
          setCenterCoordinates([lat, lng]);
        } else if (validActivities.length > 1) {
          // Calculate average position
          const avgLat = validActivities.reduce((sum, act) => 
            sum + act.activity!.coordinates![1], 0
          ) / validActivities.length;
          const avgLng = validActivities.reduce((sum, act) => 
            sum + act.activity!.coordinates![0], 0
          ) / validActivities.length;
          
          setCenterCoordinates([avgLat, avgLng]);
        }
      }
    }
  }, [selectedDate, activities, setCenterCoordinates]);

  // Handle map activity selection -> sync to calendar/list
  const handleMapActivitySelect = useCallback((activityId: string) => {
    const activity = activities.find(act => act.itinerary_activity_id === activityId);
    
    if (activity) {
      // Select the activity
      onActivitySelect?.(activityId);
      
      // Also select the date if different
      if (activity.date && activity.date !== selectedDate) {
        onDateSelect?.(activity.date);
      }
      
      // If activity has time, focus on that time slot
      if (activity.date && activity.start_time) {
        onTimeSlotSelect?.(activity.date, activity.start_time);
      }
    }
  }, [activities, selectedDate, onActivitySelect, onDateSelect, onTimeSlotSelect]);

  // This component is primarily a sync utility and doesn't render UI
  // It provides the handleMapActivitySelect callback that can be used by map components
  return null;
}

// Hook for easier integration
export function useMapSync({
  selectedDate,
  selectedActivityId,
  visibleDates = [],
  activities = [],
  onDateSelect,
  onActivitySelect,
  onTimeSlotSelect,
}: MapSyncProps) {
  const { centerCoordinates, setCenterCoordinates } = useMapStore();

  // Focus map on selected activity
  const focusActivity = useCallback((activityId: string) => {
    const activity = activities.find(act => act.itinerary_activity_id === activityId);
    if (activity?.activity?.coordinates) {
      const [lng, lat] = activity.activity.coordinates;
      setCenterCoordinates([lat, lng]);
    }
  }, [activities, setCenterCoordinates]);

  // Focus map on selected date's activities
  const focusDate = useCallback((date: string) => {
    const dayActivities = activities.filter(
      activity => activity.date === date && activity.activity?.coordinates
    );
    
    if (dayActivities.length === 1) {
      const [lng, lat] = dayActivities[0].activity!.coordinates!;
      setCenterCoordinates([lat, lng]);
    } else if (dayActivities.length > 1) {
      // Calculate average position
      const avgLat = dayActivities.reduce((sum, act) => 
        sum + act.activity!.coordinates![1], 0
      ) / dayActivities.length;
      const avgLng = dayActivities.reduce((sum, act) => 
        sum + act.activity!.coordinates![0], 0
      ) / dayActivities.length;
      
      setCenterCoordinates([avgLat, avgLng]);
    }
  }, [activities, setCenterCoordinates]);

  // Handle activity selection from map
  const handleMapActivitySelect = useCallback((activityId: string) => {
    const activity = activities.find(act => act.itinerary_activity_id === activityId);
    
    if (activity) {
      onActivitySelect?.(activityId);
      
      if (activity.date && activity.date !== selectedDate) {
        onDateSelect?.(activity.date);
      }
      
      if (activity.date && activity.start_time) {
        onTimeSlotSelect?.(activity.date, activity.start_time);
      }
    }
  }, [activities, selectedDate, onActivitySelect, onDateSelect, onTimeSlotSelect]);

  // Calculate filtered activities based on visible dates
  const visibleActivities = React.useMemo(() => {
    if (visibleDates.length === 0) return activities;
    return activities.filter(activity => 
      activity.date && visibleDates.includes(activity.date)
    );
  }, [activities, visibleDates]);

  // Auto-sync effects
  React.useEffect(() => {
    if (selectedActivityId) {
      focusActivity(selectedActivityId);
    }
  }, [selectedActivityId, focusActivity]);

  React.useEffect(() => {
    if (selectedDate) {
      focusDate(selectedDate);
    }
  }, [selectedDate, focusDate]);

  return {
    focusActivity,
    focusDate,
    handleMapActivitySelect,
    visibleActivities,
    mapCenter: centerCoordinates,
  };
}

// Utility functions for map-view synchronization
export class MapViewSync {
  private static instance: MapViewSync;
  private callbacks: Map<string, Function[]> = new Map();

  static getInstance(): MapViewSync {
    if (!MapViewSync.instance) {
      MapViewSync.instance = new MapViewSync();
    }
    return MapViewSync.instance;
  }

  // Subscribe to sync events
  subscribe(event: 'activity-select' | 'date-select' | 'time-select', callback: Function) {
    if (!this.callbacks.has(event)) {
      this.callbacks.set(event, []);
    }
    this.callbacks.get(event)!.push(callback);

    // Return unsubscribe function
    return () => {
      const callbacks = this.callbacks.get(event);
      if (callbacks) {
        const index = callbacks.indexOf(callback);
        if (index > -1) {
          callbacks.splice(index, 1);
        }
      }
    };
  }

  // Emit sync events
  emit(event: 'activity-select' | 'date-select' | 'time-select', data: any) {
    const callbacks = this.callbacks.get(event);
    if (callbacks) {
      callbacks.forEach(callback => callback(data));
    }
  }

  // Sync from calendar/list to map
  syncToMap(type: 'activity' | 'date', id: string) {
    if (type === 'activity') {
      this.emit('activity-select', id);
    } else if (type === 'date') {
      this.emit('date-select', id);
    }
  }

  // Sync from map to calendar/list
  syncFromMap(type: 'activity' | 'date' | 'time', data: any) {
    if (type === 'activity') {
      this.emit('activity-select', data);
    } else if (type === 'date') {
      this.emit('date-select', data);
    } else if (type === 'time') {
      this.emit('time-select', data);
    }
  }
}