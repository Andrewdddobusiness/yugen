"use client";

import React from 'react';
import { format, addDays, subDays, addWeeks, subWeeks, isToday } from 'date-fns';
import { ChevronLeft, ChevronRight, Calendar, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface CalendarControlsProps {
  selectedDate: Date;
  viewMode: 'day' | '3-day' | 'week';
  onDateChange?: (date: Date) => void;
  onViewModeChange?: (mode: 'day' | '3-day' | 'week') => void;
  className?: string;
}

export function CalendarControls({
  selectedDate,
  viewMode,
  onDateChange,
  onViewModeChange,
  className
}: CalendarControlsProps) {

  const handlePrevious = () => {
    if (!onDateChange) return;
    
    switch (viewMode) {
      case 'day':
        onDateChange(subDays(selectedDate, 1));
        break;
      case '3-day':
        onDateChange(subDays(selectedDate, 3));
        break;
      case 'week':
        onDateChange(subWeeks(selectedDate, 1));
        break;
    }
  };

  const handleNext = () => {
    if (!onDateChange) return;
    
    switch (viewMode) {
      case 'day':
        onDateChange(addDays(selectedDate, 1));
        break;
      case '3-day':
        onDateChange(addDays(selectedDate, 3));
        break;
      case 'week':
        onDateChange(addWeeks(selectedDate, 1));
        break;
    }
  };

  const handleToday = () => {
    if (onDateChange) {
      onDateChange(new Date());
    }
  };

  const getDateRangeText = () => {
    switch (viewMode) {
      case 'day':
        return format(selectedDate, 'EEEE, MMMM d, yyyy');
      case '3-day':
        const threeDayEnd = addDays(selectedDate, 2);
        if (selectedDate.getMonth() === threeDayEnd.getMonth()) {
          return `${format(selectedDate, 'MMM d')} - ${format(threeDayEnd, 'd, yyyy')}`;
        } else {
          return `${format(selectedDate, 'MMM d')} - ${format(threeDayEnd, 'MMM d, yyyy')}`;
        }
      case 'week':
        const weekEnd = addDays(selectedDate, 6);
        if (selectedDate.getMonth() === weekEnd.getMonth()) {
          return `${format(selectedDate, 'MMM d')} - ${format(weekEnd, 'd, yyyy')}`;
        } else {
          return `${format(selectedDate, 'MMM d')} - ${format(weekEnd, 'MMM d, yyyy')}`;
        }
    }
  };

  return (
    <div className={cn("flex items-center justify-between p-4 bg-white", className)}>
      {/* Date Navigation */}
      <div className="flex items-center space-x-4">
        <div className="flex items-center space-x-1">
          <Button
            variant="outline"
            size="sm"
            onClick={handlePrevious}
            className="h-8 w-8 p-0"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            onClick={handleNext}
            className="h-8 w-8 p-0"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        <Button
          variant={isToday(selectedDate) ? "default" : "outline"}
          size="sm"
          onClick={handleToday}
          className="h-8"
        >
          Today
        </Button>

        <div className="text-lg font-semibold text-gray-900">
          {getDateRangeText()}
        </div>
      </div>

      {/* View Mode Controls */}
      <div className="flex items-center space-x-2">
        <div className="flex items-center bg-gray-100 rounded-lg p-1">
          <Button
            variant={viewMode === 'day' ? "default" : "ghost"}
            size="sm"
            onClick={() => onViewModeChange?.('day')}
            className="h-7 text-xs"
          >
            Day
          </Button>
          <Button
            variant={viewMode === '3-day' ? "default" : "ghost"}
            size="sm"
            onClick={() => onViewModeChange?.('3-day')}
            className="h-7 text-xs"
          >
            3 Days
          </Button>
          <Button
            variant={viewMode === 'week' ? "default" : "ghost"}
            size="sm"
            onClick={() => onViewModeChange?.('week')}
            className="h-7 text-xs"
          >
            Week
          </Button>
        </div>

        {/* Time Zone Indicator */}
        <div className="flex items-center space-x-1 text-sm text-gray-500 ml-4">
          <Clock className="h-4 w-4" />
          <span>{Intl.DateTimeFormat().resolvedOptions().timeZone}</span>
        </div>
      </div>
    </div>
  );
}