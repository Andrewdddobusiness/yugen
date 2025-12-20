"use client";

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { format } from 'date-fns';
import { useParams } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { useItineraryActivityStore, IItineraryActivity } from '@/store/itineraryActivityStore';
import { useItineraryLayoutStore } from '@/store/itineraryLayoutStore';
import { useTravelTimes } from '@/components/hooks/use-travel-times';
import type { TravelMode } from '@/actions/google/travelTime';
import type { FilterableActivity } from '../../list/SearchAndFilter';

// Use the interface from the store
type ItineraryActivity = IItineraryActivity;

interface ItineraryListContextType {
  // Activities state
  activeActivities: ItineraryActivity[];
  filteredActivities: FilterableActivity[];
  setFilteredActivities: (activities: FilterableActivity[]) => void;
  activitiesForGrouping: ItineraryActivity[];
  groupedActivities: [string, ItineraryActivity[]][];
  
  // Search state
  currentSearchTerm: string;
  setCurrentSearchTerm: (term: string) => void;
  
  // View state
  useTimeSlotView: boolean;
  setUseTimeSlotView: (value: boolean) => void;
  expandedDays: Set<string>;
  toggleDayExpansion: (dateKey: string) => void;
  expandAllDays: () => void;
  collapseAllDays: () => void;
  isExpanded: (dateKey: string) => boolean;
  
  // Travel times
  travelModes: TravelMode[];
  setTravelModes: (modes: TravelMode[]) => void;
  travelTimes: Record<string, any[]>;
  travelTimesLoading: Record<string, boolean>;
  travelTimesError: any;
  refreshTravelTimes: () => void;
  
  // Activity operations
  handleRemoveActivity: (placeId: string) => Promise<void>;
  availableDates: { date: string; label: string; count: number }[];
  
  // Filterable activities
  filterableActivities: FilterableActivity[];
}

const ItineraryListContext = createContext<ItineraryListContextType | undefined>(undefined);

export const useItineraryListContext = () => {
  const context = useContext(ItineraryListContext);
  if (context === undefined) {
    throw new Error('useItineraryListContext must be used within an ItineraryListProvider');
  }
  return context;
};

interface ItineraryListProviderProps {
  children: React.ReactNode;
}

export function ItineraryListProvider({ children }: ItineraryListProviderProps) {
  const { itineraryId } = useParams();
  const queryClient = useQueryClient();
  
  // Get layout store functions
  const { saveViewState, getViewState } = useItineraryLayoutStore();
  
  // Filter and search state
  const [filteredActivities, setFilteredActivities] = useState<FilterableActivity[]>([]);
  const [currentSearchTerm, setCurrentSearchTerm] = useState<string>('');
  
  // Travel time state
  const [travelModes, setTravelModes] = useState<TravelMode[]>(['walking', 'driving']);
  
  // View mode state
  const [useTimeSlotView, setUseTimeSlotView] = useState(false);
  
  // Initialize expanded days from store or defaults
  const [expandedDays, setExpandedDays] = useState<Set<string>>(() => {
    const viewState = getViewState('list');
    if (viewState.expandedDays.length > 0) {
      return new Set(viewState.expandedDays);
    }
    
    // Initially expand today's activities and unscheduled by default
    const today = new Date().toISOString().split("T")[0];
    return new Set([today, 'unscheduled']);
  });

  const { itineraryActivities, removeItineraryActivity } = useItineraryActivityStore();

  // Filter out deleted activities
  const activeActivities = itineraryActivities.filter(
    (activity) => activity.deleted_at === null
  );

  // Activity removal handler
  const handleRemoveActivity = useCallback(async (placeId: string) => {
    try {
      if (!itineraryId) return;
      await removeItineraryActivity(placeId, Array.isArray(itineraryId) ? itineraryId[0] : itineraryId);
      queryClient.invalidateQueries({
        queryKey: ["itineraryActivities"],
      });
    } catch (error) {
      console.error("Error removing activity:", error);
    }
  }, [itineraryId, removeItineraryActivity, queryClient]);

  // Group activities by date
  const groupActivitiesByDate = useCallback((activities: ItineraryActivity[]) => {
    const groups: { [key: string]: ItineraryActivity[] } = {
      unscheduled: [],
    };

    activities.forEach((activity) => {
      if (!activity.date) {
        groups.unscheduled.push(activity);
      } else {
        const date = new Date(activity.date).toISOString().split("T")[0];
        if (!groups[date]) {
          groups[date] = [];
        }
        groups[date].push(activity);
      }
    });

    // Remove empty unscheduled group
    if (groups.unscheduled.length === 0) {
      delete groups.unscheduled;
    }

    // Sort activities within each day by start time
    Object.keys(groups).forEach(date => {
      if (date !== 'unscheduled') {
        groups[date].sort((a, b) => {
          if (!a.start_time && !b.start_time) return 0;
          if (!a.start_time) return 1;
          if (!b.start_time) return -1;
          return a.start_time.localeCompare(b.start_time);
        });
      }
    });

    return Object.entries(groups).sort(([dateA], [dateB]) => {
      if (dateA === "unscheduled") return 1;
      if (dateB === "unscheduled") return -1;
      return new Date(dateA).getTime() - new Date(dateB).getTime();
    });
  }, []);

  const toggleDayExpansion = useCallback((dateKey: string) => {
    setExpandedDays(prev => {
      const newSet = new Set(prev);
      if (newSet.has(dateKey)) {
        newSet.delete(dateKey);
      } else {
        newSet.add(dateKey);
      }
      
      // Save expanded days to store
      saveViewState('list', {
        expandedDays: Array.from(newSet)
      });
      
      return newSet;
    });
  }, [saveViewState]);

  const isExpanded = useCallback((dateKey: string) => expandedDays.has(dateKey), [expandedDays]);

  // Convert activities to filterable format
  const filterableActivities: FilterableActivity[] = useMemo(() => {
    return activeActivities.map(activity => ({
      itinerary_activity_id: activity.itinerary_activity_id,
      date: activity.date,
      start_time: activity.start_time,
      end_time: activity.end_time,
      notes: activity.notes,
      activity: activity.activity ? {
        name: activity.activity.name,
        address: activity.activity.address,
        types: activity.activity.types,
        rating: activity.activity.rating,
        price_level: activity.activity.price_level,
        coordinates: activity.activity.coordinates,
      } : undefined,
    }));
  }, [activeActivities]);

  // Initialize filtered activities when filterable activities change  
  const isInitialLoad = useRef(true);
  useEffect(() => {
    if (isInitialLoad.current && filterableActivities.length > 0) {
      setFilteredActivities(filterableActivities);
      isInitialLoad.current = false;
    }
  }, [filterableActivities]);

  // Convert filtered activities back to the original format for grouping
  const activitiesForGrouping = useMemo(() => {
    return activeActivities.filter(activity =>
      filteredActivities.some(filtered => 
        filtered.itinerary_activity_id === activity.itinerary_activity_id
      )
    );
  }, [activeActivities, filteredActivities]);

  const groupedActivities = useMemo(
    () => groupActivitiesByDate(activitiesForGrouping),
    [activitiesForGrouping, groupActivitiesByDate]
  );

  const expandAllDays = useCallback(() => {
    const allDates = groupedActivities.map(([date]) => date);
    const newSet = new Set(allDates);
    setExpandedDays(newSet);
    
    // Save expanded days to store
    saveViewState('list', {
      expandedDays: Array.from(newSet)
    });
  }, [groupedActivities, saveViewState]);

  const collapseAllDays = useCallback(() => {
    const newSet = new Set<string>();
    setExpandedDays(newSet);
    
    // Save expanded days to store
    saveViewState('list', {
      expandedDays: Array.from(newSet)
    });
  }, [saveViewState]);

  // Generate available dates for bulk move
  const availableDates = useMemo(() => {
    const dates: { date: string; label: string; count: number }[] = [];
    
    groupedActivities.forEach(([date, activities]) => {
      if (date !== 'unscheduled') {
        const dateObj = new Date(date);
        dates.push({
          date,
          label: format(dateObj, 'EEEE, MMM d'),
          count: activities.length
        });
      }
    });
    
    return dates.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [groupedActivities]);

  // Travel time integration
  const { 
    travelTimes, 
    loading: travelTimesLoading, 
    error: travelTimesError,
    refreshTravelTimes
  } = useTravelTimes(
    groupedActivities.map(([date, activities]) => [
      date,
      activities.map(activity => ({
        itinerary_activity_id: activity.itinerary_activity_id,
        start_time: activity.start_time,
        end_time: activity.end_time,
        activity: activity.activity ? {
          name: activity.activity.name,
          coordinates: activity.activity.coordinates
        } : undefined
      }))
    ]),
    { modes: travelModes, autoRefresh: false }
  );

  const contextValue = useMemo(() => ({
    activeActivities,
    filteredActivities,
    setFilteredActivities,
    activitiesForGrouping,
    groupedActivities,
    currentSearchTerm,
    setCurrentSearchTerm,
    useTimeSlotView,
    setUseTimeSlotView,
    expandedDays,
    toggleDayExpansion,
    expandAllDays,
    collapseAllDays,
    isExpanded,
    travelModes,
    setTravelModes,
    travelTimes,
    travelTimesLoading,
    travelTimesError,
    refreshTravelTimes,
    handleRemoveActivity,
    availableDates,
    filterableActivities,
  }), [
    activeActivities,
    filteredActivities,
    setFilteredActivities,
    activitiesForGrouping,
    groupedActivities,
    currentSearchTerm,
    setCurrentSearchTerm,
    useTimeSlotView,
    setUseTimeSlotView,
    expandedDays,
    toggleDayExpansion,
    expandAllDays,
    collapseAllDays,
    isExpanded,
    travelModes,
    setTravelModes,
    travelTimes,
    travelTimesLoading,
    travelTimesError,
    refreshTravelTimes,
    handleRemoveActivity,
    availableDates,
    filterableActivities,
  ]);

  return (
    <ItineraryListContext.Provider value={contextValue}>
      {children}
    </ItineraryListContext.Provider>
  );
}