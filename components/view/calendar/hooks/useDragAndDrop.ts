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
import { setItineraryCustomEventDateTimes } from "@/actions/supabase/customEvents";
import { addActivitiesAsAlternatives, updateItinerarySlotTimeRange } from '@/actions/supabase/slots';
import { useItineraryActivityStore } from '@/store/itineraryActivityStore';
import { useItineraryCustomEventStore } from "@/store/itineraryCustomEventStore";
import { useItinerarySlotStore } from '@/store/itinerarySlotStore';
import { useSchedulingContext } from '@/store/timeSchedulingStore';
import { ActivityScheduler, SchedulerWishlistItem } from '../services/activityScheduler';
import { ScheduledActivity } from './useScheduledActivities';
import type { ScheduledCustomEvent } from "./useScheduledCustomEvents";
import { TimeSlot } from '../TimeGrid';
import { timeToMinutes } from '@/utils/calendar/collisionDetection';

type DropOverlapMode = 'overlap' | 'trim';
type TrimPreviewById = Record<string, { startSlot: number; span: number } | null>;

type ItineraryActivityLike = {
  itinerary_activity_id?: string | number;
  activity_id?: string | number;
  date?: string | null;
  start_time?: string | null;
  end_time?: string | null;
  deleted_at?: string | null;
  activity?: { place_id?: string | null } | null;
};

const getAlternativeGroupKey = (act: ItineraryActivityLike | null | undefined) => {
  const placeId = String(act?.activity?.place_id ?? "").trim();
  if (placeId) return `place:${placeId}`;

  const activityId = String(act?.activity_id ?? "").trim();
  if (activityId) return `activity:${activityId}`;

  return null;
};

const getActivityComparisonKeys = (act: ItineraryActivityLike | null | undefined) => {
  const keys: string[] = [];
  const placeId = String(act?.activity?.place_id ?? "").trim();
  if (placeId) keys.push(`place:${placeId}`);

  const activityId = String(act?.activity_id ?? "").trim();
  if (activityId) keys.push(`activity:${activityId}`);

  return keys;
};

const isSlotAlternativeGroupValid = (
  slotActivityIds: string[],
  activityById: Map<string, ItineraryActivityLike>
) => {
  if (slotActivityIds.length <= 1) return true;

  const keys: string[] = [];
  for (const activityId of slotActivityIds) {
    const act = activityById.get(String(activityId));
    const key = getAlternativeGroupKey(act);
    if (!act || !key) return false;
    keys.push(key);
  }

  return new Set(keys).size === keys.length;
};

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

const minutesToTimeString = (minutes: number) =>
  `${Math.floor(minutes / 60)
    .toString()
    .padStart(2, "0")}:${(minutes % 60).toString().padStart(2, "0")}:00`;

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
  scheduledActivities: ScheduledActivity[],
  scheduledCustomEvents: ScheduledCustomEvent[] = []
) {
  const getActivityIdFromDragId = (id: unknown) => {
    const raw = String(id);
    if (raw.startsWith('calendar-overlay:')) return raw.slice('calendar-overlay:'.length);
    if (raw.startsWith('calendar:')) return raw.slice('calendar:'.length);
    if (raw.startsWith('sidebar:')) return raw.slice('sidebar:'.length);
    if (raw.startsWith('custom-overlay:')) return raw.slice('custom-overlay:'.length);
    if (raw.startsWith('custom:')) return raw.slice('custom:'.length);
    return raw;
  };

  const { destinationId } = useParams();
  const { toast } = useToast();
  const { itineraryActivities, setItineraryActivities } = useItineraryActivityStore();
  const updateCustomEvent = useItineraryCustomEventStore((s) => s.updateCustomEvent);
  const upsertCustomEvent = useItineraryCustomEventStore((s) => s.upsertCustomEvent);
  const getCustomEventById = useItineraryCustomEventStore((s) => s.getCustomEventById);
  const getSlotIdForActivity = useItinerarySlotStore((s) => s.getSlotIdForActivity);
  const getActivityIdsForSlot = useItinerarySlotStore((s) => s.getActivityIdsForSlot);
  const getSlotById = useItinerarySlotStore((s) => s.getSlotById);
  const upsertSlot = useItinerarySlotStore((s) => s.upsertSlot);
  const upsertSlotOptions = useItinerarySlotStore((s) => s.upsertSlotOptions);
  const removeSlots = useItinerarySlotStore((s) => s.removeSlots);
  const schedulingContext = useSchedulingContext();
  
	  // Drag state
	  const [activeId, setActiveId] = useState<string | null>(null);
	  const [activeType, setActiveType] = useState<'scheduled-activity' | 'itinerary-activity' | 'wishlist-item' | 'custom-event' | null>(null);
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
          gridIntervalMinutes: schedulingContext.config.interval,
          travelSettings: schedulingContext.travelSettings,
        },
        itineraryActivities
      ),
    [itineraryActivities, schedulingContext.config.interval, schedulingContext.travelSettings]
  );

		  const handleDragStart = useCallback((event: DragStartEvent) => {
		    const dragType = (event.active.data?.current as any)?.type as
		      | 'scheduled-activity'
		      | 'itinerary-activity'
		      | 'wishlist-item'
		      | 'custom-event'
		      | undefined;

		    if (dragType === 'scheduled-activity' || dragType === 'itinerary-activity' || dragType === 'custom-event') {
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

    let mode = getDropOverlapMode(event);

    // Check if this is a wishlist item being dragged
    const dragData = active.data?.current as any;
    const isCustomEventDrag = dragData?.type === "custom-event";
    if (isCustomEventDrag) mode = "overlap";
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
		    } else if (dragData?.type === "custom-event") {
		      const draggedEvent =
		        dragData?.item ??
		        scheduledCustomEvents.find((evt) => String(evt.id) === String(activeDragId));

		      duration = Math.max(1, Number(draggedEvent?.duration ?? 60));
		      spanSlots = Math.max(1, Math.ceil(duration / schedulingContext.config.interval));
		      excludeId = activeDragId;
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
    
      let hasTimeOverlap = false;
      let hasHighSeverityConflicts = false;
      if (!isCustomEventDrag) {
        const detectedConflicts = scheduler.detectConflicts(
          proposedDate,
          proposedStartTime,
          duration,
          placeData?.place_id,
          excludeId || undefined
        );

        hasTimeOverlap = detectedConflicts.some((c) => c.type === "time_overlap");
        hasHighSeverityConflicts = detectedConflicts.some(
          (c) => c.severity === "high" && c.type !== "time_overlap"
        );
      }

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
	  }, [days, timeSlots, scheduledActivities, scheduledCustomEvents, scheduler, schedulingContext.config.interval]);

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

      const dragData = active.data?.current as any;
      const mode = dragData?.type === "custom-event" ? "overlap" : getDropOverlapMode(event);
      const activeDragId = getActivityIdFromDragId(active.id);
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

        const activityById = new Map<string, ItineraryActivityLike>(
          currentActivities.map((act) => [String(act.itinerary_activity_id), act] as const)
        );

        const rawSlotId = getSlotIdForActivity(activityIdString);
        const rawSlotActivityIds = rawSlotId ? getActivityIdsForSlot(rawSlotId) : [];
        const slotId =
          rawSlotId && isSlotAlternativeGroupValid(rawSlotActivityIds, activityById)
            ? rawSlotId
            : null;
        const slotActivityIds = slotId ? rawSlotActivityIds : [];
        const timeGroupCandidates =
          !slotId && previousActivity.date && previousActivity.start_time && previousActivity.end_time
            ? currentActivities.filter((act) => {
                if (act.deleted_at !== null) return false;
                return (
                  String(act.date ?? "") === String(previousActivity.date) &&
                  String(act.start_time ?? "") === String(previousActivity.start_time) &&
                  String(act.end_time ?? "") === String(previousActivity.end_time)
                );
              })
            : [];

        // Only treat exact time overlaps as a "slot group" when it looks like true alternatives
        // (i.e. different activities), otherwise duplicating an activity would unintentionally
        // cause multiple instances to move/resize together.
        const timeGroupIds =
          timeGroupCandidates.length > 1
            ? (() => {
                const keys = timeGroupCandidates
                  .map((act) => getAlternativeGroupKey(act))
                  .filter(Boolean);
                if (keys.length !== timeGroupCandidates.length) return [];
                const unique = new Set(keys);
                if (unique.size !== timeGroupCandidates.length) return [];
                return timeGroupCandidates.map((act) => String((act as any).itinerary_activity_id));
              })()
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
      for (const id of groupActivityIds) {
        const act = activityById.get(String(id));
        if (!act) continue;
        previousById.set(String(id), {
          date: act.date ?? null,
          start_time: act.start_time ?? null,
          end_time: act.end_time ?? null,
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
        const groupComparisonKeys = new Set<string>();
        for (const id of groupActivityIds) {
          const act = activityById.get(String(id));
          for (const key of getActivityComparisonKeys(act)) groupComparisonKeys.add(key);
        }

        let best: { act: any; overlap: number } | null = null;
        let dedupedIdsToAdd: string[] | null = null;
        for (const act of overlaps) {
          const candidateKeys = getActivityComparisonKeys(act);
          if (candidateKeys.some((key) => groupComparisonKeys.has(key))) continue;

          const start = timeToMinutes(act.start_time as string);
          const end = timeToMinutes(act.end_time as string);
          const overlapMinutes = Math.min(end, boundedEndMinutes) - Math.max(start, boundedStartMinutes);
          if (overlapMinutes <= 0) continue;
          if (!best || overlapMinutes > best.overlap) {
            best = { act, overlap: overlapMinutes };
          }
        }

        if (best) {
          const targetKeys = new Set(getActivityComparisonKeys(best.act));
          dedupedIdsToAdd = groupActivityIds.filter((id) => {
            const act = activityById.get(String(id));
            const keys = getActivityComparisonKeys(act);
            return keys.length > 0 && !keys.some((key) => targetKeys.has(key));
          });
          if (dedupedIdsToAdd.length === 0) {
            // Dropping onto the same underlying place shouldn't create "alternatives".
            // Fall back to normal overlap behavior (two separate events in the same time range).
            best = null;
            dedupedIdsToAdd = null;
          }
        }

        if (best && dedupedIdsToAdd) {
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
            const result = await addActivitiesAsAlternatives(targetId, dedupedIdsToAdd);
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
    const dragData = active.data?.current as any;
    if (dragData?.type === 'wishlist-item') {
      await handleWishlistItemDrop(dragData.item, targetDate, targetSlot);
      return;
    }
    if (dragData?.type === 'custom-event') {
      const eventIdString = String(activeDragId ?? '').trim();
      if (!/^\d+$/.test(eventIdString)) {
        toast({
          title: 'Unable to move note',
          description: 'Please try again.',
          variant: 'destructive',
        });
        return;
      }

      const eventId = Number(eventIdString);
      const previous = getCustomEventById(eventId);
      if (!previous || !previous.date || !previous.start_time || !previous.end_time) return;

      const draggedEvent =
        dragData?.item ??
        scheduledCustomEvents.find((evt) => String(evt.id) === String(eventIdString));

      const interval = schedulingContext.config.interval;
      const dayStartMinutes = schedulingContext.config.startHour * 60;
      const dayEndMinutes = (schedulingContext.config.endHour + 1) * 60;

      const baseDuration = Math.max(interval, Number(draggedEvent?.duration ?? 60));
      const alignedDuration = Math.max(interval, Math.ceil(baseDuration / interval) * interval);
      const spanSlots = Math.max(1, Math.ceil(alignedDuration / interval));

      const boundedSlotIndex = Math.max(0, Math.min(slotIndex, timeSlots.length - spanSlots));
      const boundedSlot = timeSlots[boundedSlotIndex] ?? targetSlot;
      const proposedStartMinutes = boundedSlot.hour * 60 + boundedSlot.minute;
      const boundedStartMinutes = Math.min(
        Math.max(proposedStartMinutes, dayStartMinutes),
        Math.max(dayStartMinutes, dayEndMinutes - alignedDuration)
      );

      const newDate = format(targetDate, 'yyyy-MM-dd');
      const newStartTime = minutesToTimeString(boundedStartMinutes);
      const newEndTime = minutesToTimeString(boundedStartMinutes + alignedDuration);

      updateCustomEvent(eventId, {
        date: newDate,
        start_time: newStartTime,
        end_time: newEndTime,
      });

      setIsSaving(true);
      try {
        const result = await setItineraryCustomEventDateTimes(
          eventIdString,
          newDate,
          newStartTime,
          newEndTime
        );

        if (!result.success || !result.data) {
          throw new Error(result.error?.message ?? 'Failed to update');
        }

        upsertCustomEvent(result.data);
      } catch (error) {
        updateCustomEvent(eventId, {
          date: previous.date,
          start_time: previous.start_time,
          end_time: previous.end_time,
        });

        console.error('Failed to move custom event:', error);
        toast({
          title: "Couldn't move note",
          description: 'Please try again.',
          variant: 'destructive',
        });
      } finally {
        setIsSaving(false);
      }

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
				  }, [
            days,
            destinationId,
            getCustomEventById,
            handleActivityReschedule,
            handleWishlistItemDrop,
            scheduledActivities,
            scheduledCustomEvents,
            scheduler,
            schedulingContext.config.endHour,
            schedulingContext.config.interval,
            schedulingContext.config.startHour,
            setItineraryActivities,
            timeSlots,
            toast,
            updateCustomEvent,
            upsertCustomEvent,
          ]);

		  const handleDragCancel = useCallback((_event: DragCancelEvent) => {
		    setActiveId(null);
		    setActiveType(null);
		    setDragOverInfo(null);
		  }, []);

      const handleCustomEventResize = useCallback(
        async (
          eventId: string,
          newDuration: number,
          resizeDirection: 'top' | 'bottom'
        ) => {
          const eventIdValue = String(eventId ?? '').trim();
          if (!/^\d+$/.test(eventIdValue)) return;

          const eventIdNumber = Number(eventIdValue);
          const current = getCustomEventById(eventIdNumber);
          if (!current || !current.date || !current.start_time || !current.end_time) return;

          const interval = schedulingContext.config.interval;
          const minDuration = interval;
          const alignedDuration = Math.max(
            minDuration,
            Math.round(newDuration / interval) * interval
          );

          const dayStartMinutes = schedulingContext.config.startHour * 60;
          const dayEndMinutes = (schedulingContext.config.endHour + 1) * 60;

          const startMinutes = timeToMinutes(current.start_time);
          const endMinutes = timeToMinutes(current.end_time);

          const boundedEndMinutes = Math.min(
            Math.max(endMinutes, dayStartMinutes + minDuration),
            dayEndMinutes
          );
          const boundedStartMinutes = Math.max(
            dayStartMinutes,
            Math.min(startMinutes, boundedEndMinutes - minDuration)
          );

          const nextEndMinutes =
            resizeDirection === 'bottom'
              ? Math.min(boundedStartMinutes + alignedDuration, dayEndMinutes)
              : boundedEndMinutes;
          const nextStartMinutes =
            resizeDirection === 'top'
              ? Math.max(nextEndMinutes - alignedDuration, dayStartMinutes)
              : boundedStartMinutes;

          const safeStartMinutes = Math.min(
            Math.max(nextStartMinutes, dayStartMinutes),
            Math.max(dayStartMinutes, nextEndMinutes - minDuration)
          );
          const safeEndMinutes = Math.max(
            safeStartMinutes + minDuration,
            Math.min(nextEndMinutes, dayEndMinutes)
          );

          const newStartTime = minutesToTimeString(safeStartMinutes);
          const newEndTime = minutesToTimeString(safeEndMinutes);

          updateCustomEvent(eventIdNumber, {
            start_time: newStartTime,
            end_time: newEndTime,
          });

          setIsSaving(true);
          try {
            const result = await setItineraryCustomEventDateTimes(
              eventIdValue,
              current.date,
              newStartTime,
              newEndTime
            );

            if (!result.success || !result.data) {
              throw new Error(result.error?.message ?? 'Failed to update');
            }

            upsertCustomEvent(result.data);
          } catch (error) {
            updateCustomEvent(eventIdNumber, {
              start_time: current.start_time,
              end_time: current.end_time,
            });

            console.error('Failed to resize custom event:', error);
            toast({
              title: "Couldn't update note",
              description: 'Please try again.',
              variant: 'destructive',
            });
          } finally {
            setIsSaving(false);
          }
        },
        [
          getCustomEventById,
          schedulingContext.config.endHour,
          schedulingContext.config.interval,
          schedulingContext.config.startHour,
          toast,
          updateCustomEvent,
          upsertCustomEvent,
        ]
      );

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

    const activityById = new Map<string, ItineraryActivityLike>(
      currentActivities.map((act) => [String(act.itinerary_activity_id), act] as const)
    );

    const rawSlotId = getSlotIdForActivity(activityIdString);
    const rawSlotActivityIds = rawSlotId ? getActivityIdsForSlot(rawSlotId) : [];
    const slotId =
      rawSlotId && isSlotAlternativeGroupValid(rawSlotActivityIds, activityById)
        ? rawSlotId
        : null;
    const slotActivityIds = slotId ? rawSlotActivityIds : [];
    const timeGroupCandidates =
      !slotId && previousActivity.date && previousActivity.start_time && previousActivity.end_time
        ? currentActivities.filter((act) => {
            if (act.deleted_at !== null) return false;
            return (
              String(act.date ?? "") === String(previousActivity.date) &&
              String(act.start_time ?? "") === String(previousActivity.start_time) &&
              String(act.end_time ?? "") === String(previousActivity.end_time)
            );
          })
        : [];

    const timeGroupIds =
      timeGroupCandidates.length > 1
        ? (() => {
            const keys = timeGroupCandidates
              .map((act) => getAlternativeGroupKey(act))
              .filter(Boolean);
            if (keys.length !== timeGroupCandidates.length) return [];
            const unique = new Set(keys);
            if (unique.size !== timeGroupCandidates.length) return [];
            return timeGroupCandidates.map((act) => String((act as any).itinerary_activity_id));
          })()
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

      const activeCustomEvent = (() => {
        if (!activeId || activeType !== 'custom-event') return null;

        const scheduled = scheduledCustomEvents.find(
          (evt) => String(evt.id) === String(activeId)
        );
        if (!scheduled) return null;

        if (!dragOverInfo) return scheduled;

        const targetDate =
          dragOverInfo.dayIndex != null ? days[dragOverInfo.dayIndex] : undefined;
        const targetSlot =
          dragOverInfo.slotIndex != null ? timeSlots[dragOverInfo.slotIndex] : undefined;
        if (!targetDate || !targetSlot) return scheduled;

        const interval = schedulingContext.config.interval;
        const spanSlots =
          dragOverInfo.spanSlots ?? Math.max(1, Math.ceil(scheduled.duration / interval));
        const visualDuration = spanSlots * interval;

        const startMinutes = targetSlot.hour * 60 + targetSlot.minute;
        const startTime = minutesToTimeString(startMinutes);
        const endTime = minutesToTimeString(startMinutes + visualDuration);

        return {
          ...scheduled,
          date: targetDate,
          startTime,
          endTime,
          duration: visualDuration,
          position: {
            day: dragOverInfo.dayIndex ?? scheduled.position.day,
            startSlot: dragOverInfo.slotIndex ?? scheduled.position.startSlot,
            span: spanSlots,
          },
        } satisfies ScheduledCustomEvent;
      })();

		  return {
		    // Drag handlers
		    handleDragStart,
		    handleDragOver,
	      handleDragMove,
		    handleDragEnd,
		    handleDragCancel,
		    handleResize,
        handleCustomEventResize,
		    
		    // State
		    activeId,
		    activeType,
		    activeActivity,
        activeCustomEvent,
	      dragOverInfo,
	      isSaving,
	    
	    // Utilities
	    scheduler
	  };
}
