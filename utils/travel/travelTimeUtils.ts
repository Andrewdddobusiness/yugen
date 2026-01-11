import { calculateTravelTime, calculateBatchTravelTimes, type TravelMode } from '@/actions/google/travelTime';
import type { Coordinates } from '@/types/database';

export interface ActivityWithCoordinates {
  itinerary_activity_id: string;
  start_time: string | null;
  end_time: string | null;
  travel_mode_to_next?: TravelMode | null;
  activity?: {
    name: string;
    // Stored as [lng, lat] across the app.
    coordinates?: [number, number];
  };
}

export interface TravelTimeResult {
  fromActivityId: string;
  toActivityId: string;
  duration: string;
  distance: string;
  mode: TravelMode;
  durationValue: number; // in seconds
  distanceValue: number; // in meters
}

/**
 * Get travel times between consecutive activities in a day
 */
export async function getTravelTimesBetweenActivities(
  activities: ActivityWithCoordinates[],
  modes: TravelMode[] = ['walking', 'driving']
): Promise<TravelTimeResult[]> {
  if (activities.length < 2) {
    return [];
  }

  // Filter activities with coordinates and sort by time
  const activitiesWithCoords = activities
    .filter(activity => 
      activity.activity?.coordinates && 
      Array.isArray(activity.activity.coordinates) && 
      activity.activity.coordinates.length === 2
    )
    .sort((a, b) => {
      // Sort by start_time, putting activities without times at the end
      if (!a.start_time && !b.start_time) return 0;
      if (!a.start_time) return 1;
      if (!b.start_time) return -1;
      return a.start_time.localeCompare(b.start_time);
    });

  if (activitiesWithCoords.length < 2) {
    return [];
  }

  // Ensure we request any explicitly selected per-segment modes in addition to defaults.
  const requestedModes = Array.from(new Set<TravelMode>(modes));

  // Create pairs of consecutive activities
  const activityPairs = [];
  for (let i = 0; i < activitiesWithCoords.length - 1; i++) {
    const fromActivity = activitiesWithCoords[i];
    const toActivity = activitiesWithCoords[i + 1];
    
    if (fromActivity.activity?.coordinates && toActivity.activity?.coordinates) {
      const preferredMode = fromActivity.travel_mode_to_next ?? null;
      if (preferredMode) {
        requestedModes.push(preferredMode);
      }

      activityPairs.push({
        from: {
          lat: fromActivity.activity.coordinates[1],
          lng: fromActivity.activity.coordinates[0]
        },
        to: {
          lat: toActivity.activity.coordinates[1],
          lng: toActivity.activity.coordinates[0]
        },
        fromId: fromActivity.itinerary_activity_id,
        toId: toActivity.itinerary_activity_id
      });
    }
  }

  if (activityPairs.length === 0) {
    return [];
  }

  try {
    const uniqueRequestedModes = Array.from(new Set<TravelMode>(requestedModes));
    const batchResult = await calculateBatchTravelTimes(activityPairs, uniqueRequestedModes);
    
    if (!batchResult.success || !batchResult.data) {
      console.error('Failed to calculate batch travel times:', batchResult.error);
      return [];
    }

    const preferredModeByFromId = new Map<string, TravelMode | null>();
    for (const activity of activitiesWithCoords) {
      preferredModeByFromId.set(
        activity.itinerary_activity_id,
        activity.travel_mode_to_next ?? null
      );
    }

    const travelTimes: TravelTimeResult[] = [];

    for (const result of batchResult.data) {
      const preferredMode = preferredModeByFromId.get(result.fromId) ?? null;
      const selectedTravelTime =
        preferredMode && result.travelTimes.results[preferredMode]
          ? result.travelTimes.results[preferredMode]
          : getBestTravelTime(result.travelTimes.results);
      
      if (selectedTravelTime) {
        travelTimes.push({
          fromActivityId: result.fromId,
          toActivityId: result.toId,
          duration: selectedTravelTime.duration.text,
          distance: selectedTravelTime.distance.text,
          mode: selectedTravelTime.mode,
          durationValue: selectedTravelTime.duration.value,
          distanceValue: selectedTravelTime.distance.value
        });
      }
    }

    return travelTimes;

  } catch (error) {
    console.error('Error calculating travel times between activities:', error);
    return [];
  }
}

/**
 * Get the best travel option based on mode priority and distance
 */
function getBestTravelTime(results: { [mode in TravelMode]?: any }): any {
  const modes = Object.keys(results) as TravelMode[];
  
  if (modes.length === 0) {
    return null;
  }

  // If only one mode available, return it
  if (modes.length === 1) {
    return results[modes[0]];
  }

  // Check if we have walking and it's reasonable (< 20 minutes)
  if (results.walking) {
    const walkingTime = results.walking.duration.value;
    if (walkingTime <= 20 * 60) { // 20 minutes in seconds
      return results.walking;
    }
  }

  // If driving is available and walking is too long, prefer driving
  if (results.driving) {
    return results.driving;
  }

  // Fall back to transit if available
  if (results.transit) {
    return results.transit;
  }

  // Fall back to bicycling if available
  if (results.bicycling) {
    return results.bicycling;
  }

  // Return the first available mode
  return results[modes[0]];
}

/**
 * Check if travel time is significant enough to display
 */
export function shouldShowTravelTime(travelTime: TravelTimeResult): boolean {
  // Don't show if travel time is very short (< 2 minutes)
  return travelTime.durationValue >= 2 * 60;
}

/**
 * Get travel time display color based on duration
 */
export function getTravelTimeColor(durationValue: number): string {
  if (durationValue <= 5 * 60) { // <= 5 minutes
    return 'text-green-600';
  } else if (durationValue <= 15 * 60) { // <= 15 minutes
    return 'text-yellow-600';
  } else if (durationValue <= 30 * 60) { // <= 30 minutes
    return 'text-orange-600';
  } else { // > 30 minutes
    return 'text-red-600';
  }
}

/**
 * Get travel mode icon name for the UI
 */
export function getTravelModeIcon(mode: TravelMode): string {
  return getTravelModeLabel(mode);
}

export function getTravelModeLabel(mode: TravelMode): string {
  switch (mode) {
    case 'walking':
      return 'Walk';
    case 'driving':
      return 'Drive';
    case 'transit':
      return 'Transit';
    case 'bicycling':
      return 'Bike';
    default:
      return 'Walk';
  }
}

/**
 * Format travel time for display
 */
export function formatTravelTime(duration: string, distance: string, mode: TravelMode): string {
  const label = getTravelModeLabel(mode);
  return `${label}: ${duration} (${distance})`;
}

/**
 * Calculate total travel time for a day
 */
export function getTotalTravelTimeForDay(travelTimes: TravelTimeResult[]): {
  totalDuration: number; // in seconds
  totalDistance: number; // in meters
  formattedDuration: string;
  formattedDistance: string;
} {
  const totalDuration = travelTimes.reduce((sum, travel) => sum + travel.durationValue, 0);
  const totalDistance = travelTimes.reduce((sum, travel) => sum + travel.distanceValue, 0);

  const formattedDuration = formatDuration(totalDuration);
  const formattedDistance = formatDistance(totalDistance);

  return {
    totalDuration,
    totalDistance,
    formattedDuration,
    formattedDistance
  };
}

/**
 * Format duration in seconds to human readable format
 */
export function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);

  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes}m`;
}

/**
 * Format distance in meters to human readable format
 */
export function formatDistance(meters: number): string {
  if (meters < 1000) {
    return `${Math.round(meters)}m`;
  }
  const kilometers = meters / 1000;
  if (kilometers < 10) {
    return `${kilometers.toFixed(1)}km`;
  }
  return `${Math.round(kilometers)}km`;
}

/**
 * Detect potential scheduling conflicts based on travel time
 */
export function detectTravelTimeConflicts(
  activities: ActivityWithCoordinates[],
  travelTimes: TravelTimeResult[]
): Array<{
  fromActivityId: string;
  toActivityId: string;
  conflict: string;
  severity: 'warning' | 'error';
}> {
  const conflicts: Array<{
    fromActivityId: string;
    toActivityId: string;
    conflict: string;
    severity: 'warning' | 'error';
  }> = [];

  for (const travelTime of travelTimes) {
    const fromActivity = activities.find(a => a.itinerary_activity_id === travelTime.fromActivityId);
    const toActivity = activities.find(a => a.itinerary_activity_id === travelTime.toActivityId);

    if (!fromActivity || !toActivity || !fromActivity.end_time || !toActivity.start_time) {
      continue;
    }

    // Parse times
    const fromEndTime = new Date(`2000-01-01T${fromActivity.end_time}`);
    const toStartTime = new Date(`2000-01-01T${toActivity.start_time}`);
    
    // Calculate available time between activities
    const availableTime = (toStartTime.getTime() - fromEndTime.getTime()) / 1000; // in seconds
    const requiredTime = travelTime.durationValue;

    if (availableTime < requiredTime) {
      // Not enough time for travel
      const shortfall = requiredTime - availableTime;
      conflicts.push({
        fromActivityId: travelTime.fromActivityId,
        toActivityId: travelTime.toActivityId,
        conflict: `Need ${formatDuration(shortfall)} more time for travel`,
        severity: 'error'
      });
    } else if (availableTime < requiredTime + 5 * 60) { // Less than 5 minutes buffer
      // Very tight schedule
      conflicts.push({
        fromActivityId: travelTime.fromActivityId,
        toActivityId: travelTime.toActivityId,
        conflict: `Very tight schedule - consider adding buffer time`,
        severity: 'warning'
      });
    }
  }

  return conflicts;
}

/**
 * Suggest optimal departure time based on travel time and destination start time
 */
export function suggestDepartureTime(
  destinationStartTime: string,
  travelDurationSeconds: number,
  bufferMinutes: number = 5
): string {
  const destTime = new Date(`2000-01-01T${destinationStartTime}`);
  const bufferTime = bufferMinutes * 60 * 1000; // Convert to milliseconds
  const travelTime = travelDurationSeconds * 1000; // Convert to milliseconds
  
  const suggestedDeparture = new Date(destTime.getTime() - travelTime - bufferTime);
  
  return suggestedDeparture.toTimeString().substring(0, 5); // HH:MM format
}
