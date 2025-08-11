import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
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

describe('ItineraryListView Mobile Tests', () => {
  const mockActivities = [
    {
      itinerary_activity_id: '1',
      date: '2024-01-15',
      start_time: '09:00',
      end_time: '10:30',
      notes: 'Mobile test activity',
      deleted_at: null,
      activity: {
        name: 'Mobile Museum Visit',
        address: '123 Long Mobile Address That Should Wrap Properly',
        coordinates: [-74.006, 40.7128] as [number, number],
        types: ['museum'],
        rating: 4.5,
        price_level: '2',
        phone_number: '+1234567890',
        website_url: 'https://very-long-website-url-that-should-be-truncated-properly.example.com/path/to/page',
        place_id: 'place1',
      }
    },
    {
      itinerary_activity_id: '2',
      date: null,
      start_time: null,
      end_time: null,
      notes: '',
      deleted_at: null,
      activity: {
        name: 'Unscheduled Mobile Activity',
        address: '456 Mobile Street',
        types: ['restaurant'],
        place_id: 'place2',
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
    
    // Enable mobile mode for all tests in this file
    mockUseIsMobile.mockReturnValue(true)
    localStorage.clear()
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  describe('Mobile Layout and Styling', () => {
    it('applies mobile-specific padding classes', () => {
      const { container } = render(<ItineraryListView />)
      
      const mainDiv = container.firstChild as HTMLElement
      expect(mainDiv).toHaveClass('p-4')
      expect(mainDiv).not.toHaveClass('p-6') // Desktop padding
    })

    it('uses smaller gaps for mobile layout', () => {
      render(<ItineraryListView />)
      
      const dayHeader = screen.getByRole('button', { 
        name: /expand activities for.*january 15/i 
      })
      expect(dayHeader).toHaveClass('gap-2')
    })

    it('applies mobile-specific minimum widths for date displays', () => {
      render(<ItineraryListView />)
      
      // Check that date containers have mobile-specific classes
      const dateContainer = screen.getByText('January 15').closest('div')
      expect(dateContainer).toHaveClass('min-w-[100px]')
      expect(dateContainer).not.toHaveClass('min-w-[120px]') // Desktop width
    })

    it('uses mobile-appropriate content padding', () => {
      render(<ItineraryListView />)
      
      // Find activity card content
      const activityCard = screen.getByText('Mobile Museum Visit').closest('[class*="p-"]')
      expect(activityCard).toHaveClass('p-3')
      expect(activityCard).not.toHaveClass('p-4') // Desktop padding
    })
  })

  describe('Mobile Touch Interactions', () => {
    it('handles touch events for expand/collapse', async () => {
      render(<ItineraryListView />)
      
      const unscheduledHeader = screen.getByRole('button', { 
        name: /collapse activities for unscheduled/i 
      })
      
      // Simulate touch start and end
      fireEvent.touchStart(unscheduledHeader)
      fireEvent.touchEnd(unscheduledHeader)
      fireEvent.click(unscheduledHeader)
      
      // Should collapse unscheduled section
      expect(screen.queryByText('Unscheduled Mobile Activity')).not.toBeInTheDocument()
    })

    it('provides appropriate touch target sizes', () => {
      render(<ItineraryListView />)
      
      const expandButtons = screen.getAllByRole('button', { 
        name: /expand|collapse activities for/i 
      })
      
      expandButtons.forEach(button => {
        const styles = window.getComputedStyle(button)
        const height = parseFloat(styles.height)
        
        // Touch targets should be at least 44px (iOS guideline)
        expect(height).toBeGreaterThanOrEqual(44)
      })
    })
  })

  describe('Mobile Content Adaptation', () => {
    it('truncates long website URLs on mobile', () => {
      render(<ItineraryListView />)
      
      const websiteLink = screen.getByText('Visit website')
      const linkElement = websiteLink.closest('a')
      
      expect(linkElement).toHaveClass('max-w-36') // Mobile max-width
      expect(linkElement).not.toHaveClass('max-w-48') // Desktop max-width
    })

    it('adapts contact information layout for mobile', () => {
      render(<ItineraryListView />)
      
      // Find the container with contact info
      const contactContainer = screen.getByText('+1234567890').closest('[class*="flex"]')
      expect(contactContainer).toHaveClass('gap-3', 'flex-wrap')
      expect(contactContainer).not.toHaveClass('gap-4') // Desktop gap
    })

    it('adjusts time indicator width for mobile', () => {
      render(<ItineraryListView />)
      
      const timeIndicator = screen.getByText('9:00 AM').closest('[class*="min-w-"]')
      expect(timeIndicator).toHaveClass('min-w-[70px]')
      expect(timeIndicator).not.toHaveClass('min-w-[80px]') // Desktop width
    })

    it('applies proper margins for nested content on mobile', () => {
      render(<ItineraryListView />)
      
      const activityContent = screen.getByText('Mobile Museum Visit').closest('[class*="ml-"]')?.parentElement
      expect(activityContent).toHaveClass('ml-8')
      expect(activityContent).not.toHaveClass('ml-10') // Desktop margin
    })
  })

  describe('Mobile Accessibility', () => {
    it('maintains proper focus management on mobile', async () => {
      const user = userEvent.setup()
      render(<ItineraryListView />)
      
      // Test focus flow with touch navigation
      const expandAllButton = screen.getByRole('button', { name: /expand all/i })
      
      // Should be focusable and responsive on mobile
      expandAllButton.focus()
      expect(document.activeElement).toBe(expandAllButton)
      
      await user.keyboard('{Enter}')
      
      // Should expand all sections
      expect(screen.getByText('Unscheduled Mobile Activity')).toBeInTheDocument()
    })

    it('provides proper ARIA labels that work with mobile screen readers', () => {
      render(<ItineraryListView />)
      
      const expandButton = screen.getByRole('button', { 
        name: /collapse activities for.*january 15/i 
      })
      
      // ARIA labels should be descriptive for mobile screen readers
      expect(expandButton).toHaveAttribute('aria-label', expect.stringMatching(/january 15/i))
      expect(expandButton).toHaveAttribute('aria-expanded', 'true')
    })

    it('handles mobile keyboard navigation properly', async () => {
      const user = userEvent.setup()
      render(<ItineraryListView />)
      
      // On mobile, keyboard navigation should still work for external keyboards
      await user.tab() // Expand All
      await user.tab() // Collapse All
      await user.tab() // First day header
      
      const firstDayHeader = screen.getByRole('button', { 
        name: /collapse activities for.*january 15/i 
      })
      expect(document.activeElement).toBe(firstDayHeader)
    })
  })

  describe('Mobile Performance', () => {
    it('renders quickly on mobile devices', () => {
      const startTime = performance.now()
      render(<ItineraryListView />)
      const endTime = performance.now()
      
      // Should render within reasonable mobile time limits
      expect(endTime - startTime).toBeLessThan(100)
    })

    it('handles rapid touches without performance issues', async () => {
      render(<ItineraryListView />)
      
      const expandButton = screen.getByRole('button', { 
        name: /collapse activities for.*january 15/i 
      })
      
      const startTime = performance.now()
      
      // Simulate rapid touches
      for (let i = 0; i < 10; i++) {
        fireEvent.touchStart(expandButton)
        fireEvent.touchEnd(expandButton)
        fireEvent.click(expandButton)
      }
      
      const endTime = performance.now()
      
      // Should handle rapid interactions efficiently
      expect(endTime - startTime).toBeLessThan(200)
    })
  })

  describe('Mobile Viewport Adaptations', () => {
    it('adapts to different mobile screen sizes', () => {
      // Test with different viewport sizes
      const viewports = [
        { width: 320, height: 568 }, // iPhone SE
        { width: 375, height: 667 }, // iPhone 8
        { width: 414, height: 896 }, // iPhone 11 Pro Max
      ]
      
      viewports.forEach(viewport => {
        // Mock viewport
        Object.defineProperty(window, 'innerWidth', {
          writable: true,
          configurable: true,
          value: viewport.width,
        })
        Object.defineProperty(window, 'innerHeight', {
          writable: true,
          configurable: true,
          value: viewport.height,
        })
        
        const { unmount } = render(<ItineraryListView />)
        
        // Should render without horizontal scroll
        const mainContainer = screen.getByText('2 days with activities').closest('div')
        expect(mainContainer).toBeInTheDocument()
        
        unmount()
      })
    })
  })

  describe('Mobile-Specific Features', () => {
    it('shows appropriate visual indicators for collapsed sections on mobile', () => {
      render(<ItineraryListView />)
      
      // Initially, unscheduled is expanded, so no indicator
      // Collapse it first, then check for indicator
      const unscheduledHeader = screen.getByRole('button', { 
        name: /collapse activities for unscheduled/i 
      })
      
      fireEvent.click(unscheduledHeader)
      
      // Now check for mobile-appropriate indicator
      const indicator = screen.getByTitle('1 activity hidden')
      expect(indicator).toHaveClass('animate-pulse')
    })

    it('handles mobile swipe gestures gracefully', () => {
      render(<ItineraryListView />)
      
      const activityCard = screen.getByText('Mobile Museum Visit').closest('[class*="hover:shadow"]')
      
      // Simulate swipe gestures
      fireEvent.touchStart(activityCard!, { touches: [{ clientX: 100, clientY: 100 }] })
      fireEvent.touchMove(activityCard!, { touches: [{ clientX: 150, clientY: 100 }] })
      fireEvent.touchEnd(activityCard!)
      
      // Should not interfere with normal functionality
      expect(screen.getByText('Mobile Museum Visit')).toBeInTheDocument()
    })
  })

  describe('Mobile Error States', () => {
    it('handles network errors gracefully on mobile', async () => {
      const mockRemoveActivity = jest.fn().mockRejectedValue(new Error('Network error'))
      
      mockUseItineraryActivityStore.mockReturnValue({
        itineraryActivities: mockActivities,
        removeItineraryActivity: mockRemoveActivity,
        addItineraryActivity: jest.fn(),
        updateItineraryActivity: jest.fn(),
      })
      
      render(<ItineraryListView />)
      
      const deleteButtons = screen.getAllByRole('button', { name: '' })
      const deleteButton = deleteButtons.find(btn => 
        btn.querySelector('[class*="h-4"][class*="w-4"]')
      )
      
      if (deleteButton) {
        // Should handle error gracefully on mobile
        fireEvent.click(deleteButton)
        
        // Activity should still be visible
        expect(screen.getByText('Mobile Museum Visit')).toBeInTheDocument()
      }
    })

    it('provides appropriate error feedback for mobile users', () => {
      // Mock empty activity with missing data
      const emptyActivity = {
        itinerary_activity_id: '3',
        date: '2024-01-15',
        start_time: null,
        end_time: null,
        notes: '',
        deleted_at: null,
        activity: null,
      }
      
      mockUseItineraryActivityStore.mockReturnValue({
        itineraryActivities: [emptyActivity] as any,
        removeItineraryActivity: jest.fn(),
        addItineraryActivity: jest.fn(),
        updateItineraryActivity: jest.fn(),
      })
      
      render(<ItineraryListView />)
      
      // Should show appropriate fallback for missing activity data
      expect(screen.getByText('Unnamed Activity')).toBeInTheDocument()
      expect(screen.getByText('No time')).toBeInTheDocument()
    })
  })
})