"use client";

import React from 'react';
import { Clock } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { TIME_PERIODS } from '../constants';

interface TimePeriodFilterProps {
  selectedPeriods: string[];
  onTogglePeriod: (period: string) => void;
}

export function TimePeriodFilter({ 
  selectedPeriods, 
  onTogglePeriod 
}: TimePeriodFilterProps) {
  return (
    <div className="space-y-2">
      <Label className="flex items-center gap-2 text-sm font-medium">
        <Clock className="h-4 w-4" />
        Time of Day
      </Label>
      <div className="space-y-2">
        {TIME_PERIODS.map(period => (
          <div key={period.value} className="flex items-center space-x-2">
            <Checkbox
              id={`time-${period.value}`}
              checked={selectedPeriods.includes(period.value)}
              onCheckedChange={() => onTogglePeriod(period.value)}
            />
            <Label
              htmlFor={`time-${period.value}`}
              className="text-sm font-normal cursor-pointer"
            >
              {period.label}
            </Label>
          </div>
        ))}
      </div>
    </div>
  );
}