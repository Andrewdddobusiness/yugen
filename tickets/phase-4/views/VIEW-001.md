# VIEW-001: Create text-based list view for daily itineraries

## Priority: Medium
## Status: Open
## Assignee: Unassigned
## Type: View Feature

## Description
Create an alternative text-based list view that displays daily itineraries in a traditional, linear format similar to other travel planning apps, providing users with a familiar way to view and manage their scheduled activities.

## Acceptance Criteria
- [ ] Create day-by-day list layout with time-ordered activities
- [ ] Implement expandable/collapsible day sections
- [ ] Add inline editing capabilities for activities
- [ ] Create activity reordering within days
- [ ] Implement time-based grouping and sorting
- [ ] Add travel time indicators between activities
- [ ] Create print-friendly formatting
- [ ] Implement search and filtering within list view
- [ ] Add bulk actions for multiple activities
- [ ] Create responsive mobile-optimized list view

## List View Design

### Daily Structure
```
📅 Monday, March 15, 2024
├─ 9:00 AM - 10:30 AM (1h 30m)
│  🍳 Breakfast at Café Luna
│  📍 123 Main St • ⭐ 4.5 • $$ 
│  📝 Try the croissants
│  ────── 15 min travel ──────
├─ 11:00 AM - 1:00 PM (2h)
│  🏛️ Museum of Modern Art  
│  📍 456 Art Ave • ⭐ 4.8 • $$$
│  🎫 Tickets required
│  ────── 20 min travel ──────
├─ 1:30 PM - 3:00 PM (1h 30m)
│  🍽️ Lunch at Bistro Central
│  📍 789 Food St • ⭐ 4.3 • $$$
└─ Evening: Free time
```

## Technical Implementation

### Components
- `components/views/ListView.tsx` - Main list view container
- `components/views/DaySection.tsx` - Collapsible daily section
- `components/views/ActivityListItem.tsx` - Individual activity in list
- `components/views/TravelTimeIndicator.tsx` - Travel time between activities
- `components/views/ListControls.tsx` - View controls and actions
- `components/views/EmptyDayState.tsx` - Empty day placeholder
- `components/views/ActivityQuickEdit.tsx` - Inline editing interface

### Data Structure
```typescript
interface DayItinerary {
  date: Date;
  activities: ScheduledActivity[];
  totalDuration: number;
  travelTime: number;
  isEmpty: boolean;
  isCollapsed: boolean;
}

interface ListViewState {
  expandedDays: Set<string>;
  selectedActivities: Set<string>;
  sortBy: 'time' | 'name' | 'category';
  filters: ListViewFilters;
}
```

## List Features

### Activity Display
- **Time Range**: Clear start and end times
- **Duration**: Total activity duration
- **Place Info**: Name, address, rating, price level
- **Category Icons**: Visual activity type indicators
- **User Notes**: Personal notes and reminders
- **Status Indicators**: Confirmed, tentative, cancelled

### Interactive Elements
- **Inline Time Edit**: Click time to adjust schedule
- **Quick Actions**: Menu with edit, move, delete options
- **Drag Reorder**: Drag activities to reorder within day
- **Expand/Collapse**: Show/hide activity details
- **Multi-select**: Select multiple activities for bulk actions

### Day-Level Features
- **Day Summary**: Total activities, duration, travel time
- **Day Actions**: Copy day, clear day, optimize schedule
- **Travel Overview**: Total travel time and distances
- **Meal Indicators**: Highlight breakfast, lunch, dinner
- **Free Time**: Show gaps between scheduled activities

## Travel Time Integration

### Travel Indicators
- **Walking Time**: 🚶 5 min walk
- **Driving Time**: 🚗 15 min drive  
- **Transit Time**: 🚌 20 min by transit
- **Distance**: Show actual distance between locations
- **Route Options**: Click to see alternative routes

### Travel Optimization
- **Route Warnings**: Alert about long travel times
- **Efficiency Score**: Rate daily schedule efficiency
- **Optimization Suggestions**: Recommend reordering for better flow
- **Traffic Alerts**: Show potential traffic delays

## Responsive Design

### Desktop Layout
- Full width with multiple columns for details
- Hover effects for additional information
- Right-click context menus
- Keyboard shortcuts for common actions

### Mobile Layout
- Single column with touch-optimized interactions
- Swipe gestures for actions
- Bottom sheet for editing
- Simplified information hierarchy

## Advanced Features

### Search & Filter
- **Text Search**: Search activity names and notes
- **Category Filter**: Filter by activity type
- **Time Filter**: Show only morning/afternoon/evening
- **Status Filter**: Confirmed, tentative, or all activities

### Bulk Operations
- **Multi-select**: Select activities across multiple days
- **Bulk Edit**: Change time, category, or notes for multiple items
- **Bulk Move**: Move activities to different days
- **Bulk Delete**: Remove multiple activities at once

### Export Options
- **Print View**: Clean, printer-friendly format
- **PDF Export**: Professional itinerary document
- **Text Export**: Plain text for sharing
- **Calendar Export**: Export to Google Calendar, iCal

## List View Controls

### View Options
- **Compact/Expanded**: Toggle detail level
- **Time Format**: 12-hour vs 24-hour display
- **Travel Time**: Show/hide travel indicators
- **Group By**: Day, category, or time blocks

### Sorting Options
- **Chronological**: Default time-based sorting
- **Category**: Group similar activities together
- **Priority**: High-priority activities first
- **Custom**: User-defined ordering

## Integration with Calendar View

### View Synchronization
- **Shared State**: Same data as calendar view
- **Real-time Updates**: Changes sync between views
- **Selection Sync**: Selected activities highlighted in both views
- **Consistent Actions**: Same edit/delete functionality

### View Switching
- **Seamless Toggle**: Smooth transition between views
- **Maintain Context**: Preserve selected items and filters
- **View Preferences**: Remember user's preferred view
- **Deep Links**: URL support for specific view modes

## State Management
```typescript
interface ListViewState {
  activities: ScheduledActivity[];
  expandedDays: string[];
  selectedItems: string[];
  sortOrder: SortOrder;
  filters: ViewFilters;
  viewMode: 'compact' | 'expanded';
}
```

## Performance Optimizations
- **Virtual Scrolling**: Handle large itineraries efficiently
- **Lazy Loading**: Load activity details on demand
- **Memoized Calculations**: Cache travel time calculations
- **Optimized Renders**: Minimize re-renders during interactions

## Dependencies
- Phase 3 Calendar system (shared activity data)
- INFRA-004 (Server actions for activity management)
- Travel time calculations from Google Maps API

## Estimated Effort
4-5 hours

## Notes
- Focus on readability and traditional itinerary feel
- Ensure accessibility for screen readers
- Plan for internationalization (date/time formats)
- Consider offline viewing capabilities
- Make printing and sharing effortless