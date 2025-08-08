"use client";

import React, { useState, useEffect } from 'react';
import { CalendarGrid } from './CalendarGrid';
import { useDateRangeStore } from '@/store/dateRangeStore';

interface GoogleCalendarViewProps {
  isLoading?: boolean;
  className?: string;
}

export function GoogleCalendarView({
  isLoading = false,
  className
}: GoogleCalendarViewProps) {
  const { startDate } = useDateRangeStore();
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [viewMode, setViewMode] = useState<'day' | '3-day' | 'week'>('week');

  useEffect(() => {
    if (startDate) {
      setSelectedDate(new Date(startDate));
    }
  }, [startDate]);

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
      className={className}
    />
  );
}