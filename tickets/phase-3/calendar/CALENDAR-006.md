# CALENDAR-006: Handle drag-and-drop interactions between wishlist and calendar

## Priority: High
## Status: Open
## Assignee: Unassigned
## Type: Calendar Feature

## Description
Implement the complete drag-and-drop interaction system between the wishlist sidebar and calendar grid, enabling smooth activity scheduling with visual feedback and validation.

## Acceptance Criteria
- [ ] Implement drag initiation from wishlist items
- [ ] Create visual feedback during drag operations
- [ ] Handle drop validation and placement logic
- [ ] Implement drag cancellation and error handling
- [ ] Add multi-touch support for mobile devices
- [ ] Create accessibility alternatives for drag operations
- [ ] Implement batch drag operations
- [ ] Add undo/redo functionality for drag actions
- [ ] Handle edge cases and error states
- [ ] Optimize performance for smooth interactions

## Drag-and-Drop Flow

### Complete Interaction Flow
1. **Initiate**: User starts dragging from wishlist item
2. **Visual Feedback**: Drag preview and valid drop zones appear
3. **Navigate**: User drags over calendar grid
4. **Validate**: System validates drop target in real-time
5. **Drop**: User releases item on valid time slot
6. **Process**: System creates scheduled activity
7. **Confirm**: Visual confirmation and state update
8. **Cleanup**: Remove drag artifacts and reset state

## Technical Implementation

### Drag System Architecture
```typescript
interface DragContext {
  draggedItem: WishlistItem | ScheduledActivity | null;
  dragType: 'wishlist-to-calendar' | 'calendar-internal' | 'multi-select';
  dragPreview: DragPreview;
  validDropZones: GridCell[];
  activeDropZone: GridCell | null;
}

interface DragValidation {
  isValid: boolean;
  reason?: string;
  conflictingActivities?: ScheduledActivity[];
  suggestedAlternatives?: GridCell[];
}
```

### Core Components
- `components/dnd/DragProvider.tsx` - Drag context provider
- `components/dnd/DragPreview.tsx` - Drag preview overlay
- `components/dnd/DropZoneHighlight.tsx` - Visual drop zone indicators
- `components/dnd/DragValidation.tsx` - Validation feedback UI
- `components/dnd/DragAccessible.tsx` - Keyboard alternatives

## Drag Source (Wishlist)

### Wishlist Item Dragging
```typescript
const DraggableWishlistItem = ({ item }: Props) => {
  const { attributes, listeners, setNodeRef, transform } = useDraggable({
    id: item.id,
    data: {
      type: 'wishlist-item',
      item: item,
      source: 'wishlist'
    }
  });

  return (
    <div 
      ref={setNodeRef} 
      {...listeners} 
      {...attributes}
      style={transform ? { transform: CSS.Translate.toString(transform) } : undefined}
    >
      <WishlistItemCard item={item} isDragging={isDragging} />
    </div>
  );
};
```

### Drag Initiation
- **Mouse**: Click and drag with 3px threshold
- **Touch**: Long press (300ms) then drag
- **Keyboard**: Space/Enter to pick up, arrows to move, Enter to drop

## Drop Target (Calendar Grid)

### Grid Cell Drop Zones
```typescript
const DroppableGridCell = ({ cell }: Props) => {
  const { setNodeRef, isOver, active } = useDroppable({
    id: cell.id,
    data: {
      type: 'grid-cell',
      cell: cell,
      accepts: ['wishlist-item', 'scheduled-activity']
    }
  });

  const isValidDrop = validateDrop(active?.data, cell);

  return (
    <div 
      ref={setNodeRef}
      className={cn(
        'grid-cell',
        isOver && isValidDrop && 'drop-zone-valid',
        isOver && !isValidDrop && 'drop-zone-invalid'
      )}
    >
      {/* Cell content */}
    </div>
  );
};
```

### Drop Validation Logic
```typescript
const validateDrop = (dragData: any, targetCell: GridCell): DragValidation => {
  // Check if cell is available
  if (targetCell.isOccupied) {
    return { isValid: false, reason: 'Time slot is already occupied' };
  }

  // Check business hours
  if (!isWithinBusinessHours(dragData.item, targetCell)) {
    return { isValid: false, reason: 'Activity scheduled outside business hours' };
  }

  // Check for conflicts
  const conflicts = checkConflicts(dragData.item, targetCell);
  if (conflicts.length > 0) {
    return { 
      isValid: false, 
      reason: 'Scheduling conflicts detected',
      conflictingActivities: conflicts 
    };
  }

  return { isValid: true };
};
```

## Visual Feedback System

### Drag Preview
- **Item Preview**: Miniature version of wishlist item
- **Ghost Element**: Semi-transparent representation
- **Snap Preview**: Shows where item will be placed
- **Duration Indicator**: Visual representation of activity duration

### Drop Zone Indicators
- **Valid Zones**: Green highlight with check icon
- **Invalid Zones**: Red highlight with warning icon
- **Occupied Slots**: Gray overlay with activity info
- **Suggested Times**: Blue highlight for recommended slots

### Animation System
- **Smooth Transitions**: CSS transforms for drag movement
- **Spring Animations**: Natural feeling drag feedback
- **Micro-interactions**: Subtle feedback for user actions
- **Success Animations**: Confirmation animations on drop

## Error Handling & Edge Cases

### Error Scenarios
- **Network Issues**: Handle offline drops with queue
- **Validation Failures**: Clear error messages and alternatives
- **API Failures**: Rollback UI changes and show errors
- **Concurrent Modifications**: Handle real-time conflicts

### Edge Cases
- **Multi-day Activities**: Handle activities spanning multiple days
- **Timezone Changes**: Maintain correct scheduling across timezones
- **Rapid Interactions**: Debounce rapid drag operations
- **Browser Compatibility**: Fallbacks for older browsers

## Accessibility Implementation

### Keyboard Navigation
```typescript
const KeyboardDragHandler = () => {
  const handleKeyboardDrag = (event: KeyboardEvent) => {
    switch (event.key) {
      case ' ':
      case 'Enter':
        // Pick up or drop item
        event.code === 'Space' ? pickupItem() : dropItem();
        break;
      case 'ArrowUp':
      case 'ArrowDown':
      case 'ArrowLeft':
      case 'ArrowRight':
        // Move item in grid
        moveItemInDirection(event.key);
        break;
      case 'Escape':
        // Cancel drag operation
        cancelDrag();
        break;
    }
  };
};
```

### Screen Reader Support
- **Drag Announcements**: "Started dragging Restaurant XYZ"
- **Drop Zone Status**: "Valid drop zone for 2 PM Tuesday"
- **Validation Feedback**: "Cannot drop here: time slot occupied"
- **Success Confirmation**: "Successfully scheduled Restaurant XYZ for 2 PM Tuesday"

## Performance Optimizations

### Drag Performance
- **RequestAnimationFrame**: Smooth 60fps drag movement
- **Throttled Updates**: Limit validation checks during drag
- **Memoized Calculations**: Cache expensive drag computations
- **Virtual Drop Zones**: Only render visible drop zones

### Memory Management
- **Cleanup Listeners**: Remove event listeners on unmount
- **Optimized Re-renders**: Minimize component updates during drag
- **Garbage Collection**: Clean up drag artifacts promptly

## State Management

### Drag State
```typescript
interface DragState {
  activeDrag: ActiveDrag | null;
  dropValidation: DropValidation | null;
  dragHistory: DragOperation[];
  preferences: DragPreferences;
}

interface ActiveDrag {
  itemId: string;
  sourceType: 'wishlist' | 'calendar';
  currentPosition: Coordinates;
  validDropZones: string[];
  startTime: number;
}
```

### Undo/Redo System
- **Operation History**: Track all drag operations
- **Reversible Actions**: Store enough data to undo operations
- **Batch Operations**: Group related operations together
- **History Limits**: Maintain reasonable history size

## Integration Points
- **Calendar Grid**: CALENDAR-005 (Drop targets)
- **Wishlist Panel**: CALENDAR-003 (Drag sources)
- **Activity Blocks**: CALENDAR-002 (Internal drag operations)
- **Time Scheduling**: CALENDAR-004 (Validation logic)

## Dependencies
- `@dnd-kit/core` - Core drag-and-drop functionality
- `@dnd-kit/sortable` - For internal calendar sorting
- `@dnd-kit/utilities` - Helper utilities
- React Query - For optimistic updates

## Estimated Effort
8-9 hours

## Notes
- This is a critical user interaction - must be smooth and intuitive
- Test extensively on all device types and screen sizes
- Ensure accessibility compliance for keyboard users
- Plan for real-time collaboration conflicts
- Consider haptic feedback for mobile devices
- Monitor performance during drag operations