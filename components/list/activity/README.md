# Activity Components

This directory contains components related to displaying and managing individual activities within an itinerary.

## Component Architecture

### Main Components

- **SortableActivityItem** (183 lines) - Main orchestrator component that combines drag-drop functionality with activity display
- **ItineraryActivityList** - Container for rendering lists of sortable activities  
- **ItineraryActivityEditor** - Full-page activity editor component

### Sub-Components (Extracted for Reusability)

- **ActivityCardDisplay** (~95 lines) - Displays activity information (name, address, ratings, contact info)
- **ActivityNameEditor** (~40 lines) - Inline editor for activity names
- **ActivityTimeEditor** (~65 lines) - Inline editor for activity start/end times
- **ActivityTimeDisplay** (~40 lines) - Read-only display of activity times
- **ActivityNotesSection** (~80 lines) - Handles both display and editing of activity notes
- **ActivitySelectionCheckbox** (~30 lines) - Checkbox for bulk selection mode

### Types

All shared types are defined in `types.ts`:
- `ItineraryActivity` - Main activity data structure
- `EditingField` - Tracks which field is being edited
- `SortableActivityItemProps` - Props interface for the main component

## Design Decisions

1. **Component Decomposition**: The original 443-line component was broken down into focused sub-components, each handling a specific responsibility.

2. **Memoization**: All components use `React.memo` to prevent unnecessary re-renders, crucial for performance with drag-drop operations.

3. **Type Safety**: Centralized type definitions ensure consistency across all components.

4. **Composition Pattern**: The main `SortableActivityItem` acts as an orchestrator, composing smaller components based on state (editing vs display mode).

## Usage Example

```tsx
import { SortableActivityItem } from '@/components/list/activity';
import type { ItineraryActivity } from '@/components/list/activity';

function MyItinerary() {
  const [activities, setActivities] = useState<ItineraryActivity[]>([]);
  
  return (
    <SortableContext items={activities} strategy={verticalListSortingStrategy}>
      {activities.map((activity, index) => (
        <SortableActivityItem
          key={activity.itinerary_activity_id}
          activity={activity}
          index={index}
          // ... other required props
        />
      ))}
    </SortableContext>
  );
}
```

## Performance Considerations

- Components are memoized to prevent re-renders during drag operations
- Edit states are managed at the parent level to avoid prop drilling
- Sub-components are lazy-loaded only when needed (editing vs display mode)