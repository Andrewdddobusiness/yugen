import { useState, useCallback, useMemo } from 'react';
import {
  DragStartEvent,
  DragOverEvent,
  DragMoveEvent,
  DragEndEvent,
  DragCancelEvent,
} from '@dnd-kit/core';
import { format } from 'date-fns';
import { useParams } from 'next/navigation';
import { useToast } from '@/components/ui/use-toast';
import { fetchFilteredTableData2, setItineraryActivityDateTimes, setTableDataWithCheck } from '@/actions/supabase/actions';
import { addActivitiesAsAlternatives, updateItinerarySlotTimeRange } from '@/actions/supabase/slots';
import { useItineraryActivityStore } from '@/store/itineraryActivityStore';
import { useItinerarySlotStore } from '@/store/itinerarySlotStore';
import { useSchedulingContext } from '@/store/timeSchedulingStore';
import { ActivityScheduler, SchedulerWishlistItem } from '../services/activityScheduler';
import { ScheduledActivity } from './useScheduledActivities';
import { TimeSlot } from '../TimeGrid';
import { timeToMinutes } from '@/utils/calendar/collisionDetection';

type DropOverlapMode = 'overlap' | 'trim';
type TrimPreviewById = Record<string, { startSlot: number; span: number } | null>;

const getEventClientX = (event: Event): number | null => {
  if ('clientX' in event && typeof (event as MouseEvent).clientX === 'number') {
    return (event as MouseEvent).clientX;
  }

  if ('touches' in event) {
    const touchEvent = event as TouchEvent;
    const touch = touchEvent.touches[0] ?? touchEvent.changedTouches[0];
    return touch?.clientX ?? null;
  }

  return null;
};

const getDropOverlapMode = (
  event: Pick<
    DragOverEvent | DragMoveEvent | DragEndEvent,
    'activatorEvent' | 'delta' | 'over'
  >
): DropOverlapMode => {
  const overRect = event.over?.rect;
  if (!overRect) return 'trim';

  const initialClientX = getEventClientX(event.activatorEvent);
  if (initialClientX == null) return 'trim';

  const currentClientX = initialClientX + event.delta.x;
  const midpoint = overRect.left + overRect.width / 2;

  return currentClientX > midpoint ? 'overlap' : 'trim';
};

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
  const getActivityIdFromDragId = (id: unknown) => {
    const raw = String(id);
    if (raw.startsWith('calendar-overlay:')) return raw.slice('calendar-overlay:'.length);
    if (raw.startsWith('calendar:')) return raw.slice('calendar:'.length);
    if (raw.startsWith('sidebar:')) return raw.slice('sidebar:'.length);
    return raw;
  };

  const { destinationId } = useParams();
  const { toast } = useToast();
  const { itineraryActivities, setItineraryActivities } = useItineraryActivityStore();
  const getSlotIdForActivity = useItinerarySlotStore((s) => s.getSlotIdForActivity);
  const getActivityIdsForSlot = useItinerarySlotStore((s) => s.getActivityIdsForSlot);
  const getSlotById = useItinerarySlotStore((s) => s.getSlotById);
  const upsertSlot = useItinerarySlotStore((s) => s.upsertSlot);
  const upsertSlotOptions = useItinerarySlotStore((s) => s.upsertSlotOptions);
  const removeSlots = useItinerarySlotStore((s) => s.removeSlots);
  const schedulingContext = useSchedulingContext();
  
	  // Drag state
	  const [activeId, setActiveId] = useState<string | null>(null);
	  const [activeType, setActiveType] = useState<'scheduled-activity' | 'itinerary-activity' | 'wishlist-item' | null>(null);
	  const [isSaving, setIsSaving] = useState(false);
	  const [dragOverInfo, setDragOverInfo] = useState<{
	    dayIndex: number;
	    slotIndex: number;
	    spanSlots: number;
    hasConflict: boolean;
    mode: DropOverlapMode;
    hasTimeOverlap: boolean;
    trimPreviewById?: TrimPreviewById;
  } | null>(null);

  // Create scheduler instance (memoized to avoid re-creating callbacks every render)
  const scheduler = useMemo(
    () =>
      new ActivityScheduler(
        {
          travelSettings: schedulingContext.travelSettings,
        },
        itineraryActivities
      ),
    [itineraryActivities, schedulingContext.travelSettings]
  );

		  const handleDragStart = useCallback((event: DragStartEvent) => {
		    const dragType = (event.active.data?.current as any)?.type as
		      | 'scheduled-activity'
		      | 'itinerary-activity'
		      | 'wishlist-item'
		      | undefined;

		    if (dragType === 'scheduled-activity' || dragType === 'itinerary-activity') {
		      // Drive the DragOverlay for cross-component drags (sidebar -> calendar).
		      setActiveId(getActivityIdFromDragId(event.active.id));
		      setActiveType(dragType);
		      return;
		    }

		    setActiveId(null);
		    setActiveType(null);
		  }, []);

		  const handleDragOver = useCallback((event: DragOverEvent) => {
		    const { active, over } = event;
		    const activeDragId = getActivityIdFromDragId(active.id);
	    
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

    const mode = getDropOverlapMode(event);

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
	      excludeId = String(itineraryActivity?.itinerary_activity_id ?? activeDragId);
	      spanSlots = Math.max(
	        1,
	        Math.ceil(duration / schedulingContext.config.interval)
	      );
	    } else {
	      // Find the activity being dragged (existing logic)
	      const draggedActivity = scheduledActivities.find((act) => String(act.id) === activeDragId);
	      if (!draggedActivity) {
	        setDragOverInfo(null);
	        return;
	      }
	      duration = draggedActivity.duration;
	      spanSlots = Math.max(1, draggedActivity.position.span);
	      excludeId = activeDragId;
	    }

    // Keep the dragged item's duration, but clamp the start slot so it stays within the grid.
    spanSlots = Math.max(1, Math.min(spanSlots, timeSlots.length));
    const boundedSlotIndex = Math.max(0, Math.min(slotIndex, timeSlots.length - spanSlots));
    const boundedTargetSlot = timeSlots[boundedSlotIndex];

    // Enhanced conflict detection
    const proposedDate = format(targetDate, 'yyyy-MM-dd');
    const proposedStartTime = `${boundedTargetSlot.hour.toString().padStart(2, '0')}:${boundedTargetSlot.minute.toString().padStart(2, '0')}:00`;
    
    const detectedConflicts = scheduler.detectConflicts(
      proposedDate,
      proposedStartTime,
      duration,
      placeData?.place_id,
      excludeId || undefined
    );
    
    const hasTimeOverlap = detectedConflicts.some((c) => c.type === 'time_overlap');
    const hasHighSeverityConflicts = detectedConflicts.some(
      (c) => c.severity === 'high' && c.type !== 'time_overlap'
    );

    const proposedStartSlot = boundedSlotIndex;
    const proposedEndSlot = boundedSlotIndex + spanSlots;

    const trimPreviewById: TrimPreviewById | undefined =
      mode === 'trim' && hasTimeOverlap
        ? (() => {
            const preview: TrimPreviewById = {};
            const overlaps = scheduledActivities.filter((act) => {
              if (act.position.day !== dayIndex) return false;
              if (excludeId && String(act.id) === String(excludeId)) return false;

              const start = Math.max(0, act.position.startSlot);
              const end = Math.max(start + 1, start + Math.max(1, act.position.span));
              return end > proposedStartSlot && start < proposedEndSlot;
            });

            for (const act of overlaps) {
              const start = Math.max(0, act.position.startSlot);
              const end = Math.max(start + 1, start + Math.max(1, act.position.span));

              let newStart = start;
              let newEnd = end;
              let shouldUnschedule = false;

              if (start >= proposedStartSlot && end <= proposedEndSlot) {
                shouldUnschedule = true;
              } else if (start < proposedStartSlot && end > proposedEndSlot) {
                const left = proposedStartSlot - start;
                const right = end - proposedEndSlot;
                if (left >= right) newEnd = proposedStartSlot;
                else newStart = proposedEndSlot;
              } else if (start < proposedStartSlot && end > proposedStartSlot) {
                newEnd = proposedStartSlot;
              } else if (start < proposedEndSlot && end > proposedEndSlot) {
                newStart = proposedEndSlot;
              }

              if (!shouldUnschedule && newEnd <= newStart) {
                shouldUnschedule = true;
              }

              preview[String(act.id)] = shouldUnschedule
                ? null
                : {
                    startSlot: Math.max(0, newStart),
                    span: Math.max(1, newEnd - newStart),
                  };
            }

            return preview;
          })()
        : undefined;
    
    setDragOverInfo({
      dayIndex,
      slotIndex: boundedSlotIndex,
      spanSlots,
      hasConflict: hasHighSeverityConflicts,
      mode,
      hasTimeOverlap,
      trimPreviewById,
    });
  }, [days, timeSlots, scheduledActivities, scheduler, schedulingContext.config.interval]);

  // DragOver does not always fire when staying over the same slot.
  // Use DragMove to allow live switching between trim/overlap as the cursor crosses the column midpoint.
  const handleDragMove = useCallback(
    (event: DragMoveEvent) => {
      const { active, over } = event;

      if (!over) {
        setDragOverInfo(null);
        return;
      }

      const dropZoneData = over.id.toString().split('-');
      if (dropZoneData.length !== 3 || dropZoneData[0] !== 'slot') {
        setDragOverInfo(null);
        return;
      }

      const dayIndex = parseInt(dropZoneData[1]);
      const slotIndex = parseInt(dropZoneData[2]);
      if (isNaN(dayIndex) || isNaN(slotIndex)) return;

      const mode = getDropOverlapMode(event);
      const activeDragId = getActivityIdFromDragId(active.id);

      const dragData = active.data?.current as any;
      const excludeId =
        dragData?.type === 'itinerary-activity'
          ? String(dragData?.item?.itinerary_activity_id ?? activeDragId)
          : String(activeDragId);

      setDragOverInfo((prev) => {
        if (!prev) return prev;
        if (prev.dayIndex !== dayIndex) return prev;

        const boundedSlotIndex = Math.max(
          0,
          Math.min(slotIndex, timeSlots.length - Math.max(1, prev.spanSlots))
        );

        if (prev.slotIndex !== boundedSlotIndex) return prev;
        if (prev.mode === mode) return prev;

        const proposedStartSlot = boundedSlotIndex;
        const proposedEndSlot = proposedStartSlot + prev.spanSlots;

        const trimPreviewById: TrimPreviewById | undefined =
          mode === 'trim' && prev.hasTimeOverlap
            ? (() => {
                const preview: TrimPreviewById = {};
                const overlaps = scheduledActivities.filter((act) => {
                  if (act.position.day !== dayIndex) return false;
                  if (excludeId && String(act.id) === String(excludeId)) return false;

                  const start = Math.max(0, act.position.startSlot);
                  const end = Math.max(start + 1, start + Math.max(1, act.position.span));
                  return end > proposedStartSlot && start < proposedEndSlot;
                });

                for (const act of overlaps) {
                  const start = Math.max(0, act.position.startSlot);
                  const end = Math.max(start + 1, start + Math.max(1, act.position.span));

                  let newStart = start;
                  let newEnd = end;
                  let shouldUnschedule = false;

                  if (start >= proposedStartSlot && end <= proposedEndSlot) {
                    shouldUnschedule = true;
                  } else if (start < proposedStartSlot && end > proposedEndSlot) {
                    const left = proposedStartSlot - start;
                    const right = end - proposedEndSlot;
                    if (left >= right) newEnd = proposedStartSlot;
                    else newStart = proposedEndSlot;
                  } else if (start < proposedStartSlot && end > proposedStartSlot) {
                    newEnd = proposedStartSlot;
                  } else if (start < proposedEndSlot && end > proposedEndSlot) {
                    newStart = proposedEndSlot;
                  }

                  if (!shouldUnschedule && newEnd <= newStart) {
                    shouldUnschedule = true;
                  }

                  preview[String(act.id)] = shouldUnschedule
                    ? null
                    : {
                        startSlot: Math.max(0, newStart),
                        span: Math.max(1, newEnd - newStart),
                      };
                }

                return preview;
              })()
            : undefined;

        return {
          ...prev,
          mode,
          trimPreviewById,
        };
      });
    },
    [scheduledActivities, timeSlots.length]
  );

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
		    currentDuration: number,
      mode: DropOverlapMode = 'trim'
		  ) => {
		    const activityIdString = String(activityId);
		    if (!/^\d+$/.test(activityIdString)) {
		      toast({
		        title: 'Unable to schedule',
		        description: 'This activity is missing a valid id. Refresh the page and try again.',
		        variant: 'destructive',
		      });
		      return;
		    }

		    const currentActivities = useItineraryActivityStore.getState().itineraryActivities;
		    const previousActivity = currentActivities.find(
		      (act) => String(act.itinerary_activity_id) === activityIdString
		    );
		    if (!previousActivity) return;

        const slotId = getSlotIdForActivity(activityIdString);
        const slotActivityIds = slotId ? getActivityIdsForSlot(slotId) : [];
        const timeGroupIds =
          !slotId && previousActivity.date && previousActivity.start_time && previousActivity.end_time
            ? currentActivities
                .filter((act) => {
                  if (act.deleted_at !== null) return false;
                  return (
                    String(act.date ?? "") === String(previousActivity.date) &&
                    String(act.start_time ?? "") === String(previousActivity.start_time) &&
                    String(act.end_time ?? "") === String(previousActivity.end_time)
                  );
                })
                .map((act) => String(act.itinerary_activity_id))
            : [];

        const groupActivityIds = Array.from(
          new Set(
            (slotId
              ? slotActivityIds.length
                ? slotActivityIds
                : [activityIdString]
              : timeGroupIds.length
                ? timeGroupIds
                : [activityIdString]
            ).concat(activityIdString)
          )
        ).filter((id) => /^\d+$/.test(String(id)));
        const groupIdSet = new Set(groupActivityIds);

	    const minutesToTimeString = (minutes: number) =>
	      `${Math.floor(minutes / 60).toString().padStart(2, '0')}:${(minutes % 60)
	        .toString()
	        .padStart(2, '0')}:00`;

	    const newDate = format(targetDate, 'yyyy-MM-dd');
	    const interval = schedulingContext.config.interval;
	    const dayStartMinutes = schedulingContext.config.startHour * 60;
	    const dayEndMinutes = (schedulingContext.config.endHour + 1) * 60;

	    const alignedDuration = Math.min(
	      Math.max(interval, Math.ceil(currentDuration / interval) * interval),
	      Math.max(interval, dayEndMinutes - dayStartMinutes)
	    );

	    const proposedStartMinutes = targetSlot.hour * 60 + targetSlot.minute;
	    const boundedStartMinutes = Math.min(
	      Math.max(proposedStartMinutes, dayStartMinutes),
	      Math.max(dayStartMinutes, dayEndMinutes - alignedDuration)
	    );
	    const boundedEndMinutes = boundedStartMinutes + alignedDuration;

	    const optimisticPatch = {
	      date: newDate,
	      start_time: minutesToTimeString(boundedStartMinutes),
	      end_time: minutesToTimeString(boundedEndMinutes),
	    } as const;

	    const previousById = new Map<
	      string,
	      { date: string | null; start_time: string | null; end_time: string | null }
	    >();
      const activityById = new Map(
        currentActivities.map((act) => [String(act.itinerary_activity_id), act] as const)
      );
      for (const id of groupActivityIds) {
        const act = activityById.get(String(id));
        if (!act) continue;
        previousById.set(String(id), {
          date: act.date,
          start_time: act.start_time,
          end_time: act.end_time,
        });
      }

	    const updatesById = new Map<
	      string,
	      { date: string | null; start_time: string | null; end_time: string | null }
	    >();
      for (const id of groupActivityIds) {
        updatesById.set(String(id), optimisticPatch);
      }

	    const overlaps = currentActivities.filter((act) => {
	      if (groupIdSet.has(String(act.itinerary_activity_id))) return false;
	      if (act.deleted_at !== null) return false;
	      if (!act.date || !act.start_time || !act.end_time) return false;
	      return String(act.date) === newDate;
	    });

	    let trimmedCount = 0;
      // Overlap mode: treat the best overlap as "add as an alternative" by snapping
      // the dragged activity (or slot group) to the target slot time range.
      if (mode === 'overlap') {
        let best: { act: any; overlap: number } | null = null;
        for (const act of overlaps) {
          const start = timeToMinutes(act.start_time as string);
          const end = timeToMinutes(act.end_time as string);
          const overlapMinutes = Math.min(end, boundedEndMinutes) - Math.max(start, boundedStartMinutes);
          if (overlapMinutes <= 0) continue;
          if (!best || overlapMinutes > best.overlap) {
            best = { act, overlap: overlapMinutes };
          }
        }

        if (best) {
          const targetId = String(best.act.itinerary_activity_id);
          const targetSlotId = getSlotIdForActivity(targetId);
          const targetSlot = targetSlotId ? getSlotById(targetSlotId) : null;

          const targetPatch = {
            date: String(targetSlot?.date ?? best.act.date),
            start_time: String(targetSlot?.start_time ?? best.act.start_time),
            end_time: String(targetSlot?.end_time ?? best.act.end_time),
          } as const;

          for (const id of groupActivityIds) {
            updatesById.set(String(id), targetPatch);
          }

          const slotSnapshot = slotId ? getSlotById(slotId) : null;
          const activitiesAfterOptimistic = currentActivities.map((act) => {
            const update = updatesById.get(String(act.itinerary_activity_id));
            return update ? { ...act, ...update } : act;
          });
          setItineraryActivities(activitiesAfterOptimistic);
          setIsSaving(true);

          try {
            const result = await addActivitiesAsAlternatives(targetId, groupActivityIds);
            if (!result.success) {
              throw new Error(result.message || 'Failed to add alternative');
            }

            upsertSlot(result.data.slot as any);
            upsertSlotOptions(result.data.slotOptions as any);
            removeSlots(result.data.removedSlotIds.map((id) => String(id)));

            toast({
              title: 'Alternative added',
              description: 'This activity is now an option for that time slot.',
            });
          } catch (error) {
            console.error('Error adding alternative:', error);
            const message = error instanceof Error ? error.message : String(error ?? "");
            const migrationMissing =
              message.toLowerCase().includes("migration missing") ||
              message.toLowerCase().includes("slots are not available");

            if (migrationMissing) {
              // Fallback: just align times in itinerary_activity (alternatives are represented by exact time overlap).
              try {
                await Promise.all(
                  groupActivityIds.map((id) =>
                    setItineraryActivityDateTimes(id, targetPatch.date, targetPatch.start_time, targetPatch.end_time)
                  )
                );

                toast({
                  title: 'Alternative added',
                  description: 'This activity is now an option for that time slot.',
                });
              } catch (persistError) {
                console.error("Failed to persist alternative times:", persistError);
                setItineraryActivities(currentActivities);
                if (slotSnapshot) upsertSlot(slotSnapshot as any);

                toast({
                  title: "Failed to save",
                  description: "Could not save alternative. Please try again.",
                  variant: "destructive",
                });
              }
            } else {
              setItineraryActivities(currentActivities);
              if (slotSnapshot) upsertSlot(slotSnapshot as any);

              toast({
                title: 'Failed to add alternative',
                description:
                  error instanceof Error ? error.message : 'Please try again.',
                variant: 'destructive',
              });
            }
          } finally {
            setIsSaving(false);
          }

          return;
        }
      }

      if (mode === 'trim') {
	      for (const act of overlaps) {
	        const start = timeToMinutes(act.start_time as string);
	        const end = timeToMinutes(act.end_time as string);

	        if (end <= boundedStartMinutes || start >= boundedEndMinutes) continue;

	        let newStart = start;
	        let newEnd = end;
	        let shouldUnschedule = false;

	        if (start >= boundedStartMinutes && end <= boundedEndMinutes) {
	          // Fully covered by the moved activity.
	          shouldUnschedule = true;
	        } else if (start < boundedStartMinutes && end > boundedEndMinutes) {
	          // Spans across the moved activity; keep the larger remaining side.
	          const left = boundedStartMinutes - start;
	          const right = end - boundedEndMinutes;
	          if (left >= right) newEnd = boundedStartMinutes;
	          else newStart = boundedEndMinutes;
	        } else if (start < boundedStartMinutes && end > boundedStartMinutes) {
	          // Overlaps the start of the moved activity.
	          newEnd = boundedStartMinutes;
	        } else if (start < boundedEndMinutes && end > boundedEndMinutes) {
	          // Overlaps the end of the moved activity.
	          newStart = boundedEndMinutes;
	        }

	        if (!shouldUnschedule && newEnd <= newStart) {
	          shouldUnschedule = true;
	        }

	        const id = String(act.itinerary_activity_id);
	        previousById.set(id, {
	          date: act.date,
	          start_time: act.start_time,
	          end_time: act.end_time,
	        });

	        if (shouldUnschedule) {
	          updatesById.set(id, {
	            date: null,
	            start_time: null,
	            end_time: null,
	          });
	        } else {
	          updatesById.set(id, {
	            date: newDate,
	            start_time: minutesToTimeString(newStart),
	            end_time: minutesToTimeString(newEnd),
	          });
	        }

	        trimmedCount++;
	      }
      }

      const draggedSlotSnapshot = slotId ? getSlotById(slotId) : null;
      if (slotId && draggedSlotSnapshot) {
        upsertSlot({
          ...draggedSlotSnapshot,
          date: optimisticPatch.date,
          start_time: optimisticPatch.start_time,
          end_time: optimisticPatch.end_time,
        } as any);
      }

	    // Optimistic UI: update local store immediately.
	    const activitiesAfterOptimistic = currentActivities.map((act) => {
	      const update = updatesById.get(String(act.itinerary_activity_id));
	      return update ? { ...act, ...update } : act;
	    });
	    setItineraryActivities(activitiesAfterOptimistic);

	    setIsSaving(true);

      const persistSlotUpdate = async () => {
        if (!slotId) return;
        const result = await updateItinerarySlotTimeRange(
          slotId,
          optimisticPatch.date,
          optimisticPatch.start_time,
          optimisticPatch.end_time
        );
        if (!result.success) {
          throw new Error(result.message || 'Failed to update slot');
        }
        upsertSlot(result.data.slot as any);
      };

	    const persistedIds: string[] = [];
      let slotPersisted = false;
	    const persistUpdate = async (
	      id: string,
	      update: { date: string | null; start_time: string | null; end_time: string | null }
	    ) => {
	      if (update.date && update.start_time && update.end_time) {
	        const result = await setItineraryActivityDateTimes(
	          id,
	          update.date,
	          update.start_time,
	          update.end_time
	        );
	        if (!result.success) {
	          throw new Error(result.message || 'Failed to update activity');
	        }
	        return;
	      }

	      const result = await setTableDataWithCheck(
	        'itinerary_activity',
	        {
	          itinerary_activity_id: id,
	          date: null,
	          start_time: null,
	          end_time: null,
	        },
	        ['itinerary_activity_id']
	      );
	      if (!result.success) {
	        throw new Error(result.message || 'Failed to update activity');
	      }
	    };

	    const rollbackPersisted = async () => {
	      for (const id of persistedIds.reverse()) {
	        const previous = previousById.get(id);
	        if (!previous) continue;
	        try {
	          await persistUpdate(id, previous);
	        } catch (error) {
	          console.error('Failed to rollback activity update:', error);
	        }
	      }
	    };

	    try {
        if (slotId) {
          await persistSlotUpdate();
          slotPersisted = true;
        } else {
          // No slot: persist the primary activity normally.
          const primaryUpdate = updatesById.get(activityIdString) ?? optimisticPatch;
          await persistUpdate(activityIdString, primaryUpdate);
          persistedIds.push(activityIdString);
        }

	      for (const [id, update] of updatesById.entries()) {
          if (slotId && groupIdSet.has(String(id))) continue;
          if (String(id) === activityIdString && !slotId) continue;
	        await persistUpdate(id, update);
	        persistedIds.push(id);
	      }

	      toast({
	        title: 'Activity updated',
	        description:
	          trimmedCount > 0
	            ? 'Overlapping activities were trimmed to fit.'
	            : 'Activity moved successfully.',
	      });
	    } catch (error) {
	      console.error('Error saving activity:', error);

        if (slotPersisted && slotId) {
          const previous = previousById.get(activityIdString);
          if (previous?.date && previous.start_time && previous.end_time) {
            try {
              const revertResult = await updateItinerarySlotTimeRange(
                slotId,
                previous.date,
                previous.start_time,
                previous.end_time
              );
              if (revertResult.success) {
                upsertSlot(revertResult.data.slot as any);
              }
            } catch (rollbackError) {
              console.error('Failed to rollback slot update:', rollbackError);
            }
          }
        }

	      await rollbackPersisted();
	      setItineraryActivities(currentActivities);
        if (draggedSlotSnapshot) upsertSlot(draggedSlotSnapshot as any);

	      toast({
	        title: 'Failed to save',
	        description:
	          error instanceof Error ? error.message : 'Could not save changes. Please try again.',
	        variant: 'destructive',
	      });
	    } finally {
	      setIsSaving(false);
	    }
	  }, [
      getActivityIdsForSlot,
      getSlotById,
      getSlotIdForActivity,
      removeSlots,
      schedulingContext.config.endHour,
      schedulingContext.config.interval,
      schedulingContext.config.startHour,
      setItineraryActivities,
      toast,
      upsertSlot,
      upsertSlotOptions,
    ]);

		  const handleDragEnd = useCallback(async (event: DragEndEvent) => {
        const mode = getDropOverlapMode(event);

		    setActiveId(null);
		    setActiveType(null);
		    setDragOverInfo(null);
	    
	    const { active, over } = event;
	    const activeDragId = getActivityIdFromDragId(active.id);
	    
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
	      const rawIdFromItem = String(itineraryActivity?.itinerary_activity_id ?? '').trim();
	      let resolvedItineraryActivityId = String(activeDragId ?? '').trim();
	
	      if (!/^\d+$/.test(resolvedItineraryActivityId) && /^\d+$/.test(rawIdFromItem)) {
	        resolvedItineraryActivityId = rawIdFromItem;
	      }
	
	      if (!/^\d+$/.test(resolvedItineraryActivityId)) {
	        const activityIdValue = String(itineraryActivity?.activity_id ?? '').trim();
	        const itineraryDestinationIdValue = String(
	          itineraryActivity?.itinerary_destination_id ?? destinationId ?? ''
	        ).trim();
	
	        if (/^\d+$/.test(activityIdValue) && /^\d+$/.test(itineraryDestinationIdValue)) {
	          const lookup = await fetchFilteredTableData2(
	            'itinerary_activity',
	            'itinerary_activity_id',
	            {
	              itinerary_destination_id: itineraryDestinationIdValue,
	              activity_id: activityIdValue,
	            }
	          );
	
	          const foundRow = Array.isArray(lookup.data) ? lookup.data[0] : null;
	          const foundId = foundRow?.itinerary_activity_id;
	          if (lookup.success && foundId != null) {
	            resolvedItineraryActivityId = String(foundId);
	
	            const currentActivities = useItineraryActivityStore.getState().itineraryActivities;
	            setItineraryActivities(
	              currentActivities.map((act) => {
	                const actId = String(act.itinerary_activity_id ?? '').trim();
	                const matchesPlaceholder =
	                  actId === rawIdFromItem ||
	                  (actId === '' &&
	                    String(act.activity_id ?? '').trim() === activityIdValue &&
	                    String(act.itinerary_destination_id ?? '').trim() === itineraryDestinationIdValue);
	
	                return matchesPlaceholder
	                  ? { ...act, itinerary_activity_id: resolvedItineraryActivityId }
	                  : act;
	              })
	            );
	          }
	        }
	      }
	
	      if (!/^\d+$/.test(resolvedItineraryActivityId)) {
	        toast({
	          title: 'Unable to schedule',
	          description: 'This activity is missing a valid id. Refresh the page and try again.',
	          variant: 'destructive',
	        });
	        return;
	      }

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
		        resolvedItineraryActivityId,
		        targetDate,
		        targetSlot,
		        duration || 60,
            mode
		      );
		      return;
		    }

	    // Find the activity being dragged (existing logic for scheduled activities)
	    const draggedActivity = scheduledActivities.find((act) => String(act.id) === activeDragId);
	    if (!draggedActivity) return;

	    await handleActivityReschedule(
	      activeDragId,
	      targetDate,
	      targetSlot,
	      draggedActivity.duration,
        mode
	    );
			  }, [days, timeSlots, scheduledActivities, handleWishlistItemDrop, handleActivityReschedule, scheduler, destinationId, setItineraryActivities, toast]);

	  const handleDragCancel = useCallback((_event: DragCancelEvent) => {
	    setActiveId(null);
	    setActiveType(null);
	    setDragOverInfo(null);
	  }, []);

  const handleResize = useCallback(async (
    activityId: string,
    newDuration: number,
    resizeDirection: 'top' | 'bottom'
  ) => {
    const activityIdString = String(activityId);
    const minutesToTimeString = (minutes: number) =>
      `${Math.floor(minutes / 60).toString().padStart(2, '0')}:${(minutes % 60)
        .toString()
        .padStart(2, '0')}:00`;

    const currentActivities = useItineraryActivityStore.getState().itineraryActivities;
    const previousActivity = currentActivities.find(
      (act) => String(act.itinerary_activity_id) === activityIdString
    );
    if (!previousActivity || !previousActivity.start_time || !previousActivity.end_time) return;

    const slotId = getSlotIdForActivity(activityIdString);
    const slotActivityIds = slotId ? getActivityIdsForSlot(slotId) : [];
    const timeGroupIds =
      !slotId && previousActivity.date && previousActivity.start_time && previousActivity.end_time
        ? currentActivities
            .filter((act) => {
              if (act.deleted_at !== null) return false;
              return (
                String(act.date ?? "") === String(previousActivity.date) &&
                String(act.start_time ?? "") === String(previousActivity.start_time) &&
                String(act.end_time ?? "") === String(previousActivity.end_time)
              );
            })
            .map((act) => String(act.itinerary_activity_id))
        : [];

    const groupActivityIds = Array.from(
      new Set(
        (slotId
          ? slotActivityIds.length
            ? slotActivityIds
            : [activityIdString]
          : timeGroupIds.length
            ? timeGroupIds
            : [activityIdString]
        ).concat(activityIdString)
      )
    ).filter((id) => /^\d+$/.test(String(id)));
    const groupIdSet = new Set(groupActivityIds);
    const slotSnapshot = slotId ? getSlotById(slotId) : null;

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

    if (slotId) {
      // Optimistic UI: update all options in the slot so the overlap stays aligned.
      const activitiesAfterOptimistic = currentActivities.map((act) =>
        groupIdSet.has(String(act.itinerary_activity_id))
          ? { ...act, start_time: optimisticStartTime, end_time: optimisticEndTime }
          : act
      );
      setItineraryActivities(activitiesAfterOptimistic);

      if (slotSnapshot) {
        upsertSlot({
          ...slotSnapshot,
          start_time: optimisticStartTime,
          end_time: optimisticEndTime,
        } as any);
      }

      setIsSaving(true);
      try {
        const result = await updateItinerarySlotTimeRange(
          slotId,
          previousActivity.date as string,
          optimisticStartTime,
          optimisticEndTime
        );
        if (!result.success) {
          throw new Error(result.message || "Failed to resize slot");
        }

        upsertSlot(result.data.slot as any);
        toast({
          title: "Activity resized",
          description: "Duration updated.",
        });
      } catch (error) {
        // Revert on error
        setItineraryActivities(currentActivities);
        if (slotSnapshot) upsertSlot(slotSnapshot as any);

        toast({
          title: "Failed to resize",
          description: error instanceof Error ? error.message : "Please try again.",
          variant: "destructive",
        });
      } finally {
        setIsSaving(false);
      }

      return;
    }

    // Time-group alternatives (no slot tables): resize the whole group.
    if (groupActivityIds.length > 1 && previousActivity.date) {
      const activitiesAfterOptimistic = currentActivities.map((act) =>
        groupIdSet.has(String(act.itinerary_activity_id))
          ? { ...act, start_time: optimisticStartTime, end_time: optimisticEndTime }
          : act
      );
      setItineraryActivities(activitiesAfterOptimistic);

      setIsSaving(true);
      try {
        await Promise.all(
          groupActivityIds.map((id) =>
            setItineraryActivityDateTimes(id, String(previousActivity.date), optimisticStartTime, optimisticEndTime)
          )
        );

        toast({
          title: "Activity resized",
          description: "Duration updated.",
        });
      } catch (error) {
        console.error("Error resizing alternative group:", error);
        setItineraryActivities(currentActivities);
        toast({
          title: "Failed to resize",
          description: error instanceof Error ? error.message : "Please try again.",
          variant: "destructive",
        });
      } finally {
        setIsSaving(false);
      }

      return;
    }

    // Optimistic UI: update local store immediately so the block doesn't snap back.
    const activitiesAfterOptimistic = useItineraryActivityStore
      .getState()
      .itineraryActivities.map((act) =>
        String(act.itinerary_activity_id) === activityIdString
          ? { ...act, start_time: optimisticStartTime, end_time: optimisticEndTime }
          : act
      );
    setItineraryActivities(activitiesAfterOptimistic);

    setIsSaving(true);

    const result = await scheduler.resizeActivity(
      activityIdString,
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
          String(act.itinerary_activity_id) === activityIdString
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
          String(act.itinerary_activity_id) === activityIdString
            ? { ...act, ...previousTimes }
            : act
        );
      setItineraryActivities(activitiesAfterRevert);

      toast({
        title: "Failed to resize",
        description: result.error,
        variant: "destructive"
      });
    }

    setIsSaving(false);
	  }, [
	    getActivityIdsForSlot,
	    getSlotById,
	    getSlotIdForActivity,
	    scheduler,
	    setItineraryActivities,
	    toast,
	    upsertSlot,
	  ]);

	  // Get the currently active activity for drag overlay.
	  // For sidebar drags (itinerary-activity), we synthesize a ScheduledActivity so the DragOverlay
	  // can render the same card UI while crossing components.
			  const activeActivity = (() => {
			    if (!activeId || !activeType) return null;

			    if (activeType === 'scheduled-activity') {
			      return (
			        scheduledActivities.find((act) => String(act.id) === activeId) ?? null
			      );
			    }

		    if (activeType !== 'itinerary-activity') return null;

	    const itineraryActivity = itineraryActivities.find(
	      (act) => String(act.itinerary_activity_id) === activeId
	    );
	    if (!itineraryActivity) return null;

	    const interval = schedulingContext.config.interval;
	    const MIN_DURATION = interval;

	    const durationFromTimes =
	      itineraryActivity.start_time && itineraryActivity.end_time
	        ? Math.max(
	            0,
	            timeToMinutes(itineraryActivity.end_time) -
	              timeToMinutes(itineraryActivity.start_time)
	          )
	        : null;

	    const durationFromActivity =
	      typeof itineraryActivity.activity?.duration === 'number'
	        ? itineraryActivity.activity.duration
	        : null;

	    const targetDate = dragOverInfo?.dayIndex != null ? days[dragOverInfo.dayIndex] : undefined;
	    const targetSlot = dragOverInfo?.slotIndex != null ? timeSlots[dragOverInfo.slotIndex] : undefined;

	    const durationFromEstimate =
	      itineraryActivity.activity && targetDate && targetSlot
	        ? scheduler.estimateDuration(itineraryActivity.activity, targetSlot, targetDate)
	        : null;

	    const duration =
	      durationFromTimes ??
	      durationFromActivity ??
	      durationFromEstimate ??
	      60;

	    const safeDuration = Math.max(MIN_DURATION, duration);
	    const spanSlots =
	      dragOverInfo?.spanSlots ??
	      Math.max(1, Math.ceil(safeDuration / interval));
	    const visualDuration = dragOverInfo ? spanSlots * interval : safeDuration;

	    const startTime = (() => {
	      if (targetSlot) {
	        return `${targetSlot.hour.toString().padStart(2, '0')}:${targetSlot.minute
	          .toString()
	          .padStart(2, '0')}:00`;
	      }
	      if (itineraryActivity.start_time) return itineraryActivity.start_time;
	      const firstSlot = timeSlots[0];
	      return `${firstSlot.hour.toString().padStart(2, '0')}:${firstSlot.minute
	        .toString()
	        .padStart(2, '0')}:00`;
	    })();

	    const endTime = (() => {
	      if (!targetSlot && itineraryActivity.end_time) return itineraryActivity.end_time;
	      const startMinutes = timeToMinutes(startTime);
	      const endMinutes = startMinutes + visualDuration;
	      return `${Math.floor(endMinutes / 60)
	        .toString()
	        .padStart(2, '0')}:${(endMinutes % 60).toString().padStart(2, '0')}:00`;
	    })();

	    const overlayDate = (() => {
	      if (targetDate) return targetDate;
	      if (itineraryActivity.date) return new Date(itineraryActivity.date);
	      return days[0] ?? new Date();
	    })();

	    return {
	      id: String(itineraryActivity.itinerary_activity_id),
	      activityId: itineraryActivity.activity_id || '',
	      placeId: itineraryActivity.activity?.place_id || '',
	      date: overlayDate,
	      startTime,
	      endTime,
	      duration: visualDuration,
	      position: {
	        day: dragOverInfo?.dayIndex ?? 0,
	        startSlot: dragOverInfo?.slotIndex ?? 0,
	        span: spanSlots,
	      },
	      activity: itineraryActivity.activity,
	    } satisfies ScheduledActivity;
	  })();

	  return {
	    // Drag handlers
	    handleDragStart,
	    handleDragOver,
      handleDragMove,
	    handleDragEnd,
	    handleDragCancel,
	    handleResize,
	    
	    // State
	    activeId,
	    activeType,
	    activeActivity,
      dragOverInfo,
      isSaving,
    
    // Utilities
    scheduler
  };
}
