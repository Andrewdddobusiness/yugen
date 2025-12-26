"use client";

import React, { useState, useEffect } from 'react';
import { CalendarGrid } from './CalendarGrid';
import { useDateRangeStore } from '@/store/dateRangeStore';
import { useItineraryLayoutStore } from '@/store/itineraryLayoutStore';

interface GoogleCalendarViewProps {
  isLoading?: boolean;
  className?: string;
  selectedDate?: Date;
  onSelectedDateChange?: (date: Date) => void;
  useExternalDndContext?: boolean;
}

export function GoogleCalendarView({
  isLoading = false,
  className,
  selectedDate: controlledSelectedDate,
  onSelectedDateChange,
  useExternalDndContext = false,
}: GoogleCalendarViewProps) {
  const { startDate } = useDateRangeStore();
  const { saveViewState, getViewState } = useItineraryLayoutStore();

  const controlledSelectedDateTime = controlledSelectedDate?.getTime() ?? null;
  const isControlled = controlledSelectedDateTime !== null;
  
  // Initialize state from store or defaults
  const [selectedDate, setSelectedDate] = useState<Date>(() => {
    const viewState = getViewState('calendar');
    if (viewState.selectedDate) {
      return new Date(viewState.selectedDate);
    }
    return startDate ? new Date(startDate) : new Date();
  });
  
  const [viewMode, setViewMode] = useState<'day' | '3-day' | 'week' | 'month'>(() => {
    const viewState = getViewState('calendar');
    return viewState.viewMode || 'week';
  });

  const effectiveSelectedDate = isControlled
    ? (controlledSelectedDate as Date)
    : selectedDate;
  const effectiveSelectedDateTime = isControlled
    ? (controlledSelectedDateTime as number)
    : selectedDate.getTime();

  // Save state when selectedDate changes
  useEffect(() => {
    saveViewState('calendar', {
      selectedDate: new Date(effectiveSelectedDateTime).toISOString(),
    });
  }, [effectiveSelectedDateTime, saveViewState]);

  // Save state when viewMode changes
  useEffect(() => {
    saveViewState('calendar', {
      viewMode,
    });
  }, [viewMode, saveViewState]);

  // Update selected date when startDate changes (only if not already set by user)
  useEffect(() => {
    if (!startDate) return;
    if (isControlled) return;

    const newStartDate = new Date(startDate);
    // Only update if it's significantly different (not just a small time difference)
    if (
      Math.abs(newStartDate.getTime() - effectiveSelectedDateTime) >
      24 * 60 * 60 * 1000
    ) {
      setSelectedDate(newStartDate);
    }
  }, [startDate, isControlled, effectiveSelectedDateTime]);

  // Sync internal state when controlled date changes (keeps viewState and smooth transitions consistent)
  useEffect(() => {
    if (controlledSelectedDateTime === null) return;
    setSelectedDate((prev) => {
      if (prev.getTime() === controlledSelectedDateTime) return prev;
      return new Date(controlledSelectedDateTime);
    });
  }, [controlledSelectedDateTime]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full bg-white">
        <div className="flex flex-col items-center space-y-2">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <p className="text-sm text-gray-600">Loading calendar...</p>
        </div>
      </div>
    );
  }

  return (
    <CalendarGrid
      selectedDate={effectiveSelectedDate}
      viewMode={viewMode}
      onViewModeChange={setViewMode}
      onDateChange={(date) => {
        if (!isControlled) {
          setSelectedDate(date);
        }
        onSelectedDateChange?.(date);
      }}
      className={className}
      useExternalDndContext={useExternalDndContext}
    />
  );
}
