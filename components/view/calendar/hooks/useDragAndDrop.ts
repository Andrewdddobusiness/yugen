import { useState, useCallback } from 'react';
import { DragStartEvent, DragOverEvent, DragEndEvent } from '@dnd-kit/core';
import { format } from 'date-fns';
import { useParams } from 'next/navigation';
import { useToast } from '@/components/ui/use-toast';
import { useItineraryActivityStore } from '@/store/itineraryActivityStore';
import { useSchedulingContext } from '@/store/timeSchedulingStore';
import { ActivityScheduler, SchedulerWishlistItem } from '../services/activityScheduler';
import { ScheduledActivity } from './useScheduledActivities';
import { TimeSlot } from '../TimeGrid';
import { findNearestValidSlot, timeToMinutes } from '@/utils/calendar/collisionDetection';

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
    spanSlots: number;
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
    const dragType = (event.active.data?.current as any)?.type;
    if (dragType !== 'scheduled-activity') {
      setActiveId(null);
      return;
    }
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
    let spanSlots = 1;
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
      spanSlots = Math.max(
        1,
        Math.ceil(duration / schedulingContext.config.interval)
      );
    } else if (dragData?.type === 'itinerary-activity') {
      const itineraryActivity = dragData.item;

      const durationFromTimes =
        itineraryActivity?.start_time && itineraryActivity?.end_time
          ? (() => {
              const [sh, sm] = itineraryActivity.start_time.split(':').map(Number);
              const [eh, em] = itineraryActivity.end_time.split(':').map(Number);
              return (eh * 60 + em) - (sh * 60 + sm);
            })()
          : null;

      duration =
        durationFromTimes ??
        itineraryActivity?.activity?.duration ??
        (itineraryActivity?.activity
          ? scheduler.estimateDuration(
              itineraryActivity.activity,
              targetSlot,
              targetDate
            )
          : 60);

      placeData = itineraryActivity?.activity ?? null;
      excludeId = itineraryActivity?.itinerary_activity_id ?? (active.id as string);
      spanSlots = Math.max(
        1,
        Math.ceil(duration / schedulingContext.config.interval)
      );
    } else {
      // Find the activity being dragged (existing logic)
      const draggedActivity = scheduledActivities.find(act => act.id === active.id);
      if (!draggedActivity) {
        setDragOverInfo(null);
        return;
      }
      duration = draggedActivity.duration;
      spanSlots = Math.max(1, draggedActivity.position.span);
      excludeId = active.id as string;
    }

    spanSlots = Math.max(1, Math.min(spanSlots, timeSlots.length - slotIndex));

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
      spanSlots,
      hasConflict: hasHighSeverityConflicts
    });
  }, [days, timeSlots, scheduledActivities, scheduler, schedulingContext.config.interval]);

  const handleWishlistItemDrop = useCallback(async (wishlistItem: SchedulerWishlistItem, targetDate: Date, targetSlot: TimeSlot) => {
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
    const currentActivities = useItineraryActivityStore.getState().itineraryActivities;
    const previousActivity = currentActivities.find(
      (act) => act.itinerary_activity_id === activityId
    );
    if (!previousActivity) return;

    const previousTimes = {
      date: previousActivity.date,
      start_time: previousActivity.start_time,
      end_time: previousActivity.end_time,
    };

    const newDate = format(targetDate, 'yyyy-MM-dd');
    const proposedStartTime = `${targetSlot.hour.toString().padStart(2, '0')}:${targetSlot.minute.toString().padStart(2, '0')}:00`;

    // Match the scheduler's "nearest valid slot" logic so the UI doesn't jump twice.
    const existingActivities = currentActivities
      .filter((act) => act.date && act.start_time && act.end_time)
      .map((act) => ({
        id: act.itinerary_activity_id,
        date: act.date as string,
        startTime: act.start_time as string,
        endTime: act.end_time as string,
      }));

    const optimisticSlot = findNearestValidSlot(
      proposedStartTime,
      currentDuration,
      newDate,
      existingActivities,
      activityId
    );

    if (!optimisticSlot) {
      toast({
        title: 'Could not move activity',
        description: 'Could not find an available time slot for this activity.',
        variant: 'destructive',
      });
      return;
    }

    const optimisticPatch = {
      date: newDate,
      start_time: optimisticSlot.startTime,
      end_time: optimisticSlot.endTime,
    };

    // Optimistic UI: update local store immediately.
    const activitiesAfterOptimistic = useItineraryActivityStore
      .getState()
      .itineraryActivities.map((act) =>
        act.itinerary_activity_id === activityId ? { ...act, ...optimisticPatch } : act
      );
    setItineraryActivities(activitiesAfterOptimistic);

    setIsSaving(true);

    const result = await scheduler.rescheduleActivity(
      activityId,
      targetDate,
      targetSlot,
      currentDuration
    );

    if (result.success) {
      if (result.data) {
        const activitiesAfterCommit = useItineraryActivityStore
          .getState()
          .itineraryActivities.map((act) =>
            act.itinerary_activity_id === activityId
              ? {
                  ...act,
                  date: result.data.date,
                  start_time: result.data.startTime,
                  end_time: result.data.endTime,
                }
              : act
          );
        setItineraryActivities(activitiesAfterCommit);
      }

      toast({
        title: result.data?.wasAdjusted ? "Time adjusted" : "Activity updated",
        description: result.message,
      });
    } else {
      // Revert on error
      const activitiesAfterRevert = useItineraryActivityStore
        .getState()
        .itineraryActivities.map((act) =>
          act.itinerary_activity_id === activityId ? { ...act, ...previousTimes } : act
        );
      setItineraryActivities(activitiesAfterRevert);

      toast({
        title: "Failed to save",
        description: result.error,
        variant: "destructive"
      });
    }
    
    setIsSaving(false);
  }, [scheduler, setItineraryActivities, toast]);

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
    if (dragData?.type === 'itinerary-activity') {
      const itineraryActivity = dragData.item;

      const durationFromTimes =
        itineraryActivity?.start_time && itineraryActivity?.end_time
          ? (() => {
              const [sh, sm] = itineraryActivity.start_time.split(':').map(Number);
              const [eh, em] = itineraryActivity.end_time.split(':').map(Number);
              return (eh * 60 + em) - (sh * 60 + sm);
            })()
          : null;

      const duration =
        durationFromTimes ??
        itineraryActivity?.activity?.duration ??
        (itineraryActivity?.activity
          ? scheduler.estimateDuration(
              itineraryActivity.activity,
              targetSlot,
              targetDate
            )
          : 60);

      await handleActivityReschedule(
        (active.id as string) ?? itineraryActivity?.itinerary_activity_id,
        targetDate,
        targetSlot,
        duration || 60
      );
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
  }, [days, timeSlots, scheduledActivities, handleWishlistItemDrop, handleActivityReschedule, scheduler]);

  const handleResize = useCallback(async (
    activityId: string,
    newDuration: number,
    resizeDirection: 'top' | 'bottom'
  ) => {
    const minutesToTimeString = (minutes: number) =>
      `${Math.floor(minutes / 60).toString().padStart(2, '0')}:${(minutes % 60)
        .toString()
        .padStart(2, '0')}:00`;

    const currentActivities = useItineraryActivityStore.getState().itineraryActivities;
    const previousActivity = currentActivities.find(
      (act) => act.itinerary_activity_id === activityId
    );
    if (!previousActivity || !previousActivity.start_time || !previousActivity.end_time) return;

    const previousTimes = {
      start_time: previousActivity.start_time,
      end_time: previousActivity.end_time,
    };

    const startMinutes = timeToMinutes(previousActivity.start_time as string);
    const endMinutes = timeToMinutes(previousActivity.end_time as string);

    let optimisticStartTime = previousActivity.start_time as string;
    let optimisticEndTime = previousActivity.end_time as string;

    if (resizeDirection === 'bottom') {
      optimisticEndTime = minutesToTimeString(startMinutes + newDuration);
    } else {
      optimisticStartTime = minutesToTimeString(endMinutes - newDuration);
    }

    // Optimistic UI: update local store immediately so the block doesn't snap back.
    const activitiesAfterOptimistic = useItineraryActivityStore
      .getState()
      .itineraryActivities.map((act) =>
        act.itinerary_activity_id === activityId
          ? { ...act, start_time: optimisticStartTime, end_time: optimisticEndTime }
          : act
      );
    setItineraryActivities(activitiesAfterOptimistic);

    setIsSaving(true);

    const result = await scheduler.resizeActivity(
      activityId,
      newDuration,
      resizeDirection,
      previousTimes.start_time as string,
      previousTimes.end_time as string,
      previousActivity.date as string
    );

    if (result.success && result.data) {
      const activitiesAfterCommit = useItineraryActivityStore
        .getState()
        .itineraryActivities.map((act) =>
          act.itinerary_activity_id === activityId
            ? {
                ...act,
                start_time: result.data.startTime,
                end_time: result.data.endTime,
              }
            : act
        );
      setItineraryActivities(activitiesAfterCommit);

      toast({
        title: "Activity resized",
        description: result.message,
      });
    } else {
      // Revert on error
      const activitiesAfterRevert = useItineraryActivityStore
        .getState()
        .itineraryActivities.map((act) =>
          act.itinerary_activity_id === activityId ? { ...act, ...previousTimes } : act
        );
      setItineraryActivities(activitiesAfterRevert);

      toast({
        title: "Failed to resize",
        description: result.error,
        variant: "destructive"
      });
    }

    setIsSaving(false);
  }, [scheduler, setItineraryActivities, toast]);

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
