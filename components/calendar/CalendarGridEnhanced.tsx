"use client";

import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { DndContext, DragOverlay, closestCenter, DragStartEvent, DragOverEvent, DragEndEvent, MouseSensor, TouchSensor, useSensor, useSensors } from '@dnd-kit/core';
import { format, startOfWeek, endOfWeek, eachDayOfInterval, isSameDay, isToday, addDays } from 'date-fns';
import { useParams } from 'next/navigation';
import { cn } from '@/lib/utils';
import { useItineraryActivityStore } from '@/store/itineraryActivityStore';
import { useTimeSchedulingStore } from '@/store/timeSchedulingStore';
import { GridHeader, TimeColumn, CurrentTimeIndicator } from './GridHeader';
import { GridNavigation, ViewMode, TimeInterval, MobileGridNavigation } from './GridNavigation';
import { GridCell, GridCellData, GridCellGroup } from './GridCell';
import { DropZone, DropZoneData, useDropZoneManager, DropPreview } from './DropZone';
import { ActivityBlock } from './ActivityBlock';
import { setItineraryActivityDateTimes, addItineraryActivity } from '@/actions/supabase/actions';
import { useToast } from '@/components/ui/use-toast';
import { detectConflicts, findOptimalTimeSlots, snapToTimeSlot } from '@/utils/calendar/collisionDetection';
import { estimateActivityDuration } from '@/utils/calendar/durationEstimation';
import { useMediaQuery } from '@/hooks/use-media-query';

interface CalendarGridEnhancedProps {
  selectedDate?: Date;
  defaultViewMode?: ViewMode;
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

/**
 * Enhanced calendar grid with comprehensive features
 */
export function CalendarGridEnhanced({
  selectedDate = new Date(),
  defaultViewMode = 'week',
  className
}: CalendarGridEnhancedProps) {
  const { destinationId } = useParams();
  const { itineraryActivities, setItineraryActivities } = useItineraryActivityStore();
  const schedulingStore = useTimeSchedulingStore();
  const { toast } = useToast();
  const isMobile = useMediaQuery('(max-width: 768px)');

  // State
  const [currentDate, setCurrentDate] = useState(selectedDate);
  const [viewMode, setViewMode] = useState<ViewMode>(isMobile ? 'day' : defaultViewMode);
  const [timeInterval, setTimeInterval] = useState<TimeInterval>(schedulingStore.timeGridConfig.interval as TimeInterval);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [selectedCells, setSelectedCells] = useState<Set<string>>(new Set());
  const [isDragging, setIsDragging] = useState(false);
  
  const dropZoneManager = useDropZoneManager();
  const gridRef = useRef<HTMLDivElement>(null);

  // Configure drag sensors
  const sensors = useSensors(
    useSensor(MouseSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 250,
        tolerance: 8,
      },
    })
  );

  // Generate time slots
  const timeSlots = useMemo(() => {
    const { startHour, endHour } = schedulingStore.timeGridConfig;
    const slots = [];
    let intervalIndex = 0;

    for (let hour = startHour; hour <= endHour; hour++) {
      const intervalsPerHour = 60 / timeInterval;
      
      for (let i = 0; i < intervalsPerHour; i++) {
        const minute = i * timeInterval;
        const timeString = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
        
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
  }, [schedulingStore.timeGridConfig, timeInterval]);

  // Generate days based on view mode
  const days = useMemo(() => {
    switch (viewMode) {
      case 'day':
        return [currentDate];
      case '3-day':
        return Array.from({ length: 3 }, (_, i) => addDays(currentDate, i));
      case 'week':
        const start = startOfWeek(currentDate, { weekStartsOn: 1 });
        const end = endOfWeek(currentDate, { weekStartsOn: 1 });
        return eachDayOfInterval({ start, end });
      default:
        return [currentDate];
    }
  }, [currentDate, viewMode]);

  // Convert activities to scheduled format
  const scheduledActivities = useMemo(() => {
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

  // Handle cell interactions
  const handleCellClick = useCallback((cell: GridCellData) => {
    if (isDragging) return;
    
    // TODO: Open quick add dialog for the selected time slot
    console.log('Cell clicked:', cell);
  }, [isDragging]);

  const handleCellDoubleClick = useCallback((cell: GridCellData) => {
    if (isDragging) return;
    
    // TODO: Open full activity creation dialog
    console.log('Cell double-clicked:', cell);
  }, [isDragging]);

  const handleCellSelect = useCallback((cell: GridCellData, isSelected: boolean) => {
    setSelectedCells(prev => {
      const next = new Set(prev);
      const cellId = `${cell.dayIndex}-${cell.timeSlot}`;
      
      if (isSelected) {
        next.add(cellId);
      } else {
        next.delete(cellId);
      }
      
      return next;
    });
  }, []);

  // Handle drag events
  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
    setIsDragging(true);
    dropZoneManager.clearDropZones();
  };

  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event;
    if (!over) return;

    const dragData = active.data?.current;
    const dropData = over.data?.current as DropZoneData;
    
    if (!dropData) return;

    // Validate drop and update visual feedback
    let canDrop = true;
    let conflicts: any[] = [];

    // Check for conflicts
    if (dragData?.type === 'wishlist-item' || dragData?.type === 'activity') {
      const duration = dragData.duration || 60;
      const proposedStartTime = dropData.timeSlot + ':00';
      const proposedEndMinutes = parseInt(dropData.timeSlot.split(':')[0]) * 60 + 
                               parseInt(dropData.timeSlot.split(':')[1]) + duration;
      const proposedEndTime = `${Math.floor(proposedEndMinutes / 60).toString().padStart(2, '0')}:${(proposedEndMinutes % 60).toString().padStart(2, '0')}:00`;

      const existingActivities = itineraryActivities.map(act => ({
        id: act.itinerary_activity_id,
        date: act.date,
        startTime: act.start_time,
        endTime: act.end_time
      }));

      conflicts = detectConflicts(
        {
          date: format(dropData.date, 'yyyy-MM-dd'),
          startTime: proposedStartTime,
          endTime: proposedEndTime,
          duration
        },
        existingActivities,
        undefined,
        schedulingStore.travelSettings.showTravelTime ? schedulingStore.travelSettings.bufferMinutes : undefined,
        dragData.id
      );

      canDrop = conflicts.filter(c => c.severity === 'high').length === 0;
    }

    dropZoneManager.registerDropZone(over.id.toString(), canDrop);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    setActiveId(null);
    setIsDragging(false);
    dropZoneManager.clearDropZones();

    const { active, over } = event;
    if (!over) return;

    const dragData = active.data?.current;
    const dropData = over.data?.current as GridCellData;
    
    if (!dropData) return;

    // Handle activity drop/move
    if (dragData?.type === 'wishlist-item') {
      await handleWishlistDrop(dragData.item, dropData);
    } else if (dragData?.type === 'activity') {
      await handleActivityMove(active.id as string, dropData);
    }
  };

  const handleWishlistDrop = async (wishlistItem: any, dropCell: GridCellData) => {
    if (!wishlistItem.activity) {
      toast({
        title: "Cannot schedule item",
        description: "This wishlist item is missing activity details.",
        variant: "destructive"
      });
      return;
    }

    const targetDate = dropCell.date;
    const startTime = dropCell.timeSlot + ':00';
    
    // Estimate duration intelligently
    const estimate = estimateActivityDuration(
      {
        place_id: wishlistItem.placeId,
        types: wishlistItem.activity.types || [],
        name: wishlistItem.activity.name,
        rating: wishlistItem.activity.rating,
        user_ratings_total: wishlistItem.activity.user_ratings_total
      },
      {
        timeOfDay: dropCell.timeSlot,
        isWeekend: targetDate.getDay() === 0 || targetDate.getDay() === 6
      }
    );

    const durationMinutes = estimate.duration;
    const endTimeMinutes = parseInt(dropCell.timeSlot.split(':')[0]) * 60 + 
                          parseInt(dropCell.timeSlot.split(':')[1]) + durationMinutes;
    const endTime = `${Math.floor(endTimeMinutes / 60).toString().padStart(2, '0')}:${(endTimeMinutes % 60).toString().padStart(2, '0')}:00`;

    try {
      const result = await addItineraryActivity(
        wishlistItem.placeId,
        wishlistItem.activity.activity_id || null,
        format(targetDate, 'yyyy-MM-dd'),
        startTime,
        endTime,
        destinationId as string
      );

      if (result.success && result.data) {
        const newActivity = {
          ...result.data,
          activity: wishlistItem.activity
        };

        setItineraryActivities([...itineraryActivities, newActivity]);

        toast({
          title: "Activity scheduled",
          description: `${wishlistItem.activity.name} has been added to your itinerary.`,
        });
      }
    } catch (error) {
      console.error('Error scheduling activity:', error);
      toast({
        title: "Failed to schedule",
        description: "Could not add this item to your itinerary.",
        variant: "destructive"
      });
    }
  };

  const handleActivityMove = async (activityId: string, dropCell: GridCellData) => {
    const activity = scheduledActivities.find(a => a.id === activityId);
    if (!activity) return;

    const newDate = format(dropCell.date, 'yyyy-MM-dd');
    const newStartTime = dropCell.timeSlot + ':00';
    const endTimeMinutes = parseInt(dropCell.timeSlot.split(':')[0]) * 60 + 
                          parseInt(dropCell.timeSlot.split(':')[1]) + activity.duration;
    const newEndTime = `${Math.floor(endTimeMinutes / 60).toString().padStart(2, '0')}:${(endTimeMinutes % 60).toString().padStart(2, '0')}:00`;

    const updatedActivity = {
      ...itineraryActivities.find(a => a.itinerary_activity_id === activityId)!,
      date: newDate,
      start_time: newStartTime,
      end_time: newEndTime
    };

    // Optimistically update
    setItineraryActivities(
      itineraryActivities.map(a => 
        a.itinerary_activity_id === activityId ? updatedActivity : a
      )
    );

    try {
      const result = await setItineraryActivityDateTimes(
        activityId,
        newDate,
        newStartTime,
        newEndTime
      );

      if (result.success) {
        toast({
          title: "Activity moved",
          description: `${activity.activity?.name || 'Activity'} has been rescheduled.`,
        });
      } else {
        throw new Error(result.message || 'Failed to update activity');
      }
    } catch (error) {
      console.error('Error moving activity:', error);
      
      // Revert on error
      setItineraryActivities(itineraryActivities);
      
      toast({
        title: "Failed to move",
        description: "Could not reschedule the activity.",
        variant: "destructive"
      });
    }
  };

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // TODO: Implement keyboard navigation
      // Arrow keys to move between cells
      // Enter/Space to activate cell
      // Escape to cancel operations
    };

    if (gridRef.current) {
      gridRef.current.addEventListener('keydown', handleKeyDown);
      return () => gridRef.current?.removeEventListener('keydown', handleKeyDown);
    }
  }, []);

  const activeActivity = scheduledActivities.find(act => act.id === activeId);

  return (
    <div className={cn("flex flex-col h-full bg-white", className)}>
      {/* Navigation */}
      {isMobile ? (
        <MobileGridNavigation
          currentDate={currentDate}
          viewMode={viewMode}
          onDateChange={setCurrentDate}
          onViewModeChange={setViewMode}
          onTodayClick={() => setCurrentDate(new Date())}
        />
      ) : (
        <GridNavigation
          currentDate={currentDate}
          viewMode={viewMode}
          timeInterval={timeInterval}
          onDateChange={setCurrentDate}
          onViewModeChange={setViewMode}
          onTimeIntervalChange={setTimeInterval}
          onTodayClick={() => setCurrentDate(new Date())}
        />
      )}

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
      >
        <div ref={gridRef} className="flex-1 flex flex-col overflow-hidden">
          {/* Grid Header */}
          <GridHeader
            dates={days}
            viewMode={viewMode}
            showWeather={false}
          />

          {/* Grid Body */}
          <div className="flex-1 flex overflow-auto">
            {/* Time Column */}
            <TimeColumn
              timeSlots={timeSlots}
              interval={timeInterval}
              isCompact={viewMode === 'week' || isMobile}
            />

            {/* Day Columns */}
            <div className="flex-1 flex relative">
              {/* Current time indicator */}
              {days.some(day => isToday(day)) && (
                <CurrentTimeIndicator
                  timeSlots={timeSlots}
                  interval={timeInterval}
                  className="z-20"
                />
              )}

              {/* Day columns with cells */}
              {days.map((day, dayIndex) => {
                const isCurrentDay = isToday(day);
                const dayActivities = scheduledActivities.filter(a => a.position.day === dayIndex);

                return (
                  <div
                    key={format(day, 'yyyy-MM-dd')}
                    className={cn(
                      "flex-1 flex flex-col relative",
                      dayIndex < days.length - 1 && "border-r border-gray-200"
                    )}
                  >
                    {/* Time slots */}
                    {timeSlots.map((slot, slotIndex) => {
                      const cellData: GridCellData = {
                        dayIndex,
                        timeSlot: slot.time,
                        date: day,
                        isDropZone: true,
                        isOccupied: dayActivities.some(a => 
                          slotIndex >= a.position.startSlot && 
                          slotIndex < a.position.startSlot + a.position.span
                        ),
                        hasConflict: false,
                        isSelected: selectedCells.has(`${dayIndex}-${slot.time}`),
                        isHighlighted: false,
                        isCurrentTime: isCurrentDay && (() => {
                          const now = new Date();
                          const currentMinutes = now.getHours() * 60 + now.getMinutes();
                          const slotStart = slot.hour * 60 + slot.minute;
                          const slotEnd = slotStart + timeInterval;
                          return currentMinutes >= slotStart && currentMinutes < slotEnd;
                        })(),
                        isBusinessHours: true // TODO: Implement business hours check
                      };

                      const dropZoneData: DropZoneData = {
                        dayIndex,
                        timeSlot: slot.time,
                        date: day,
                        canDrop: !cellData.isOccupied
                      };

                      return (
                        <DropZone
                          key={`${dayIndex}-${slotIndex}`}
                          data={dropZoneData}
                          isDraggingGlobal={isDragging}
                          className="border-b border-gray-100"
                          style={{ height: timeInterval === 15 ? 30 : timeInterval === 30 ? 48 : 60 }}
                        >
                          <GridCell
                            cell={cellData}
                            isOver={false}
                            isDragging={isDragging}
                            onCellClick={handleCellClick}
                            onCellDoubleClick={handleCellDoubleClick}
                            onCellSelect={handleCellSelect}
                            className="h-full"
                          />
                        </DropZone>
                      );
                    })}

                    {/* Activity blocks */}
                    <div className="absolute inset-0 pointer-events-none">
                      {dayActivities.map((activity) => {
                        const slotHeight = timeInterval === 15 ? 30 : timeInterval === 30 ? 48 : 60;
                        
                        return (
                          <div
                            key={activity.id}
                            className="absolute pointer-events-auto"
                            style={{
                              top: `${activity.position.startSlot * slotHeight}px`,
                              height: `${activity.position.span * slotHeight}px`,
                              left: '4px',
                              right: '4px',
                              zIndex: 10
                            }}
                          >
                            <ActivityBlock
                              activity={activity}
                              className="h-full"
                            />
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
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