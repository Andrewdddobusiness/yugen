"use client";

import { useState, useEffect, useCallback } from 'react';
import { getTravelTimesBetweenActivities, type ActivityWithCoordinates, type TravelTimeResult } from '@/utils/travel/travelTimeUtils';
import type { TravelMode } from '@/actions/google/travelTime';

export interface UseTravelTimesOptions {
  modes?: TravelMode[];
  autoRefresh?: boolean;
  refreshInterval?: number; // in milliseconds
}

export interface UseTravelTimesResult {
  travelTimes: { [dayKey: string]: TravelTimeResult[] };
  loading: { [dayKey: string]: boolean };
  error: { [dayKey: string]: string | null };
  refreshTravelTimes: (dayKey?: string) => Promise<void>;
  clearTravelTimes: () => void;
}

export function useTravelTimes(
  groupedActivities: Array<[string, ActivityWithCoordinates[]]>,
  options: UseTravelTimesOptions = {}
): UseTravelTimesResult {
  const {
    modes = ['walking', 'driving'],
    autoRefresh = false,
    refreshInterval = 30 * 60 * 1000 // 30 minutes
  } = options;

  const [travelTimes, setTravelTimes] = useState<{ [dayKey: string]: TravelTimeResult[] }>({});
  const [loading, setLoading] = useState<{ [dayKey: string]: boolean }>({});
  const [error, setError] = useState<{ [dayKey: string]: string | null }>({});

  const calculateTravelTimesForDay = useCallback(async (
    dayKey: string, 
    activities: ActivityWithCoordinates[]
  ) => {
    try {
      setLoading(prev => ({ ...prev, [dayKey]: true }));
      setError(prev => ({ ...prev, [dayKey]: null }));

      const dayTravelTimes = await getTravelTimesBetweenActivities(activities, modes);
      
      setTravelTimes(prev => ({
        ...prev,
        [dayKey]: dayTravelTimes
      }));
    } catch (err: any) {
      console.error(`Error calculating travel times for ${dayKey}:`, err);
      setError(prev => ({
        ...prev,
        [dayKey]: err.message || 'Failed to calculate travel times'
      }));
      setTravelTimes(prev => ({
        ...prev,
        [dayKey]: []
      }));
    } finally {
      setLoading(prev => ({ ...prev, [dayKey]: false }));
    }
  }, [modes]);

  const refreshTravelTimes = useCallback(async (dayKey?: string) => {
    if (dayKey) {
      const dayData = groupedActivities.find(([key]) => key === dayKey);
      if (dayData) {
        await calculateTravelTimesForDay(dayData[0], dayData[1]);
      }
    } else {
      // Refresh all days
      const promises = groupedActivities.map(([key, activities]) =>
        calculateTravelTimesForDay(key, activities)
      );
      await Promise.all(promises);
    }
  }, [groupedActivities, calculateTravelTimesForDay]);

  const clearTravelTimes = useCallback(() => {
    setTravelTimes({});
    setLoading({});
    setError({});
  }, []);

  // Initial calculation when activities change
  useEffect(() => {
    const calculateAllTravelTimes = async () => {
      // Only calculate for days with multiple activities that have coordinates
      const daysWithValidActivities = groupedActivities.filter(([, activities]) => {
        const activitiesWithCoords = activities.filter(activity => 
          activity.activity?.coordinates && 
          Array.isArray(activity.activity.coordinates) && 
          activity.activity.coordinates.length === 2
        );
        return activitiesWithCoords.length >= 2;
      });

      if (daysWithValidActivities.length === 0) {
        setTravelTimes((prev) => (Object.keys(prev).length > 0 ? {} : prev));
        setLoading((prev) => (Object.keys(prev).length > 0 ? {} : prev));
        setError((prev) => (Object.keys(prev).length > 0 ? {} : prev));
        return;
      }

      // Calculate travel times for each valid day
      const promises = daysWithValidActivities.map(([dayKey, activities]) =>
        calculateTravelTimesForDay(dayKey, activities)
      );

      await Promise.all(promises);
    };

    calculateAllTravelTimes();
  }, [groupedActivities, calculateTravelTimesForDay]);

  // Auto-refresh functionality
  useEffect(() => {
    if (!autoRefresh || refreshInterval <= 0) {
      return;
    }

    const interval = setInterval(() => {
      refreshTravelTimes();
    }, refreshInterval);

    return () => clearInterval(interval);
  }, [autoRefresh, refreshInterval, refreshTravelTimes]);

  return {
    travelTimes,
    loading,
    error,
    refreshTravelTimes,
    clearTravelTimes
  };
}

export default useTravelTimes;
