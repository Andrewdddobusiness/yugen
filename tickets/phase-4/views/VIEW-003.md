# VIEW-003: Add day-by-day breakdown with time slots

## Priority: Medium
## Status: ✅ COMPLETED
## Assignee: Claude Code Assistant
## Type: View Feature

## Description
Enhance the list view with detailed day-by-day breakdowns that show time slots, activity durations, travel times, and gaps, providing users with a comprehensive daily schedule overview.

## Acceptance Criteria
- [x] Create detailed daily timeline with time slots
- [x] Show activity durations and time gaps
- [x] Add travel time calculations between activities
- [x] Implement day efficiency metrics
- [x] Create expandable time slot details
- [x] Add time conflict detection and warnings
- [x] Implement free time suggestions
- [x] Create day optimization recommendations
- [x] Add meal time tracking and suggestions
- [x] Implement daily summary statistics

## Daily Timeline Structure

### Time Slot Breakdown
```
📅 Tuesday, March 16, 2024
┌─────────────────────────────────────┐
│ 🌅 6:00 AM - 9:00 AM               │
│ └─ Free time (3 hours)             │
├─────────────────────────────────────┤
│ 🍳 9:00 AM - 10:30 AM (1h 30m)     │
│ └─ Breakfast at Café Sunrise       │
│    📍 Downtown • ⭐ 4.6 • $$       │
├─────────────────────────────────────┤
│ 🚶 10:30 AM - 10:45 AM (15 min)    │
│ └─ Travel to Museum District       │
├─────────────────────────────────────┤
│ 🏛️ 10:45 AM - 1:15 PM (2h 30m)     │
│ └─ Art Museum Visit                │
│    📍 Museum District • ⭐ 4.8     │
│    🎫 Pre-booked tickets           │
├─────────────────────────────────────┤
│ 🍽️ 1:15 PM - 2:30 PM (1h 15m)      │
│ └─ Lunch at Garden Bistro          │
│    📍 Museum District • ⭐ 4.4     │
├─────────────────────────────────────┤
│ 🌆 2:30 PM - 11:00 PM              │
│ └─ Free time (8h 30m)              │
└─────────────────────────────────────┘

📊 Day Summary:
• Total Activities: 3 • Active Time: 5h 15m
• Travel Time: 15m • Free Time: 11h 30m  
• Efficiency Score: 85% ✅
```

## Technical Implementation

### Components
- `components/views/DayBreakdown.tsx` - Main daily breakdown
- `components/views/TimeSlotItem.tsx` - Individual time slot
- `components/views/TravelSlot.tsx` - Travel time indicator
- `components/views/FreeTimeSlot.tsx` - Free time blocks
- `components/views/DaySummary.tsx` - Daily statistics
- `components/views/TimeGaps.tsx` - Gap analysis and suggestions
- `components/views/EfficiencyScore.tsx` - Day efficiency metrics

### Data Structure
```typescript
interface DayBreakdown {
  date: Date;
  timeSlots: TimeSlot[];
  summary: DaySummary;
  efficiency: EfficiencyMetrics;
  suggestions: OptimizationSuggestion[];
}

interface TimeSlot {
  id: string;
  startTime: string;
  endTime: string;
  duration: number; // minutes
  type: 'activity' | 'travel' | 'free' | 'meal';
  content?: ScheduledActivity | TravelSegment;
  conflicts: TimeConflict[];
}

interface DaySummary {
  totalActivities: number;
  activeTime: number; // minutes
  travelTime: number;
  freeTime: number;
  mealTime: number;
  efficiencyScore: number;
}
```

## Time Slot Types

### Activity Slots
- **Activity Details**: Name, location, duration
- **Activity Type**: Category icon and color coding
- **Booking Status**: Confirmation requirements
- **Notes**: User-added notes and reminders
- **Actions**: Edit, move, delete options

### Travel Slots
- **Transportation Mode**: Walking, driving, transit
- **Duration**: Estimated travel time
- **Route**: Brief route description
- **Traffic Warnings**: Potential delays
- **Alternative Options**: Other transportation modes

### Free Time Slots
- **Duration**: Available time blocks
- **Suggestions**: Recommended activities for the gap
- **Location Context**: Nearby attractions or activities
- **Meal Suggestions**: If gap includes meal times
- **Rest Indicators**: Recommended downtime

## Daily Metrics & Analytics

### Efficiency Calculations
```typescript
const calculateEfficiency = (day: DayBreakdown): EfficiencyMetrics => {
  const totalWakingHours = 16; // 6 AM to 10 PM
  const activeMinutes = day.summary.activeTime + day.summary.travelTime;
  const efficiency = (activeMinutes / (totalWakingHours * 60)) * 100;
  
  return {
    score: Math.round(efficiency),
    activeRatio: activeMinutes / (totalWakingHours * 60),
    freeTimeRatio: day.summary.freeTime / (totalWakingHours * 60),
    recommendation: getEfficiencyRecommendation(efficiency)
  };
};
```

### Optimization Suggestions
- **Packing Too Much**: Suggest removing activities
- **Too Sparse**: Suggest adding activities to gaps
- **Poor Location Flow**: Recommend reordering by proximity
- **Missing Meals**: Suggest meal times and locations
- **Long Travel**: Recommend grouping activities by area

## Visual Design Elements

### Time Slot Styling
- **Activity Blocks**: Color-coded by category
- **Travel Indicators**: Subtle connecting lines or arrows
- **Free Time**: Dotted or dashed borders
- **Conflicts**: Red highlighting for overlaps
- **Meal Times**: Special styling for breakfast, lunch, dinner

### Progressive Disclosure
- **Collapsed View**: Basic time and activity name
- **Expanded View**: Full details, notes, and actions
- **Hover States**: Quick preview of additional information
- **Click Actions**: Edit inline or open detailed modal

## Time Management Features

### Conflict Detection
```typescript
interface TimeConflict {
  type: 'overlap' | 'insufficient_travel' | 'closed_venue' | 'meal_timing';
  severity: 'warning' | 'error';
  message: string;
  suggestions: ConflictResolution[];
}
```

### Gap Analysis
- **Short Gaps**: < 30 minutes, suggest combining or removing
- **Medium Gaps**: 30min - 2hrs, suggest nearby activities
- **Long Gaps**: > 2hrs, suggest major activities or rest
- **Meal Gaps**: Missing meal times, suggest restaurants

### Time Optimization
- **Route Optimization**: Reorder activities by location
- **Duration Adjustment**: Suggest longer/shorter activity times
- **Buffer Time**: Add appropriate buffers between activities
- **Peak Time Avoidance**: Suggest off-peak scheduling

## Meal Time Integration

### Meal Slot Recognition
- **Breakfast**: 7:00-10:00 AM slots
- **Lunch**: 11:30 AM-2:30 PM slots  
- **Dinner**: 5:30-9:00 PM slots
- **Snacks**: Brief gaps between activities

### Meal Suggestions
- **Missing Meals**: Highlight gaps during meal times
- **Nearby Options**: Suggest restaurants near scheduled activities
- **Cuisine Variety**: Recommend different food types
- **Dietary Restrictions**: Filter suggestions by dietary needs

## Interactive Features

### Time Slot Actions
- **Inline Editing**: Click time to adjust directly
- **Drag to Reorder**: Drag activities to different times
- **Quick Fill**: Suggest activities for free time slots
- **Bulk Adjust**: Move entire day earlier/later
- **Split Activities**: Break long activities into segments

### Contextual Menus
- **Activity Actions**: Edit, duplicate, move, delete
- **Free Time Actions**: Add activity, extend adjacent activity
- **Travel Actions**: Change transportation mode, add stops
- **Day Actions**: Optimize schedule, duplicate day, clear day

## Performance Optimizations
- **Virtual Time Slots**: Only render visible time periods
- **Lazy Calculations**: Calculate metrics on demand
- **Memoized Suggestions**: Cache optimization recommendations
- **Efficient Conflict Detection**: Optimized overlap algorithms

## State Management
```typescript
interface DayBreakdownState {
  expandedSlots: Set<string>;
  selectedTimeRange: TimeRange | null;
  showMetrics: boolean;
  optimizationLevel: 'basic' | 'advanced';
  mealTrackingEnabled: boolean;
}
```

## Integration Points
- VIEW-001 (Text-based list view) - Enhanced day display
- CALENDAR-004 (Time-based scheduling) - Time conflict logic
- Google Maps API - Travel time calculations
- INFRA-004 (Server actions) - Activity data

## Dependencies
- VIEW-001 (List view foundation)
- CALENDAR-004 (Time scheduling logic)
- INFRA-005 (Google Maps API for travel times)

## Estimated Effort
5-6 hours

## Notes
- Focus on helping users optimize their daily schedules
- Ensure time calculations are accurate and helpful
- Plan for different travel styles (fast-paced vs relaxed)
- Consider cultural differences in meal timing
- Test with various itinerary densities and complexities

## Implementation Progress (Completed)
**Date Completed**: 2025-01-12  
**Completed by**: Claude Code Assistant

### What was implemented:
1. **TimeSlotGrid Component** - Created hourly grid layout (6 AM - 11 PM) with current time indicator
2. **ActivityTimeBlock Component** - Activities positioned at scheduled times with duration-based sizing  
3. **DayTimeSlots Component** - Combines time grid with scheduled/unscheduled activity sections
4. **Time Calculation Utilities** - Complete time parsing, positioning, and duration calculation system
5. **ItineraryListView Integration** - Toggle button to switch between list and time slot views
6. **Travel Time Integration** - Shows travel duration between consecutive activities
7. **Conflict Detection System** - Comprehensive time conflict analysis with resolution suggestions
8. **Free Time Analysis** - Automatic gap detection with personalized activity suggestions
9. **Efficiency Metrics** - Advanced scheduling efficiency scoring and optimization recommendations
10. **Meal Time Tracking** - Intelligent meal time detection and dining suggestions
11. **Daily Statistics** - Complete day summary with time breakdowns and insights
12. **Responsive Design** - Works seamlessly on both mobile and desktop devices

### Core Features Delivered:
✅ **Daily timeline with time slots**: 6 AM to 11 PM hourly grid with minute-level precision  
✅ **Activity durations and gaps**: Visual representation of activity lengths and free time between activities
✅ **Travel time calculations**: Full integration with travel time system showing duration, mode, and routing
✅ **Expandable time slot details**: Collapsible day headers with comprehensive activity information
✅ **Day efficiency metrics**: Advanced scoring system (0-100%) with personalized recommendations
✅ **Time conflict detection**: Detects overlaps, insufficient travel time, closed venues, and meal conflicts
✅ **Free time suggestions**: Context-aware suggestions for gaps (rest, meals, activities, exploration)
✅ **Day optimization recommendations**: Intelligent suggestions to improve schedule efficiency
✅ **Meal time tracking**: Automatic detection of breakfast, lunch, and dinner time gaps with restaurant suggestions
✅ **Daily summary statistics**: Complete time breakdown, activity count, efficiency score, and conflict summary

### Advanced Features:
- **Smart Conflict Resolution**: One-click application of time adjustment suggestions
- **Contextual Free Time Suggestions**: Different suggestions based on gap length and time of day  
- **Efficiency Scoring Algorithm**: Considers activity balance, travel optimization, and time utilization
- **Meal Time Intelligence**: Recognizes cultural meal timing patterns and dietary needs
- **Visual Progress Indicators**: Color-coded time breakdowns and efficiency visualizations
- **Mobile-Optimized Interface**: Touch-friendly collapsible sections and responsive layouts

### Files Created:
- `/components/list/TimeSlotGrid.tsx` - Time grid background with hourly slots and current time indicator
- `/components/list/ActivityTimeBlock.tsx` - Individual activity blocks with smart positioning and metadata
- `/components/list/DayTimeSlots.tsx` - Complete day view with all advanced features integrated
- `/components/list/TimeConflicts.tsx` - Comprehensive conflict detection and resolution interface
- `/components/list/FreeTimeSuggestions.tsx` - Intelligent free time gap analysis and suggestions
- `/components/list/EfficiencyMetrics.tsx` - Advanced efficiency scoring with detailed breakdowns
- `/utils/timeSlots.ts` - Time calculation, positioning, and duration utilities
- `/utils/timeConflicts.ts` - Conflict detection algorithms for overlaps, travel, and venue hours
- `/utils/freeTimeSuggestions.ts` - Gap analysis and contextual activity suggestion engine
- `/utils/efficiencyMetrics.ts` - Sophisticated efficiency calculation and recommendation system

### Files Modified:
- `/components/list/ItineraryListView.tsx` - Added time slot view toggle, conflict resolution handlers, and suggestion integration

**COMPLETE IMPLEMENTATION**: All 10 acceptance criteria have been fully implemented with advanced features exceeding the original specification. The system now provides comprehensive day-by-day schedule analysis with intelligent optimization suggestions.