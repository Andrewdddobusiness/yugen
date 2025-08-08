"use client";

import React, { useState, useMemo, useCallback } from 'react';
import { DndContext, DragOverlay, closestCorners, DragStartEvent, DragOverEvent, DragEndEvent } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { format, startOfWeek, endOfWeek, eachDayOfInterval, isSameDay } from 'date-fns';
import { useItineraryActivityStore } from '@/store/itineraryActivityStore';
import { DayColumn } from './DayColumn';
import { ActivityBlock } from './ActivityBlock';
import { TimeSlots } from './TimeSlots';
import { CalendarControls } from './CalendarControls';
import { cn } from '@/lib/utils';
import { setItineraryActivityDateTimes } from '@/actions/supabase/actions';
import { useToast } from '@/components/ui/use-toast';
import { checkActivityOverlap, findNearestValidSlot, timeToMinutes } from '@/utils/calendar/collisionDetection';

interface CalendarGridProps {
  selectedDate?: Date;
  viewMode?: 'day' | '3-day' | 'week';
  onViewModeChange?: (mode: 'day' | '3-day' | 'week') => void;
  className?: string;
}

interface TimeSlot {
  time: string;
  hour: number;
  minute: number;
  label: string;
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
  const [activeId, setActiveId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [dragOverInfo, setDragOverInfo] = useState<{
    dayIndex: number;
    slotIndex: number;
    hasConflict: boolean;
  } | null>(null);
  const { itineraryActivities, setItineraryActivities } = useItineraryActivityStore();
  const { toast } = useToast();

  // Generate time slots (30-minute intervals from 6:00 AM to 11:00 PM)
  const timeSlots: TimeSlot[] = useMemo(() => {
    const slots: TimeSlot[] = [];
    for (let hour = 6; hour <= 23; hour++) {
      for (let minute = 0; minute < 60; minute += 30) {
        const timeString = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
        const displayTime = minute === 0 ? 
          `${hour > 12 ? hour - 12 : hour === 0 ? 12 : hour}:00 ${hour >= 12 ? 'PM' : 'AM'}` :
          `${hour > 12 ? hour - 12 : hour === 0 ? 12 : hour}:30 ${hour >= 12 ? 'PM' : 'AM'}`;
        
        slots.push({
          time: timeString,
          hour,
          minute,
          label: displayTime
        });
      }
    }
    return slots;
  }, []);

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
          placeId: activity.place_id || '',
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

    // Find the activity being dragged
    const draggedActivity = scheduledActivities.find(act => act.id === active.id);
    if (!draggedActivity) {
      setDragOverInfo(null);
      return;
    }

    // Check for conflicts
    const proposedDate = format(targetDate, 'yyyy-MM-dd');
    const proposedStartTime = `${targetSlot.hour.toString().padStart(2, '0')}:${targetSlot.minute.toString().padStart(2, '0')}:00`;
    
    const existingActivities = itineraryActivities.map(act => ({
      id: act.itinerary_activity_id,
      date: act.date,
      startTime: act.start_time,
      endTime: act.end_time
    }));
    
    const conflicts = checkActivityOverlap(
      {
        date: proposedDate,
        startTime: proposedStartTime,
        endTime: `${Math.floor((targetSlot.hour * 60 + targetSlot.minute + draggedActivity.duration) / 60).toString().padStart(2, '0')}:${((targetSlot.hour * 60 + targetSlot.minute + draggedActivity.duration) % 60).toString().padStart(2, '0')}:00`
      },
      existingActivities,
      active.id as string
    );
    
    setDragOverInfo({
      dayIndex,
      slotIndex,
      hasConflict: conflicts.length > 0
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

    // Find the activity being dragged
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
          {/* Time Column */}
          <TimeSlots timeSlots={timeSlots} className="border-r border-gray-200" />

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
    </div>
  );
}