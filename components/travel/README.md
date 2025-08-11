# Travel Time System

A comprehensive travel time calculation and display system for the Journey itinerary builder.

## Features

- **Real-time travel time calculations** using Google Maps Distance Matrix API
- **Multiple transport modes** (walking, driving, transit, bicycling)
- **Smart mode selection** based on distance and travel time
- **24-hour caching** to reduce API calls and improve performance
- **Conflict detection** for scheduling issues
- **Travel time indicators** between consecutive activities
- **Daily travel summaries** in the day headers
- **Configurable settings** for transport mode preferences

## Components

### TravelTimeIndicator
Displays travel time between two activities with multiple transport options.

```tsx
<TravelTimeIndicator
  fromCoordinates={[lat, lng]}
  toCoordinates={[lat, lng]}
  fromName="Museum"
  toName="Restaurant"
  compact={false}
  showAllModes={false}
/>
```

### TravelTimeConflicts
Shows scheduling conflicts where travel time exceeds available time between activities.

```tsx
<TravelTimeConflicts
  activities={activities}
  travelTimes={travelTimes}
/>
```

### TravelTimeSettings
User interface for configuring travel time preferences and managing cache.

```tsx
<TravelTimeSettings
  defaultModes={['walking', 'driving']}
  onModesChange={setTravelModes}
  onRefresh={refreshTravelTimes}
/>
```

## Server Actions

### calculateTravelTime
Core function for calculating travel time between two coordinates.

```tsx
const result = await calculateTravelTime(
  { lat: 40.7128, lng: -74.0060 }, // New York
  { lat: 40.7589, lng: -73.9851 }, // Times Square
  ['walking', 'driving'],
  new Date() // Optional departure time
);
```

### calculateBatchTravelTimes
Efficiently calculates travel times for multiple activity pairs.

```tsx
const results = await calculateBatchTravelTimes([
  { from: coord1, to: coord2, fromId: 'act1', toId: 'act2' },
  { from: coord2, to: coord3, fromId: 'act2', toId: 'act3' }
], ['walking', 'driving']);
```

## Hooks

### useTravelTimes
React hook for managing travel times in components with automatic refresh and caching.

```tsx
const {
  travelTimes,
  loading,
  error,
  refreshTravelTimes,
  clearTravelTimes
} = useTravelTimes(groupedActivities, {
  modes: ['walking', 'driving'],
  autoRefresh: false,
  refreshInterval: 30 * 60 * 1000 // 30 minutes
});
```

## Utilities

### Travel Time Utils
Helper functions for processing and displaying travel time data:

- `getTravelTimesBetweenActivities()` - Calculate travel times for a day's activities
- `shouldShowTravelTime()` - Determine if travel time is significant enough to display
- `detectTravelTimeConflicts()` - Find scheduling conflicts
- `suggestDepartureTime()` - Recommend departure times to avoid conflicts
- `getTotalTravelTimeForDay()` - Calculate daily travel time summaries

## Caching Strategy

The system implements a two-layer caching approach:

1. **Server-side cache** - In-memory cache in server actions (24-hour TTL)
2. **Component-level cache** - Short-term cache for UI components (10-minute TTL)

This reduces API calls while ensuring fresh data when needed.

## API Integration

Uses Google Maps Distance Matrix API with the following features:

- **Multiple transport modes** supported
- **Real-time traffic data** for driving directions
- **Departure time optimization** for transit and driving
- **Automatic fallbacks** when routes are unavailable
- **Rate limiting protection** through intelligent caching

## Performance Considerations

- Travel times are calculated asynchronously to avoid blocking the UI
- Results are cached to minimize API calls
- Only activities with valid coordinates are processed
- Batch requests are used for multiple calculations
- Component updates are debounced to prevent excessive re-renders

## Error Handling

The system gracefully handles:
- Missing or invalid coordinates
- API rate limits and failures
- Network connectivity issues
- Unsupported transport modes
- Route calculation failures

## Configuration

Travel time behavior can be configured through:
- Transport mode selection in the UI
- Cache duration settings
- API key configuration via environment variables
- Rate limiting parameters

## Environment Variables

Required environment variables:
```
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=your_api_key_here
NEXT_PUBLIC_APP_URL=https://your-app.com
```

## Integration with ItineraryListView

The travel time system is fully integrated into the list view with:
- Travel time indicators between consecutive activities
- Daily travel summaries in day headers
- Conflict warnings for tight schedules
- User settings for customization
- Loading states and error handling