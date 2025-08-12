export interface TimeSlot {
  hour: number;
  minute: number;
  displayTime: string;
  position: number; // Position in pixels from top
}

export interface ActivityTimeBlock {
  startTime: string;
  endTime?: string;
  duration: number; // Duration in minutes
  startPosition: number; // Position in pixels from top
  height: number; // Height in pixels
  activity: any;
}

export interface DayTimeSlots {
  date: string;
  timeSlots: TimeSlot[];
  activities: ActivityTimeBlock[];
  unscheduledActivities: any[];
}

// Configuration
export const TIME_SLOT_CONFIG = {
  startHour: 6, // 6 AM
  endHour: 23, // 11 PM
  slotHeight: 60, // Height of each hour slot in pixels
  minuteHeight: 1, // Height per minute in pixels
  headerHeight: 40, // Height of day header
} as const;

/**
 * Generate time slots for a day
 */
export function generateTimeSlots(): TimeSlot[] {
  const slots: TimeSlot[] = [];
  
  for (let hour = TIME_SLOT_CONFIG.startHour; hour <= TIME_SLOT_CONFIG.endHour; hour++) {
    const position = (hour - TIME_SLOT_CONFIG.startHour) * TIME_SLOT_CONFIG.slotHeight;
    slots.push({
      hour,
      minute: 0,
      displayTime: formatHour(hour),
      position,
    });
  }
  
  return slots;
}

/**
 * Format hour for display (12-hour format)
 */
export function formatHour(hour: number): string {
  if (hour === 0) return '12 AM';
  if (hour === 12) return '12 PM';
  if (hour < 12) return `${hour} AM`;
  return `${hour - 12} PM`;
}

/**
 * Parse time string (HH:mm) to minutes since start of day
 */
export function parseTimeToMinutes(timeString: string): number {
  const [hours, minutes] = timeString.split(':').map(Number);
  return hours * 60 + minutes;
}

/**
 * Convert minutes since start of day to time string (HH:mm)
 */
export function minutesToTimeString(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
}

/**
 * Calculate position in pixels for a given time
 */
export function getTimePosition(timeString: string): number {
  const [hours, minutes] = timeString.split(':').map(Number);
  const totalMinutes = hours * 60 + minutes;
  const startMinutes = TIME_SLOT_CONFIG.startHour * 60;
  
  // If time is before start hour, position at top
  if (totalMinutes < startMinutes) {
    return 0;
  }
  
  const minutesFromStart = totalMinutes - startMinutes;
  return minutesFromStart * TIME_SLOT_CONFIG.minuteHeight;
}

/**
 * Calculate duration in minutes between two times
 */
export function calculateDuration(startTime: string, endTime: string): number {
  const startMinutes = parseTimeToMinutes(startTime);
  const endMinutes = parseTimeToMinutes(endTime);
  
  if (endMinutes < startMinutes) {
    // Handle overnight activities (end time next day)
    return (24 * 60 - startMinutes) + endMinutes;
  }
  
  return endMinutes - startMinutes;
}

/**
 * Convert activity to time block with positioning
 */
export function activityToTimeBlock(activity: any): ActivityTimeBlock | null {
  if (!activity.start_time) {
    return null;
  }
  
  const startPosition = getTimePosition(activity.start_time);
  const duration = activity.end_time 
    ? calculateDuration(activity.start_time, activity.end_time)
    : 60; // Default 1 hour if no end time
  
  const height = Math.max(duration * TIME_SLOT_CONFIG.minuteHeight, 30); // Minimum 30px height
  
  return {
    startTime: activity.start_time,
    endTime: activity.end_time,
    duration,
    startPosition,
    height,
    activity,
  };
}

/**
 * Process activities for a day into time slots structure
 */
export function processDayActivities(activities: any[], date: string): DayTimeSlots {
  const timeSlots = generateTimeSlots();
  const scheduledActivities: ActivityTimeBlock[] = [];
  const unscheduledActivities: any[] = [];
  
  activities.forEach(activity => {
    const timeBlock = activityToTimeBlock(activity);
    if (timeBlock) {
      scheduledActivities.push(timeBlock);
    } else {
      unscheduledActivities.push(activity);
    }
  });
  
  // Sort scheduled activities by start time
  scheduledActivities.sort((a, b) => 
    parseTimeToMinutes(a.startTime) - parseTimeToMinutes(b.startTime)
  );
  
  return {
    date,
    timeSlots,
    activities: scheduledActivities,
    unscheduledActivities,
  };
}

/**
 * Check if a time is within visible hours
 */
export function isTimeVisible(timeString: string): boolean {
  const [hours] = timeString.split(':').map(Number);
  return hours >= TIME_SLOT_CONFIG.startHour && hours <= TIME_SLOT_CONFIG.endHour;
}

/**
 * Get current time position for scroll-to-now functionality
 */
export function getCurrentTimePosition(): number {
  const now = new Date();
  const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
  return getTimePosition(currentTime);
}

/**
 * Calculate total height needed for the time grid
 */
export function getTotalGridHeight(): number {
  const totalHours = TIME_SLOT_CONFIG.endHour - TIME_SLOT_CONFIG.startHour + 1;
  return totalHours * TIME_SLOT_CONFIG.slotHeight;
}