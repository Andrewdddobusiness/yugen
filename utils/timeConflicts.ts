import { parseTimeToMinutes, minutesToTimeString } from './timeSlots';

export interface TimeConflict {
  type: 'overlap' | 'insufficient_travel' | 'closed_venue' | 'meal_timing';
  severity: 'warning' | 'error';
  message: string;
  suggestions: ConflictResolution[];
  activityIds: string[];
}

export interface ConflictResolution {
  action: 'adjust_time' | 'remove_activity' | 'add_travel_buffer' | 'suggest_alternative';
  description: string;
  newStartTime?: string;
  newEndTime?: string;
}

/**
 * Check for time overlaps between activities
 */
export function detectOverlapConflicts(activities: any[]): TimeConflict[] {
  const conflicts: TimeConflict[] = [];
  const scheduledActivities = activities
    .filter(a => a.start_time && a.end_time)
    .sort((a, b) => parseTimeToMinutes(a.start_time) - parseTimeToMinutes(b.start_time));

  for (let i = 0; i < scheduledActivities.length - 1; i++) {
    const current = scheduledActivities[i];
    const next = scheduledActivities[i + 1];
    
    const currentEnd = parseTimeToMinutes(current.end_time);
    const nextStart = parseTimeToMinutes(next.start_time);
    
    if (currentEnd > nextStart) {
      // Activities overlap
      const overlapMinutes = currentEnd - nextStart;
      conflicts.push({
        type: 'overlap',
        severity: 'error',
        message: `${current.activity?.name || 'Activity'} overlaps with ${next.activity?.name || 'Activity'} by ${overlapMinutes} minutes`,
        activityIds: [current.itinerary_activity_id, next.itinerary_activity_id],
        suggestions: [
          {
            action: 'adjust_time',
            description: `End ${current.activity?.name || 'first activity'} at ${minutesToTimeString(nextStart)}`,
            newEndTime: minutesToTimeString(nextStart)
          },
          {
            action: 'adjust_time',
            description: `Start ${next.activity?.name || 'second activity'} at ${minutesToTimeString(currentEnd)}`,
            newStartTime: minutesToTimeString(currentEnd)
          }
        ]
      });
    }
  }
  
  return conflicts;
}

/**
 * Check for insufficient travel time between activities
 */
export function detectTravelTimeConflicts(
  activities: any[], 
  travelTimes: { [key: string]: { duration: string; durationValue: number; mode: string } }
): TimeConflict[] {
  const conflicts: TimeConflict[] = [];
  const scheduledActivities = activities
    .filter(a => a.start_time && a.end_time)
    .sort((a, b) => parseTimeToMinutes(a.start_time) - parseTimeToMinutes(b.start_time));

  for (let i = 0; i < scheduledActivities.length - 1; i++) {
    const current = scheduledActivities[i];
    const next = scheduledActivities[i + 1];
    
    const travelTime = travelTimes[current.itinerary_activity_id];
    if (!travelTime) continue;
    
    const currentEnd = parseTimeToMinutes(current.end_time);
    const nextStart = parseTimeToMinutes(next.start_time);
    const availableTime = nextStart - currentEnd;
    const requiredTravelTime = Math.ceil(travelTime.durationValue / 60); // Convert seconds to minutes
    
    if (availableTime < requiredTravelTime) {
      const shortfall = requiredTravelTime - availableTime;
      conflicts.push({
        type: 'insufficient_travel',
        severity: shortfall > 15 ? 'error' : 'warning',
        message: `Not enough time to travel from ${current.activity?.name || 'Activity'} to ${next.activity?.name || 'Activity'}. Need ${requiredTravelTime}m but only have ${availableTime}m.`,
        activityIds: [current.itinerary_activity_id, next.itinerary_activity_id],
        suggestions: [
          {
            action: 'adjust_time',
            description: `Start ${next.activity?.name || 'next activity'} at ${minutesToTimeString(currentEnd + requiredTravelTime + 5)}`,
            newStartTime: minutesToTimeString(currentEnd + requiredTravelTime + 5)
          },
          {
            action: 'adjust_time',
            description: `End ${current.activity?.name || 'current activity'} at ${minutesToTimeString(nextStart - requiredTravelTime - 5)}`,
            newEndTime: minutesToTimeString(nextStart - requiredTravelTime - 5)
          }
        ]
      });
    }
  }
  
  return conflicts;
}

/**
 * Check for activities scheduled during typical meal times without meal activities
 */
export function detectMealTimingConflicts(activities: any[]): TimeConflict[] {
  const conflicts: TimeConflict[] = [];
  const scheduledActivities = activities.filter(a => a.start_time && a.end_time);
  
  const mealTimes = [
    { name: 'breakfast', start: '07:00', end: '10:00', ideal: '08:30' },
    { name: 'lunch', start: '11:30', end: '14:30', ideal: '12:30' },
    { name: 'dinner', start: '17:30', end: '21:00', ideal: '19:00' }
  ];
  
  for (const meal of mealTimes) {
    const mealStartMinutes = parseTimeToMinutes(meal.start);
    const mealEndMinutes = parseTimeToMinutes(meal.end);
    
    // Check if there's already a meal/restaurant activity during this time
    const hasMealActivity = scheduledActivities.some(activity => {
      const activityStart = parseTimeToMinutes(activity.start_time);
      const activityEnd = parseTimeToMinutes(activity.end_time);
      const isRestaurant = activity.activity?.types?.includes('restaurant') || 
                          activity.activity?.types?.includes('meal_takeaway') ||
                          activity.activity?.name?.toLowerCase().includes('breakfast') ||
                          activity.activity?.name?.toLowerCase().includes('lunch') ||
                          activity.activity?.name?.toLowerCase().includes('dinner');
      
      return isRestaurant && (
        (activityStart >= mealStartMinutes && activityStart <= mealEndMinutes) ||
        (activityEnd >= mealStartMinutes && activityEnd <= mealEndMinutes)
      );
    });
    
    if (!hasMealActivity) {
      // Check if meal time is completely blocked by other activities
      const blockingActivities = scheduledActivities.filter(activity => {
        const activityStart = parseTimeToMinutes(activity.start_time);
        const activityEnd = parseTimeToMinutes(activity.end_time);
        
        return activityStart <= mealStartMinutes && activityEnd >= mealEndMinutes;
      });
      
      if (blockingActivities.length > 0) {
        conflicts.push({
          type: 'meal_timing',
          severity: 'warning',
          message: `${meal.name.charAt(0).toUpperCase() + meal.name.slice(1)} time (${meal.start}-${meal.end}) is blocked by activities`,
          activityIds: blockingActivities.map(a => a.itinerary_activity_id),
          suggestions: [
            {
              action: 'suggest_alternative',
              description: `Consider adding a ${meal.name} break around ${meal.ideal}`
            },
            {
              action: 'adjust_time',
              description: `Shorten activities to allow for ${meal.name} time`
            }
          ]
        });
      }
    }
  }
  
  return conflicts;
}

/**
 * Check for activities scheduled outside typical venue hours
 */
export function detectVenueHourConflicts(activities: any[]): TimeConflict[] {
  const conflicts: TimeConflict[] = [];
  
  // Common venue hour patterns
  const venueHours: { [key: string]: { open: string; close: string; days?: string[] } } = {
    'museum': { open: '09:00', close: '17:00' },
    'tourist_attraction': { open: '08:00', close: '18:00' },
    'shopping_mall': { open: '10:00', close: '22:00' },
    'restaurant': { open: '11:00', close: '22:00' },
    'bar': { open: '17:00', close: '02:00' },
    'bank': { open: '09:00', close: '17:00', days: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'] },
    'post_office': { open: '09:00', close: '17:00', days: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'] }
  };
  
  for (const activity of activities) {
    if (!activity.start_time || !activity.activity?.types) continue;
    
    const activityStart = parseTimeToMinutes(activity.start_time);
    
    for (const type of activity.activity.types) {
      const hours = venueHours[type];
      if (!hours) continue;
      
      const openMinutes = parseTimeToMinutes(hours.open);
      const closeMinutes = parseTimeToMinutes(hours.close);
      
      if (activityStart < openMinutes || activityStart > closeMinutes) {
        conflicts.push({
          type: 'closed_venue',
          severity: 'warning',
          message: `${activity.activity?.name || 'Activity'} may be closed at ${activity.start_time}. ${type.replace('_', ' ')}s typically open ${hours.open}-${hours.close}`,
          activityIds: [activity.itinerary_activity_id],
          suggestions: [
            {
              action: 'adjust_time',
              description: `Move to ${hours.open} when venue opens`,
              newStartTime: hours.open
            },
            {
              action: 'suggest_alternative',
              description: 'Check venue-specific hours before visiting'
            }
          ]
        });
        break; // Only show one conflict per activity
      }
    }
  }
  
  return conflicts;
}

/**
 * Get all conflicts for a day's activities
 */
export function detectAllConflicts(
  activities: any[],
  travelTimes: { [key: string]: { duration: string; durationValue: number; mode: string } } = {}
): TimeConflict[] {
  return [
    ...detectOverlapConflicts(activities),
    ...detectTravelTimeConflicts(activities, travelTimes),
    ...detectMealTimingConflicts(activities),
    ...detectVenueHourConflicts(activities)
  ];
}

/**
 * Group conflicts by severity
 */
export function groupConflictsBySeverity(conflicts: TimeConflict[]) {
  return {
    errors: conflicts.filter(c => c.severity === 'error'),
    warnings: conflicts.filter(c => c.severity === 'warning')
  };
}

/**
 * Get conflict summary text
 */
export function getConflictSummary(conflicts: TimeConflict[]): string {
  const { errors, warnings } = groupConflictsBySeverity(conflicts);
  
  if (errors.length === 0 && warnings.length === 0) {
    return 'No scheduling conflicts detected';
  }
  
  const parts = [];
  if (errors.length > 0) {
    parts.push(`${errors.length} error${errors.length > 1 ? 's' : ''}`);
  }
  if (warnings.length > 0) {
    parts.push(`${warnings.length} warning${warnings.length > 1 ? 's' : ''}`);
  }
  
  return parts.join(', ');
}