// View component exports

// Calendar views
export { default as ItineraryCalendar } from './calendar/Calendar';
export { CalendarTest } from './calendar/CalendarTest';
export { GoogleCalendarView } from './calendar/GoogleCalendarView';
export { CalendarLayout } from './calendar/CalendarLayout';
export { CalendarControls } from './calendar/CalendarControls';
export { CalendarGrid } from './calendar/CalendarGrid';
export { CalendarGridEnhanced } from './calendar/CalendarGridEnhanced';
export { ActivityBlock } from './calendar/ActivityBlock';
export { ActivityBlockContent } from './calendar/ActivityBlockContent';
export { ActivityBlockPopover } from './calendar/ActivityBlockPopover';
export { BusinessHoursOverlay } from './calendar/BusinessHoursOverlay';
export { ConflictResolver } from './calendar/ConflictResolver';
export { DayColumn } from './calendar/DayColumn';
export { DropZone } from './calendar/DropZone';
export { GridCell } from './calendar/GridCell';
export { GridHeader } from './calendar/GridHeader';
export { GridNavigation } from './calendar/GridNavigation';
export { TimeGrid } from './calendar/TimeGrid';
export { TimePicker } from './calendar/TimePicker';
export { TimeSlots } from './calendar/TimeSlots';
export { TravelTimeIndicator as CalendarTravelTimeIndicator } from './calendar/TravelTimeIndicator';

// Calendar hooks
export { useCalendarDays } from './calendar/hooks/useCalendarDays';
export { useDragAndDrop as useCalendarDragAndDrop } from './calendar/hooks/useDragAndDrop';
export { useScheduledActivities } from './calendar/hooks/useScheduledActivities';
export { useTimeSlots } from './calendar/hooks/useTimeSlots';

// Calendar services
export * from './calendar/services/activityScheduler';

// Calendar data
export * from './calendar/data';

// Print views
export { PrintView } from './print/PrintView';

// Toggle views
export { ViewToggle } from './toggle/ViewToggle';
export { MobileViewSelector } from './toggle/MobileViewSelector';
export { ViewRecommendationCard } from './toggle/ViewRecommendationCard';
export { ViewTransition } from './toggle/ViewTransition';