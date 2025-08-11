import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ItineraryListView } from '../ItineraryListView'
import { useItineraryActivityStore } from '@/store/itineraryActivityStore'
import { useDateRangeStore } from '@/store/dateRangeStore'
import { useIsMobile } from '@/components/hooks/use-mobile'

// Mock the stores and hooks
jest.mock('@/store/itineraryActivityStore')
jest.mock('@/store/dateRangeStore')
jest.mock('@/components/hooks/use-mobile')

const mockUseItineraryActivityStore = useItineraryActivityStore as jest.MockedFunction<typeof useItineraryActivityStore>
const mockUseDateRangeStore = useDateRangeStore as jest.MockedFunction<typeof useDateRangeStore>
const mockUseIsMobile = useIsMobile as jest.MockedFunction<typeof useIsMobile>

// Sample test data
const mockActivities = [
  {
    itinerary_activity_id: '1',
    date: '2024-01-15',
    start_time: '09:00',
    end_time: '10:30',
    notes: 'Test notes',
    deleted_at: null,
    activity: {
      name: 'Museum Visit',
      address: '123 Main St, City',
      coordinates: [-74.006, 40.7128] as [number, number],
      types: ['museum'],
      rating: 4.5,
      price_level: '2',
      phone_number: '+1234567890',
      website_url: 'https://example.com',
      photo_names: ['photo1.jpg'],
      place_id: 'place1',
    }
  },
  {
    itinerary_activity_id: '2',
    date: '2024-01-15',
    start_time: '14:00',
    end_time: '16:00',
    notes: '',
    deleted_at: null,
    activity: {
      name: 'Restaurant Lunch',
      address: '456 Food Ave',
      types: ['restaurant'],
      rating: 4.2,
      price_level: '3',
      place_id: 'place2',
    }
  },
  {
    itinerary_activity_id: '3',
    date: null,
    start_time: null,
    end_time: null,
    notes: '',
    deleted_at: null,
    activity: {
      name: 'Unscheduled Activity',
      address: '789 Unknown St',
      types: ['attraction'],
      place_id: 'place3',
    }
  },
  {
    itinerary_activity_id: '4',
    date: '2024-01-16',
    start_time: '10:00',
    end_time: null,
    notes: '',
    deleted_at: null,
    activity: {
      name: 'Tomorrow Activity',
      address: '321 Tomorrow Rd',
      types: ['park'],
      place_id: 'place4',
    }
  },
  // Deleted activity should not appear
  {
    itinerary_activity_id: '5',
    date: '2024-01-15',
    start_time: '11:00',
    end_time: '12:00',
    notes: '',
    deleted_at: '2024-01-14T10:00:00Z',
    activity: {
      name: 'Deleted Activity',
      place_id: 'place5',
    }
  },
]

describe('ItineraryListView', () => {
  const mockRemoveActivity = jest.fn()
  
  beforeEach(() => {
    jest.clearAllMocks()
    
    // Mock current date to be 2024-01-15 for consistent "today" testing
    jest.useFakeTimers()
    jest.setSystemTime(new Date('2024-01-15T12:00:00Z'))
    
    mockUseItineraryActivityStore.mockReturnValue({
      itineraryActivities: mockActivities,
      removeItineraryActivity: mockRemoveActivity,
      addItineraryActivity: jest.fn(),
      updateItineraryActivity: jest.fn(),
    })
    
    mockUseDateRangeStore.mockReturnValue({
      startDate: '2024-01-01',
      endDate: '2024-01-31',
      setDateRange: jest.fn(),
    })
    
    mockUseIsMobile.mockReturnValue(false)
    
    // Clear localStorage
    localStorage.clear()
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  describe('Initial Rendering', () => {
    it('renders the component without crashing', () => {
      render(<ItineraryListView />)
      expect(screen.getByText('3 days with activities')).toBeInTheDocument()
    })

    it('displays empty state when no activities are present', () => {
      mockUseItineraryActivityStore.mockReturnValue({
        itineraryActivities: [],
        removeItineraryActivity: mockRemoveActivity,
        addItineraryActivity: jest.fn(),
        updateItineraryActivity: jest.fn(),
      })

      render(<ItineraryListView />)
      expect(screen.getByText('No activities scheduled')).toBeInTheDocument()
      expect(screen.getByText('Add activities to your itinerary to see them here.')).toBeInTheDocument()
    })

    it('filters out deleted activities', () => {
      render(<ItineraryListView />)
      expect(screen.queryByText('Deleted Activity')).not.toBeInTheDocument()
    })

    it('groups activities by date correctly', () => {
      render(<ItineraryListView />)
      
      // Should show three groups: Jan 15, Jan 16, and Unscheduled
      expect(screen.getByText('3 days with activities')).toBeInTheDocument()
      expect(screen.getByText('Unscheduled')).toBeInTheDocument()
    })
  })

  describe('Default Expansion State', () => {
    it('expands today\'s activities by default', () => {
      render(<ItineraryListView />)
      
      // Today (2024-01-15) should be expanded by default
      const todaySection = screen.getByText('Museum Visit')
      expect(todaySection).toBeVisible()
    })

    it('expands unscheduled activities by default', () => {
      render(<ItineraryListView />)
      
      // Unscheduled activities should be expanded by default
      const unscheduledActivity = screen.getByText('Unscheduled Activity')
      expect(unscheduledActivity).toBeVisible()
    })

    it('collapses non-today scheduled activities by default', () => {
      render(<ItineraryListView />)
      
      // Tomorrow's activities should be collapsed by default
      expect(screen.queryByText('Tomorrow Activity')).not.toBeInTheDocument()
    })
  })

  describe('Expand/Collapse Functionality', () => {
    it('toggles day section when clicking on day header', async () => {
      const user = userEvent.setup()
      render(<ItineraryListView />)
      
      // Find tomorrow's section (should be collapsed initially)
      const tomorrowHeader = screen.getByRole('button', { name: /expand activities for.*january 16/i })
      expect(screen.queryByText('Tomorrow Activity')).not.toBeInTheDocument()
      
      // Click to expand
      await user.click(tomorrowHeader)
      expect(screen.getByText('Tomorrow Activity')).toBeInTheDocument()
      
      // Click to collapse
      await user.click(tomorrowHeader)
      await waitFor(() => {
        expect(screen.queryByText('Tomorrow Activity')).not.toBeInTheDocument()
      })
    })

    it('updates chevron icon when expanding/collapsing', async () => {
      const user = userEvent.setup()
      render(<ItineraryListView />)
      
      const tomorrowHeader = screen.getByRole('button', { name: /expand activities for.*january 16/i })
      const chevron = tomorrowHeader.querySelector('[class*="transform"]')
      
      // Initially collapsed (rotated -90 degrees)
      expect(chevron).toHaveClass('-rotate-90')
      
      // Click to expand
      await user.click(tomorrowHeader)
      expect(chevron).toHaveClass('rotate-0')
    })

    it('shows activity count indicator when collapsed', () => {
      render(<ItineraryListView />)
      
      const tomorrowSection = screen.getByText('1 activity')
      expect(tomorrowSection).toBeInTheDocument()
    })
  })

  describe('Expand All / Collapse All', () => {
    it('expands all sections when "Expand All" is clicked', async () => {
      const user = userEvent.setup()
      render(<ItineraryListView />)
      
      // Initially, Tomorrow Activity should not be visible
      expect(screen.queryByText('Tomorrow Activity')).not.toBeInTheDocument()
      
      // Click Expand All
      const expandAllButton = screen.getByRole('button', { name: /expand all/i })
      await user.click(expandAllButton)
      
      // Now Tomorrow Activity should be visible
      expect(screen.getByText('Tomorrow Activity')).toBeInTheDocument()
    })

    it('collapses all sections when "Collapse All" is clicked', async () => {
      const user = userEvent.setup()
      render(<ItineraryListView />)
      
      // Initially, today's activities should be visible
      expect(screen.getByText('Museum Visit')).toBeInTheDocument()
      expect(screen.getByText('Unscheduled Activity')).toBeInTheDocument()
      
      // Click Collapse All
      const collapseAllButton = screen.getByRole('button', { name: /collapse all/i })
      await user.click(collapseAllButton)
      
      // Now activities should not be visible
      await waitFor(() => {
        expect(screen.queryByText('Museum Visit')).not.toBeInTheDocument()
        expect(screen.queryByText('Unscheduled Activity')).not.toBeInTheDocument()
      })
    })
  })

  describe('Keyboard Navigation', () => {
    it('toggles expansion with Enter key', async () => {
      const user = userEvent.setup()
      render(<ItineraryListView />)
      
      const tomorrowHeader = screen.getByRole('button', { name: /expand activities for.*january 16/i })
      
      // Focus and press Enter
      tomorrowHeader.focus()
      await user.keyboard('{Enter}')
      
      expect(screen.getByText('Tomorrow Activity')).toBeInTheDocument()
    })

    it('toggles expansion with Space key', async () => {
      const user = userEvent.setup()
      render(<ItineraryListView />)
      
      const tomorrowHeader = screen.getByRole('button', { name: /expand activities for.*january 16/i })
      
      // Focus and press Space
      tomorrowHeader.focus()
      await user.keyboard(' ')
      
      expect(screen.getByText('Tomorrow Activity')).toBeInTheDocument()
    })
  })

  describe('Global Keyboard Shortcuts', () => {
    it('expands all sections with Ctrl+Shift+E', async () => {
      const user = userEvent.setup()
      render(<ItineraryListView />)
      
      expect(screen.queryByText('Tomorrow Activity')).not.toBeInTheDocument()
      
      // Press global shortcut
      await user.keyboard('{Control>}{Shift>}e{/Shift}{/Control}')
      
      expect(screen.getByText('Tomorrow Activity')).toBeInTheDocument()
    })

    it('collapses all sections with Ctrl+Shift+C', async () => {
      const user = userEvent.setup()
      render(<ItineraryListView />)
      
      expect(screen.getByText('Museum Visit')).toBeInTheDocument()
      
      // Press global shortcut
      await user.keyboard('{Control>}{Shift>}c{/Shift}{/Control}')
      
      await waitFor(() => {
        expect(screen.queryByText('Museum Visit')).not.toBeInTheDocument()
      })
    })
  })

  describe('localStorage Persistence', () => {
    it('saves expanded state to localStorage', async () => {
      const user = userEvent.setup()
      render(<ItineraryListView />)
      
      // Expand a collapsed section
      const tomorrowHeader = screen.getByRole('button', { name: /expand activities for.*january 16/i })
      await user.click(tomorrowHeader)
      
      // Check localStorage was called
      expect(localStorage.setItem).toHaveBeenCalledWith(
        'expandedDays-test-itinerary-id',
        expect.stringContaining('2024-01-16')
      )
    })

    it('restores expanded state from localStorage', () => {
      // Mock localStorage to return saved expanded state
      const mockGetItem = localStorage.getItem as jest.Mock
      mockGetItem.mockReturnValue(JSON.stringify(['2024-01-16', 'unscheduled']))
      
      render(<ItineraryListView />)
      
      // Tomorrow's activity should be visible because it was saved as expanded
      expect(screen.getByText('Tomorrow Activity')).toBeInTheDocument()
    })

    it('handles corrupted localStorage data gracefully', () => {
      const mockGetItem = localStorage.getItem as jest.Mock
      mockGetItem.mockReturnValue('invalid-json')
      
      // Should not crash and should fall back to defaults
      expect(() => render(<ItineraryListView />)).not.toThrow()
      
      // Should still expand today by default
      expect(screen.getByText('Museum Visit')).toBeInTheDocument()
    })
  })

  describe('Mobile Responsiveness', () => {
    beforeEach(() => {
      mockUseIsMobile.mockReturnValue(true)
    })

    it('applies mobile-specific styling when on mobile', () => {
      const { container } = render(<ItineraryListView />)
      
      // Check for mobile padding class
      const mainDiv = container.firstChild as HTMLElement
      expect(mainDiv).toHaveClass('p-4')
    })

    it('adjusts gap spacing for mobile', () => {
      render(<ItineraryListView />)
      
      // Mobile should use smaller gaps (implementation-dependent)
      const dayHeaders = screen.getAllByRole('button', { name: /expand|collapse/i })
      expect(dayHeaders[0]).toHaveClass('gap-2')
    })
  })

  describe('Activity Display and Formatting', () => {
    it('formats time correctly', () => {
      render(<ItineraryListView />)
      
      // Check 24-hour to 12-hour conversion
      expect(screen.getByText('9:00 AM')).toBeInTheDocument()
      expect(screen.getByText('2:00 PM')).toBeInTheDocument()
    })

    it('shows "Today" badge for current day', () => {
      render(<ItineraryListView />)
      
      expect(screen.getByText('Today')).toBeInTheDocument()
    })

    it('displays activity rating and price level', () => {
      render(<ItineraryListView />)
      
      expect(screen.getByText('4.5')).toBeInTheDocument()
      expect(screen.getByText('$$')).toBeInTheDocument() // Price level 2
    })

    it('handles activities without time', () => {
      render(<ItineraryListView />)
      
      expect(screen.getByText('No time')).toBeInTheDocument()
    })
  })

  describe('Activity Actions', () => {
    it('calls removeItineraryActivity when delete button is clicked', async () => {
      const user = userEvent.setup()
      render(<ItineraryListView />)
      
      const deleteButtons = screen.getAllByRole('button', { name: '' })
      const deleteButton = deleteButtons.find(btn => 
        btn.querySelector('[class*="h-4"][class*="w-4"]')
      )
      
      if (deleteButton) {
        await user.click(deleteButton)
        expect(mockRemoveActivity).toHaveBeenCalledWith('place1', 'test-itinerary-id')
      }
    })
  })

  describe('Accessibility', () => {
    it('has proper ARIA labels for expand/collapse buttons', () => {
      render(<ItineraryListView />)
      
      const expandButton = screen.getByRole('button', { 
        name: /expand activities for.*january 16/i 
      })
      expect(expandButton).toHaveAttribute('aria-expanded', 'false')
    })

    it('updates aria-expanded when state changes', async () => {
      const user = userEvent.setup()
      render(<ItineraryListView />)
      
      const expandButton = screen.getByRole('button', { 
        name: /expand activities for.*january 16/i 
      })
      
      // Initially collapsed
      expect(expandButton).toHaveAttribute('aria-expanded', 'false')
      
      // Click to expand
      await user.click(expandButton)
      expect(expandButton).toHaveAttribute('aria-expanded', 'true')
    })

    it('has proper focus management', async () => {
      const user = userEvent.setup()
      render(<ItineraryListView />)
      
      const expandButton = screen.getByRole('button', { 
        name: /expand activities for.*january 16/i 
      })
      
      await user.tab()
      // Should be able to focus the expand button
      expect(document.activeElement).toBe(expandButton)
    })
  })

  describe('Animation and Visual States', () => {
    it('shows loading indicator dot when section is collapsed and has activities', () => {
      render(<ItineraryListView />)
      
      // Find a collapsed section with activities
      const tomorrowSection = screen.getByText('1 activity').closest('button')
      const loadingDot = tomorrowSection?.querySelector('.animate-pulse')
      
      expect(loadingDot).toBeInTheDocument()
    })

    it('applies hover styles to day headers', () => {
      render(<ItineraryListView />)
      
      const dayHeader = screen.getByRole('button', { 
        name: /expand activities for.*january 16/i 
      })
      
      expect(dayHeader).toHaveClass('hover:bg-gray-50/50')
    })
  })

  describe('Date Sorting and Grouping', () => {
    it('sorts dates chronologically', () => {
      render(<ItineraryListView />)
      
      const dateHeaders = screen.getAllByRole('button', { name: /expand|collapse/i })
      const dateTexts = dateHeaders.map(header => header.textContent)
      
      // Should have dates in order: Jan 15, Jan 16, then Unscheduled
      expect(dateTexts[0]).toContain('January 15')
      expect(dateTexts[1]).toContain('January 16')
      expect(dateTexts[2]).toContain('Unscheduled')
    })

    it('sorts activities within a day by start time', () => {
      render(<ItineraryListView />)
      
      // Museum Visit (9:00 AM) should appear before Restaurant Lunch (2:00 PM)
      const activities = screen.getAllByText(/Museum Visit|Restaurant Lunch/)
      const museumIndex = activities.findIndex(el => el.textContent === 'Museum Visit')
      const restaurantIndex = activities.findIndex(el => el.textContent === 'Restaurant Lunch')
      
      expect(museumIndex).toBeLessThan(restaurantIndex)
    })
  })
})