"use client";

import React from 'react';
import { Calendar } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { DAYS_OF_WEEK } from '../constants';

interface DaysOfWeekFilterProps {
  selectedDays: string[];
  onToggleDay: (day: string) => void;
}

export function DaysOfWeekFilter({ 
  selectedDays, 
  onToggleDay 
}: DaysOfWeekFilterProps) {
  return (
    <div className="space-y-2">
      <Label className="flex items-center gap-2 text-sm font-medium">
        <Calendar className="h-4 w-4" />
        Days of Week
      </Label>
      <div className="grid grid-cols-2 gap-2">
        {DAYS_OF_WEEK.map(day => (
          <div key={day.value} className="flex items-center space-x-2">
            <Checkbox
              id={`day-${day.value}`}
              checked={selectedDays.includes(day.value)}
              onCheckedChange={() => onToggleDay(day.value)}
            />
            <Label
              htmlFor={`day-${day.value}`}
              className="text-sm font-normal cursor-pointer"
            >
              {day.label}
            </Label>
          </div>
        ))}
      </div>
    </div>
  );
}