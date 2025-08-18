# Location Suggestions Module

This module provides location suggestion functionality for the map interface, breaking down the original 500+ line component into focused, modular pieces.

## Architecture

### Components (~150 lines each)

- **LocationSuggestions.tsx** - Main orchestrating component that combines all functionality
- **SuggestionMarker.tsx** - Individual purple marker for suggestions on the map
- **SuggestionDetails.tsx** - Popup details when a suggestion marker is clicked
- **SuggestionsControlPanel.tsx** - Control panel showing count, stats, and filter toggle
- **FilterPanel.tsx** - Expandable filter controls for refining suggestions

### Hooks (~50 lines each)

- **useSuggestionsFetch.ts** - Handles API calls to Google Places and data conversion
- **useSuggestionsFilter.ts** - Client-side filtering logic for suggestions

### Utilities & Configuration (~30 lines each)

- **types.ts** - TypeScript interfaces and type definitions
- **constants.ts** - Static configuration (activity types, defaults)
- **utils.ts** - Pure utility functions for data formatting and conversion
- **index.ts** - Clean re-exports for easy importing

## Usage

```typescript
import { LocationSuggestions } from '@/components/map/suggestions';
// or
import { LocationSuggestions } from '@/components/map/LocationSuggestions';

<LocationSuggestions
  existingActivities={activities}
  mapCenter={{ lat, lng }}
  selectedDate="2024-01-15"
  onAddSuggestion={(suggestion, date) => {
    // Handle adding suggestion to itinerary
  }}
/>
```

## Benefits of This Structure

1. **Maintainability** - Each file has a single, clear responsibility
2. **Testability** - Components and hooks can be tested in isolation
3. **Reusability** - Individual components can be used elsewhere if needed
4. **Performance** - Hooks prevent unnecessary re-renders through proper memoization
5. **Code Organization** - Clear separation between UI, logic, and configuration
6. **TypeScript Support** - Strong typing throughout with shared type definitions

## File Sizes

All files are under 200 lines, following the codebase's best practices:
- Components: 50-150 lines each
- Hooks: 30-80 lines each  
- Utils/Types: 20-50 lines each
- Total reduction: 500+ lines → 8 focused modules

This follows the established patterns in the codebase like `components/calendar/`, `components/list/`, etc.