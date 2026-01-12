import '@testing-library/jest-dom'

// Mock Next.js router
const mockParams = {
  itineraryId: 'test-itinerary-id',
  destinationId: 'test-destination-id',
}

const mockNavigation = {
  useRouter() {
    return {
      push: jest.fn(),
      replace: jest.fn(),
      prefetch: jest.fn(),
      back: jest.fn(),
      forward: jest.fn(),
      refresh: jest.fn(),
    }
  },
  useParams() {
    return mockParams
  },
  usePathname() {
    return '/test-path'
  },
  useSearchParams() {
    return new URLSearchParams()
  },
  // Helper function for tests to update params
  __setMockParams: (newParams) => {
    Object.assign(mockParams, newParams)
  }
}

jest.mock('next/navigation', () => mockNavigation)

// Mock framer-motion
jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }) => <div {...props}>{children}</div>,
    button: ({ children, ...props }) => <button {...props}>{children}</button>,
    span: ({ children, ...props }) => <span {...props}>{children}</span>,
  },
  AnimatePresence: ({ children }) => <>{children}</>,
}))

// Mock Zustand stores
jest.mock('@/store/itineraryActivityStore', () => ({
  useItineraryActivityStore: jest.fn(() => ({
    itineraryActivities: [],
    removeItineraryActivity: jest.fn(),
    addItineraryActivity: jest.fn(),
    updateItineraryActivity: jest.fn(),
  })),
}))

jest.mock('@/store/dateRangeStore', () => ({
  useDateRangeStore: jest.fn(() => ({
    startDate: '2024-01-01',
    endDate: '2024-01-07',
    setDateRange: jest.fn(),
  })),
}))

// Mock React Query
jest.mock('@tanstack/react-query', () => ({
  useQueryClient: jest.fn(() => ({
    invalidateQueries: jest.fn(),
    setQueryData: jest.fn(),
    getQueryData: jest.fn(),
  })),
  QueryClient: jest.fn(),
  QueryClientProvider: ({ children }) => children,
}))

// Mock mobile hook
jest.mock('@/components/hooks/use-mobile', () => ({
  useIsMobile: jest.fn(() => false),
}))

// Mock localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
}
global.localStorage = localStorageMock

// Mock window.matchMedia
if (typeof window !== 'undefined') {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: jest.fn().mockImplementation(query => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: jest.fn(), // deprecated
      removeListener: jest.fn(), // deprecated
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      dispatchEvent: jest.fn(),
    })),
  })
}

// Mock ResizeObserver
global.ResizeObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}))

// Set up a default timezone for consistent date testing
process.env.TZ = 'UTC'
