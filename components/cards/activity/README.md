# Unified Activity Card System

This directory contains a unified, reusable activity card system that consolidates multiple overlapping card components into a flexible, composition-based architecture.

## Overview

The previous implementation had three separate components with overlapping functionality:
- `itineraryListCard.tsx` (117 lines) - Horizontal list view card
- `itineraryListCardWrapper.tsx` (28 lines) - Drag-and-drop wrapper  
- `ActivityTimeBlock.tsx` (181 lines) - Calendar/time-based view card

This unified system replaces them with a single, flexible base component and specialized variants, reducing duplication and improving maintainability.

## Architecture

### Base Component: `BaseActivityCard`
The core component containing all shared functionality:
- Activity display (name, address, time, rating, price, category)
- Interactive states (hover, selection, editing, loading)
- Customizable layout options (horizontal/vertical, size variants)
- Event handlers (click, edit, delete)
- Extensible via custom header/footer slots

### Specialized Variants

#### `ListActivityCard`
- **Use case**: Horizontal list views with drag handles
- **Features**: Date/time popovers, drag handle, remove functionality
- **Layout**: Horizontal orientation optimized for list display

#### `TimeBlockActivityCard` 
- **Use case**: Calendar/time-based views with absolute positioning
- **Features**: Time-based positioning, travel time display, compact vertical layout
- **Layout**: Vertical orientation optimized for calendar grids

#### `DraggableActivityCard`
- **Use case**: Wrapper for drag-and-drop functionality
- **Features**: Handles sortable context, can wrap any variant
- **Flexibility**: Supports list, timeblock, and base variants

## Usage Examples

### Basic List View
```tsx
import { ListActivityCard } from "@/components/cards/activity";

<ListActivityCard
  activity={activity}
  showDatePicker={true}
  showTimePicker={true}
  onRemove={handleRemove}
/>
```

### Calendar/Time View
```tsx
import { TimeBlockActivityCard } from "@/components/cards/activity";

<TimeBlockActivityCard
  timeBlock={timeBlock}
  onEdit={handleEdit}
  onDelete={handleDelete}
  showTravelTimeBefore={true}
/>
```

### Draggable List
```tsx
import { DraggableActivityCard } from "@/components/cards/activity";

<DraggableActivityCard
  variant="list"
  activity={activity}
  dragId={activity.id}
/>
```

### Custom Base Usage
```tsx
import { BaseActivityCard } from "@/components/cards/activity";

<BaseActivityCard
  activity={activity}
  variant="compact"
  orientation="horizontal"
  size="sm"
  customActions={<MyCustomButtons />}
  showTime={false}
  showCategory={true}
/>
```

## Key Benefits

1. **Reduced Duplication**: Single source of truth for card functionality
2. **Flexible Composition**: Easy to create new variants without duplicating code
3. **Consistent Behavior**: Unified time formatting, styling, and interactions
4. **Type Safety**: Full TypeScript support with shared interfaces
5. **Maintainable**: Changes to base functionality automatically propagate to all variants
6. **Extensible**: Easy to add new display options and interactions

## Migration Guide

The system provides backward-compatible exports for easy migration:

```tsx
// Old imports
import { ItineraryListCard } from "./itineraryListCard";
import { ActivityTimeBlock } from "./ActivityTimeBlock";
import { ItineraryListCardWrapper } from "./itineraryListCardWrapper";

// New unified imports (all from single entry point)
import { 
  ListActivityCard,           // Replaces ItineraryListCard
  TimeBlockActivityCard,      // Replaces ActivityTimeBlock  
  DraggableActivityCard       // Replaces ItineraryListCardWrapper
} from "@/components/cards/activity";
```

## Component Guidelines

- Keep individual components under 200 lines
- Use composition over inheritance
- Leverage shared time utilities from `@/utils/formatting/time`
- Follow the base component's prop patterns for consistency
- Add new features to the base component when applicable to all variants

## Dependencies

- Uses shared time utilities: `@/utils/formatting/time`
- Integrates with existing stores: `@/store/itineraryActivityStore`, `@/store/dateRangeStore`
- Compatible with drag-and-drop: `@dnd-kit/sortable`
- Styled with: Tailwind CSS, Radix UI components