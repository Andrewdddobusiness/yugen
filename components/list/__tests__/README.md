# ItineraryListView Test Suite

This directory contains comprehensive tests for the `ItineraryListView` component, covering all aspects of the expandable/collapsible day sections functionality.

## Test Files Overview

### Core Functionality Tests
- **`ItineraryListView.test.tsx`** - Main test file covering:
  - Initial rendering and state
  - Default expansion behavior (today + unscheduled)
  - Expand/collapse functionality
  - Keyboard navigation and shortcuts
  - Accessibility features
  - Activity display and formatting
  - Date sorting and grouping

### Integration Tests
- **`ItineraryListView.integration.test.tsx`** - Complex scenarios:
  - Performance with large datasets
  - State interactions with dynamic data
  - Error boundaries and resilience
  - Memory management and cleanup
  - Complex user workflows

### localStorage Tests
- **`ItineraryListView.localStorage.test.tsx`** - Persistence features:
  - Saving/restoring expansion state
  - Error handling for localStorage failures
  - Different itinerary ID isolation
  - Server-side rendering compatibility
  - Race condition handling

### Mobile-Specific Tests
- **`ItineraryListView.mobile.test.tsx`** - Mobile responsiveness:
  - Mobile layout adaptations
  - Touch interactions
  - Mobile-specific styling
  - Performance on mobile devices
  - Viewport adaptations

### Edge Cases and Boundary Tests
- **`ItineraryListView.edge-cases.test.tsx`** - Unusual scenarios:
  - Boundary dates (leap years, year boundaries)
  - Extreme data scenarios (long names, missing data)
  - Timezone edge cases
  - State corruption and recovery
  - Network failures

### Test Utilities
- **`test-utils.ts`** - Helper functions and mocks:
  - Data factories for creating test activities
  - Mock setup functions
  - Assertion helpers
  - Date and performance utilities

## Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage

# Run specific test file
npm test ItineraryListView.test.tsx

# Run tests matching a pattern
npm test -- --testNamePattern="expand/collapse"
```

## Test Coverage Areas

### ✅ Functional Coverage
- [x] Component rendering and state management
- [x] User interactions (click, keyboard, touch)
- [x] Data manipulation and filtering
- [x] localStorage persistence
- [x] Responsive behavior
- [x] Error handling and recovery

### ✅ Accessibility Coverage
- [x] ARIA attributes and roles
- [x] Keyboard navigation
- [x] Screen reader compatibility
- [x] Focus management
- [x] Touch target sizing

### ✅ Performance Coverage
- [x] Large dataset handling
- [x] Rapid state changes
- [x] Memory leak prevention
- [x] Render optimization
- [x] Mobile performance

### ✅ Edge Case Coverage
- [x] Invalid data handling
- [x] Network failures
- [x] Browser compatibility
- [x] Timezone handling
- [x] Locale differences

## Test Data Patterns

The test suite uses consistent patterns for creating test data:

```typescript
// Basic activity
const activity = createMockActivity({
  date: '2024-01-15',
  activity: { name: 'Test Activity' }
})

// Unscheduled activity
const unscheduled = createUnscheduledActivity()

// Deleted activity (should be filtered out)
const deleted = createDeletedActivity()
```

## Mocking Strategy

Tests use comprehensive mocking for external dependencies:

- **Zustand stores** - Mocked with configurable return values
- **Next.js hooks** - Mocked navigation and routing
- **localStorage** - Mocked with error simulation
- **Date/time** - Controlled with fake timers
- **Mobile detection** - Configurable device type
- **Network calls** - Mocked with success/failure scenarios

## Best Practices

1. **Test Isolation** - Each test starts with clean state
2. **Realistic Data** - Use representative test data
3. **User-Centric** - Test from user's perspective
4. **Accessibility First** - Always test accessibility features
5. **Performance Aware** - Include performance assertions
6. **Error Resilience** - Test error scenarios thoroughly

## Coverage Goals

- **Lines**: >90%
- **Functions**: >90%
- **Branches**: >85%
- **Statements**: >90%

## Adding New Tests

When adding new tests:

1. Choose the appropriate test file based on the feature
2. Use helper functions from `test-utils.ts`
3. Follow existing naming conventions
4. Include both positive and negative test cases
5. Test accessibility implications
6. Consider mobile-specific behavior
7. Add performance assertions where relevant

## Debugging Tests

Common debugging approaches:

```typescript
// Debug rendered component
screen.debug()

// Check all queries
screen.logTestingPlaygroundURL()

// Inspect specific elements
console.log(screen.getByRole('button').outerHTML)

// Check localStorage calls
console.log(localStorage.setItem.mock.calls)
```

## Dependencies

The test suite requires:
- Jest + jsdom environment
- React Testing Library
- User Event for interactions
- Custom mocks for Next.js and stores