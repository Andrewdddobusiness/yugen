"use client";

import React from 'react';
import { format, addDays, subDays, addWeeks, subWeeks, addMonths, subMonths, isToday, startOfWeek } from 'date-fns';
import { ChevronLeft, ChevronRight, Calendar, Clock, MapPin, Car, Timer } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { useItineraryLayoutStore } from '@/store/itineraryLayoutStore';
import { useTimeSchedulingStore } from '@/store/timeSchedulingStore';

interface CalendarControlsProps {
  selectedDate: Date;
  viewMode: 'day' | '3-day' | 'week' | 'month';
  onDateChange?: (date: Date) => void;
  onViewModeChange?: (mode: 'day' | '3-day' | 'week' | 'month') => void;
  className?: string;
}

export function CalendarControls({
  selectedDate,
  viewMode,
  onDateChange,
  onViewModeChange,
  className
}: CalendarControlsProps) {
  const showCityLabels = useItineraryLayoutStore((s) => s.viewStates.calendar.showCityLabels);
  const showTravelTimes = useItineraryLayoutStore((s) => s.viewStates.calendar.showTravelTimes);
  const saveViewState = useItineraryLayoutStore((s) => s.saveViewState);
  const timeInterval = useTimeSchedulingStore((s) => s.timeGridConfig.interval);
  const updateTimeGridConfig = useTimeSchedulingStore((s) => s.updateTimeGridConfig);

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
      case 'month':
        onDateChange(subMonths(selectedDate, 1));
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
      case 'month':
        onDateChange(addMonths(selectedDate, 1));
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
        const weekStart = startOfWeek(selectedDate, { weekStartsOn: 0 });
        const weekEnd = addDays(weekStart, 6);
        if (weekStart.getMonth() === weekEnd.getMonth()) {
          return `${format(weekStart, 'MMM d')} - ${format(weekEnd, 'd, yyyy')}`;
        } else {
          return `${format(weekStart, 'MMM d')} - ${format(weekEnd, 'MMM d, yyyy')}`;
        }
      case 'month':
        return format(selectedDate, 'MMMM yyyy');
    }
  };

  return (
    <div className={cn(
      "flex items-center justify-between px-4 py-3",
      "bg-bg-0/90 backdrop-blur-sm border-b border-stroke-200",
      "dark:bg-ink-900/50 dark:border-white/10",
      "rounded-t-xl"
    , className)}>
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

        <div className="text-lg font-semibold text-ink-900 dark:text-white/90">
          {getDateRangeText()}
        </div>
      </div>

      {/* View Mode Controls */}
      <div className="flex items-center space-x-2">
        <div className="flex items-center bg-bg-50 dark:bg-white/10 rounded-lg p-1 border border-stroke-200/70 dark:border-white/10 shadow-sm">
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
          <Button
            variant={viewMode === 'month' ? "default" : "ghost"}
            size="sm"
            onClick={() => onViewModeChange?.('month')}
            className="h-7 text-xs"
          >
            Month
          </Button>
        </div>

        {/* Time interval (15/30/60) */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="h-8 px-3">
              <Timer className="h-4 w-4 text-brand-500 mr-1" />
              {timeInterval}m
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Time increments</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => updateTimeGridConfig({ interval: 15 })}>
              <span className={cn(timeInterval === 15 && "font-semibold")}>15 minutes</span>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => updateTimeGridConfig({ interval: 30 })}>
              <span className={cn(timeInterval === 30 && "font-semibold")}>30 minutes</span>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => updateTimeGridConfig({ interval: 60 })}>
              <span className={cn(timeInterval === 60 && "font-semibold")}>1 hour</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* City labels toggle */}
        <div className="flex items-center space-x-2 ml-4 text-sm text-ink-500">
          <MapPin className="h-4 w-4 text-brand-500" />
          <span className="hidden md:inline">Cities</span>
          <Switch
            checked={showCityLabels}
            onCheckedChange={(checked) => saveViewState("calendar", { showCityLabels: checked })}
          />
        </div>

        {/* Travel times toggle */}
        <div
          className={cn(
            "flex items-center space-x-2 ml-4 text-sm text-ink-500",
            viewMode === "month" && "opacity-50"
          )}
          title={viewMode === "month" ? "Travel times are available in Day / 3 Days / Week views." : undefined}
        >
          <Car className="h-4 w-4 text-brand-500" />
          <span className="hidden md:inline">Travel times</span>
          <Switch
            checked={showTravelTimes}
            disabled={viewMode === "month"}
            onCheckedChange={(checked) => saveViewState("calendar", { showTravelTimes: checked })}
          />
        </div>

        {/* Time Zone Indicator */}
        <div className="flex items-center space-x-1 text-sm text-ink-500 ml-4">
          <Clock className="h-4 w-4 text-brand-500" />
          <span>{Intl.DateTimeFormat().resolvedOptions().timeZone}</span>
        </div>
      </div>
    </div>
  );
}
