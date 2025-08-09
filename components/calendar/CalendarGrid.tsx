"use client";

import React, { useState, useMemo, useCallback } from 'react';
import { DndContext, DragOverlay, closestCorners, DragStartEvent, DragOverEvent, DragEndEvent } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { format, startOfWeek, endOfWeek, eachDayOfInterval, isSameDay } from 'date-fns';
import { useParams } from 'next/navigation';
import { useItineraryActivityStore } from '@/store/itineraryActivityStore';
import { DayColumn } from './DayColumn';
import { ActivityBlock } from './ActivityBlock';
import { TimeGrid, TimeSlot } from './TimeGrid';
import { CalendarControls } from './CalendarControls';
import { ConflictResolver, TimeConflict } from './ConflictResolver';
import { cn } from '@/lib/utils';
import { setItineraryActivityDateTimes, addItineraryActivity } from '@/actions/supabase/actions';
import { useToast } from '@/components/ui/use-toast';
import { 
  checkActivityOverlap, 
  findNearestValidSlot, 
  timeToMinutes,
  detectConflicts,
  snapToTimeSlot
} from '@/utils/calendar/collisionDetection';
import { estimateActivityDuration } from '@/utils/calendar/durationEstimation';
import { useTimeSchedulingStore, useSchedulingContext } from '@/store/timeSchedulingStore';

interface CalendarGridProps {
  selectedDate?: Date;
  viewMode?: 'day' | '3-day' | 'week';
  onViewModeChange?: (mode: 'day' | '3-day' | 'week') => void;
  className?: string;
}


interface ScheduledActivity {
  id: string;
  activityId: string;
  placeId: string;
  date: Date;
  startTime: string;
  endTime: string;
  duration: number;
  position: { day: number; startSlot: number; span: number };
  activity?: {
    name: string;
    address?: string;
    coordinates?: [number, number];
  };
}

export function CalendarGrid({
  selectedDate = new Date(),
  viewMode = 'week',
  onViewModeChange,
  className
}: CalendarGridProps) {
  const { destinationId } = useParams();
  const [activeId, setActiveId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [dragOverInfo, setDragOverInfo] = useState<{
    dayIndex: number;
    slotIndex: number;
    hasConflict: boolean;
  } | null>(null);
  const [conflicts, setConflicts] = useState<TimeConflict[]>([]);
  const [showConflictResolver, setShowConflictResolver] = useState(false);
  
  const { itineraryActivities, setItineraryActivities } = useItineraryActivityStore();
  const { toast } = useToast();
  const schedulingContext = useSchedulingContext();
  const { 
    updateTimeGridConfig,
    startSchedulingSession,
    endSchedulingSession,
    updateSchedulingSession 
  } = useTimeSchedulingStore();

  // Generate time slots using enhanced TimeGrid system
  const timeSlots: TimeSlot[] = useMemo(() => {
    const { interval, startHour, endHour } = schedulingContext.config;
    const slots: TimeSlot[] = [];
    let intervalIndex = 0;

    for (let hour = startHour; hour <= endHour; hour++) {
      const intervalsPerHour = 60 / interval;
      
      for (let i = 0; i < intervalsPerHour; i++) {
        const minute = i * interval;
        const timeString = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
        
        // Format display time
        let displayTime: string;
        if (minute === 0) {
          const displayHour = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
          displayTime = `${displayHour}:00 ${hour >= 12 ? 'PM' : 'AM'}`;
        } else {
          const displayHour = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
          displayTime = `${displayHour}:${minute.toString().padStart(2, '0')} ${hour >= 12 ? 'PM' : 'AM'}`;
        }

        slots.push({
          time: timeString,
          hour,
          minute,
          label: displayTime,
          isHour: minute === 0,
          intervalIndex
        });

        intervalIndex++;
      }
    }

    return slots;
  }, [schedulingContext.config]);

  // Generate days based on view mode
  const days = useMemo(() => {
    switch (viewMode) {
      case 'day':
        return [selectedDate];
      case '3-day':
        return [
          selectedDate,
          new Date(selectedDate.getTime() + 24 * 60 * 60 * 1000),
          new Date(selectedDate.getTime() + 2 * 24 * 60 * 60 * 1000)
        ];
      case 'week':
      default:
        const start = startOfWeek(selectedDate, { weekStartsOn: 1 }); // Monday
        const end = endOfWeek(selectedDate, { weekStartsOn: 1 });
        return eachDayOfInterval({ start, end });
    }
  }, [selectedDate, viewMode]);

  // Convert itinerary activities to scheduled activities
  const scheduledActivities: ScheduledActivity[] = useMemo(() => {
    return itineraryActivities
      .filter(activity => activity.date && activity.start_time && activity.end_time)
      .map(activity => {
        const activityDate = new Date(activity.date);
        const dayIndex = days.findIndex(day => isSameDay(day, activityDate));
        
        if (dayIndex === -1) return null;

        const [startHour, startMinute] = activity.start_time.split(':').map(Number);
        const [endHour, endMinute] = activity.end_time.split(':').map(Number);
        
        const startSlot = timeSlots.findIndex(slot => 
          slot.hour === startHour && slot.minute === startMinute
        );
        const endSlot = timeSlots.findIndex(slot => 
          slot.hour === endHour && slot.minute === endMinute
        );
        
        const span = Math.max(1, endSlot - startSlot);
        const duration = (endHour * 60 + endMinute) - (startHour * 60 + startMinute);

        return {
          id: activity.itinerary_activity_id,
          activityId: activity.activity_id || '',
          placeId: activity.activity?.place_id || '',
          date: activityDate,
          startTime: activity.start_time,
          endTime: activity.end_time,
          duration,
          position: {
            day: dayIndex,
            startSlot: Math.max(0, startSlot),
            span: Math.max(1, span)
          },
          activity: activity.activity
        };
      })
      .filter(Boolean) as ScheduledActivity[];
  }, [itineraryActivities, days, timeSlots]);

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragOver = (event: DragOverEvent) => {
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
        const estimate = estimateActivityDuration(
          {
            place_id: dragData.item.placeId,
            types: dragData.item.activity.types || [],
            name: dragData.item.activity.name,
            rating: dragData.item.activity.rating,
            user_ratings_total: dragData.item.activity.user_ratings_total
          },
          {
            timeOfDay: `${targetSlot.hour}:${targetSlot.minute}`,
            isWeekend: targetDate.getDay() === 0 || targetDate.getDay() === 6
          }
        );
        duration = estimate.duration;
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
    const proposedEndTime = `${Math.floor((targetSlot.hour * 60 + targetSlot.minute + duration) / 60).toString().padStart(2, '0')}:${((targetSlot.hour * 60 + targetSlot.minute + duration) % 60).toString().padStart(2, '0')}:00`;
    
    const existingActivities = itineraryActivities.map(act => ({
      id: act.itinerary_activity_id,
      date: act.date,
      startTime: act.start_time,
      endTime: act.end_time
    }));
    
    // Use enhanced conflict detection
    const detectedConflicts = detectConflicts(
      {
        date: proposedDate,
        startTime: proposedStartTime,
        endTime: proposedEndTime,
        placeId: placeData?.place_id,
        duration
      },
      existingActivities,
      undefined, // business hours - could be enhanced later
      schedulingContext.travelSettings.showTravelTime ? schedulingContext.travelSettings.bufferMinutes : undefined,
      excludeId || undefined
    );
    
    const hasHighSeverityConflicts = detectedConflicts.some(c => c.severity === 'high');
    
    setDragOverInfo({
      dayIndex,
      slotIndex,
      hasConflict: hasHighSeverityConflicts
    });
  };

  const handleResize = useCallback(async (activityId: string, newDuration: number, resizeDirection: 'top' | 'bottom') => {
    // Find the activity being resized
    const activityToResize = itineraryActivities.find(act => act.itinerary_activity_id === activityId);
    if (!activityToResize || !activityToResize.start_time || !activityToResize.end_time) return;

    const startMinutes = timeToMinutes(activityToResize.start_time);
    const endMinutes = timeToMinutes(activityToResize.end_time);
    
    let newStartTime: string;
    let newEndTime: string;
    
    if (resizeDirection === 'bottom') {
      // Resizing the end time
      const newEndMinutes = startMinutes + newDuration;
      newStartTime = activityToResize.start_time;
      newEndTime = `${Math.floor(newEndMinutes / 60).toString().padStart(2, '0')}:${(newEndMinutes % 60).toString().padStart(2, '0')}:00`;
    } else {
      // Resizing the start time
      const newStartMinutes = endMinutes - newDuration;
      newStartTime = `${Math.floor(newStartMinutes / 60).toString().padStart(2, '0')}:${(newStartMinutes % 60).toString().padStart(2, '0')}:00`;
      newEndTime = activityToResize.end_time;
    }

    // Update activity optimistically
    const updatedActivity = {
      ...activityToResize,
      start_time: newStartTime,
      end_time: newEndTime
    };

    const updatedActivities = itineraryActivities.map(act =>
      act.itinerary_activity_id === activityId ? updatedActivity : act
    );
    
    setItineraryActivities(updatedActivities);

    // Save to database
    setIsSaving(true);
    try {
      const result = await setItineraryActivityDateTimes(
        activityId,
        activityToResize.date,
        newStartTime,
        newEndTime
      );

      if (result.success) {
        toast({
          title: "Activity resized",
          description: `Duration updated to ${Math.floor(newDuration / 60)}h ${newDuration % 60}m`,
        });
      } else {
        throw new Error(result.message || 'Failed to resize activity');
      }
    } catch (error) {
      console.error('Error resizing activity:', error);
      
      // Revert on error
      setItineraryActivities(itineraryActivities);
      
      toast({
        title: "Failed to resize",
        description: "Could not resize the activity. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsSaving(false);
    }
  }, [itineraryActivities, setItineraryActivities, toast]);

  const handleWishlistItemDrop = async (wishlistItem: any, targetDate: Date, targetSlot: any) => {
    if (!wishlistItem.activity) {
      toast({
        title: "Cannot schedule item",
        description: "This wishlist item is missing activity details.",
        variant: "destructive"
      });
      return;
    }

    const newDate = format(targetDate, 'yyyy-MM-dd');
    const startTime = `${targetSlot.hour.toString().padStart(2, '0')}:${targetSlot.minute.toString().padStart(2, '0')}:00`;
    
    // Determine duration - use activity suggestion or default to 1 hour
    const durationMinutes = wishlistItem.activity.duration || 60;
    const endTimeMinutes = (targetSlot.hour * 60 + targetSlot.minute) + durationMinutes;
    const endTime = `${Math.floor(endTimeMinutes / 60).toString().padStart(2, '0')}:${(endTimeMinutes % 60).toString().padStart(2, '0')}:00`;

    setIsSaving(true);
    try {
      const result = await addItineraryActivity(
        wishlistItem.placeId,
        wishlistItem.activity.activity_id || null,
        newDate,
        startTime,
        endTime,
        destinationId as string
      );

      if (result.success && result.data) {
        // Add the new activity to the store
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

        setItineraryActivities([...itineraryActivities, newActivity]);

        toast({
          title: "Activity scheduled",
          description: `${wishlistItem.activity.name} has been added to your itinerary.`,
        });
      } else {
        throw new Error(result.error || result.message || 'Failed to schedule activity');
      }
    } catch (error) {
      console.error('Error scheduling wishlist item:', error);
      toast({
        title: "Failed to schedule",
        description: "Could not add this item to your itinerary. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
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

    // Update the activity with new date and time
    const updatedItineraryActivity = itineraryActivities.find(
      act => act.itinerary_activity_id === active.id
    );

    if (updatedItineraryActivity) {
      const newDate = format(targetDate, 'yyyy-MM-dd');
      const proposedStartTime = `${targetSlot.hour.toString().padStart(2, '0')}:${targetSlot.minute.toString().padStart(2, '0')}:00`;
      
      // Check for collisions
      const existingActivities = itineraryActivities.map(act => ({
        id: act.itinerary_activity_id,
        date: act.date,
        startTime: act.start_time,
        endTime: act.end_time
      }));
      
      const validSlot = findNearestValidSlot(
        proposedStartTime,
        draggedActivity.duration,
        newDate,
        existingActivities,
        active.id as string
      );
      
      if (!validSlot) {
        toast({
          title: "No available time slot",
          description: "Could not find an available time slot for this activity.",
          variant: "destructive"
        });
        return;
      }
      
      const { startTime: newStartTime, endTime: newEndTime } = validSlot;
      
      // Check if we had to adjust the time due to conflicts
      if (newStartTime !== proposedStartTime) {
        toast({
          title: "Time adjusted",
          description: "Activity time was adjusted to avoid conflicts.",
        });
      }

      const updatedActivity = {
        ...updatedItineraryActivity,
        date: newDate,
        start_time: newStartTime,
        end_time: newEndTime
      };

      // Optimistically update the store
      const updatedActivities = itineraryActivities.map(act =>
        act.itinerary_activity_id === active.id ? updatedActivity : act
      );
      
      setItineraryActivities(updatedActivities);

      // Auto-save to database
      setIsSaving(true);
      try {
        const result = await setItineraryActivityDateTimes(
          updatedActivity.itinerary_activity_id,
          newDate,
          newStartTime,
          newEndTime
        );

        if (result.success) {
          toast({
            title: "Activity updated",
            description: `${updatedActivity.activity?.name || 'Activity'} moved successfully`,
          });
        } else {
          throw new Error(result.message || 'Failed to update activity');
        }
      } catch (error) {
        console.error('Error saving activity:', error);
        
        // Revert on error
        setItineraryActivities(itineraryActivities);
        
        toast({
          title: "Failed to save",
          description: "Could not save the activity position. Please try again.",
          variant: "destructive"
        });
      } finally {
        setIsSaving(false);
      }
    }
  };

  const activeActivity = scheduledActivities.find(act => act.id === activeId);

  return (
    <div className={cn("flex flex-col h-full bg-white", className)}>
      {/* Calendar Controls */}
      <CalendarControls
        selectedDate={selectedDate}
        viewMode={viewMode}
        onViewModeChange={onViewModeChange}
        className="border-b border-gray-200"
      />

      {/* Saving Indicator */}
      {isSaving && (
        <div className="absolute top-16 right-4 bg-white rounded-lg shadow-lg p-2 flex items-center space-x-2 z-50">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
          <span className="text-sm text-gray-600">Saving...</span>
        </div>
      )}

      <DndContext
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
      >
        <div className="flex-1 flex overflow-hidden">
          {/* Time Column using enhanced TimeGrid */}
          <TimeGrid 
            config={schedulingContext.config}
            className="border-r border-gray-200"
          >
            {(slots) => (
              <div className="w-20 flex-shrink-0 bg-gray-50">
                <div className="h-12 border-b border-gray-200" />
                <div className="relative">
                  {slots.map((slot) => {
                    const slotHeight = schedulingContext.config.interval === 15 ? 30 : 
                                    schedulingContext.config.interval === 30 ? 48 : 60;
                    
                    return (
                      <div
                        key={slot.time}
                        className={cn(
                          "border-b relative",
                          slot.isHour ? "border-gray-200" : "border-gray-100"
                        )}
                        style={{ height: `${slotHeight}px` }}
                      >
                        {(slot.isHour || schedulingContext.config.interval === 15) && (
                          <div 
                            className={cn(
                              "absolute -top-2 right-2 text-xs px-1 bg-gray-50",
                              slot.isHour ? "text-gray-700 font-medium" : "text-gray-500"
                            )}
                          >
                            {schedulingContext.config.interval === 15 || slot.isHour ? slot.label : ''}
                          </div>
                        )}
                        {slot.isHour && (
                          <div className="absolute left-0 top-0 w-2 h-px bg-gray-300" />
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </TimeGrid>

          {/* Days Grid */}
          <div className="flex-1 flex">
            {days.map((day, dayIndex) => (
              <DayColumn
                key={format(day, 'yyyy-MM-dd')}
                date={day}
                dayIndex={dayIndex}
                timeSlots={timeSlots}
                activities={scheduledActivities.filter(act => act.position.day === dayIndex)}
                dragOverInfo={dragOverInfo}
                onResize={handleResize}
                className={dayIndex < days.length - 1 ? "border-r border-gray-200" : ""}
              />
            ))}
          </div>
        </div>

        {/* Drag Overlay */}
        <DragOverlay>
          {activeActivity && (
            <ActivityBlock
              activity={activeActivity}
              isOverlay
              className="opacity-80 rotate-3 shadow-lg"
            />
          )}
        </DragOverlay>
      </DndContext>

      {/* Conflict Resolution Dialog */}
      <ConflictResolver
        conflicts={conflicts}
        isOpen={showConflictResolver}
        onClose={() => setShowConflictResolver(false)}
        onResolve={async (resolutions) => {
          // Handle conflict resolutions
          try {
            for (const resolution of resolutions) {
              // Apply the selected resolution
              // This would involve updating the activity times, duration, etc.
              console.log('Applying resolution:', resolution);
            }
            setConflicts([]);
            toast({
              title: "Conflicts resolved",
              description: `${resolutions.length} conflict${resolutions.length > 1 ? 's' : ''} resolved successfully.`,
            });
          } catch (error) {
            console.error('Failed to resolve conflicts:', error);
            toast({
              title: "Failed to resolve conflicts",
              description: "Some conflicts could not be resolved. Please try again.",
              variant: "destructive"
            });
          }
        }}
      />
    </div>
  );
}