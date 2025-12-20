import { format } from 'date-fns';
import { setItineraryActivityDateTimes, addItineraryActivity } from '@/actions/supabase/actions';
import { 
  findNearestValidSlot, 
  detectConflicts,
  timeToMinutes
} from '@/utils/calendar/collisionDetection';
import { estimateActivityDuration } from '@/utils/calendar/durationEstimation';
import { IItineraryActivity } from '@/store/itineraryActivityStore';
import { TimeSlot } from '../TimeGrid';

/**
 * Service for handling activity scheduling operations
 * 
 * Handles:
 * - Activity positioning and time calculations
 * - Conflict detection and resolution
 * - Database updates for scheduled activities
 * - Duration estimation for new activities
 */

export interface ActivitySchedulingContext {
  travelSettings: {
    showTravelTime: boolean;
    bufferMinutes: number;
  };
}

export interface SchedulerWishlistItem {
  placeId: string;
  activity: any;
  notes?: string;
  cost?: number;
}

export interface SchedulingResult {
  success: boolean;
  message?: string;
  data?: any;
  error?: string;
}

export class ActivityScheduler {
  constructor(
    private context: ActivitySchedulingContext,
    private itineraryActivities: IItineraryActivity[]
  ) {}

  /**
   * Schedules a wishlist item to a specific date and time slot
   */
  async scheduleWishlistItem(
    wishlistItem: SchedulerWishlistItem,
    targetDate: Date,
    targetSlot: TimeSlot,
    destinationId: string
  ): Promise<SchedulingResult> {
    if (!wishlistItem.activity) {
      return {
        success: false,
        error: "This wishlist item is missing activity details."
      };
    }

    const newDate = format(targetDate, 'yyyy-MM-dd');
    const startTime = `${targetSlot.hour.toString().padStart(2, '0')}:${targetSlot.minute.toString().padStart(2, '0')}:00`;
    
    // Determine duration - use activity suggestion or default to 1 hour
    const durationMinutes = wishlistItem.activity.duration || 60;
    const endTimeMinutes = (targetSlot.hour * 60 + targetSlot.minute) + durationMinutes;
    const endTime = `${Math.floor(endTimeMinutes / 60).toString().padStart(2, '0')}:${(endTimeMinutes % 60).toString().padStart(2, '0')}:00`;

    try {
      const result = await addItineraryActivity(
        wishlistItem.placeId,
        wishlistItem.activity.activity_id || null,
        newDate,
        startTime,
        endTime,
        destinationId
      );

      if (result.success && result.data) {
        const newActivity = {
          itinerary_activity_id: result.data.itinerary_activity_id,
          itinerary_id: result.data.itinerary_id,
          itinerary_destination_id: result.data.itinerary_destination_id,
          place_id: wishlistItem.placeId,
          activity_id: wishlistItem.activity.activity_id,
          date: newDate,
          start_time: startTime,
          end_time: endTime,
          notes: wishlistItem.notes || null,
          is_booked: false,
          booking_reference: null,
          cost: wishlistItem.cost || null,
          order_in_day: 0,
          deleted_at: null,
          activity: wishlistItem.activity,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };

        return {
          success: true,
          message: `${wishlistItem.activity.name} has been added to your itinerary.`,
          data: newActivity
        };
      } else {
        return {
          success: false,
          error: result.error || result.message || 'Failed to schedule activity'
        };
      }
    } catch (error) {
      console.error('Error scheduling wishlist item:', error);
      return {
        success: false,
        error: 'Could not add this item to your itinerary. Please try again.'
      };
    }
  }

  /**
   * Reschedules an existing activity to a new time slot
   */
  async rescheduleActivity(
    activityId: string,
    targetDate: Date,
    targetSlot: TimeSlot,
    currentDuration: number
  ): Promise<SchedulingResult> {
    const newDate = format(targetDate, 'yyyy-MM-dd');
    const proposedStartTime = `${targetSlot.hour.toString().padStart(2, '0')}:${targetSlot.minute.toString().padStart(2, '0')}:00`;
    
    // Check for collisions
    const existingActivities = this.itineraryActivities
      .filter(act => act.date && act.start_time && act.end_time)
      .map(act => ({
        id: act.itinerary_activity_id,
        date: act.date as string,
        startTime: act.start_time as string,
        endTime: act.end_time as string
      }));
    
    const validSlot = findNearestValidSlot(
      proposedStartTime,
      currentDuration,
      newDate,
      existingActivities,
      activityId
    );
    
    if (!validSlot) {
      return {
        success: false,
        error: "Could not find an available time slot for this activity."
      };
    }
    
    const { startTime: newStartTime, endTime: newEndTime } = validSlot;
    
    try {
      const result = await setItineraryActivityDateTimes(
        activityId,
        newDate,
        newStartTime,
        newEndTime
      );

      if (result.success) {
        return {
          success: true,
          message: proposedStartTime !== newStartTime 
            ? "Activity time was adjusted to avoid conflicts."
            : "Activity moved successfully",
          data: {
            date: newDate,
            startTime: newStartTime,
            endTime: newEndTime,
            wasAdjusted: proposedStartTime !== newStartTime
          }
        };
      } else {
        return {
          success: false,
          error: result.message || 'Failed to update activity'
        };
      }
    } catch (error) {
      console.error('Error saving activity:', error);
      return {
        success: false,
        error: 'Could not save the activity position. Please try again.'
      };
    }
  }

  /**
   * Resizes an activity to a new duration
   */
  async resizeActivity(
    activityId: string,
    newDuration: number,
    resizeDirection: 'top' | 'bottom',
    currentStartTime: string,
    currentEndTime: string,
    activityDate: string
  ): Promise<SchedulingResult> {
    const startMinutes = timeToMinutes(currentStartTime);
    const endMinutes = timeToMinutes(currentEndTime);
    
    let newStartTime: string;
    let newEndTime: string;
    
    if (resizeDirection === 'bottom') {
      // Resizing the end time
      const newEndMinutes = startMinutes + newDuration;
      newStartTime = currentStartTime;
      newEndTime = `${Math.floor(newEndMinutes / 60).toString().padStart(2, '0')}:${(newEndMinutes % 60).toString().padStart(2, '0')}:00`;
    } else {
      // Resizing the start time
      const newStartMinutes = endMinutes - newDuration;
      newStartTime = `${Math.floor(newStartMinutes / 60).toString().padStart(2, '0')}:${(newStartMinutes % 60).toString().padStart(2, '0')}:00`;
      newEndTime = currentEndTime;
    }

    try {
      const result = await setItineraryActivityDateTimes(
        activityId,
        activityDate,
        newStartTime,
        newEndTime
      );

      if (result.success) {
        return {
          success: true,
          message: `Duration updated to ${Math.floor(newDuration / 60)}h ${newDuration % 60}m`,
          data: {
            startTime: newStartTime,
            endTime: newEndTime
          }
        };
      } else {
        return {
          success: false,
          error: result.message || 'Failed to resize activity'
        };
      }
    } catch (error) {
      console.error('Error resizing activity:', error);
      return {
        success: false,
        error: 'Could not resize the activity. Please try again.'
      };
    }
  }

  /**
   * Detects conflicts for a proposed activity placement
   */
  detectConflicts(
    proposedDate: string,
    proposedStartTime: string,
    duration: number,
    placeId?: string,
    excludeId?: string
  ) {
    const proposedEndTime = `${Math.floor((timeToMinutes(proposedStartTime) + duration) / 60).toString().padStart(2, '0')}:${((timeToMinutes(proposedStartTime) + duration) % 60).toString().padStart(2, '0')}:00`;
    
    const existingActivities = this.itineraryActivities
      .filter(act => act.date && act.start_time && act.end_time)
      .map(act => ({
        id: act.itinerary_activity_id,
        date: act.date as string,
        startTime: act.start_time as string,
        endTime: act.end_time as string
      }));
    
    return detectConflicts(
      {
        date: proposedDate,
        startTime: proposedStartTime,
        endTime: proposedEndTime,
        placeId,
        duration
      },
      existingActivities,
      undefined, // business hours - could be enhanced later
      this.context.travelSettings.showTravelTime ? this.context.travelSettings.bufferMinutes : undefined,
      excludeId
    );
  }

  /**
   * Estimates duration for a new activity
   */
  estimateDuration(
    activity: any,
    targetSlot: TimeSlot,
    targetDate: Date
  ): number {
    if (activity.duration) {
      return activity.duration;
    }

    const estimate = estimateActivityDuration(
      {
        place_id: activity.place_id,
        types: activity.types || [],
        name: activity.name,
        rating: activity.rating,
        user_ratings_total: activity.user_ratings_total
      },
      {
        timeOfDay: `${targetSlot.hour}:${targetSlot.minute}`,
        isWeekend: targetDate.getDay() === 0 || targetDate.getDay() === 6
      }
    );

    return estimate.duration;
  }
}