// Travel time utility exports

export {
  getTravelTimesBetweenActivities,
  shouldShowTravelTime,
  getTravelTimeColor,
  getTravelModeIcon,
  formatTravelTime,
  getTotalTravelTimeForDay,
  formatDuration,
  formatDistance,
  detectTravelTimeConflicts,
  suggestDepartureTime
} from './travelTimeUtils';

export type {
  ActivityWithCoordinates,
  TravelTimeResult
} from './travelTimeUtils';

// Test utilities (only import in development)
export {
  testBasicTravelTime,
  testBatchTravelTime,
  testTravelTimeCache,
  testErrorHandling,
  runAllTravelTimeTests,
  benchmarkTravelTimes,
  TEST_COORDINATES
} from './travelTimeTest';