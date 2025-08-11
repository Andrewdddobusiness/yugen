import React from 'react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ItineraryListView } from '../ItineraryListView'
import { useItineraryActivityStore } from '@/store/itineraryActivityStore'
import { useDateRangeStore } from '@/store/dateRangeStore'
import { useIsMobile } from '@/components/hooks/use-mobile'

jest.mock('@/store/itineraryActivityStore')
jest.mock('@/store/dateRangeStore')
jest.mock('@/components/hooks/use-mobile')

const mockUseItineraryActivityStore = useItineraryActivityStore as jest.MockedFunction<typeof useItineraryActivityStore>
const mockUseDateRangeStore = useDateRangeStore as jest.MockedFunction<typeof useDateRangeStore>
const mockUseIsMobile = useIsMobile as jest.MockedFunction<typeof useIsMobile>

describe('ItineraryListView localStorage Tests', () => {
  const mockActivities = [
    {
      itinerary_activity_id: '1',
      date: '2024-01-15',
      start_time: '09:00',
      end_time: '10:30',
      notes: '',
      deleted_at: null,
      activity: {
        name: 'Today Activity',
        place_id: 'place1',
      }
    },
    {
      itinerary_activity_id: '2',
      date: '2024-01-16',
      start_time: '14:00',
      end_time: '16:00',
      notes: '',
      deleted_at: null,
      activity: {
        name: 'Tomorrow Activity',
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
        place_id: 'place3',
      }
    },
  ]

  beforeEach(() => {
    jest.clearAllMocks()
    jest.useFakeTimers()
    jest.setSystemTime(new Date('2024-01-15T12:00:00Z'))
    
    mockUseItineraryActivityStore.mockReturnValue({
      itineraryActivities: mockActivities,
      removeItineraryActivity: jest.fn(),
      addItineraryActivity: jest.fn(),
      updateItineraryActivity: jest.fn(),
    })
    
    mockUseDateRangeStore.mockReturnValue({
      startDate: '2024-01-01',
      endDate: '2024-01-31',
      setDateRange: jest.fn(),
    })
    
    mockUseIsMobile.mockReturnValue(false)
    localStorage.clear()
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  describe('localStorage Persistence', () => {
    it('saves initial default expansion state to localStorage', () => {
      render(<ItineraryListView />)
      
      // Should save default expanded days (today + unscheduled)
      expect(localStorage.setItem).toHaveBeenCalledWith(
        'expandedDays-test-itinerary-id',
        JSON.stringify(['2024-01-15', 'unscheduled'])
      )
    })

    it('updates localStorage when expanding a section', async () => {
      const user = userEvent.setup()
      render(<ItineraryListView />)
      
      // Clear previous calls
      jest.clearAllMocks()
      
      // Expand tomorrow's section
      const tomorrowHeader = screen.getByRole('button', { 
        name: /expand activities for.*january 16/i 
      })
      await user.click(tomorrowHeader)
      
      // Should save expanded state including the new day
      expect(localStorage.setItem).toHaveBeenCalledWith(
        'expandedDays-test-itinerary-id',
        expect.stringMatching(/2024-01-16/)
      )
    })

    it('updates localStorage when collapsing a section', async () => {
      const user = userEvent.setup()
      render(<ItineraryListView />)
      
      // Clear previous calls
      jest.clearAllMocks()
      
      // Collapse today's section (which is expanded by default)
      const todayHeader = screen.getByRole('button', { 
        name: /collapse activities for.*january 15/i 
      })
      await user.click(todayHeader)
      
      // Should save state without today
      expect(localStorage.setItem).toHaveBeenCalledWith(
        'expandedDays-test-itinerary-id',
        JSON.stringify(['unscheduled'])
      )
    })

    it('updates localStorage when using Expand All', async () => {
      const user = userEvent.setup()
      render(<ItineraryListView />)
      
      jest.clearAllMocks()
      
      const expandAllButton = screen.getByRole('button', { name: /expand all/i })
      await user.click(expandAllButton)
      
      // Should save all available days
      expect(localStorage.setItem).toHaveBeenCalledWith(
        'expandedDays-test-itinerary-id',
        expect.stringMatching(/2024-01-15.*2024-01-16.*unscheduled|unscheduled.*2024-01-15.*2024-01-16/)
      )
    })

    it('updates localStorage when using Collapse All', async () => {
      const user = userEvent.setup()
      render(<ItineraryListView />)
      
      jest.clearAllMocks()
      
      const collapseAllButton = screen.getByRole('button', { name: /collapse all/i })
      await user.click(collapseAllButton)
      
      // Should save empty state
      expect(localStorage.setItem).toHaveBeenCalledWith(
        'expandedDays-test-itinerary-id',
        JSON.stringify([])
      )
    })
  })

  describe('localStorage Restoration', () => {
    it('restores previously expanded state from localStorage', () => {
      const mockGetItem = localStorage.getItem as jest.Mock
      mockGetItem.mockReturnValue(JSON.stringify(['2024-01-16', 'unscheduled']))
      
      render(<ItineraryListView />)
      
      // Tomorrow's activity should be visible
      expect(screen.getByText('Tomorrow Activity')).toBeInTheDocument()
      // Unscheduled should be visible
      expect(screen.getByText('Unscheduled Activity')).toBeInTheDocument()
      // Today should be collapsed (not in saved state)
      expect(screen.queryByText('Today Activity')).not.toBeInTheDocument()
    })

    it('handles partial restoration correctly', () => {
      const mockGetItem = localStorage.getItem as jest.Mock
      mockGetItem.mockReturnValue(JSON.stringify(['2024-01-16'])) // Only tomorrow
      
      render(<ItineraryListView />)
      
      // Only tomorrow should be expanded
      expect(screen.getByText('Tomorrow Activity')).toBeInTheDocument()
      // Today and unscheduled should be collapsed
      expect(screen.queryByText('Today Activity')).not.toBeInTheDocument()
      expect(screen.queryByText('Unscheduled Activity')).not.toBeInTheDocument()
    })

    it('handles empty localStorage array', () => {
      const mockGetItem = localStorage.getItem as jest.Mock
      mockGetItem.mockReturnValue(JSON.stringify([]))
      
      render(<ItineraryListView />)
      
      // All sections should be collapsed
      expect(screen.queryByText('Today Activity')).not.toBeInTheDocument()
      expect(screen.queryByText('Tomorrow Activity')).not.toBeInTheDocument()
      expect(screen.queryByText('Unscheduled Activity')).not.toBeInTheDocument()
    })
  })

  describe('localStorage Error Handling', () => {
    it('falls back to defaults when localStorage.getItem throws', () => {
      const mockGetItem = localStorage.getItem as jest.Mock
      mockGetItem.mockImplementation(() => {
        throw new Error('localStorage not available')
      })
      
      // Should not crash and should use defaults
      render(<ItineraryListView />)
      
      // Today and unscheduled should be expanded by default
      expect(screen.getByText('Today Activity')).toBeInTheDocument()
      expect(screen.getByText('Unscheduled Activity')).toBeInTheDocument()
      expect(screen.queryByText('Tomorrow Activity')).not.toBeInTheDocument()
    })

    it('falls back to defaults when localStorage contains invalid JSON', () => {
      const mockGetItem = localStorage.getItem as jest.Mock
      mockGetItem.mockReturnValue('invalid-json-string')
      
      render(<ItineraryListView />)
      
      // Should use defaults despite invalid JSON
      expect(screen.getByText('Today Activity')).toBeInTheDocument()
      expect(screen.getByText('Unscheduled Activity')).toBeInTheDocument()
      expect(screen.queryByText('Tomorrow Activity')).not.toBeInTheDocument()
    })

    it('handles localStorage.setItem throwing errors gracefully', async () => {
      const user = userEvent.setup()
      const mockSetItem = localStorage.setItem as jest.Mock
      mockSetItem.mockImplementation(() => {
        throw new Error('Storage quota exceeded')
      })
      
      render(<ItineraryListView />)
      
      // Should not crash when trying to save state
      const tomorrowHeader = screen.getByRole('button', { 
        name: /expand activities for.*january 16/i 
      })
      
      // This should not throw despite localStorage.setItem failing
      expect(async () => await user.click(tomorrowHeader)).not.toThrow()
      
      // The UI should still work
      expect(screen.getByText('Tomorrow Activity')).toBeInTheDocument()
    })

    it('handles non-array data in localStorage', () => {
      const mockGetItem = localStorage.getItem as jest.Mock
      mockGetItem.mockReturnValue(JSON.stringify({ not: 'an array' }))
      
      render(<ItineraryListView />)
      
      // Should fall back to defaults when saved data is not an array
      expect(screen.getByText('Today Activity')).toBeInTheDocument()
      expect(screen.getByText('Unscheduled Activity')).toBeInTheDocument()
    })
  })

  describe('Different Itinerary IDs', () => {
    it('uses different localStorage keys for different itineraries', () => {
      // Mock different itinerary ID
      require('next/navigation').__setMockParams({
        itineraryId: 'different-itinerary-id',
        destinationId: 'test-destination-id',
      })
      
      render(<ItineraryListView />)
      
      // Should use the different itinerary ID in localStorage key
      expect(localStorage.setItem).toHaveBeenCalledWith(
        'expandedDays-different-itinerary-id',
        expect.any(String)
      )
    })

    it('does not share state between different itineraries', () => {
      const mockGetItem = localStorage.getItem as jest.Mock
      
      // Mock localStorage to have data for a different itinerary
      mockGetItem.mockImplementation((key) => {
        if (key === 'expandedDays-other-itinerary') {
          return JSON.stringify(['2024-01-16'])
        }
        return null // No data for current itinerary
      })
      
      render(<ItineraryListView />)
      
      // Should use defaults, not data from other itinerary
      expect(screen.getByText('Today Activity')).toBeInTheDocument()
      expect(screen.getByText('Unscheduled Activity')).toBeInTheDocument()
      expect(screen.queryByText('Tomorrow Activity')).not.toBeInTheDocument()
    })
  })

  describe('Server-Side Rendering Compatibility', () => {
    it('handles server-side rendering when window is undefined', () => {
      // Mock window to be undefined (SSR environment)
      const originalWindow = global.window
      
      // @ts-ignore
      delete global.window
      
      // Should not crash during SSR
      expect(() => render(<ItineraryListView />)).not.toThrow()
      
      // Restore window
      global.window = originalWindow
    })

    it('does not try to access localStorage during SSR', () => {
      const originalWindow = global.window
      
      // @ts-ignore
      delete global.window
      
      render(<ItineraryListView />)
      
      // localStorage should not have been called during SSR
      expect(localStorage.getItem).not.toHaveBeenCalled()
      
      global.window = originalWindow
    })
  })

  describe('Race Conditions', () => {
    it('handles rapid expansion state changes correctly', async () => {
      const user = userEvent.setup()
      render(<ItineraryListView />)
      
      const tomorrowHeader = screen.getByRole('button', { 
        name: /expand activities for.*january 16/i 
      })
      
      // Rapidly click the header multiple times
      await user.click(tomorrowHeader)
      await user.click(tomorrowHeader)
      await user.click(tomorrowHeader)
      await user.click(tomorrowHeader)
      
      // Final state should be consistent
      const isVisible = screen.queryByText('Tomorrow Activity')
      const isExpanded = tomorrowHeader.getAttribute('aria-expanded') === 'true'
      
      // Visual state should match ARIA state
      expect(Boolean(isVisible)).toBe(isExpanded)
    })

    it('maintains localStorage consistency during rapid changes', async () => {
      const user = userEvent.setup()
      render(<ItineraryListView />)
      
      jest.clearAllMocks()
      
      // Rapid expand/collapse operations
      const expandAllButton = screen.getByRole('button', { name: /expand all/i })
      const collapseAllButton = screen.getByRole('button', { name: /collapse all/i })
      
      await user.click(expandAllButton)
      await user.click(collapseAllButton)
      await user.click(expandAllButton)
      
      // Should have called localStorage.setItem for each operation
      expect(localStorage.setItem).toHaveBeenCalledTimes(3)
      
      // Final call should reflect expand all state
      const lastCall = (localStorage.setItem as jest.Mock).mock.calls.slice(-1)[0]
      const finalState = JSON.parse(lastCall[1])
      expect(finalState).toContain('2024-01-15')
      expect(finalState).toContain('2024-01-16')
      expect(finalState).toContain('unscheduled')
    })
  })
})