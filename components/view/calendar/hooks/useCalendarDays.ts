import { useMemo } from 'react';
import { startOfWeek, endOfWeek, eachDayOfInterval } from 'date-fns';

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
  viewMode: 'day' | '3-day' | 'week'
): Date[] {
  const days = useMemo(() => {
    switch (viewMode) {
      case 'day':
        return [selectedDate];
      case '3-day':
        return [
          selectedDate,
          new Date(selectedDate.getTime() + 24 * 60 * 60 * 1000),
          new Date(selectedDate.getTime() + 2 * 24 * 60 * 60 * 1000)
        ];
      case 'week':
      default:
        const start = startOfWeek(selectedDate, { weekStartsOn: 1 }); // Monday
        const end = endOfWeek(selectedDate, { weekStartsOn: 1 });
        return eachDayOfInterval({ start, end });
    }
  }, [selectedDate, viewMode]);

  return days;
}