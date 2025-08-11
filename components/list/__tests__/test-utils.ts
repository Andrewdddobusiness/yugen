import { useParams } from 'next/navigation'

// Test data factories
export const createMockActivity = (overrides: any = {}) => ({
  itinerary_activity_id: 'test-id',
  date: '2024-01-15',
  start_time: '09:00',
  end_time: '10:00',
  notes: '',
  deleted_at: null,
  activity: {
    name: 'Test Activity',
    address: '123 Test Street',
    coordinates: [-74.006, 40.7128] as [number, number],
    types: ['attraction'],
    rating: 4.0,
    price_level: '2',
    phone_number: '+1234567890',
    website_url: 'https://example.com',
    photo_names: ['photo1.jpg'],
    place_id: 'test-place-id',
  },
  ...overrides,
})

export const createMockActivities = (count: number = 3, dateBase: string = '2024-01-15') => {
  return Array.from({ length: count }, (_, index) => {
    const date = new Date(dateBase)
    date.setDate(date.getDate() + Math.floor(index / 2)) // 2 activities per day
    
    return createMockActivity({
      itinerary_activity_id: `activity-${index}`,
      date: date.toISOString().split('T')[0],
      start_time: `${9 + (index % 8)}:00`,
      end_time: `${10 + (index % 8)}:00`,
      activity: {
        ...createMockActivity().activity,
        name: `Activity ${index}`,
        place_id: `place-${index}`,
      }
    })
  })
}

export const createUnscheduledActivity = (overrides: any = {}) => 
  createMockActivity({
    date: null,
    start_time: null,
    end_time: null,
    activity: {
      ...createMockActivity().activity,
      name: 'Unscheduled Activity',
    },
    ...overrides,
  })

export const createDeletedActivity = (overrides: any = {}) =>
  createMockActivity({
    deleted_at: '2024-01-14T10:00:00Z',
    activity: {
      ...createMockActivity().activity,
      name: 'Deleted Activity',
    },
    ...overrides,
  })

// Mock store return values
export const createMockStoreReturn = (activities: any[] = []) => ({
  itineraryActivities: activities,
  removeItineraryActivity: jest.fn(),
  addItineraryActivity: jest.fn(),
  updateItineraryActivity: jest.fn(),
})

export const createMockDateRangeReturn = (startDate: string = '2024-01-01', endDate: string = '2024-01-31') => ({
  startDate,
  endDate,
  setDateRange: jest.fn(),
})

// Utility functions for tests
export const setMockParams = (params: any) => {
  const mockUseParams = useParams as jest.MockedFunction<typeof useParams>
  mockUseParams.mockReturnValue(params)
}

export const mockCurrentDate = (dateString: string) => {
  jest.useFakeTimers()
  jest.setSystemTime(new Date(`${dateString}T12:00:00Z`))
}

export const restoreRealTimers = () => {
  jest.useRealTimers()
}

// Mock localStorage utilities
export const mockLocalStorageValue = (key: string, value: string) => {
  const mockGetItem = localStorage.getItem as jest.Mock
  mockGetItem.mockImplementation((k) => k === key ? value : null)
}

export const mockLocalStorageError = (method: 'getItem' | 'setItem' = 'getItem', error: Error = new Error('localStorage error')) => {
  const mockMethod = localStorage[method] as jest.Mock
  mockMethod.mockImplementation(() => {
    throw error
  })
}

export const clearLocalStorageMocks = () => {
  jest.clearAllMocks()
  localStorage.clear()
}

// Test setup helpers
export const setupBasicTest = (options: {
  activities?: any[]
  currentDate?: string
  isMobile?: boolean
  itineraryId?: string
} = {}) => {
  const {
    activities = [createMockActivity()],
    currentDate = '2024-01-15',
    isMobile = false,
    itineraryId = 'test-itinerary-id'
  } = options

  // Mock current date
  if (currentDate) {
    mockCurrentDate(currentDate)
  }

  // Set params
  setMockParams({
    itineraryId,
    destinationId: 'test-destination-id',
  })

  // Mock stores
  const mockStoreReturn = createMockStoreReturn(activities)
  const mockDateRangeReturn = createMockDateRangeReturn()

  require('@/store/itineraryActivityStore').useItineraryActivityStore.mockReturnValue(mockStoreReturn)
  require('@/store/dateRangeStore').useDateRangeStore.mockReturnValue(mockDateRangeReturn)
  require('@/components/hooks/use-mobile').useIsMobile.mockReturnValue(isMobile)

  clearLocalStorageMocks()

  return {
    mockStoreReturn,
    mockDateRangeReturn,
  }
}

// Assertion helpers
export const expectElementToBeVisible = (text: string) => {
  const element = screen.getByText(text)
  expect(element).toBeVisible()
  return element
}

export const expectElementNotToBeVisible = (text: string) => {
  const element = screen.queryByText(text)
  expect(element).not.toBeInTheDocument()
}

export const expectLocalStorageToBeCalled = (itineraryId: string, expectedData?: any) => {
  expect(localStorage.setItem).toHaveBeenCalledWith(
    `expandedDays-${itineraryId}`,
    expectedData ? JSON.stringify(expectedData) : expect.any(String)
  )
}

// Screen reader / accessibility helpers
export const expectAriaExpanded = (element: HTMLElement, expanded: boolean) => {
  expect(element).toHaveAttribute('aria-expanded', expanded.toString())
}

export const expectProperAriaLabel = (element: HTMLElement, textMatch: RegExp) => {
  expect(element).toHaveAttribute('aria-label', expect.stringMatching(textMatch))
}

// Date formatting helpers
export const formatTestDate = (dateString: string, format: 'full' | 'day' | 'date' = 'full') => {
  const date = new Date(dateString)
  
  switch (format) {
    case 'full':
      return date.toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
      })
    case 'day':
      return date.toLocaleDateString('en-US', { weekday: 'long' })
    case 'date':
      return date.toLocaleDateString('en-US', {
        month: 'long',
        day: 'numeric',
      })
    default:
      return date.toLocaleDateString()
  }
}

// Performance testing helpers
export const measureRenderTime = (renderFn: () => void) => {
  const startTime = performance.now()
  renderFn()
  const endTime = performance.now()
  return endTime - startTime
}

// Mobile testing helpers
export const mockMobileViewport = (width: number = 375, height: number = 667) => {
  Object.defineProperty(window, 'innerWidth', {
    writable: true,
    configurable: true,
    value: width,
  })
  Object.defineProperty(window, 'innerHeight', {
    writable: true,
    configurable: true,
    value: height,
  })
  
  // Trigger resize event
  window.dispatchEvent(new Event('resize'))
}

// Import screen from testing library for convenience
import { screen } from '@testing-library/react'
export { screen }