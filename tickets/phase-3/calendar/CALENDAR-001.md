# CALENDAR-001: Implement Google Calendar-style drag-and-drop interface

## Priority: Critical
## Status: Open
## Assignee: Unassigned
## Type: Calendar Feature

## Description
Implement the core drag-and-drop calendar interface similar to Google Calendar, allowing users to visually organize their travel activities by dragging them to specific days and time slots.

## Acceptance Criteria
- [ ] Create calendar grid with time slots (hourly/30-min intervals)
- [ ] Implement drag-and-drop functionality for activity blocks
- [ ] Add visual feedback during drag operations (ghost elements, drop zones)
- [ ] Handle time slot snapping and collision detection
- [ ] Create resizable activity blocks for duration adjustment
- [ ] Implement multi-day view (day, 3-day, week views)
- [ ] Add keyboard accessibility for drag operations
- [ ] Handle edge cases (overlapping activities, invalid drops)
- [ ] Implement undo/redo functionality
- [ ] Add auto-save during drag operations

## Technical Implementation

### Core Components
- `components/calendar/CalendarGrid.tsx` - Main calendar grid
- `components/calendar/TimeSlots.tsx` - Time slot columns
- `components/calendar/DayColumn.tsx` - Individual day column
- `components/calendar/ActivityBlock.tsx` - Draggable activity block
- `components/calendar/DropZone.tsx` - Drop target areas
- `components/calendar/CalendarControls.tsx` - Navigation and view controls

### Drag-and-Drop Library
Use `@dnd-kit/core` and `@dnd-kit/sortable` for:
- Smooth drag animations
- Touch device support
- Accessibility features
- Collision detection algorithms
- Custom drag overlays

### Calendar Grid Structure
```typescript
interface CalendarGrid {
  days: CalendarDay[];
  timeSlots: TimeSlot[];
  activities: ScheduledActivity[];
  viewMode: 'day' | '3-day' | 'week';
}

interface TimeSlot {
  time: string; // "09:00", "09:30", etc.
  hour: number;
  minute: number;
}

interface ScheduledActivity {
  id: string;
  placeId: string;
  date: Date;
  startTime: string;
  endTime: string;
  duration: number; // minutes
  position: GridPosition;
}
```

## Visual Design
- **Time Grid**: 30-minute or 1-hour intervals
- **Activity Blocks**: Colored blocks with place name and duration
- **Drag Feedback**: Semi-transparent overlay during drag
- **Drop Zones**: Highlighted valid drop areas
- **Collision Handling**: Visual warnings for overlapping activities

## Drag Behaviors
- **From Wishlist**: Drag places from sidebar to calendar
- **Within Calendar**: Move activities between time slots
- **Resize Duration**: Drag edges to adjust activity duration
- **Multi-Select**: Select and move multiple activities
- **Cross-Day**: Drag activities to different days

## Time Management
- **Snap to Grid**: Activities snap to nearest time slot
- **Duration Constraints**: Minimum 30-minute blocks
- **Overlap Detection**: Warn about scheduling conflicts
- **Travel Time**: Consider travel time between locations
- **Business Hours**: Highlight typical business hours

## State Management
```typescript
interface CalendarState {
  scheduledActivities: ScheduledActivity[];
  draggedItem: DraggedItem | null;
  viewMode: CalendarViewMode;
  selectedDate: Date;
  timeRange: TimeRange;
}
```

## Performance Optimizations
- Virtual scrolling for long time ranges
- Debounced auto-save during drag operations
- Optimistic updates for smooth UX
- Memoized calendar calculations
- Efficient collision detection algorithms

## Accessibility
- Keyboard navigation (arrow keys, tab, enter)
- Screen reader announcements for drag operations
- Focus management during interactions
- ARIA labels for calendar grid and activities
- High contrast mode support

## Integration Points
- Connect with wishlist sidebar (CALENDAR-003)
- Link to activity data from database
- Sync with Google Calendar (future feature)
- Export to calendar formats

## Dependencies
- UX-005 (Main itinerary builder layout)
- INFRA-004 (Server actions for activity scheduling)
- `@dnd-kit` libraries already in package.json

## Estimated Effort
8-10 hours

## Notes
- This is the core feature of the entire application
- Focus on smooth, intuitive interactions
- Ensure mobile touch support works well
- Consider time zone handling for international travel
- Plan for real-time collaboration in future phases
- Test extensively with various screen sizes and devices