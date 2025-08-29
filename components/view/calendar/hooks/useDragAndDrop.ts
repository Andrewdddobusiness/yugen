import { useState, useCallback } from 'react';
import { DragStartEvent, DragOverEvent, DragEndEvent } from '@dnd-kit/core';
import { format } from 'date-fns';
import { useParams } from 'next/navigation';
import { useToast } from '@/components/ui/use-toast';
import { useItineraryActivityStore } from '@/store/itineraryActivityStore';
import { useSchedulingContext } from '@/store/timeSchedulingStore';
import { ActivityScheduler, WishlistItem } from '../services/activityScheduler';
import { ScheduledActivity } from './useScheduledActivities';
import { TimeSlot } from '../TimeGrid';

/**
 * useDragAndDrop - Comprehensive drag and drop logic for calendar grid
 * 
 * Features:
 * - Handles drag start, over, and end events
 * - Supports both wishlist items and scheduled activities
 * - Real-time conflict detection during drag
 * - Activity scheduling and rescheduling
 * - Activity resizing functionality
 * 
 * @param days - Array of dates for current calendar view
 * @param timeSlots - Available time slots for positioning
 * @param scheduledActivities - Current scheduled activities
 * @returns Drag handlers, state, and utility functions
 */
export function useDragAndDrop(
  days: Date[],
  timeSlots: TimeSlot[],
  scheduledActivities: ScheduledActivity[]
) {
  const { destinationId } = useParams();
  const { toast } = useToast();
  const { itineraryActivities, setItineraryActivities } = useItineraryActivityStore();
  const schedulingContext = useSchedulingContext();
  
  // Drag state
  const [activeId, setActiveId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [dragOverInfo, setDragOverInfo] = useState<{
    dayIndex: number;
    slotIndex: number;
    hasConflict: boolean;
  } | null>(null);

  // Create scheduler instance
  const scheduler = new ActivityScheduler(
    {
      travelSettings: schedulingContext.travelSettings
    },
    itineraryActivities
  );

  const handleDragStart = useCallback((event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  }, []);

  const handleDragOver = useCallback((event: DragOverEvent) => {
    const { active, over } = event;
    
    if (!over) {
      setDragOverInfo(null);
      return;
    }

    // Parse drop zone ID
    const dropZoneData = over.id.toString().split('-');
    if (dropZoneData.length !== 3 || dropZoneData[0] !== 'slot') {
      setDragOverInfo(null);
      return;
    }

    const dayIndex = parseInt(dropZoneData[1]);
    const slotIndex = parseInt(dropZoneData[2]);
    
    if (isNaN(dayIndex) || isNaN(slotIndex)) {
      setDragOverInfo(null);
      return;
    }

    const targetDate = days[dayIndex];
    const targetSlot = timeSlots[slotIndex];
    
    if (!targetDate || !targetSlot) {
      setDragOverInfo(null);
      return;
    }

    // Check if this is a wishlist item being dragged
    const dragData = active.data?.current;
    let duration = 60; // Default 1 hour
    let excludeId = null;
    let placeData = null;
    
    if (dragData?.type === 'wishlist-item') {
      // For wishlist items, estimate duration intelligently
      if (dragData.item.activity) {
        duration = scheduler.estimateDuration(dragData.item.activity, targetSlot, targetDate);
        placeData = dragData.item.activity;
      } else {
        duration = dragData.item.activity?.duration || 60;
      }
    } else {
      // Find the activity being dragged (existing logic)
      const draggedActivity = scheduledActivities.find(act => act.id === active.id);
      if (!draggedActivity) {
        setDragOverInfo(null);
        return;
      }
      duration = draggedActivity.duration;
      excludeId = active.id as string;
    }

    // Enhanced conflict detection
    const proposedDate = format(targetDate, 'yyyy-MM-dd');
    const proposedStartTime = `${targetSlot.hour.toString().padStart(2, '0')}:${targetSlot.minute.toString().padStart(2, '0')}:00`;
    
    const detectedConflicts = scheduler.detectConflicts(
      proposedDate,
      proposedStartTime,
      duration,
      placeData?.place_id,
      excludeId || undefined
    );
    
    const hasHighSeverityConflicts = detectedConflicts.some(c => c.severity === 'high');
    
    setDragOverInfo({
      dayIndex,
      slotIndex,
      hasConflict: hasHighSeverityConflicts
    });
  }, [days, timeSlots, scheduledActivities, scheduler]);

  const handleWishlistItemDrop = useCallback(async (wishlistItem: WishlistItem, targetDate: Date, targetSlot: TimeSlot) => {
    setIsSaving(true);
    
    const result = await scheduler.scheduleWishlistItem(
      wishlistItem,
      targetDate,
      targetSlot,
      destinationId as string
    );

    if (result.success && result.data) {
      setItineraryActivities([...itineraryActivities, result.data]);
      toast({
        title: "Activity scheduled",
        description: result.message,
      });
    } else {
      toast({
        title: "Failed to schedule",
        description: result.error,
        variant: "destructive"
      });
    }
    
    setIsSaving(false);
  }, [scheduler, destinationId, itineraryActivities, setItineraryActivities, toast]);

  const handleActivityReschedule = useCallback(async (
    activityId: string,
    targetDate: Date,
    targetSlot: TimeSlot,
    currentDuration: number
  ) => {
    setIsSaving(true);
    
    const result = await scheduler.rescheduleActivity(
      activityId,
      targetDate,
      targetSlot,
      currentDuration
    );

    if (result.success) {
      // Update the activity in the store
      const updatedActivity = itineraryActivities.find(
        act => act.itinerary_activity_id === activityId
      );

      if (updatedActivity && result.data) {
        const updatedActivityData = {
          ...updatedActivity,
          date: result.data.date,
          start_time: result.data.startTime,
          end_time: result.data.endTime
        };

        const updatedActivities = itineraryActivities.map(act =>
          act.itinerary_activity_id === activityId ? updatedActivityData : act
        );
        
        setItineraryActivities(updatedActivities);
      }

      toast({
        title: result.data?.wasAdjusted ? "Time adjusted" : "Activity updated",
        description: result.message,
      });
    } else {
      // Revert on error - activities are already in their original state
      toast({
        title: "Failed to save",
        description: result.error,
        variant: "destructive"
      });
    }
    
    setIsSaving(false);
  }, [scheduler, itineraryActivities, setItineraryActivities, toast]);

  const handleDragEnd = useCallback(async (event: DragEndEvent) => {
    setActiveId(null);
    setDragOverInfo(null);
    
    const { active, over } = event;
    
    if (!over) return;

    // Parse drop zone ID to get day and time slot
    const dropZoneData = over.id.toString().split('-');
    if (dropZoneData.length !== 3 || dropZoneData[0] !== 'slot') return;

    const dayIndex = parseInt(dropZoneData[1]);
    const slotIndex = parseInt(dropZoneData[2]);
    
    if (isNaN(dayIndex) || isNaN(slotIndex)) return;

    const targetDate = days[dayIndex];
    const targetSlot = timeSlots[slotIndex];
    
    if (!targetDate || !targetSlot) return;

    // Check if this is a wishlist item being dragged
    const dragData = active.data?.current;
    if (dragData?.type === 'wishlist-item') {
      await handleWishlistItemDrop(dragData.item, targetDate, targetSlot);
      return;
    }

    // Find the activity being dragged (existing logic for scheduled activities)
    const draggedActivity = scheduledActivities.find(act => act.id === active.id);
    if (!draggedActivity) return;

    await handleActivityReschedule(
      active.id as string,
      targetDate,
      targetSlot,
      draggedActivity.duration
    );
  }, [days, timeSlots, scheduledActivities, handleWishlistItemDrop, handleActivityReschedule]);

  const handleResize = useCallback(async (
    activityId: string,
    newDuration: number,
    resizeDirection: 'top' | 'bottom'
  ) => {
    // Find the activity being resized
    const activityToResize = itineraryActivities.find(act => act.itinerary_activity_id === activityId);
    if (!activityToResize || !activityToResize.start_time || !activityToResize.end_time) return;

    setIsSaving(true);
    
    const result = await scheduler.resizeActivity(
      activityId,
      newDuration,
      resizeDirection,
      activityToResize.start_time,
      activityToResize.end_time,
      activityToResize.date
    );

    if (result.success && result.data) {
      // Update activity optimistically
      const updatedActivity = {
        ...activityToResize,
        start_time: result.data.startTime,
        end_time: result.data.endTime
      };

      const updatedActivities = itineraryActivities.map(act =>
        act.itinerary_activity_id === activityId ? updatedActivity : act
      );
      
      setItineraryActivities(updatedActivities);

      toast({
        title: "Activity resized",
        description: result.message,
      });
    } else {
      toast({
        title: "Failed to resize",
        description: result.error,
        variant: "destructive"
      });
    }
    
    setIsSaving(false);
  }, [scheduler, itineraryActivities, setItineraryActivities, toast]);

  // Get the currently active activity for drag overlay
  const activeActivity = scheduledActivities.find(act => act.id === activeId);

  return {
    // Drag handlers
    handleDragStart,
    handleDragOver,
    handleDragEnd,
    handleResize,
    
    // State
    activeId,
    activeActivity,
    dragOverInfo,
    isSaving,
    
    // Utilities
    scheduler
  };
}