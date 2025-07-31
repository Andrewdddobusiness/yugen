# VIEW-004: Build responsive mobile version of itinerary views

## Priority: Medium
## Status: Open
## Assignee: Unassigned
## Type: View Feature

## Description
Create mobile-optimized versions of both calendar and list views with touch-first interactions, responsive layouts, and mobile-specific features that work seamlessly on smartphones and tablets.

## Acceptance Criteria
- [ ] Design mobile-first responsive layouts for both views
- [ ] Implement touch-optimized drag-and-drop interactions
- [ ] Create mobile-specific navigation patterns
- [ ] Add swipe gestures for common actions
- [ ] Implement bottom sheet UI for mobile interactions
- [ ] Create mobile-optimized activity cards and time slots
- [ ] Add haptic feedback for mobile interactions
- [ ] Implement mobile-specific view switching
- [ ] Create landscape and portrait orientation support
- [ ] Add mobile-specific accessibility features

## Mobile Design Principles

### Touch-First Design
- **Minimum Touch Targets**: 44px minimum for interactive elements
- **Thumb-Friendly**: Important actions within thumb reach
- **Gesture Support**: Swipe, pinch, long-press interactions
- **Large Text**: Readable text sizes without zooming
- **Spacing**: Adequate spacing between touch targets

### Mobile Layout Patterns
- **Single Column**: Full-width layouts for mobile screens
- **Bottom Navigation**: Key actions at bottom of screen
- **Modal Overlays**: Bottom sheets and full-screen modals
- **Sticky Headers**: Keep important controls visible
- **Progressive Disclosure**: Show details on demand

## Mobile Calendar View

### Layout Structure
```
┌─────────────────────────────┐
│ Header: Trip Name, Date     │ ← Sticky header
├─────────────────────────────┤
│ [Day] [List] [•••]         │ ← View toggle
├─────────────────────────────┤
│ Time     Today              │
│ 9:00 ┌─────────────────────┐│
│      │ 🍳 Breakfast        ││ ← Touch-friendly
│ 9:30 │ Café Luna           ││   activity blocks
│      └─────────────────────┘│
│10:00 ┌─────────────────────┐│
│      │ 🏛️ Museum Visit     ││
│10:30 │ Art Gallery         ││
│      └─────────────────────┘│
│11:00    (Free time)         │
├─────────────────────────────┤
│ [+] Add Activity            │ ← Bottom action
└─────────────────────────────┘
```

### Mobile Calendar Features
- **Single Day Focus**: Default to current day view
- **Horizontal Day Swiping**: Swipe left/right between days
- **Vertical Time Scrolling**: Scroll through time slots
- **Touch Drag**: Long-press and drag to move activities
- **Quick Actions**: Tap for quick activity menu

## Mobile List View

### Optimized List Layout
```
┌─────────────────────────────┐
│ Tuesday, March 16           │
├─────────────────────────────┤
│ 🍳 9:00 AM - Breakfast      │ ← Expandable
│ Café Luna  ⭐4.5  $$       │   cards
│ ↓ 15 min walk               │
├─────────────────────────────┤
│ 🏛️ 10:15 AM - Museum       │
│ Art Gallery  ⭐4.8         │
│ ↓ 20 min drive              │
├─────────────────────────────┤
│ 🍽️ 1:00 PM - Lunch         │
│ Garden Bistro  ⭐4.4       │
├─────────────────────────────┤
│ [+ Add to this day]         │
└─────────────────────────────┘
```

### Mobile List Features
- **Compact Cards**: Essential information only
- **Swipe Actions**: Swipe for edit, delete, move options
- **Expandable Details**: Tap to show full activity details
- **Day Grouping**: Clear day separations
- **Quick Add**: Easy activity addition within days

## Touch Interactions

### Drag-and-Drop on Mobile
```typescript
const MobileDragHandler = () => {
  const [isDragging, setIsDragging] = useState(false);
  
  const handleTouchStart = (e: TouchEvent) => {
    // Long press detection (500ms)
    longPressTimer = setTimeout(() => {
      setIsDragging(true);
      // Haptic feedback
      navigator.vibrate?.(50);
      // Visual feedback
      showDragPreview();
    }, 500);
  };
  
  const handleTouchMove = (e: TouchEvent) => {
    if (isDragging) {
      updateDragPosition(e.touches[0]);
      showDropZones();
    }
  };
};
```

### Gesture Support
- **Long Press**: Initiate drag operations
- **Swipe Left/Right**: Navigate between days
- **Swipe Up/Down**: Show/hide details or menus
- **Pinch**: Zoom time scale (calendar view)
- **Pull to Refresh**: Refresh itinerary data

## Bottom Sheet Implementation

### Activity Details Bottom Sheet
```typescript
interface BottomSheetProps {
  activity: ScheduledActivity;
  isOpen: boolean;
  onClose: () => void;
}

const ActivityBottomSheet = ({ activity, isOpen, onClose }: Props) => {
  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent side="bottom" className="h-[80vh]">
        <SheetHeader>
          <SheetTitle>{activity.place.name}</SheetTitle>
        </SheetHeader>
        <div className="grid gap-4 py-4">
          {/* Activity details, edit options, actions */}
        </div>
      </SheetContent>
    </Sheet>
  );
};
```

### Bottom Sheet Use Cases
- **Activity Details**: Full activity information and editing
- **Add Activity**: Search and add new activities
- **Day Actions**: Bulk day operations
- **Settings**: View preferences and options
- **Filter/Sort**: Advanced filtering options

## Mobile Navigation

### Tab Bar Navigation
```
┌─────────────────────────────┐
│                             │
│     Main Content Area       │
│                             │
├─────────────────────────────┤
│ [Calendar] [List] [Wishlist]│ ← Bottom tabs
└─────────────────────────────┘
```

### Floating Action Button
- **Primary Action**: Add new activity
- **Secondary Actions**: Quick day actions
- **Context Aware**: Changes based on current view
- **Accessibility**: Proper labels and focus management

## Responsive Breakpoints

### Mobile Portrait (< 480px)
- Single column layout
- Bottom sheet interactions
- Simplified information display
- Touch-optimized controls

### Mobile Landscape (480px - 768px)
- Wider activity cards
- Side-by-side layout where appropriate
- Landscape-specific interactions
- Adapted navigation patterns

### Tablet (768px - 1024px)
- Hybrid mobile/desktop patterns
- Sidebar + main content layout
- Enhanced touch targets
- Multi-column where appropriate

## Mobile-Specific Features

### Haptic Feedback
```typescript
const useHapticFeedback = () => {
  const triggerHaptic = (type: 'light' | 'medium' | 'heavy') => {
    if ('vibrate' in navigator) {
      const patterns = {
        light: [10],
        medium: [50],
        heavy: [100]
      };
      navigator.vibrate(patterns[type]);
    }
  };
};
```

### Mobile Accessibility
- **Voice Over**: Proper screen reader support
- **Large Text**: Support for iOS/Android text scaling
- **High Contrast**: Enhanced visibility modes
- **Touch Assistance**: Larger touch targets when enabled
- **Reduced Motion**: Respect motion preferences

## Performance Optimizations

### Mobile-Specific Optimizations
- **Touch Event Optimization**: Passive event listeners
- **Reduced Animations**: Lighter animations for older devices
- **Image Optimization**: Responsive images for mobile screens
- **Bundle Splitting**: Load mobile-specific code separately
- **Service Worker**: Offline functionality for mobile

### Memory Management
- **Virtual Scrolling**: Handle large lists efficiently
- **Image Lazy Loading**: Load images as needed
- **Component Cleanup**: Proper cleanup on unmount
- **State Minimization**: Keep mobile state lightweight

## Technical Implementation

### Mobile Components
- `components/mobile/MobileCalendar.tsx` - Mobile calendar view
- `components/mobile/MobileList.tsx` - Mobile list view
- `components/mobile/TouchDragHandler.tsx` - Touch drag interactions
- `components/mobile/BottomSheetMenu.tsx` - Bottom sheet interface
- `components/mobile/MobileNavigation.tsx` - Mobile navigation
- `components/mobile/SwipeGestures.tsx` - Swipe gesture handling

### Responsive Hooks
```typescript
const useMobileView = () => {
  const [isMobile, setIsMobile] = useState(false);
  const [orientation, setOrientation] = useState<'portrait' | 'landscape'>('portrait');
  
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
      setOrientation(window.innerHeight > window.innerWidth ? 'portrait' : 'landscape');
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);
  
  return { isMobile, orientation };
};
```

## Integration Points
- VIEW-001 & VIEW-002 (Calendar and List views)
- CALENDAR-001 through CALENDAR-006 (Drag-and-drop system)
- Mobile gesture libraries
- Device-specific APIs (haptics, orientation)

## Dependencies
- VIEW-001 (List view implementation)
- VIEW-002 (View switching system)
- Calendar system from Phase 3
- Mobile UI components (bottom sheets, gestures)

## Estimated Effort
6-7 hours

## Notes
- Test extensively on actual mobile devices
- Consider different operating systems (iOS/Android)
- Ensure performance on older/slower devices
- Plan for various screen sizes and resolutions
- Consider mobile-specific user behavior patterns
- Test touch interactions thoroughly