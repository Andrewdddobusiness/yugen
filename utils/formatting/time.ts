/**
 * Comprehensive time formatting utilities for the Journey app.
 * Consolidates duplicate time formatting logic from various components.
 */

/**
 * Formats a duration in minutes to a human-readable string.
 * 
 * @param minutes - Duration in minutes
 * @returns Formatted duration string (e.g., "2h 30m", "45m", "3h")
 */
export function formatDuration(minutes: number): string {
  if (minutes < 0) return "0m";
  
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  
  if (hours === 0) return `${mins}m`;
  if (mins === 0) return `${hours}h`;
  return `${hours}h ${mins}m`;
}

/**
 * Formats a time string from 24-hour format to 12-hour format with AM/PM.
 * 
 * @param time - Time string in 24-hour format (e.g., "14:30")
 * @returns Formatted time string in 12-hour format (e.g., "2:30 PM")
 */
export function formatTime(time: string): string {
  if (!time) return "";

  const [hours, minutes] = time.split(":");
  const hoursNum = parseInt(hours, 10);

  if (isNaN(hoursNum) || !minutes) return time;

  let period = "AM";
  let formattedHours = hoursNum;

  if (hoursNum >= 12) {
    period = "PM";
    formattedHours = hoursNum === 12 ? 12 : hoursNum - 12;
  }

  formattedHours = formattedHours === 0 ? 12 : formattedHours;

  return `${formattedHours}:${minutes} ${period}`;
}

/**
 * Formats a time range with start and end times, optionally including duration.
 * 
 * @param startTime - Start time in 24-hour format (e.g., "09:00")
 * @param endTime - End time in 24-hour format (e.g., "11:30") 
 * @param duration - Optional duration in minutes
 * @param options - Formatting options
 * @returns Formatted time range string
 */
export function formatTimeRange(
  startTime: string, 
  endTime?: string, 
  duration?: number,
  options: {
    includeDuration?: boolean;
    format12Hour?: boolean;
  } = {}
): string {
  const { includeDuration = true, format12Hour = true } = options;
  
  if (!startTime) return "";
  
  const formatTimeFn = format12Hour ? formatTime : (t: string) => t;
  const formattedStart = formatTimeFn(startTime);
  
  if (!endTime) {
    if (duration && includeDuration) {
      return `${formattedStart} (${formatDuration(duration)})`;
    }
    return formattedStart;
  }
  
  const formattedEnd = formatTimeFn(endTime);
  
  if (duration && includeDuration) {
    return `${formattedStart} - ${formattedEnd} (${formatDuration(duration)})`;
  }
  
  return `${formattedStart} - ${formattedEnd}`;
}

/**
 * Calculates duration in minutes from start and end time strings.
 * 
 * @param startTime - Start time in 24-hour format (e.g., "09:00")
 * @param endTime - End time in 24-hour format (e.g., "11:30")
 * @returns Duration in minutes, or 0 if invalid times
 */
export function calculateDuration(startTime: string, endTime: string): number {
  if (!startTime || !endTime) return 0;
  
  const parseTime = (timeStr: string): number => {
    const [hours, minutes] = timeStr.split(":");
    return parseInt(hours, 10) * 60 + parseInt(minutes, 10);
  };
  
  try {
    const startMinutes = parseTime(startTime);
    const endMinutes = parseTime(endTime);
    
    // Handle times that cross midnight
    if (endMinutes < startMinutes) {
      return (24 * 60 - startMinutes) + endMinutes;
    }
    
    return endMinutes - startMinutes;
  } catch {
    return 0;
  }
}

/**
 * Converts minutes since midnight to a time string.
 * 
 * @param minutes - Minutes since midnight (e.g., 570 for 9:30 AM)
 * @param format12Hour - Whether to format as 12-hour time
 * @returns Time string (e.g., "09:30" or "9:30 AM")
 */
export function minutesToTime(minutes: number, format12Hour: boolean = false): string {
  if (minutes < 0 || minutes >= 24 * 60) return "";
  
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  const timeStr = `${hours.toString().padStart(2, "0")}:${mins.toString().padStart(2, "0")}`;
  
  return format12Hour ? formatTime(timeStr) : timeStr;
}

/**
 * Converts a time string to minutes since midnight.
 * 
 * @param timeStr - Time string in 24-hour format (e.g., "09:30")
 * @returns Minutes since midnight, or 0 if invalid
 */
export function timeToMinutes(timeStr: string): number {
  if (!timeStr) return 0;
  
  try {
    const [hours, minutes] = timeStr.split(":");
    return parseInt(hours, 10) * 60 + parseInt(minutes, 10);
  } catch {
    return 0;
  }
}

/**
 * Formats travel time for display with contextual labeling.
 * 
 * @param minutes - Travel time in minutes
 * @param mode - Travel mode (e.g., "driving", "walking", "transit")
 * @returns Formatted travel time string
 */
export function formatTravelTime(minutes: number, mode?: string): string {
  if (minutes <= 0) return "";
  
  const duration = formatDuration(minutes);
  const modeText = mode ? ` ${mode}` : "";
  
  return `${duration}${modeText} travel`;
}

/**
 * Formats a time gap or free time period.
 * 
 * @param startTime - Gap start time
 * @param endTime - Gap end time  
 * @param duration - Gap duration in minutes
 * @returns Formatted gap string
 */
export function formatTimeGap(startTime: string, endTime: string, duration: number): string {
  const timeRange = formatTimeRange(startTime, endTime, duration, { includeDuration: false });
  const durationStr = formatDuration(duration);
  
  return `${timeRange} (${durationStr} free)`;
}

/**
 * Gets a relative time description for activity scheduling.
 * 
 * @param minutes - Duration in minutes
 * @returns Relative time description
 */
export function getRelativeTimeDescription(minutes: number): string {
  if (minutes < 15) return "Quick";
  if (minutes < 60) return "Short";  
  if (minutes < 180) return "Medium";
  if (minutes < 360) return "Long";
  return "Extended";
}

/**
 * Type definitions for time formatting options
 */
export interface TimeFormatOptions {
  format12Hour?: boolean;
  includeDuration?: boolean;
  includeSeconds?: boolean;
  showAmPm?: boolean;
}

/**
 * Type for time range objects
 */
export interface TimeRange {
  startTime: string;
  endTime: string;
  duration?: number;
}

/**
 * Formats multiple time ranges for display
 */
export function formatMultipleTimeRanges(ranges: TimeRange[], separator: string = ", "): string {
  return ranges
    .map(range => formatTimeRange(range.startTime, range.endTime, range.duration))
    .join(separator);
}