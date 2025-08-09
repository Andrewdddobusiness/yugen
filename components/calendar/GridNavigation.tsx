"use client";

import React from 'react';
import { ChevronLeft, ChevronRight, Calendar, Clock, Grid3x3 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { format, addDays, subDays, addWeeks, subWeeks, startOfWeek, endOfWeek } from 'date-fns';

export type ViewMode = 'day' | '3-day' | 'week' | 'custom';
export type TimeInterval = 15 | 30 | 60;

interface GridNavigationProps {
  currentDate: Date;
  viewMode: ViewMode;
  timeInterval: TimeInterval;
  onDateChange: (date: Date) => void;
  onViewModeChange: (mode: ViewMode) => void;
  onTimeIntervalChange: (interval: TimeInterval) => void;
  onTodayClick?: () => void;
  customDateRange?: { start: Date; end: Date };
  onCustomDateRangeChange?: (range: { start: Date; end: Date }) => void;
  className?: string;
}

/**
 * Navigation controls for calendar grid
 */
export function GridNavigation({
  currentDate,
  viewMode,
  timeInterval,
  onDateChange,
  onViewModeChange,
  onTimeIntervalChange,
  onTodayClick,
  customDateRange,
  onCustomDateRangeChange,
  className
}: GridNavigationProps) {
  
  const handlePrevious = () => {
    switch (viewMode) {
      case 'day':
        onDateChange(subDays(currentDate, 1));
        break;
      case '3-day':
        onDateChange(subDays(currentDate, 3));
        break;
      case 'week':
        onDateChange(subWeeks(currentDate, 1));
        break;
      case 'custom':
        if (customDateRange) {
          const days = Math.ceil((customDateRange.end.getTime() - customDateRange.start.getTime()) / (1000 * 60 * 60 * 24));
          onDateChange(subDays(currentDate, days));
        }
        break;
    }
  };

  const handleNext = () => {
    switch (viewMode) {
      case 'day':
        onDateChange(addDays(currentDate, 1));
        break;
      case '3-day':
        onDateChange(addDays(currentDate, 3));
        break;
      case 'week':
        onDateChange(addWeeks(currentDate, 1));
        break;
      case 'custom':
        if (customDateRange) {
          const days = Math.ceil((customDateRange.end.getTime() - customDateRange.start.getTime()) / (1000 * 60 * 60 * 24));
          onDateChange(addDays(currentDate, days));
        }
        break;
    }
  };

  const getDateRangeDisplay = () => {
    switch (viewMode) {
      case 'day':
        return format(currentDate, 'EEEE, MMMM d, yyyy');
      case '3-day':
        const threeDayEnd = addDays(currentDate, 2);
        return `${format(currentDate, 'MMM d')} - ${format(threeDayEnd, 'MMM d, yyyy')}`;
      case 'week':
        const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
        const weekEnd = endOfWeek(currentDate, { weekStartsOn: 1 });
        return `${format(weekStart, 'MMM d')} - ${format(weekEnd, 'MMM d, yyyy')}`;
      case 'custom':
        if (customDateRange) {
          return `${format(customDateRange.start, 'MMM d')} - ${format(customDateRange.end, 'MMM d, yyyy')}`;
        }
        return '';
    }
  };

  return (
    <div className={cn(
      "flex items-center justify-between p-2 border-b border-gray-200 bg-white",
      className
    )}>
      {/* Date Navigation */}
      <div className="flex items-center space-x-2">
        <Button
          variant="outline"
          size="sm"
          onClick={handlePrevious}
          aria-label="Previous period"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        
        <Button
          variant="outline"
          size="sm"
          onClick={() => onTodayClick?.()}
          className="px-3"
        >
          Today
        </Button>
        
        <Button
          variant="outline"
          size="sm"
          onClick={handleNext}
          aria-label="Next period"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
        
        <div className="text-sm font-medium px-3">
          {getDateRangeDisplay()}
        </div>
      </div>

      {/* View Controls */}
      <div className="flex items-center space-x-4">
        {/* View Mode Toggle */}
        <ToggleGroup
          type="single"
          value={viewMode}
          onValueChange={(value) => value && onViewModeChange(value as ViewMode)}
          className="h-9"
        >
          <ToggleGroupItem value="day" aria-label="Day view" className="px-3">
            Day
          </ToggleGroupItem>
          <ToggleGroupItem value="3-day" aria-label="3-day view" className="px-3">
            3 Days
          </ToggleGroupItem>
          <ToggleGroupItem value="week" aria-label="Week view" className="px-3">
            Week
          </ToggleGroupItem>
        </ToggleGroup>

        {/* Time Interval Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="h-9">
              <Clock className="h-4 w-4 mr-1" />
              {timeInterval}min
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Time Intervals</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => onTimeIntervalChange(15)}>
              <span className={cn(timeInterval === 15 && "font-semibold")}>
                15 minutes
              </span>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onTimeIntervalChange(30)}>
              <span className={cn(timeInterval === 30 && "font-semibold")}>
                30 minutes
              </span>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onTimeIntervalChange(60)}>
              <span className={cn(timeInterval === 60 && "font-semibold")}>
                1 hour
              </span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Grid Options */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="h-9">
              <Grid3x3 className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Grid Options</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem>
              <Calendar className="h-4 w-4 mr-2" />
              Show weekends
            </DropdownMenuItem>
            <DropdownMenuItem>
              <Clock className="h-4 w-4 mr-2" />
              24-hour view
            </DropdownMenuItem>
            <DropdownMenuItem>
              Show business hours
            </DropdownMenuItem>
            <DropdownMenuItem>
              Show travel time
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}

/**
 * Mobile-optimized grid navigation
 */
export function MobileGridNavigation({
  currentDate,
  viewMode,
  onDateChange,
  onViewModeChange,
  onTodayClick,
  className
}: Omit<GridNavigationProps, 'timeInterval' | 'onTimeIntervalChange' | 'customDateRange' | 'onCustomDateRangeChange'>) {
  return (
    <div className={cn(
      "flex flex-col space-y-2 p-2 border-b border-gray-200 bg-white",
      className
    )}>
      {/* Date Display and Navigation */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">
          {format(currentDate, 'MMMM yyyy')}
        </h2>
        
        <div className="flex items-center space-x-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={handlePrevious}
            aria-label="Previous"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onTodayClick?.()}
          >
            Today
          </Button>
          
          <Button
            variant="ghost"
            size="sm"
            onClick={handleNext}
            aria-label="Next"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* View Mode Tabs */}
      <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg">
        {(['day', '3-day', 'week'] as ViewMode[]).map((mode) => (
          <button
            key={mode}
            onClick={() => onViewModeChange(mode)}
            className={cn(
              "flex-1 py-1.5 px-3 text-sm font-medium rounded transition-colors",
              viewMode === mode
                ? "bg-white text-gray-900 shadow-sm"
                : "text-gray-600 hover:text-gray-900"
            )}
          >
            {mode === '3-day' ? '3 Days' : mode.charAt(0).toUpperCase() + mode.slice(1)}
          </button>
        ))}
      </div>
    </div>
  );

  function handlePrevious() {
    onDateChange(viewMode === 'week' ? subWeeks(currentDate, 1) : subDays(currentDate, 1));
  }

  function handleNext() {
    onDateChange(viewMode === 'week' ? addWeeks(currentDate, 1) : addDays(currentDate, 1));
  }
}