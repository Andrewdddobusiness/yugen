# CALENDAR-005: Add calendar grid with day/hour slots for dropping activities

## Priority: High
## Status: Open
## Assignee: Unassigned
## Type: Calendar Feature

## Description
Create a comprehensive calendar grid system with properly defined day columns and time slots that serves as the foundation for the drag-and-drop activity scheduling interface.

## Acceptance Criteria
- [ ] Create responsive calendar grid with day columns
- [ ] Implement configurable time slots (30min/1hr intervals)
- [ ] Add visual drop zones for activity placement
- [ ] Create day/week/multi-day view modes
- [ ] Implement grid scrolling and navigation
- [ ] Add current time indicator and today highlighting
- [ ] Create grid cell interactions (click, hover, select)
- [ ] Implement grid virtualization for performance
- [ ] Add keyboard navigation for grid cells
- [ ] Create mobile-optimized grid layout

## Grid Structure & Layout

### Calendar Grid Architecture
```
    Time     Day 1      Day 2      Day 3
  ┌──────┬──────────┬──────────┬──────────┐
  │ 9:00 │          │          │          │
  ├──────┼──────────┼──────────┼──────────┤
  │ 9:30 │          │ Activity │          │
  ├──────┼──────────┼──────────┼──────────┤
  │10:00 │ Activity │ Activity │          │
  ├──────┼──────────┼──────────┼──────────┤
  │10:30 │ Activity │          │ Activity │
  └──────┴──────────┴──────────┴──────────┘
```

### Grid Cell Structure
```typescript
interface GridCell {
  dayIndex: number;
  timeSlot: string; // "09:00"
  date: Date;
  isDropZone: boolean;
  isOccupied: boolean;
  activities: ScheduledActivity[];
  conflicts: boolean;
}

interface CalendarGrid {
  days: CalendarDay[];
  timeSlots: TimeSlot[];
  startTime: string; // "06:00"
  endTime: string;   // "23:00"
  interval: 30 | 60; // minutes
  viewMode: 'day' | 'week' | '3-day';
}
```

## View Modes

### Day View
- Single day column with full time range
- Maximum detail and activity information
- Ideal for detailed daily planning

### 3-Day View  
- Three consecutive days visible
- Balanced between detail and overview
- Good for weekend or short trip planning

### Week View
- Seven day columns with compressed time slots
- Overview of entire week
- Useful for longer trip planning

### Custom Range View
- User-defined date range (2-14 days)
- Flexible for various trip lengths
- Adaptive layout based on range length

## Technical Implementation

### Core Components
- `components/calendar/CalendarGrid.tsx` - Main grid container
- `components/calendar/GridHeader.tsx` - Day headers and navigation
- `components/calendar/TimeColumn.tsx` - Time labels column
- `components/calendar/DayColumn.tsx` - Individual day column
- `components/calendar/GridCell.tsx` - Individual time slot cell
- `components/calendar/DropZone.tsx` - Drop target areas
- `components/calendar/GridNavigation.tsx` - Navigation controls

### Grid Rendering Logic
```typescript
const renderGrid = () => {
  const timeSlots = generateTimeSlots(startTime, endTime, interval);
  const days = generateDateRange(startDate, viewMode);
  
  return timeSlots.map(timeSlot => 
    days.map(day => 
      <GridCell 
        key={`${day.dateString}-${timeSlot.time}`}
        day={day}
        timeSlot={timeSlot}
        activities={getActivitiesForSlot(day, timeSlot)}
        onDrop={handleActivityDrop}
      />
    )
  );
};
```

## Drop Zone Implementation

### Visual Drop Zones
- **Active Drop Zone**: Highlighted when dragging activity
- **Valid Drop Zone**: Green highlight for available slots
- **Invalid Drop Zone**: Red highlight for conflicts
- **Occupied Slots**: Different styling for slots with activities

### Drop Zone Behavior
- **Hover Detection**: Show drop affordance on hover
- **Snap to Grid**: Activities snap to nearest time slot
- **Multi-slot Drops**: Handle activities spanning multiple slots
- **Conflict Prevention**: Prevent drops on occupied slots

## Grid Interactions

### Cell Interactions
- **Click**: Select time slot for quick activity addition
- **Double-click**: Open activity creation dialog
- **Right-click**: Context menu for slot actions
- **Drag Select**: Select multiple time slots
- **Keyboard Navigation**: Arrow keys to navigate cells

### Grid Controls
- **Time Range**: Adjust visible hours (6AM-11PM, 24hr, custom)
- **Zoom Level**: Adjust time slot height and detail level
- **View Toggle**: Switch between day/week views
- **Date Navigation**: Previous/next day/week navigation

## Visual Design Elements

### Grid Styling
- **Time Labels**: Clear, readable time indicators
- **Grid Lines**: Subtle lines separating time slots
- **Day Headers**: Date, day name, weather icon (future)
- **Current Time**: Red line showing current time
- **Today Highlight**: Different background for current day

### Responsive Behavior
- **Desktop**: Full grid with all time slots visible
- **Tablet**: Condensed view with scrollable time range
- **Mobile**: Single day view with vertical scrolling
- **Touch Devices**: Larger touch targets and gestures

## Performance Optimizations

### Virtual Scrolling
- Only render visible time slots
- Efficient handling of large date ranges
- Smooth scrolling performance

### Grid Calculations
- Memoized time slot generation
- Cached day/date calculations  
- Optimized conflict detection algorithms
- Debounced resize handling

### Memory Management
- Cleanup unused grid cells
- Efficient activity positioning calculations
- Minimized re-renders during interactions

## Accessibility Features

### Keyboard Navigation
- **Tab**: Navigate through interactive elements
- **Arrow Keys**: Move between grid cells
- **Enter/Space**: Activate cell or drop activity
- **Escape**: Cancel current operation

### Screen Reader Support
- **Grid Role**: Proper ARIA grid semantics
- **Cell Labels**: Time and date announcements
- **Activity Descriptions**: Full activity information
- **Status Updates**: Announcements for drag operations

## Integration Points

### Drag-and-Drop Integration
- Receive drops from sidebar wishlist (CALENDAR-003)
- Handle internal activity moving (CALENDAR-001)
- Provide drop zone feedback and validation

### Activity Management
- Display scheduled activities (CALENDAR-002)
- Handle activity conflicts (CALENDAR-004)
- Update activity positions in real-time

## State Management
```typescript
interface GridState {
  viewMode: CalendarViewMode;
  visibleDateRange: DateRange;
  timeRange: TimeRange;
  selectedCells: GridCell[];
  gridInterval: number;
  scrollPosition: number;
}
```

## Dependencies
- CALENDAR-001 (Drag-and-drop interface)
- CALENDAR-002 (Activity blocks)
- Date manipulation libraries (date-fns)

## Estimated Effort
6-7 hours

## Notes
- Ensure grid performs well with many activities
- Test thoroughly on various screen sizes
- Consider timezone display for international travel
- Plan for real-time collaboration features
- Optimize for both mouse and touch interactions