# VIEW-002: Implement view switching between calendar and list modes

## Priority: Medium
## Status: Open
## Assignee: Unassigned
## Type: View Feature

## Description
Create a seamless view switching system that allows users to toggle between calendar and list views while maintaining state, context, and user preferences across both interfaces.

## Acceptance Criteria
- [ ] Create view toggle controls in toolbar
- [ ] Implement smooth transitions between views
- [ ] Maintain state consistency across view switches
- [ ] Preserve user selections and filters
- [ ] Store view preferences per user
- [ ] Add keyboard shortcuts for view switching
- [ ] Implement view-specific URL routing
- [ ] Create context-aware view recommendations
- [ ] Add animation transitions between views
- [ ] Handle deep linking to specific views

## View Toggle Interface

### Toggle Control Design
```
┌─────────────────────────────────────┐
│ [📅 Calendar] [📋 List] [⚙️ Settings] │
└─────────────────────────────────────┘
```

### Toggle States
- **Calendar Active**: Calendar view with highlighted button
- **List Active**: List view with highlighted button  
- **Transitioning**: Loading state during view switch
- **Both Available**: Both views accessible via toggle

## Technical Implementation

### View Manager Component
```typescript
interface ViewManagerState {
  currentView: 'calendar' | 'list';
  previousView: 'calendar' | 'list';
  isTransitioning: boolean;
  viewPreferences: UserViewPreferences;
  sharedState: SharedViewState;
}

const ViewManager = () => {
  const [viewState, setViewState] = useState<ViewManagerState>();
  
  const switchView = useCallback((targetView: ViewType) => {
    setViewState(prev => ({
      ...prev,
      previousView: prev.currentView,
      currentView: targetView,
      isTransitioning: true
    }));
  }, []);
};
```

### Core Components
- `components/views/ViewManager.tsx` - Main view orchestration
- `components/views/ViewToggle.tsx` - Toggle control interface
- `components/views/ViewTransition.tsx` - Transition animations
- `components/views/ViewPreferences.tsx` - User preference settings
- `components/views/ViewRouter.tsx` - URL routing for views

## State Management

### Shared State Between Views
```typescript
interface SharedViewState {
  selectedActivities: Set<string>;
  activeFilters: FilterState;
  timeRange: DateRange;
  selectedDate: Date;
  searchQuery: string;
  sortPreferences: SortPreferences;
}
```

### View-Specific State
```typescript
interface CalendarViewState extends SharedViewState {
  calendarMode: 'day' | 'week' | '3-day';
  timeSlotInterval: 30 | 60;
  showTravelTime: boolean;
  gridScrollPosition: number;
}

interface ListViewState extends SharedViewState {
  expandedDays: Set<string>;
  compactMode: boolean;
  groupByCategory: boolean;
  listScrollPosition: number;
}
```

## View Transitions

### Transition Types
- **Instant**: Immediate switch with no animation
- **Fade**: Cross-fade between views
- **Slide**: Horizontal slide transition
- **Flip**: 3D flip animation between views

### Transition Implementation
```typescript
const ViewTransition = ({ children, isTransitioning, transitionType }: Props) => {
  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={currentView}
        initial={{ opacity: 0, x: transitionType === 'slide' ? 100 : 0 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: transitionType === 'slide' ? -100 : 0 }}
        transition={{ duration: 0.3, ease: "easeInOut" }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
};
```

## User Preferences

### Preference Storage
- **Default View**: User's preferred starting view
- **View History**: Remember recent view choices
- **Context Preferences**: Different views for different contexts
- **Device Preferences**: Different defaults for mobile/desktop

### Preference Settings
```typescript
interface UserViewPreferences {
  defaultView: 'calendar' | 'list';
  rememberLastView: boolean;
  transitionType: TransitionType;
  mobileDefaultView: 'calendar' | 'list';
  autoSwitchConditions: AutoSwitchRule[];
}
```

## URL Routing & Deep Linking

### Route Structure
- `/itinerary/:id/calendar` - Calendar view
- `/itinerary/:id/list` - List view
- `/itinerary/:id/calendar/day/:date` - Specific day in calendar
- `/itinerary/:id/list/day/:date` - Specific day in list

### Route Parameters
```typescript
interface ViewRouteParams {
  itineraryId: string;
  view: 'calendar' | 'list';
  date?: string;
  filters?: string; // encoded filter state
  selected?: string; // selected activity IDs
}
```

## Context-Aware View Switching

### Smart View Recommendations
- **Planning Mode**: Suggest calendar view for scheduling
- **Review Mode**: Suggest list view for reviewing plans
- **Mobile Context**: Prefer list view on small screens
- **Print Context**: Automatically switch to list view

### Auto-Switch Conditions
```typescript
interface AutoSwitchRule {
  condition: 'screen-size' | 'activity-count' | 'user-action';
  threshold: number | string;
  targetView: 'calendar' | 'list';
  enabled: boolean;
}
```

## View-Specific Features

### Calendar View Features
- Drag-and-drop activity scheduling
- Visual time blocking
- Multi-day overview
- Time-based conflict detection

### List View Features  
- Detailed activity information
- Easy text scanning
- Print-friendly format
- Sequential activity flow

### Shared Features
- Activity editing and management
- Search and filtering
- Selection and bulk operations
- Export and sharing options

## Keyboard Shortcuts

### View Navigation
- **Ctrl/Cmd + 1**: Switch to calendar view
- **Ctrl/Cmd + 2**: Switch to list view
- **Tab**: Toggle between views
- **Ctrl/Cmd + Shift + V**: View preferences

### Accessibility
- **Screen Reader**: Announce view changes
- **Focus Management**: Maintain focus across view switches
- **High Contrast**: Ensure toggle visibility
- **Keyboard Navigation**: Full keyboard accessibility

## Performance Considerations

### Lazy Loading
- Only load active view components
- Preload opposite view for faster switching
- Cache rendered views for instant switching
- Dispose unused view resources

### State Synchronization
```typescript
const useSyncedViewState = () => {
  const syncState = useCallback(() => {
    // Sync selected items
    // Sync filter states  
    // Sync time ranges
    // Preserve scroll positions
  }, []);
};
```

## Error Handling

### View Switch Failures
- **State Corruption**: Reset to safe default state
- **Route Errors**: Fallback to default view
- **Component Errors**: Error boundary with view recovery
- **Network Issues**: Maintain offline view switching

## Integration Points
- **Calendar System**: CALENDAR-001 through CALENDAR-006
- **List View**: VIEW-001 (Text-based list view)
- **URL Routing**: Next.js App Router
- **State Management**: Zustand stores

## Dependencies
- VIEW-001 (List view implementation)
- Calendar system from Phase 3
- Framer Motion for animations
- Next.js routing system

## Estimated Effort
3-4 hours

## Notes
- Ensure view switching feels instant and smooth
- Test thoroughly on different devices and screen sizes
- Consider user workflow patterns when designing defaults
- Plan for future view types (map view, timeline view)
- Ensure accessibility compliance across all view modes