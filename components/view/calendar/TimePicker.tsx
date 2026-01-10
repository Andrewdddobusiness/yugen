"use client";

import React, { useState, useEffect } from 'react';
import { Clock, ChevronUp, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { TimeGridConfig } from './TimeGrid';

interface TimePickerProps {
  value?: string; // "HH:MM" or "HH:MM:SS"
  onChange: (time: string) => void;
  config?: TimeGridConfig;
  showDuration?: boolean;
  duration?: number; // minutes
  onDurationChange?: (minutes: number) => void;
  disabled?: boolean;
  className?: string;
  portalContainer?: HTMLElement | null;
  keepParentOpenAttribute?: string;
}

interface TimeRange {
  startTime: string;
  endTime: string;
  duration: number;
}

interface TimeRangePickerProps {
  value?: TimeRange;
  onChange: (range: TimeRange) => void;
  config?: TimeGridConfig;
  disabled?: boolean;
  className?: string;
  portalContainer?: HTMLElement | null;
  keepParentOpenAttribute?: string;
}

/**
 * Precise time picker with interval snapping
 */
export function TimePicker({ 
  value = "09:00", 
  onChange, 
  config = { interval: 30, startHour: 6, endHour: 23, showExtendedHours: false },
  showDuration = false,
  duration = 60,
  onDurationChange,
  disabled = false,
  className,
  portalContainer,
  keepParentOpenAttribute,
}: TimePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [hours, setHours] = useState(9);
  const [minutes, setMinutes] = useState(0);

  // Parse initial value
  useEffect(() => {
    if (value) {
      const [h, m] = value.split(':').map(Number);
      setHours(h || 9);
      setMinutes(m || 0);
    }
  }, [value]);

  const handleTimeChange = (newHours: number, newMinutes: number) => {
    const timeString = `${newHours.toString().padStart(2, '0')}:${newMinutes.toString().padStart(2, '0')}:00`;
    onChange(timeString);
    setHours(newHours);
    setMinutes(newMinutes);
  };

  const incrementHours = () => {
    const newHours = Math.min(config.endHour, hours + 1);
    handleTimeChange(newHours, minutes);
  };

  const decrementHours = () => {
    const newHours = Math.max(config.startHour, hours - 1);
    handleTimeChange(newHours, minutes);
  };

  const incrementMinutes = () => {
    let newMinutes = minutes + config.interval;
    let newHours = hours;
    
    if (newMinutes >= 60) {
      newMinutes = 0;
      newHours = Math.min(config.endHour, hours + 1);
    }
    
    handleTimeChange(newHours, newMinutes);
  };

  const decrementMinutes = () => {
    let newMinutes = minutes - config.interval;
    let newHours = hours;
    
    if (newMinutes < 0) {
      newMinutes = 60 - config.interval;
      newHours = Math.max(config.startHour, hours - 1);
    }
    
    handleTimeChange(newHours, newMinutes);
  };

  const formatDisplayTime = (h: number, m: number) => {
    const displayHour = h > 12 ? h - 12 : h === 0 ? 12 : h;
    const period = h >= 12 ? 'PM' : 'AM';
    return `${displayHour}:${m.toString().padStart(2, '0')} ${period}`;
  };

  // Quick time buttons for common durations
  const quickTimes = [
    { label: '30m', minutes: 30 },
    { label: '1h', minutes: 60 },
    { label: '1.5h', minutes: 90 },
    { label: '2h', minutes: 120 },
    { label: '3h', minutes: 180 }
  ];

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          disabled={disabled}
          className={cn(
            "justify-start text-left font-normal",
            !value && "text-muted-foreground",
            className
          )}
        >
          <Clock className="mr-2 h-4 w-4" />
          {formatDisplayTime(hours, minutes)}
          {showDuration && duration && (
            <span className="ml-2 text-sm text-muted-foreground">
              ({Math.floor(duration / 60)}h {duration % 60}m)
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-auto p-4"
        align="start"
        container={portalContainer}
        data-keep-parent-open={keepParentOpenAttribute}
      >
        <div className="space-y-4">
          {/* Time Controls */}
          <div className="flex items-center justify-center space-x-4">
            {/* Hours */}
            <div className="flex flex-col items-center space-y-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={incrementHours}
                disabled={hours >= config.endHour}
              >
                <ChevronUp className="h-4 w-4" />
              </Button>
              <div className="text-2xl font-mono w-12 text-center">
                {hours.toString().padStart(2, '0')}
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={decrementHours}
                disabled={hours <= config.startHour}
              >
                <ChevronDown className="h-4 w-4" />
              </Button>
            </div>
            
            <div className="text-2xl font-mono">:</div>
            
            {/* Minutes */}
            <div className="flex flex-col items-center space-y-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={incrementMinutes}
              >
                <ChevronUp className="h-4 w-4" />
              </Button>
              <div className="text-2xl font-mono w-12 text-center">
                {minutes.toString().padStart(2, '0')}
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={decrementMinutes}
              >
                <ChevronDown className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Duration Controls */}
          {showDuration && onDurationChange && (
            <div className="border-t pt-4">
              <label className="text-sm font-medium mb-2 block">Duration</label>
              <div className="flex flex-wrap gap-2">
                {quickTimes.map((time) => (
                  <Button
                    key={time.minutes}
                    variant={duration === time.minutes ? "default" : "outline"}
                    size="sm"
                    onClick={() => onDurationChange(time.minutes)}
                  >
                    {time.label}
                  </Button>
                ))}
              </div>
            </div>
          )}
          
          {/* Apply button */}
          <Button
            onClick={() => setIsOpen(false)}
            className="w-full"
          >
            Apply
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}

/**
 * Time range picker for selecting start and end times
 */
export function TimeRangePicker({ 
  value, 
  onChange, 
  config = { interval: 30, startHour: 6, endHour: 23, showExtendedHours: false },
  disabled = false,
  className,
  portalContainer,
  keepParentOpenAttribute,
}: TimeRangePickerProps) {
  const [startTime, setStartTime] = useState(value?.startTime || "09:00:00");
  const [endTime, setEndTime] = useState(value?.endTime || "10:00:00");

  useEffect(() => {
    if (!value) return;
    setStartTime(value.startTime);
    setEndTime(value.endTime);
  }, [value?.startTime, value?.endTime]);

  // Calculate duration
  const calculateDuration = (start: string, end: string): number => {
    const [startH, startM] = start.split(':').map(Number);
    const [endH, endM] = end.split(':').map(Number);
    return (endH * 60 + endM) - (startH * 60 + startM);
  };

  const handleStartTimeChange = (time: string) => {
    setStartTime(time);
    const duration = calculateDuration(time, endTime);
    onChange({
      startTime: time,
      endTime,
      duration: Math.max(config.interval, duration)
    });
  };

  const handleEndTimeChange = (time: string) => {
    setEndTime(time);
    const duration = calculateDuration(startTime, time);
    onChange({
      startTime,
      endTime: time,
      duration: Math.max(config.interval, duration)
    });
  };

  const duration = calculateDuration(startTime, endTime);

  return (
    <div className={cn("flex items-center space-x-2", className)}>
      <TimePicker
        value={startTime}
        onChange={handleStartTimeChange}
        config={config}
        disabled={disabled}
        portalContainer={portalContainer}
        keepParentOpenAttribute={keepParentOpenAttribute}
      />
      <span className="text-sm text-muted-foreground">to</span>
      <TimePicker
        value={endTime}
        onChange={handleEndTimeChange}
        config={config}
        disabled={disabled}
        portalContainer={portalContainer}
        keepParentOpenAttribute={keepParentOpenAttribute}
      />
      <span className="text-sm text-muted-foreground ml-2">
        ({Math.floor(Math.abs(duration) / 60)}h {Math.abs(duration) % 60}m)
      </span>
    </div>
  );
}

/**
 * Utility function to snap time to grid interval
 */
export function snapTimeToInterval(time: string, interval: number): string {
  const [hours, minutes] = time.split(':').map(Number);
  const totalMinutes = hours * 60 + minutes;
  
  const remainder = totalMinutes % interval;
  const snappedMinutes = remainder < interval / 2 
    ? totalMinutes - remainder 
    : totalMinutes + (interval - remainder);
    
  const snappedHours = Math.floor(snappedMinutes / 60);
  const snappedMins = snappedMinutes % 60;
  
  return `${snappedHours.toString().padStart(2, '0')}:${snappedMins.toString().padStart(2, '0')}:00`;
}

/**
 * Generate time options for dropdown/selection
 */
export function generateTimeOptions(config: TimeGridConfig): Array<{value: string, label: string}> {
  const options = [];
  
  for (let hour = config.startHour; hour <= config.endHour; hour++) {
    const intervalsPerHour = 60 / config.interval;
    
    for (let i = 0; i < intervalsPerHour; i++) {
      const minute = i * config.interval;
      const value = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}:00`;
      
      const displayHour = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
      const period = hour >= 12 ? 'PM' : 'AM';
      const label = minute === 0 
        ? `${displayHour}:00 ${period}`
        : `${displayHour}:${minute.toString().padStart(2, '0')} ${period}`;
      
      options.push({ value, label });
    }
  }
  
  return options;
}
