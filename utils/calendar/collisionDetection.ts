interface TimeRange {
  startHour: number;
  startMinute: number;
  endHour: number;
  endMinute: number;
}

interface Activity {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
}

interface BusinessHours {
  open: string;
  close: string;
  isOpen24Hours?: boolean;
  isClosed?: boolean;
}

interface ConflictDetails {
  type: 'time_overlap' | 'travel_time' | 'business_hours' | 'duration_mismatch';
  severity: 'high' | 'medium' | 'low';
  conflictingActivity?: Activity;
  message: string;
  suggestedTime?: string;
}

/**
 * Converts time string (HH:MM:SS) to minutes since midnight
 */
export function timeToMinutes(timeString: string): number {
  const [hours, minutes] = timeString.split(':').map(Number);
  return hours * 60 + minutes;
}

/**
 * Checks if two time ranges overlap
 */
export function timeRangesOverlap(range1: TimeRange, range2: TimeRange): boolean {
  const start1 = range1.startHour * 60 + range1.startMinute;
  const end1 = range1.endHour * 60 + range1.endMinute;
  const start2 = range2.startHour * 60 + range2.startMinute;
  const end2 = range2.endHour * 60 + range2.endMinute;

  return start1 < end2 && end1 > start2;
}

/**
 * Checks if an activity would overlap with existing activities
 */
export function checkActivityOverlap(
  newActivity: {
    date: string;
    startTime: string;
    endTime: string;
  },
  existingActivities: Activity[],
  excludeId?: string
): Activity[] {
  const overlappingActivities: Activity[] = [];
  
  const newStart = timeToMinutes(newActivity.startTime);
  const newEnd = timeToMinutes(newActivity.endTime);

  for (const activity of existingActivities) {
    // Skip if it's the same activity being moved
    if (excludeId && activity.id === excludeId) continue;
    
    // Skip if different date
    if (activity.date !== newActivity.date) continue;
    
    const existingStart = timeToMinutes(activity.startTime);
    const existingEnd = timeToMinutes(activity.endTime);
    
    // Check for overlap
    if (newStart < existingEnd && newEnd > existingStart) {
      overlappingActivities.push(activity);
    }
  }

  return overlappingActivities;
}

/**
 * Finds the nearest valid time slot that doesn't overlap
 */
export function findNearestValidSlot(
  targetTime: string,
  duration: number,
  date: string,
  existingActivities: Activity[],
  excludeId?: string,
  interval: number = 30
): { startTime: string; endTime: string } | null {
  const targetMinutes = timeToMinutes(targetTime);
  const endMinutes = targetMinutes + duration;
  
  // Check if target slot is valid
  const overlaps = checkActivityOverlap(
    {
      date,
      startTime: targetTime,
      endTime: `${Math.floor(endMinutes / 60).toString().padStart(2, '0')}:${(endMinutes % 60).toString().padStart(2, '0')}:00`
    },
    existingActivities,
    excludeId
  );
  
  if (overlaps.length === 0) {
    return {
      startTime: targetTime,
      endTime: `${Math.floor(endMinutes / 60).toString().padStart(2, '0')}:${(endMinutes % 60).toString().padStart(2, '0')}:00`
    };
  }
  
  // Find nearest available slot
  const dayStart = 6 * 60; // 6 AM
  const dayEnd = 23 * 60; // 11 PM
  
  // Try slots after the target time
  for (let minutes = targetMinutes; minutes + duration <= dayEnd; minutes += interval) {
    const testStart = `${Math.floor(minutes / 60).toString().padStart(2, '0')}:${(minutes % 60).toString().padStart(2, '0')}:00`;
    const testEnd = `${Math.floor((minutes + duration) / 60).toString().padStart(2, '0')}:${((minutes + duration) % 60).toString().padStart(2, '0')}:00`;
    
    const testOverlaps = checkActivityOverlap(
      { date, startTime: testStart, endTime: testEnd },
      existingActivities,
      excludeId
    );
    
    if (testOverlaps.length === 0) {
      return { startTime: testStart, endTime: testEnd };
    }
  }
  
  // Try slots before the target time
  for (let minutes = targetMinutes - interval; minutes >= dayStart; minutes -= interval) {
    const testStart = `${Math.floor(minutes / 60).toString().padStart(2, '0')}:${(minutes % 60).toString().padStart(2, '0')}:00`;
    const testEnd = `${Math.floor((minutes + duration) / 60).toString().padStart(2, '0')}:${((minutes + duration) % 60).toString().padStart(2, '0')}:00`;
    
    const testOverlaps = checkActivityOverlap(
      { date, startTime: testStart, endTime: testEnd },
      existingActivities,
      excludeId
    );
    
    if (testOverlaps.length === 0) {
      return { startTime: testStart, endTime: testEnd };
    }
  }
  
  return null; // No valid slot found
}

/**
 * Enhanced conflict detection with detailed analysis
 */
export function detectConflicts(
  newActivity: {
    date: string;
    startTime: string;
    endTime: string;
    placeId?: string;
    duration?: number;
  },
  existingActivities: Activity[],
  businessHours?: BusinessHours,
  travelTimeMinutes?: number,
  excludeId?: string
): ConflictDetails[] {
  const conflicts: ConflictDetails[] = [];
  
  // Check time overlaps
  const overlapping = checkActivityOverlap(newActivity, existingActivities, excludeId);
  overlapping.forEach(activity => {
    conflicts.push({
      type: 'time_overlap',
      severity: 'high',
      conflictingActivity: activity,
      message: `Time conflicts with ${activity.id} (${formatTime(activity.startTime)} - ${formatTime(activity.endTime)})`
    });
  });

  // Check business hours
  if (businessHours && !businessHours.isOpen24Hours && !businessHours.isClosed) {
    const conflict = checkBusinessHoursConflict(newActivity, businessHours);
    if (conflict) {
      conflicts.push(conflict);
    }
  }

  // Check travel time conflicts
  if (travelTimeMinutes && travelTimeMinutes > 0) {
    const travelConflicts = checkTravelTimeConflicts(newActivity, existingActivities, travelTimeMinutes, excludeId);
    conflicts.push(...travelConflicts);
  }

  return conflicts;
}

/**
 * Check if activity conflicts with business hours
 */
export function checkBusinessHoursConflict(
  activity: { startTime: string; endTime: string },
  businessHours: BusinessHours
): ConflictDetails | null {
  if (businessHours.isClosed) {
    return {
      type: 'business_hours',
      severity: 'high',
      message: 'Activity scheduled when venue is closed'
    };
  }

  const activityStart = timeToMinutes(activity.startTime);
  const activityEnd = timeToMinutes(activity.endTime);
  const openTime = timeToMinutes(businessHours.open);
  const closeTime = timeToMinutes(businessHours.close);

  if (activityStart < openTime || activityEnd > closeTime) {
    return {
      type: 'business_hours',
      severity: 'medium',
      message: `Activity extends outside business hours (${formatTime(businessHours.open)} - ${formatTime(businessHours.close)})`,
      suggestedTime: businessHours.open
    };
  }

  return null;
}

/**
 * Check travel time conflicts between activities
 */
export function checkTravelTimeConflicts(
  newActivity: { date: string; startTime: string; endTime: string; placeId?: string },
  existingActivities: Activity[],
  travelTimeMinutes: number,
  excludeId?: string
): ConflictDetails[] {
  const conflicts: ConflictDetails[] = [];
  const newStart = timeToMinutes(newActivity.startTime);
  const newEnd = timeToMinutes(newActivity.endTime);

  const sameDay = existingActivities.filter(activity => 
    activity.date === newActivity.date && 
    (!excludeId || activity.id !== excludeId)
  );

  sameDay.forEach(activity => {
    const existingStart = timeToMinutes(activity.startTime);
    const existingEnd = timeToMinutes(activity.endTime);

    // Check if there's enough travel time before the new activity
    if (existingEnd <= newStart && newStart - existingEnd < travelTimeMinutes) {
      conflicts.push({
        type: 'travel_time',
        severity: 'medium',
        conflictingActivity: activity,
        message: `Insufficient travel time from ${activity.id} (need ${travelTimeMinutes}min, have ${newStart - existingEnd}min)`
      });
    }

    // Check if there's enough travel time after the new activity
    if (newEnd <= existingStart && existingStart - newEnd < travelTimeMinutes) {
      conflicts.push({
        type: 'travel_time',
        severity: 'medium',
        conflictingActivity: activity,
        message: `Insufficient travel time to ${activity.id} (need ${travelTimeMinutes}min, have ${existingStart - newEnd}min)`
      });
    }
  });

  return conflicts;
}

/**
 * Snaps a time to the specified interval
 */
export function snapToTimeSlot(minutes: number, interval: number = 30): number {
  const remainder = minutes % interval;
  if (remainder < interval / 2) {
    return minutes - remainder;
  } else {
    return minutes + (interval - remainder);
  }
}

/**
 * Calculate optimal time slots for an activity
 */
export function findOptimalTimeSlots(
  duration: number,
  date: string,
  existingActivities: Activity[],
  preferences: {
    preferredStartTime?: string;
    avoidPeakHours?: boolean;
    businessHours?: BusinessHours;
    travelBuffer?: number;
    interval?: number;
  },
  maxResults: number = 5
): Array<{ startTime: string; endTime: string; score: number }> {
  const slots: Array<{ startTime: string; endTime: string; score: number }> = [];
  const dayStart = 6 * 60; // 6 AM
  const dayEnd = 23 * 60; // 11 PM
  const interval = preferences.interval ?? 30;
  
  for (let minutes = dayStart; minutes + duration <= dayEnd; minutes += interval) {
    const startTime = `${Math.floor(minutes / 60).toString().padStart(2, '0')}:${(minutes % 60).toString().padStart(2, '0')}:00`;
    const endTime = `${Math.floor((minutes + duration) / 60).toString().padStart(2, '0')}:${((minutes + duration) % 60).toString().padStart(2, '0')}:00`;
    
    // Check for conflicts
    const conflicts = detectConflicts(
      { date, startTime, endTime, duration },
      existingActivities,
      preferences.businessHours,
      preferences.travelBuffer
    );
    
    if (conflicts.filter(c => c.severity === 'high').length === 0) {
      let score = 100;
      
      // Reduce score for medium/low conflicts
      score -= conflicts.filter(c => c.severity === 'medium').length * 20;
      score -= conflicts.filter(c => c.severity === 'low').length * 5;
      
      // Prefer times closer to preferred start time
      if (preferences.preferredStartTime) {
        const preferredMinutes = timeToMinutes(preferences.preferredStartTime);
        const distance = Math.abs(minutes - preferredMinutes);
        score -= distance / interval; // Reduce score based on distance
      }
      
      // Avoid peak hours if requested (9-11 AM, 12-1 PM, 5-7 PM)
      if (preferences.avoidPeakHours) {
        const peakPeriods = [
          [9 * 60, 11 * 60],   // 9-11 AM
          [12 * 60, 13 * 60],  // 12-1 PM  
          [17 * 60, 19 * 60]   // 5-7 PM
        ];
        
        const isPeakTime = peakPeriods.some(([start, end]) => 
          minutes >= start && minutes < end
        );
        
        if (isPeakTime) score -= 15;
      }
      
      slots.push({ startTime, endTime, score });
    }
  }
  
  return slots
    .sort((a, b) => b.score - a.score)
    .slice(0, maxResults);
}

/**
 * Format time for display
 */
function formatTime(timeString: string): string {
  const [hours, minutes] = timeString.split(':').map(Number);
  const displayHour = hours > 12 ? hours - 12 : hours === 0 ? 12 : hours;
  const period = hours >= 12 ? 'PM' : 'AM';
  return `${displayHour}:${minutes.toString().padStart(2, '0')} ${period}`;
}
