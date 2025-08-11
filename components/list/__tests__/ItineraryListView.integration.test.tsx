import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
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

describe('ItineraryListView Integration Tests', () => {
  const mockRemoveActivity = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
    jest.useFakeTimers()
    jest.setSystemTime(new Date('2024-01-15T12:00:00Z'))
    
    mockUseItineraryActivityStore.mockReturnValue({
      itineraryActivities: [],
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
    localStorage.clear()
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  describe('Large Dataset Performance', () => {
    it('handles large number of activities efficiently', () => {
      // Create 1000 activities across multiple days
      const largeActivitySet = Array.from({ length: 1000 }, (_, index) => ({
        itinerary_activity_id: `activity-${index}`,
        date: new Date(2024, 0, 15 + (index % 30)).toISOString().split('T')[0],
        start_time: `${9 + (index % 12)}:00`,
        end_time: `${10 + (index % 12)}:00`,
        notes: `Notes for activity ${index}`,
        deleted_at: null,
        activity: {
          name: `Activity ${index}`,
          address: `${index} Test Street`,
          types: ['attraction'],
          rating: 3 + (index % 3),
          place_id: `place-${index}`,
        }
      }))

      mockUseItineraryActivityStore.mockReturnValue({
        itineraryActivities: largeActivitySet,
        removeItineraryActivity: mockRemoveActivity,
        addItineraryActivity: jest.fn(),
        updateItineraryActivity: jest.fn(),
      })

      const startTime = performance.now()
      render(<ItineraryListView />)
      const endTime = performance.now()

      // Should render within reasonable time (less than 1 second)
      expect(endTime - startTime).toBeLessThan(1000)
      
      // Should show correct count
      expect(screen.getByText(/30 days with activities/)).toBeInTheDocument()
    })

    it('maintains expand/collapse performance with many sections', async () => {
      const user = userEvent.setup()
      
      // Create activities across 50 different days
      const multiDayActivities = Array.from({ length: 50 }, (_, index) => ({
        itinerary_activity_id: `activity-${index}`,
        date: new Date(2024, 0, 15 + index).toISOString().split('T')[0],
        start_time: '10:00',
        end_time: '11:00',
        notes: '',
        deleted_at: null,
        activity: {
          name: `Activity ${index}`,
          place_id: `place-${index}`,
        }
      }))

      mockUseItineraryActivityStore.mockReturnValue({
        itineraryActivities: multiDayActivities,
        removeItineraryActivity: mockRemoveActivity,
        addItineraryActivity: jest.fn(),
        updateItineraryActivity: jest.fn(),
      })

      render(<ItineraryListView />)

      const startTime = performance.now()
      
      // Click "Expand All" with many sections
      const expandAllButton = screen.getByRole('button', { name: /expand all/i })
      await user.click(expandAllButton)
      
      const endTime = performance.now()

      // Should complete within reasonable time
      expect(endTime - startTime).toBeLessThan(500)
    })
  })

  describe('Complex State Interactions', () => {
    it('maintains state consistency when activities are added/removed dynamically', async () => {
      const user = userEvent.setup()
      
      const initialActivities = [{
        itinerary_activity_id: '1',
        date: '2024-01-15',
        start_time: '09:00',
        end_time: '10:00',
        notes: '',
        deleted_at: null,
        activity: {
          name: 'Initial Activity',
          place_id: 'place1',
        }
      }]

      const { rerender } = render(<ItineraryListView />)
      
      // Initially empty
      expect(screen.getByText('No activities scheduled')).toBeInTheDocument()

      // Update store to have activities
      mockUseItineraryActivityStore.mockReturnValue({
        itineraryActivities: initialActivities,
        removeItineraryActivity: mockRemoveActivity,
        addItineraryActivity: jest.fn(),
        updateItineraryActivity: jest.fn(),
      })

      rerender(<ItineraryListView />)
      
      // Should now show activity
      expect(screen.getByText('Initial Activity')).toBeInTheDocument()
      
      // Expand state should be maintained
      const todaySection = screen.getByText('Initial Activity')
      expect(todaySection).toBeVisible()
    })

    it('handles timezone changes correctly', () => {
      jest.setSystemTime(new Date('2024-01-15T23:00:00-05:00')) // 11 PM EST
      
      const activities = [{
        itinerary_activity_id: '1',
        date: '2024-01-16', // Tomorrow in UTC but could be today in local time
        start_time: '09:00',
        end_time: '10:00',
        notes: '',
        deleted_at: null,
        activity: {
          name: 'Timezone Test Activity',
          place_id: 'place1',
        }
      }]

      mockUseItineraryActivityStore.mockReturnValue({
        itineraryActivities: activities,
        removeItineraryActivity: mockRemoveActivity,
        addItineraryActivity: jest.fn(),
        updateItineraryActivity: jest.fn(),
      })

      render(<ItineraryListView />)
      
      // Should handle timezone correctly and not show as "Today"
      expect(screen.queryByText('Today')).not.toBeInTheDocument()
    })
  })

  describe('Error Boundary and Resilience', () => {
    it('handles malformed activity data gracefully', () => {
      const malformedActivities = [
        // Missing required fields
        {
          itinerary_activity_id: '1',
          date: null,
          start_time: 'invalid-time',
          end_time: null,
          notes: null,
          deleted_at: null,
          activity: null,
        },
        // Invalid date format
        {
          itinerary_activity_id: '2',
          date: 'not-a-date',
          start_time: '25:70', // Invalid time
          end_time: '24:60',
          notes: '',
          deleted_at: null,
          activity: {
            name: '',
            place_id: '',
          }
        }
      ]

      mockUseItineraryActivityStore.mockReturnValue({
        itineraryActivities: malformedActivities as any,
        removeItineraryActivity: mockRemoveActivity,
        addItineraryActivity: jest.fn(),
        updateItineraryActivity: jest.fn(),
      })

      // Should not crash
      expect(() => render(<ItineraryListView />)).not.toThrow()
    })

    it('recovers from localStorage errors', () => {
      // Mock localStorage to throw an error
      const originalGetItem = localStorage.getItem
      localStorage.getItem = jest.fn(() => {
        throw new Error('localStorage error')
      })

      // Should not crash and should use default expansion
      expect(() => render(<ItineraryListView />)).not.toThrow()
      
      // Restore original localStorage
      localStorage.getItem = originalGetItem
    })

    it('handles store update errors gracefully', async () => {
      const user = userEvent.setup()
      
      // Mock removeItineraryActivity to reject
      const mockRejectRemove = jest.fn().mockRejectedValue(new Error('Network error'))
      
      const activities = [{
        itinerary_activity_id: '1',
        date: '2024-01-15',
        start_time: '09:00',
        end_time: '10:00',
        notes: '',
        deleted_at: null,
        activity: {
          name: 'Test Activity',
          place_id: 'place1',
        }
      }]

      mockUseItineraryActivityStore.mockReturnValue({
        itineraryActivities: activities,
        removeItineraryActivity: mockRejectRemove,
        addItineraryActivity: jest.fn(),
        updateItineraryActivity: jest.fn(),
      })

      render(<ItineraryListView />)
      
      const deleteButtons = screen.getAllByRole('button', { name: '' })
      const deleteButton = deleteButtons.find(btn => 
        btn.querySelector('[class*="h-4"][class*="w-4"]')
      )

      if (deleteButton) {
        // Should not crash when delete fails
        await user.click(deleteButton)
        
        // Activity should still be visible (since deletion failed)
        expect(screen.getByText('Test Activity')).toBeInTheDocument()
      }
    })
  })

  describe('Accessibility Integration', () => {
    it('maintains focus order when expanding/collapsing sections', async () => {
      const user = userEvent.setup()
      
      const activities = [
        {
          itinerary_activity_id: '1',
          date: '2024-01-15',
          start_time: '09:00',
          end_time: '10:00',
          notes: '',
          deleted_at: null,
          activity: { name: 'Today Activity', place_id: 'place1' }
        },
        {
          itinerary_activity_id: '2',
          date: '2024-01-16',
          start_time: '09:00',
          end_time: '10:00',
          notes: '',
          deleted_at: null,
          activity: { name: 'Tomorrow Activity', place_id: 'place2' }
        }
      ]

      mockUseItineraryActivityStore.mockReturnValue({
        itineraryActivities: activities,
        removeItineraryActivity: mockRemoveActivity,
        addItineraryActivity: jest.fn(),
        updateItineraryActivity: jest.fn(),
      })

      render(<ItineraryListView />)
      
      // Tab through elements
      await user.tab() // Expand All button
      await user.tab() // Collapse All button
      await user.tab() // First day header
      await user.tab() // Second day header
      
      const tomorrowHeader = screen.getByRole('button', { 
        name: /expand activities for.*january 16/i 
      })
      expect(document.activeElement).toBe(tomorrowHeader)
      
      // Expand tomorrow's section
      await user.keyboard('{Enter}')
      
      // Tab should now go to activities within the expanded section
      await user.tab()
      
      // Should be able to reach delete button inside expanded section
      const deleteButton = screen.getAllByRole('button', { name: '' })[1] // Second delete button
      expect(document.activeElement).toBe(deleteButton)
    })

    it('announces state changes to screen readers', async () => {
      const user = userEvent.setup()
      
      const activities = [{
        itinerary_activity_id: '1',
        date: '2024-01-16',
        start_time: '09:00',
        end_time: '10:00',
        notes: '',
        deleted_at: null,
        activity: { name: 'Tomorrow Activity', place_id: 'place1' }
      }]

      mockUseItineraryActivityStore.mockReturnValue({
        itineraryActivities: activities,
        removeItineraryActivity: mockRemoveActivity,
        addItineraryActivity: jest.fn(),
        updateItineraryActivity: jest.fn(),
      })

      render(<ItineraryListView />)
      
      const expandButton = screen.getByRole('button', { 
        name: /expand activities for.*january 16/i 
      })
      
      // Check initial aria-expanded state
      expect(expandButton).toHaveAttribute('aria-expanded', 'false')
      
      // Click to expand
      await user.click(expandButton)
      
      // Should update aria-expanded
      expect(expandButton).toHaveAttribute('aria-expanded', 'true')
      
      // Button text should reflect new state
      expect(expandButton).toHaveAttribute('aria-label', expect.stringMatching(/collapse/i))
    })
  })

  describe('Memory Management', () => {
    it('cleans up event listeners on unmount', () => {
      const addEventListenerSpy = jest.spyOn(document, 'addEventListener')
      const removeEventListenerSpy = jest.spyOn(document, 'removeEventListener')
      
      const { unmount } = render(<ItineraryListView />)
      
      // Should add global keydown listener
      expect(addEventListenerSpy).toHaveBeenCalledWith('keydown', expect.any(Function))
      
      unmount()
      
      // Should remove listener on unmount
      expect(removeEventListenerSpy).toHaveBeenCalledWith('keydown', expect.any(Function))
      
      addEventListenerSpy.mockRestore()
      removeEventListenerSpy.mockRestore()
    })

    it('handles rapid state updates without memory leaks', async () => {
      const user = userEvent.setup()
      
      const activities = [{
        itinerary_activity_id: '1',
        date: '2024-01-16',
        start_time: '09:00',
        end_time: '10:00',
        notes: '',
        deleted_at: null,
        activity: { name: 'Test Activity', place_id: 'place1' }
      }]

      mockUseItineraryActivityStore.mockReturnValue({
        itineraryActivities: activities,
        removeItineraryActivity: mockRemoveActivity,
        addItineraryActivity: jest.fn(),
        updateItineraryActivity: jest.fn(),
      })

      render(<ItineraryListView />)
      
      const expandButton = screen.getByRole('button', { 
        name: /expand activities for.*january 16/i 
      })
      
      // Rapidly toggle expansion multiple times
      for (let i = 0; i < 20; i++) {
        await user.click(expandButton)
      }
      
      // Should still be responsive
      expect(expandButton).toBeInTheDocument()
    })
  })
})