import React from 'react';
import { DndContext, DragOverlay, closestCorners } from '@dnd-kit/core';
import { format } from 'date-fns';
import { DayColumn } from './DayColumn';
import { ActivityBlock } from './ActivityBlock';
import { TimeGrid } from './TimeGrid';
import { CalendarControls } from './CalendarControls';
import { ConflictResolver, TimeConflict } from './ConflictResolver';
import { cn } from '@/lib/utils';
import { useSchedulingContext } from '@/store/timeSchedulingStore';
import { ScheduledActivity } from './hooks/useScheduledActivities';
import { TimeSlot } from './TimeGrid';

interface CalendarLayoutProps {
  // Calendar configuration
  selectedDate: Date;
  viewMode: 'day' | '3-day' | 'week';
  onViewModeChange?: (mode: 'day' | '3-day' | 'week') => void;
  onDateChange?: (date: Date) => void;
  className?: string;
  
  // Data
  days: Date[];
  timeSlots: TimeSlot[];
  scheduledActivities: ScheduledActivity[];
  
  // Drag & drop handlers
  onDragStart: (event: any) => void;
  onDragOver: (event: any) => void;
  onDragEnd: (event: any) => void;
  onResize: (activityId: string, newDuration: number, resizeDirection: 'top' | 'bottom') => void;
  
  // State
  activeActivity?: ScheduledActivity | null;
  dragOverInfo?: {
    dayIndex: number;
    slotIndex: number;
    hasConflict: boolean;
  } | null;
  isSaving: boolean;
  
  // Conflict resolution (optional for now)
  conflicts?: TimeConflict[];
  showConflictResolver?: boolean;
  onCloseConflictResolver?: () => void;
  onResolveConflicts?: (resolutions: any[]) => void;
}

/**
 * CalendarLayout - Main layout component for calendar grid
 * 
 * Features:
 * - Responsive calendar grid layout
 * - Time column with configurable intervals
 * - Day columns for activities
 * - Drag & drop context
 * - Loading indicators
 * - Conflict resolution UI
 * 
 * This component focuses on layout and UI structure while delegating
 * business logic to hooks and services.
 */
export function CalendarLayout({
  selectedDate,
  viewMode,
  onViewModeChange,
  onDateChange,
  className,
  days,
  timeSlots,
  scheduledActivities,
  onDragStart,
  onDragOver,
  onDragEnd,
  onResize,
  activeActivity,
  dragOverInfo,
  isSaving,
  conflicts = [],
  showConflictResolver = false,
  onCloseConflictResolver,
  onResolveConflicts
}: CalendarLayoutProps) {
  const schedulingContext = useSchedulingContext();

  return (
    <div className={cn("flex flex-col h-full bg-white", className)}>
      {/* Calendar Controls */}
      <CalendarControls
        selectedDate={selectedDate}
        viewMode={viewMode}
        onViewModeChange={onViewModeChange}
        onDateChange={onDateChange}
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
        onDragStart={onDragStart}
        onDragOver={onDragOver}
        onDragEnd={onDragEnd}
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
                onResize={onResize}
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
      {onCloseConflictResolver && onResolveConflicts && (
        <ConflictResolver
          conflicts={conflicts}
          isOpen={showConflictResolver}
          onClose={onCloseConflictResolver}
          onResolve={onResolveConflicts}
        />
      )}
    </div>
  );
}