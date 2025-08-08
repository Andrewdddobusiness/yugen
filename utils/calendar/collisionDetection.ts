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
  excludeId?: string
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
  for (let minutes = targetMinutes; minutes + duration <= dayEnd; minutes += 30) {
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
  for (let minutes = targetMinutes - 30; minutes >= dayStart; minutes -= 30) {
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
 * Snaps a time to the nearest 30-minute interval
 */
export function snapToTimeSlot(minutes: number): number {
  const remainder = minutes % 30;
  if (remainder < 15) {
    return minutes - remainder;
  } else {
    return minutes + (30 - remainder);
  }
}