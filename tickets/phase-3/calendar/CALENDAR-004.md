# CALENDAR-004: Implement time-based scheduling with precise placement

## Priority: High
## Status: In Progress
## Assignee: Claude
## Type: Calendar Feature

## Description
Implement precise time-based scheduling functionality that allows users to schedule activities at specific times with intelligent duration handling, conflict detection, and time optimization features.

## Acceptance Criteria
- [x] Create time slot grid with configurable intervals (15min, 30min, 1hr)
- [x] Implement precise time placement and snapping
- [x] Add intelligent duration estimation for activities
- [x] Create conflict detection and resolution
- [x] Implement travel time calculations between activities
- [x] Add business hours awareness and validation
- [x] Create time optimization suggestions
- [ ] Implement bulk time adjustments
- [ ] Add timezone handling for international travel
- [ ] Create time-based templates and patterns

## Time Grid System

### Grid Configuration
- **Time Intervals**: 15min, 30min, or 1hr slots
- **Operating Hours**: 6:00 AM - 11:00 PM (configurable)
- **Extended Hours**: Option to show 24-hour timeline
- **Timezone Display**: Local destination time with user timezone reference

### Time Slot Structure
```typescript
interface TimeSlot {
  startTime: string; // "09:00"
  endTime: string;   // "09:30"  
  duration: number;  // 30 minutes
  available: boolean;
  conflicts: Conflict[];
}

interface ScheduledActivity {
  id: string;
  placeId: string;
  startTime: string;
  endTime: string;
  duration: number;
  estimatedDuration?: number;
  actualDuration?: number;
  bufferTime: number; // travel/prep time
}
```

## Smart Duration Management

### Duration Estimation
- **Restaurant**: 1-2 hours based on meal type
- **Museum**: 2-4 hours based on size and popularity
- **Shopping**: 1-3 hours based on venue type
- **Attractions**: Variable based on Google Places data
- **Transportation**: Calculated travel time + buffer

### Duration Sources
1. **Google Places**: Average visit duration when available
2. **User History**: Personal patterns and preferences
3. **Crowd-sourced**: Other users' activity durations
4. **Manual Override**: User-specified custom durations

## Conflict Detection & Resolution

### Conflict Types
- **Time Overlap**: Activities scheduled at same time
- **Travel Time**: Insufficient time between distant locations
- **Business Hours**: Activity scheduled when place is closed
- **Capacity**: Multiple activities at same location
- **Personal**: Conflicts with user's other commitments

### Resolution Strategies
- **Auto-adjust**: Automatically move conflicting activities
- **Suggest Times**: Recommend alternative time slots
- **Split Activities**: Break long activities into multiple sessions
- **Travel Optimization**: Reorganize by location proximity

## Travel Time Integration

### Travel Calculations
- **Walking Distance**: < 1km, calculate walking time
- **Driving Distance**: Use Google Maps routing API
- **Public Transit**: Integration with transit APIs where available
- **Buffer Time**: Add 10-15 minutes for transitions

### Travel Optimization
- **Route Planning**: Optimize activity order by location
- **Cluster Analysis**: Group nearby activities together
- **Travel Alerts**: Warn about long travel times
- **Alternative Routes**: Suggest different transportation modes

## Business Hours Intelligence

### Operating Hours Integration
- **Google Places**: Real-time business hours
- **Holiday Schedules**: Special hours for holidays
- **Seasonal Variations**: Different hours by season
- **Popular Times**: Avoid peak crowding periods

### Smart Scheduling
- **Availability Checking**: Only allow scheduling during open hours
- **Peak Time Warnings**: Alert about busy periods
- **Last Entry Times**: Account for museums, attractions with cutoffs
- **Booking Requirements**: Flag activities requiring advance booking

## Time Optimization Features

### Smart Suggestions
- **Optimal Start Times**: Suggest best times based on place type
- **Gap Filling**: Suggest activities for empty time slots
- **Day Balancing**: Distribute activities evenly across days
- **Energy Management**: Schedule intensive activities at optimal times

### Pattern Recognition
- **Morning Person**: Schedule active activities early
- **Night Owl**: Later start times and evening activities
- **Meal Preferences**: Appropriate meal timing
- **Rest Periods**: Automatic downtime scheduling

## User Interface Elements

### Time Picker Components
- **Inline Time Editor**: Click time to edit directly
- **Duration Sliders**: Drag to adjust activity duration
- **Time Range Selector**: Select start and end times
- **Quick Time Buttons**: Common durations (30min, 1hr, etc.)

### Visual Indicators
- **Time Conflicts**: Red highlighting for overlapping activities
- **Travel Time**: Gray blocks showing travel between activities
- **Business Hours**: Background shading for closed hours
- **Optimal Times**: Green highlighting for recommended times

## Advanced Features

### Bulk Operations
- **Shift All**: Move entire day forward/backward
- **Scale Day**: Compress or expand day's timeline
- **Auto-arrange**: Automatically optimize entire day
- **Template Apply**: Apply saved scheduling patterns

### Template System
- **Day Templates**: Saved daily scheduling patterns
- **Activity Sequences**: Common activity combinations
- **Time Blocks**: Reusable time allocation blocks
- **Personal Patterns**: Learn from user's scheduling habits

## Technical Implementation

### Components
- `components/calendar/TimeGrid.tsx` - Main time grid
- `components/calendar/TimeSlot.tsx` - Individual time slots
- `components/calendar/TimePicker.tsx` - Time selection interface
- `components/calendar/ConflictResolver.tsx` - Conflict resolution UI
- `components/calendar/TravelTimeIndicator.tsx` - Travel time display
- `components/calendar/BusinessHoursOverlay.tsx` - Business hours display

### State Management
```typescript
interface TimeSchedulingState {
  timeGridInterval: 15 | 30 | 60; // minutes
  showTravelTime: boolean;
  autoResolveConflicts: boolean;
  conflictDetection: ConflictSettings;
  travelCalculations: TravelSettings;
}
```

## Dependencies
- CALENDAR-001 (Calendar drag-and-drop interface)
- CALENDAR-002 (Activity blocks)
- INFRA-005 (Google Maps API for travel time)
- External APIs for business hours and transit data

## Estimated Effort
7-8 hours

## Notes
- Focus on intelligent defaults to reduce user effort
- Ensure smooth interaction with drag-and-drop system
- Plan for international timezone complications
- Consider offline functionality for travel scenarios
- Test with various travel patterns and activity types

## Implementation Status

### ✅ Completed Features

#### 1. Time Slot Grid System (`components/calendar/TimeGrid.tsx`)
- **Configurable intervals**: 15min, 30min, 1hr slots ✓
- **Operating hours**: 6:00 AM - 11:00 PM (configurable) ✓
- **Extended hours**: 24-hour timeline option ✓
- **Visual hierarchy**: Hour markers and interval distinction ✓

#### 2. Precise Time Placement (`components/calendar/TimePicker.tsx`)
- **Inline time editor**: Click-to-edit time controls ✓
- **Duration sliders**: Quick duration adjustment buttons ✓
- **Time range selector**: Start/end time selection ✓
- **Snapping functionality**: Snap to configured intervals ✓

#### 3. Intelligent Duration Estimation (`utils/calendar/durationEstimation.ts`)
- **Activity type classification**: Restaurant, museum, shopping, attractions ✓
- **Context-aware estimates**: Meal times, popularity, weekend crowds ✓
- **User preference adjustments**: Quick visits vs thorough exploration ✓
- **Smart suggestions**: Duration options based on activity type ✓

#### 4. Conflict Detection & Resolution (`utils/calendar/collisionDetection.ts`, `components/calendar/ConflictResolver.tsx`)
- **Time overlap detection**: Activities scheduled at same time ✓
- **Travel time conflicts**: Insufficient time between locations ✓
- **Business hours validation**: Activity during closed hours ✓
- **Resolution strategies**: Auto-adjust, suggest times, split activities ✓
- **Interactive UI**: Conflict resolution dialog with options ✓

#### 5. Travel Time Integration (`components/calendar/TravelTimeIndicator.tsx`)
- **Multi-modal transport**: Walking, driving, transit calculations ✓
- **Visual indicators**: Travel time blocks between activities ✓
- **Conflict warnings**: Insufficient travel time alerts ✓
- **Travel optimization**: Route planning suggestions ✓

#### 6. Business Hours Awareness (`components/calendar/BusinessHoursOverlay.tsx`)
- **Google Places integration**: Real-time business hours ✓
- **Visual overlay**: Background shading for closed hours ✓
- **Availability checking**: Prevent scheduling during closed hours ✓
- **Hours extraction**: Parse Google Places operating hours ✓

#### 7. Time Optimization Features (`store/timeSchedulingStore.ts`, `utils/calendar/collisionDetection.ts`)
- **Optimal time slots**: Scoring system for best times ✓
- **Smart suggestions**: Based on energy patterns and preferences ✓
- **Gap filling**: Identify available time slots ✓
- **Pattern recognition**: Morning person vs night owl preferences ✓

#### 8. State Management (`store/timeSchedulingStore.ts`)
- **Persistent configuration**: Grid intervals, preferences ✓
- **Conflict settings**: Auto-resolve options, strict mode ✓
- **Travel settings**: Default mode, buffer times ✓
- **UI preferences**: Display options for indicators ✓

### 🚧 Remaining Features

#### 9. Bulk Time Adjustments
- **Shift All**: Move entire day forward/backward
- **Scale Day**: Compress or expand day's timeline
- **Auto-arrange**: Automatically optimize entire day
- **Template Apply**: Apply saved scheduling patterns

#### 10. Timezone Handling
- **International travel**: Handle timezone changes
- **Local destination time**: Show appropriate local times
- **Timezone reference**: User timezone comparison

#### 11. Time-based Templates
- **Day Templates**: Saved daily scheduling patterns
- **Activity Sequences**: Common activity combinations
- **Time Blocks**: Reusable time allocation blocks
- **Personal Patterns**: Learn from user's scheduling habits

### 🎯 Implementation Summary
**Completed**: 7/10 acceptance criteria (70%)
**Status**: Core time-based scheduling functionality implemented
**Next Steps**: Bulk operations, timezone handling, and template system