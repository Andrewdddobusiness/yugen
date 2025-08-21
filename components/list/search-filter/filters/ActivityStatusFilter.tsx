"use client";

import React from 'react';
import { Calendar } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { ACTIVITY_STATUS } from '../constants';

interface ActivityStatusFilterProps {
  selectedStatuses: string[];
  onToggleStatus: (status: string) => void;
}

export function ActivityStatusFilter({ 
  selectedStatuses, 
  onToggleStatus 
}: ActivityStatusFilterProps) {
  return (
    <div className="space-y-2">
      <Label className="flex items-center gap-2 text-sm font-medium">
        <Calendar className="h-4 w-4" />
        Status
      </Label>
      <div className="space-y-2">
        {ACTIVITY_STATUS.map(status => (
          <div key={status.value} className="flex items-center space-x-2">
            <Checkbox
              id={`status-${status.value}`}
              checked={selectedStatuses.includes(status.value)}
              onCheckedChange={() => onToggleStatus(status.value)}
            />
            <Label
              htmlFor={`status-${status.value}`}
              className="text-sm font-normal cursor-pointer"
            >
              {status.label}
            </Label>
          </div>
        ))}
      </div>
    </div>
  );
}