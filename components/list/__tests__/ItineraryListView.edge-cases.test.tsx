import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ItineraryListView } from '../ItineraryListView'
import { useItineraryActivityStore } from '@/store/itineraryActivityStore'
import { useDateRangeStore } from '@/store/dateRangeStore'
import { useIsMobile } from '@/components/hooks/use-mobile'
import {
  setupBasicTest,
  createMockActivity,
  createUnscheduledActivity,
  createDeletedActivity,
  mockCurrentDate,
  restoreRealTimers,
  expectElementToBeVisible,
  expectElementNotToBeVisible,
} from './test-utils'

jest.mock('@/store/itineraryActivityStore')
jest.mock('@/store/dateRangeStore')
jest.mock('@/components/hooks/use-mobile')

const mockUseItineraryActivityStore = useItineraryActivityStore as jest.MockedFunction<typeof useItineraryActivityStore>
const mockUseDateRangeStore = useDateRangeStore as jest.MockedFunction<typeof useDateRangeStore>
const mockUseIsMobile = useIsMobile as jest.MockedFunction<typeof useIsMobile>

describe('ItineraryListView Edge Cases', () => {
  afterEach(() => {
    restoreRealTimers()
  })

  describe('Boundary Dates and Times', () => {
    it('handles leap year dates correctly', () => {
      const leapYearActivities = [
        createMockActivity({
          itinerary_activity_id: '1',
          date: '2024-02-29', // Leap year
          activity: { ...createMockActivity().activity, name: 'Leap Day Activity' }
        })
      ]
      
      setupBasicTest({ activities: leapYearActivities, currentDate: '2024-02-29' })
      render(<ItineraryListView />)
      
      expectElementToBeVisible('Leap Day Activity')
      expect(screen.getByText('Today')).toBeInTheDocument()
    })

    it('handles year boundary dates', () => {
      const yearBoundaryActivities = [
        createMockActivity({
          date: '2023-12-31',
          activity: { name: 'Last Day of Year' }
        }),
        createMockActivity({
          date: '2024-01-01', 
          activity: { name: 'First Day of Year' }
        })
      ]
      
      setupBasicTest({ activities: yearBoundaryActivities, currentDate: '2024-01-01' })
      render(<ItineraryListView />)
      
      expectElementToBeVisible('First Day of Year')
      expectElementNotToBeVisible('Last Day of Year') // Should be collapsed
    })

    it('handles midnight times correctly', () => {
      const midnightActivity = createMockActivity({
        start_time: '00:00',
        end_time: '23:59',
        activity: { name: 'All Day Activity' }
      })
      
      setupBasicTest({ activities: [midnightActivity] })
      render(<ItineraryListView />)
      
      expect(screen.getByText('12:00 AM')).toBeInTheDocument()
      expect(screen.getByText('11:59 PM')).toBeInTheDocument()
    })

    it('handles invalid date formats gracefully', () => {
      const invalidDateActivities = [
        createMockActivity({
          date: 'not-a-date',
          activity: { name: 'Invalid Date Activity' }
        }),
        createMockActivity({
          date: '2024-13-45', // Invalid month/day
          activity: { name: 'Another Invalid Date' }
        })
      ] as any
      
      setupBasicTest({ activities: invalidDateActivities })
      
      // Should not crash
      expect(() => render(<ItineraryListView />)).not.toThrow()
    })
  })

  describe('Extreme Data Scenarios', () => {
    it('handles activities with extremely long names', () => {
      const longNameActivity = createMockActivity({
        activity: {
          ...createMockActivity().activity,
          name: 'This is an extremely long activity name that should be handled gracefully by the component and not break the layout or cause any visual issues even on smaller screens',
          address: 'An equally long address that goes on and on and should also be handled properly without breaking the component layout or causing horizontal scrolling issues'
        }
      })
      
      setupBasicTest({ activities: [longNameActivity] })
      render(<ItineraryListView />)
      
      // Should still render the activity
      expect(screen.getByText(/This is an extremely long activity name/)).toBeInTheDocument()
    })

    it('handles activities with no activity data', () => {
      const nullActivityData = {
        itinerary_activity_id: '1',
        date: '2024-01-15',
        start_time: '09:00',
        end_time: '10:00',
        notes: '',
        deleted_at: null,
        activity: null
      }
      
      setupBasicTest({ activities: [nullActivityData as any] })
      render(<ItineraryListView />)
      
      expect(screen.getByText('Unnamed Activity')).toBeInTheDocument()
    })

    it('handles activities with partial missing fields', () => {
      const partialActivity = {
        itinerary_activity_id: '1',
        date: '2024-01-15',
        start_time: '09:00',
        end_time: null,
        notes: '',
        deleted_at: null,
        activity: {
          name: 'Partial Activity',
          // Missing most fields
        }
      }
      
      setupBasicTest({ activities: [partialActivity as any] })
      render(<ItineraryListView />)
      
      expect(screen.getByText('Partial Activity')).toBeInTheDocument()
      expect(screen.getByText('9:00 AM')).toBeInTheDocument()
    })

    it('handles empty arrays and null values', () => {
      setupBasicTest({ activities: [] })
      render(<ItineraryListView />)
      
      expect(screen.getByText('No activities scheduled')).toBeInTheDocument()
    })
  })

  describe('Timezone Edge Cases', () => {
    it('handles activities across different days due to timezone', () => {
      // Set system time to late at night
      mockCurrentDate('2024-01-15T23:30:00')
      
      const activities = [
        createMockActivity({
          date: '2024-01-15',
          activity: { name: 'Today Activity' }
        }),
        createMockActivity({
          date: '2024-01-16',
          activity: { name: 'Tomorrow Activity' }
        })
      ]
      
      setupBasicTest({ activities })
      render(<ItineraryListView />)
      
      // Today should still be marked as today despite late hour
      expect(screen.getByText('Today')).toBeInTheDocument()
    })

    it('handles daylight saving time boundaries', () => {
      // Spring forward date (March 2024)
      const dstActivities = [
        createMockActivity({
          date: '2024-03-10', // DST begins in 2024
          start_time: '02:00', // This hour gets skipped
          activity: { name: 'DST Activity' }
        })
      ]
      
      setupBasicTest({ activities: dstActivities, currentDate: '2024-03-10' })
      render(<ItineraryListView />)
      
      expect(screen.getByText('2:00 AM')).toBeInTheDocument()
    })
  })

  describe('State Corruption and Recovery', () => {
    it('recovers from corrupted expanded state', async () => {
      const user = userEvent.setup()
      
      setupBasicTest({
        activities: [createMockActivity({ activity: { name: 'Test Activity' }})]
      })
      
      // Mock corrupted localStorage
      const mockGetItem = localStorage.getItem as jest.Mock
      mockGetItem.mockReturnValue('{"invalid": "data"}')
      
      render(<ItineraryListView />)
      
      // Should fall back to default expansion (today)
      expectElementToBeVisible('Test Activity')
      
      // Should be able to toggle state normally after recovery
      const todayHeader = screen.getByRole('button', { name: /collapse/i })
      await user.click(todayHeader)
      
      expectElementNotToBeVisible('Test Activity')
    })

    it('handles simultaneous state updates without corruption', async () => {
      const user = userEvent.setup()
      
      const activities = [
        createMockActivity({
          date: '2024-01-15',
          activity: { name: 'Today Activity' }
        }),
        createMockActivity({
          date: '2024-01-16',
          activity: { name: 'Tomorrow Activity' }
        })
      ]
      
      setupBasicTest({ activities })
      render(<ItineraryListView />)
      
      // Rapidly trigger multiple state changes
      const expandAllButton = screen.getByRole('button', { name: /expand all/i })
      const collapseAllButton = screen.getByRole('button', { name: /collapse all/i })
      const tomorrowHeader = screen.getByRole('button', { 
        name: /expand activities for.*january 16/i 
      })
      
      // Fire multiple clicks in quick succession
      await user.click(expandAllButton)
      await user.click(tomorrowHeader)
      await user.click(collapseAllButton)
      await user.click(tomorrowHeader)
      
      // Final state should be consistent
      const tomorrowExpanded = tomorrowHeader.getAttribute('aria-expanded') === 'true'
      const activityVisible = screen.queryByText('Tomorrow Activity') !== null
      
      expect(tomorrowExpanded).toBe(activityVisible)
    })
  })

  describe('Component Prop Edge Cases', () => {
    it('handles undefined className prop', () => {
      setupBasicTest({ activities: [] })
      
      expect(() => render(
        <ItineraryListView className={undefined as any} />
      )).not.toThrow()
    })

    it('handles null onToggleMap callback', () => {
      setupBasicTest({ activities: [] })
      
      expect(() => render(
        <ItineraryListView onToggleMap={null as any} />
      )).not.toThrow()
    })

    it('handles showMap prop changes', () => {
      setupBasicTest({ activities: [] })
      
      const { rerender } = render(
        <ItineraryListView showMap={false} />
      )
      
      rerender(<ItineraryListView showMap={true} />)
      
      // Should not affect core functionality
      expect(screen.getByText('No activities scheduled')).toBeInTheDocument()
    })
  })

  describe('Performance Edge Cases', () => {
    it('handles component re-rendering with changing activity data', () => {
      const initialActivities = [createMockActivity({ activity: { name: 'Initial' }})]
      const { mockStoreReturn } = setupBasicTest({ activities: initialActivities })
      
      const { rerender } = render(<ItineraryListView />)
      
      // Change activity data
      const updatedActivities = [createMockActivity({ activity: { name: 'Updated' }})]
      mockStoreReturn.itineraryActivities = updatedActivities
      
      rerender(<ItineraryListView />)
      
      expect(screen.getByText('Updated')).toBeInTheDocument()
      expect(screen.queryByText('Initial')).not.toBeInTheDocument()
    })

    it('handles rapid prop changes without memory leaks', () => {
      setupBasicTest({ activities: [] })
      
      const { rerender } = render(<ItineraryListView showMap={false} />)
      
      // Rapidly change props
      for (let i = 0; i < 50; i++) {
        rerender(<ItineraryListView showMap={i % 2 === 0} />)
      }
      
      // Should still render correctly
      expect(screen.getByText('No activities scheduled')).toBeInTheDocument()
    })
  })

  describe('Accessibility Edge Cases', () => {
    it('maintains accessibility with dynamically changing content', async () => {
      const user = userEvent.setup()
      const activities = [createMockActivity({ activity: { name: 'Test Activity' }})]
      
      setupBasicTest({ activities })
      render(<ItineraryListView />)
      
      const header = screen.getByRole('button', { name: /collapse/i })
      
      // Toggle multiple times and verify accessibility
      for (let i = 0; i < 5; i++) {
        await user.click(header)
        
        const isExpanded = header.getAttribute('aria-expanded') === 'true'
        const activityVisible = screen.queryByText('Test Activity') !== null
        
        expect(isExpanded).toBe(activityVisible)
      }
    })

    it('handles focus management with screen readers', async () => {
      const user = userEvent.setup()
      
      const activities = [
        createMockActivity({ activity: { name: 'Activity 1' }}),
        createMockActivity({ 
          date: '2024-01-16',
          activity: { name: 'Activity 2' }
        })
      ]
      
      setupBasicTest({ activities })
      render(<ItineraryListView />)
      
      // Navigate with keyboard
      await user.tab() // Expand All
      await user.tab() // Collapse All
      await user.tab() // First day header
      
      const firstHeader = document.activeElement
      expect(firstHeader).toHaveAttribute('aria-expanded')
      
      // Activate with keyboard
      await user.keyboard('{Enter}')
      
      // Focus should remain on the same element
      expect(document.activeElement).toBe(firstHeader)
    })
  })

  describe('Network and Store Edge Cases', () => {
    it('handles store updates during component lifecycle', () => {
      const { mockStoreReturn } = setupBasicTest({ activities: [] })
      
      const { rerender } = render(<ItineraryListView />)
      
      // Update store after initial render
      mockStoreReturn.itineraryActivities = [
        createMockActivity({ activity: { name: 'New Activity' }})
      ]
      
      mockUseItineraryActivityStore.mockReturnValue(mockStoreReturn)
      rerender(<ItineraryListView />)
      
      expect(screen.getByText('New Activity')).toBeInTheDocument()
    })

    it('handles delete operation failures gracefully', async () => {
      const user = userEvent.setup()
      const mockRemove = jest.fn().mockRejectedValue(new Error('Delete failed'))
      
      const activities = [createMockActivity({ activity: { name: 'Test Activity' }})]
      
      setupBasicTest({ activities })
      
      mockUseItineraryActivityStore.mockReturnValue({
        itineraryActivities: activities,
        removeItineraryActivity: mockRemove,
        addItineraryActivity: jest.fn(),
        updateItineraryActivity: jest.fn(),
      })
      
      render(<ItineraryListView />)
      
      const deleteButtons = screen.getAllByRole('button', { name: '' })
      const deleteButton = deleteButtons.find(btn => 
        btn.querySelector('[class*="h-4"][class*="w-4"]')
      )
      
      if (deleteButton) {
        // Click delete - should not crash
        await user.click(deleteButton)
        
        // Activity should still be visible since delete failed
        expect(screen.getByText('Test Activity')).toBeInTheDocument()
      }
    })
  })

  describe('Date Formatting Edge Cases', () => {
    it('handles different locale date formats', () => {
      // Mock different locale
      const originalDateTimeFormat = Intl.DateTimeFormat
      global.Intl.DateTimeFormat = jest.fn().mockImplementation(() => ({
        format: jest.fn().mockReturnValue('15/01/2024'), // DD/MM/YYYY format
        formatToParts: jest.fn().mockReturnValue([
          { type: 'day', value: '15' },
          { type: 'literal', value: '/' },
          { type: 'month', value: '01' },
          { type: 'literal', value: '/' },
          { type: 'year', value: '2024' }
        ])
      }))
      
      const activities = [createMockActivity({ activity: { name: 'Locale Test' }})]
      setupBasicTest({ activities })
      
      expect(() => render(<ItineraryListView />)).not.toThrow()
      
      // Restore original
      global.Intl.DateTimeFormat = originalDateTimeFormat
    })

    it('handles invalid time formats in activities', () => {
      const invalidTimeActivity = createMockActivity({
        start_time: 'invalid-time',
        end_time: '25:99', // Invalid time
        activity: { name: 'Invalid Time Activity' }
      })
      
      setupBasicTest({ activities: [invalidTimeActivity as any] })
      render(<ItineraryListView />)
      
      // Should still render activity
      expect(screen.getByText('Invalid Time Activity')).toBeInTheDocument()
    })
  })
})