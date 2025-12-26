import { useMemo } from 'react';
import {
  eachDayOfInterval,
  startOfMonth,
  addDays,
  startOfDay,
  startOfWeek
} from 'date-fns';

/**
 * useCalendarDays - Generates the array of days for calendar display
 * 
 * Features:
 * - Supports day, 3-day, and week views
 * - Week view starts on Monday
 * - Memoized for performance
 * 
 * @param selectedDate - The currently selected date
 * @param viewMode - Current view mode
 * @returns Array of dates for the current view
 */
export function useCalendarDays(
  selectedDate: Date, 
  viewMode: 'day' | '3-day' | 'week' | 'month'
): Date[] {
  const days = useMemo(() => {
    const baseDate = startOfDay(selectedDate);

    switch (viewMode) {
      case 'day':
        return [baseDate];
      case '3-day':
        return eachDayOfInterval({ start: baseDate, end: addDays(baseDate, 2) });
      case 'week': {
        const weekStart = startOfWeek(baseDate, { weekStartsOn: 1 });
        return eachDayOfInterval({ start: weekStart, end: addDays(weekStart, 6) });
      }
      case 'month': {
        const monthStart = startOfMonth(selectedDate);
        const start = startOfWeek(monthStart, { weekStartsOn: 1 }); // Monday
        // Always render 6 weeks (Google Calendar style) for stable row heights.
        const end = addDays(start, 41);
        return eachDayOfInterval({ start, end });
      }
      default:
        return [baseDate];
    }
  }, [selectedDate, viewMode]);

  return days;
}
