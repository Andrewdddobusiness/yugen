"use client";

import React, { useState, useEffect } from 'react';
import { CalendarGrid } from './CalendarGrid';
import { useDateRangeStore } from '@/store/dateRangeStore';
import { useItineraryLayoutStore } from '@/store/itineraryLayoutStore';

interface GoogleCalendarViewProps {
  isLoading?: boolean;
  className?: string;
}

export function GoogleCalendarView({
  isLoading = false,
  className
}: GoogleCalendarViewProps) {
  const { startDate } = useDateRangeStore();
  const { saveViewState, getViewState } = useItineraryLayoutStore();
  
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

  // Save state when selectedDate changes
  useEffect(() => {
    saveViewState('calendar', {
      selectedDate: selectedDate.toISOString(),
    });
  }, [selectedDate, saveViewState]);

  // Save state when viewMode changes
  useEffect(() => {
    saveViewState('calendar', {
      viewMode,
    });
  }, [viewMode, saveViewState]);

  // Update selected date when startDate changes (only if not already set by user)
  useEffect(() => {
    if (startDate) {
      const newStartDate = new Date(startDate);
      // Only update if it's significantly different (not just a small time difference)
      if (Math.abs(newStartDate.getTime() - selectedDate.getTime()) > 24 * 60 * 60 * 1000) {
        setSelectedDate(newStartDate);
      }
    }
  }, [startDate, selectedDate]);

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
      selectedDate={selectedDate}
      viewMode={viewMode}
      onViewModeChange={setViewMode}
      onDateChange={setSelectedDate}
      className={className}
    />
  );
}
