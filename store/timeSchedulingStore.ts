import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { TimeGridConfig, DEFAULT_TIME_CONFIG } from '@/components/calendar/TimeGrid';

interface ConflictSettings {
  autoResolve: boolean;
  strictMode: boolean; // Prevent any overlapping activities
  allowMinorOverlaps: boolean; // Allow overlaps < 15 minutes
  notifyTravelTime: boolean;
  minimumTravelBuffer: number; // minutes
}

interface TravelSettings {
  defaultMode: 'walking' | 'driving' | 'transit';
  showTravelTime: boolean;
  includeBuffer: boolean;
  bufferMinutes: number;
  preferClusteredActivities: boolean;
}

interface SchedulingPreferences {
  preferredStartTime: string; // "09:00:00"
  preferredEndTime: string;   // "17:00:00"
  avoidEarlyMorning: boolean; // before 8 AM
  avoidLateEvening: boolean;  // after 9 PM
  allowWeekendExtension: boolean;
  preferLongerBlocks: boolean; // prefer fewer, longer activities vs many short ones
  energyPattern: 'morning_person' | 'night_owl' | 'flexible';
}

interface TimeSchedulingState {
  // Grid configuration
  timeGridConfig: TimeGridConfig;
  
  // Scheduling preferences  
  preferences: SchedulingPreferences;
  
  // Conflict handling
  conflictSettings: ConflictSettings;
  
  // Travel calculations
  travelSettings: TravelSettings;
  
  // UI state
  showTravelIndicators: boolean;
  showBusinessHours: boolean;
  showOptimalTimes: boolean;
  highlightConflicts: boolean;
  
  // Current scheduling context
  isScheduling: boolean;
  activeSchedulingSession?: {
    activityId?: string;
    suggestedSlots?: Array<{
      startTime: string;
      endTime: string;
      score: number;
    }>;
    conflicts?: Array<{
      type: string;
      message: string;
      severity: 'high' | 'medium' | 'low';
    }>;
  };
  
  // Actions
  updateTimeGridConfig: (config: Partial<TimeGridConfig>) => void;
  updatePreferences: (prefs: Partial<SchedulingPreferences>) => void;
  updateConflictSettings: (settings: Partial<ConflictSettings>) => void;
  updateTravelSettings: (settings: Partial<TravelSettings>) => void;
  setUIState: (state: {
    showTravelIndicators?: boolean;
    showBusinessHours?: boolean;
    showOptimalTimes?: boolean;
    highlightConflicts?: boolean;
  }) => void;
  startSchedulingSession: (activityId?: string) => void;
  updateSchedulingSession: (update: Partial<TimeSchedulingState['activeSchedulingSession']>) => void;
  endSchedulingSession: () => void;
  resetToDefaults: () => void;
}

// Default preferences
const DEFAULT_PREFERENCES: SchedulingPreferences = {
  preferredStartTime: "09:00:00",
  preferredEndTime: "17:00:00", 
  avoidEarlyMorning: true,
  avoidLateEvening: true,
  allowWeekendExtension: false,
  preferLongerBlocks: false,
  energyPattern: 'flexible'
};

const DEFAULT_CONFLICT_SETTINGS: ConflictSettings = {
  autoResolve: false,
  strictMode: false,
  allowMinorOverlaps: false,
  notifyTravelTime: true,
  minimumTravelBuffer: 15
};

const DEFAULT_TRAVEL_SETTINGS: TravelSettings = {
  defaultMode: 'walking',
  showTravelTime: true,
  includeBuffer: true,
  bufferMinutes: 10,
  preferClusteredActivities: true
};

/**
 * Zustand store for time scheduling state and preferences
 */
export const useTimeSchedulingStore = create<TimeSchedulingState>()(
  persist(
    (set, get) => ({
      // Initial state
      timeGridConfig: DEFAULT_TIME_CONFIG,
      preferences: DEFAULT_PREFERENCES,
      conflictSettings: DEFAULT_CONFLICT_SETTINGS,
      travelSettings: DEFAULT_TRAVEL_SETTINGS,
      showTravelIndicators: true,
      showBusinessHours: true,
      showOptimalTimes: true,
      highlightConflicts: true,
      isScheduling: false,
      
      // Actions
      updateTimeGridConfig: (config) =>
        set((state) => ({
          timeGridConfig: { ...state.timeGridConfig, ...config }
        })),
      
      updatePreferences: (prefs) =>
        set((state) => ({
          preferences: { ...state.preferences, ...prefs }
        })),
      
      updateConflictSettings: (settings) =>
        set((state) => ({
          conflictSettings: { ...state.conflictSettings, ...settings }
        })),
      
      updateTravelSettings: (settings) =>
        set((state) => ({
          travelSettings: { ...state.travelSettings, ...settings }
        })),
      
      setUIState: (uiState) =>
        set((state) => ({
          ...state,
          ...uiState
        })),
      
      startSchedulingSession: (activityId) =>
        set({
          isScheduling: true,
          activeSchedulingSession: {
            activityId,
            suggestedSlots: [],
            conflicts: []
          }
        }),
      
      updateSchedulingSession: (update) =>
        set((state) => ({
          activeSchedulingSession: state.activeSchedulingSession
            ? { ...state.activeSchedulingSession, ...update }
            : undefined
        })),
      
      endSchedulingSession: () =>
        set({
          isScheduling: false,
          activeSchedulingSession: undefined
        }),
      
      resetToDefaults: () =>
        set({
          timeGridConfig: DEFAULT_TIME_CONFIG,
          preferences: DEFAULT_PREFERENCES,
          conflictSettings: DEFAULT_CONFLICT_SETTINGS,
          travelSettings: DEFAULT_TRAVEL_SETTINGS,
          showTravelIndicators: true,
          showBusinessHours: true,
          showOptimalTimes: true,
          highlightConflicts: true,
          isScheduling: false,
          activeSchedulingSession: undefined
        })
    }),
    {
      name: 'time-scheduling-store',
      // Only persist configuration, not temporary state
      partialize: (state) => ({
        timeGridConfig: state.timeGridConfig,
        preferences: state.preferences,
        conflictSettings: state.conflictSettings,
        travelSettings: state.travelSettings,
        showTravelIndicators: state.showTravelIndicators,
        showBusinessHours: state.showBusinessHours,
        showOptimalTimes: state.showOptimalTimes,
        highlightConflicts: state.highlightConflicts
      })
    }
  )
);

/**
 * Hook to get current scheduling context
 */
export function useSchedulingContext() {
  const {
    timeGridConfig,
    preferences, 
    conflictSettings,
    travelSettings,
    isScheduling,
    activeSchedulingSession
  } = useTimeSchedulingStore();
  
  return {
    config: timeGridConfig,
    preferences,
    conflictSettings,
    travelSettings,
    isActive: isScheduling,
    session: activeSchedulingSession
  };
}

/**
 * Hook for UI display preferences
 */
export function useSchedulingDisplay() {
  const {
    showTravelIndicators,
    showBusinessHours,
    showOptimalTimes,
    highlightConflicts,
    setUIState
  } = useTimeSchedulingStore();
  
  return {
    showTravelIndicators,
    showBusinessHours,
    showOptimalTimes,
    highlightConflicts,
    setUIState
  };
}

/**
 * Utility to determine if a time slot is within user preferences
 */
export function isPreferredTimeSlot(
  time: string,
  preferences: SchedulingPreferences
): boolean {
  const [hours] = time.split(':').map(Number);
  const preferredStart = parseInt(preferences.preferredStartTime.split(':')[0]);
  const preferredEnd = parseInt(preferences.preferredEndTime.split(':')[0]);
  
  // Check if within preferred time range
  if (hours < preferredStart || hours > preferredEnd) {
    return false;
  }
  
  // Check early morning preference
  if (preferences.avoidEarlyMorning && hours < 8) {
    return false;
  }
  
  // Check late evening preference
  if (preferences.avoidLateEvening && hours > 21) {
    return false;
  }
  
  return true;
}

/**
 * Generate smart scheduling suggestions based on preferences
 */
export function generateSchedulingSuggestions(
  duration: number,
  existingActivities: Array<{
    date: string;
    startTime: string; 
    endTime: string;
  }>,
  preferences: SchedulingPreferences
): Array<{
  startTime: string;
  endTime: string;
  score: number;
  reason: string;
}> {
  const suggestions = [];
  const dayStart = preferences.avoidEarlyMorning ? 8 * 60 : 6 * 60; // minutes since midnight
  const dayEnd = preferences.avoidLateEvening ? 21 * 60 : 23 * 60;
  
  // Energy pattern adjustments
  let optimalHours: number[] = [];
  switch (preferences.energyPattern) {
    case 'morning_person':
      optimalHours = [8, 9, 10, 11]; // Morning hours get higher scores
      break;
    case 'night_owl':
      optimalHours = [14, 15, 16, 17, 18]; // Afternoon/evening hours
      break;
    case 'flexible':
    default:
      optimalHours = [9, 10, 14, 15, 16]; // Avoid early morning and lunch
      break;
  }
  
  for (let minutes = dayStart; minutes + duration <= dayEnd; minutes += 30) {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    const startTime = `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:00`;
    const endTime = `${Math.floor((minutes + duration) / 60).toString().padStart(2, '0')}:${((minutes + duration) % 60).toString().padStart(2, '0')}:00`;
    
    let score = 50; // Base score
    let reason = 'Available time slot';
    
    // Boost score for optimal energy hours
    if (optimalHours.includes(hours)) {
      score += 20;
      reason = 'Optimal energy time';
    }
    
    // Check for conflicts with existing activities
    const hasConflict = existingActivities.some(activity => {
      const activityStart = parseInt(activity.startTime.split(':')[0]) * 60 + parseInt(activity.startTime.split(':')[1]);
      const activityEnd = parseInt(activity.endTime.split(':')[0]) * 60 + parseInt(activity.endTime.split(':')[1]);
      return minutes < activityEnd && (minutes + duration) > activityStart;
    });
    
    if (!hasConflict) {
      suggestions.push({
        startTime,
        endTime,
        score,
        reason
      });
    }
  }
  
  return suggestions
    .sort((a, b) => b.score - a.score)
    .slice(0, 10); // Return top 10 suggestions
}