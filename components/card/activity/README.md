# Unified ActivityCard System

This directory contains the consolidated ActivityCard component system that replaces 8+ duplicate activity card implementations across the codebase.

## Architecture

### Main Components

1. **ActivityCard** (`ActivityCard.tsx`)
   - The main unified component with multiple variants
   - Supports: `vertical`, `horizontal-full`, `horizontal-simple`, `compact`, `timeblock`
   - Handles all activity types: `IActivity`, `IActivityWithLocation`, `IItineraryActivity`

2. **ActivityCardSkeleton** (`ActivityCardSkeleton.tsx`)
   - Loading states for each variant
   - Maintains consistent skeleton UI across all card types

### Sub-Components

Located in `components/`:
- **ActivityImage**: Handles image display with lazy loading and placeholders
- **ActivityMetadata**: Displays rating, price, category badges
- **ActivityActions**: Unified action buttons (add/remove, edit, delete)
- **ActivityTimeInfo**: Time and duration display

### Legacy Support

For backward compatibility during migration:
- **LegacyActivityCard**: Wrapper for vertical cards
- **LegacyActivityCardHorizontal**: Wrapper for horizontal cards
- **TimeBlockActivityCard**: Adapter for time management features

## Usage Examples

### Basic Vertical Card
```tsx
<ActivityCard
  activity={activity}
  variant="vertical"
  onClick={handleClick}
  onAddToItinerary={handleAdd}
  showSaveButton
/>
```

### Horizontal Card
```tsx
<ActivityCard
  activity={activity}
  variant="horizontal-full"
  size="md"
  onEdit={handleEdit}
  onDelete={handleDelete}
/>
```

### Time Block Card
```tsx
<ActivityCard
  activity={itineraryActivity}
  variant="timeblock"
  size="sm"
  startTime={startTime}
  endTime={endTime}
  showTravelTime
/>
```

### Loading State
```tsx
<ActivityCardSkeleton variant="vertical" />
```

## Variants

- **vertical**: Traditional card layout with image on top
- **horizontal-full**: Full horizontal layout with side image
- **horizontal-simple**: Compact horizontal without image
- **compact**: Minimal single-line display
- **timeblock**: Specialized for time management views

## Props

See `types.ts` for complete prop definitions. Key props include:
- Display options (showImage, showRating, showPrice, etc.)
- Event handlers (onClick, onEdit, onDelete, etc.)
- States (isSelected, isHovered, isDragging, etc.)
- Custom slots (customHeader, customFooter, customActions)

## Migration Guide

### From old activityCard.tsx
```tsx
// Before
import ActivityCard from '@/components/cards/activityCard';

// After
import { LegacyActivityCard } from '@/components/cards/ActivityCard';
// Or migrate to new API:
import { ActivityCard } from '@/components/cards/ActivityCard';
```

### From activityCardHorizontal.tsx
```tsx
// Before
import ActivityCardHorizontal from '@/components/cards/activityCardHorizontal';

// After
import { LegacyActivityCardHorizontal } from '@/components/cards/ActivityCard';
// Or migrate to new API:
import { ActivityCard } from '@/components/cards/ActivityCard';
// Use variant="horizontal-full" or "horizontal-simple"
```

## Benefits

1. **Reduced Duplication**: From 8+ components to 1 unified system
2. **Consistent API**: Same props and patterns across all variants
3. **Better Performance**: Shared sub-components with React.memo
4. **Type Safety**: Comprehensive TypeScript interfaces
5. **Maintainability**: Single source of truth for activity cards